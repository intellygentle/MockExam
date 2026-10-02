#!/usr/bin/env python3
"""Generate src/lib/server/word-vault-challenge-content.ts from the source docx.

The Word Vault Listening & Story Challenge docx is the single source of truth
for the two new Spelling Bee cards:

    * Activity A — 120 dictation sentences (Section 8, six tables of 20).
    * Activity B — a 6-chapter story with 120 gaps (Section 9), each gap
      written as a {{ID|word}} token.

This script parses the docx directly (no python-docx dependency) and writes a
committed TypeScript data module. Re-run it only if the docx changes:

    py scripts/generate_word_vault_listening_content.py [path/to/docx]

The default path is the Download folder copy of the file. The generated file
is committed so the app does not need the docx at build or run time.
"""
import html
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

DEFAULT_DOCX = "/sdcard/Download/Word_Vault_Listening_and_Story_Challenge.docx"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src/lib/server/word-vault-challenge-content.ts")

CATEGORY_NAMES = {
    1: "Vowels silently dropped or added",
    2: "Silent letters",
    3: "Unexpected letter combinations",
    4: "\u201cie / ei\u201d and doubled-letter confusions",
    5: "Everyday words often misspelled by sound",
    6: "British spelling patterns",
}

CAPITAL_WORDS = {"February", "Wednesday"}


def paragraph_text(p):
    """All w:t text inside a paragraph, space-preserved."""
    parts = []
    for t in p.iter(f"{W}t"):
        parts.append(t.text or "")
    return "".join(parts)


def cell_text(tc):
    return "".join(paragraph_text(p) for p in tc.findall(f"{W}p")).strip()


def is_heading(p):
    """True when the paragraph uses a heading style (Heading1/2/3)."""
    style = p.find(W + "pPr/" + W + "pStyle")
    if style is None:
        return False
    val = style.get(W + "val") or ""
    return val.lower().startswith("heading")


def normalize_punct(s):
    """Straighten smart quotes / dashes exactly as the spec's 6.1 rules ask."""
    s = s.replace("\u2018", "'").replace("\u2019", "'")
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = s.replace("\u2013", "-").replace("\u2014", "-")
    return s


def parse_body(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    body = root.find(f"{W}body")
    # Return the ordered list of block elements (paragraphs and tables).
    blocks = []
    for child in body:
        if child.tag == f"{W}p":
            blocks.append(("p", child))
        elif child.tag == f"{W}tbl":
            blocks.append(("tbl", child))
    return blocks


def parse_paragraph(p):
    return html.unescape(paragraph_text(p)).strip()


def parse_table(tbl):
    rows = []
    for tr in tbl.findall(f"{W}tr"):
        cells = [cell_text(tc) for tc in tr.findall(f"{W}tc")]
        rows.append([html.unescape(c) for c in cells])
    return rows


def main():
    docx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DOCX
    if not os.path.exists(docx):
        print(f"Docx not found: {docx}", file=sys.stderr)
        sys.exit(1)

    blocks = parse_body(docx)

    items = []           # dictation items
    chapters = []        # story chapters
    category = None      # current category number while scanning tables
    chapter = None       # current chapter dict while scanning the story
    in_story = False

    for kind, el in blocks:
        if kind == "p":
            text = parse_paragraph(el)
            if not text:
                continue

            m = re.match(r"Category\s+(\d+):", text)
            if m:
                category = int(m.group(1))
                continue

            if text.startswith("9. Content B"):
                in_story = True
                category = None
                continue
            if text.startswith("10. Acceptance checklist"):
                in_story = False
                continue

            m = re.match(r"Chapter\s+(\d+):\s*(.+)", text)
            if m:
                chapter = {
                    "chapter": int(m.group(1)),
                    "title": m.group(2).strip(),
                    "paragraphs": [],
                }
                chapters.append(chapter)
                continue

            if in_story and chapter is not None:
                # "Agent note:" lines are for the agent only — never exported.
                if text.startswith("Agent note:"):
                    continue
                paragraph = normalize_punct(text)
                chapter["paragraphs"].append(paragraph)
            continue

        # kind == "tbl"
        rows = parse_table(el)
        if not rows:
            continue
        header = [c.strip().lower() for c in rows[0]]
        if header[:2] != ["id", "target word"]:
            continue  # not a Section 8 dictation table
        if category is None:
            print("Dictation table found before a Category heading", file=sys.stderr)
            sys.exit(1)

        for row in rows[1:]:
            if len(row) < 5:
                continue
            id_txt, target, ipa, sentence, typical = row[:5]
            if not id_txt.strip().isdigit():
                continue
            ipa = ipa.strip()
            note = ""
            m = re.match(r"^(.*?)\s*\(([^)]+)\)\s*$", ipa)
            if m:
                ipa = m.group(1).strip()
                note = m.group(2).strip()
            items.append({
                "id": int(id_txt.strip()),
                "category": category,
                "target": target.strip(),
                "ipa": ipa,
                "note": note,
                "sentence": normalize_punct(sentence.strip()),
                "typicalError": typical.strip(),
                "capitalRequired": target.strip() in CAPITAL_WORDS,
            })

    # ── validate ──
    if len(items) != 120:
        print(f"Expected 120 dictation items, found {len(items)}", file=sys.stderr)
        sys.exit(1)
    if [i["id"] for i in items] != list(range(1, 121)):
        print("Dictation IDs are not 1..120 in order", file=sys.stderr)
        sys.exit(1)
    if len(chapters) != 6:
        print(f"Expected 6 chapters, found {len(chapters)}", file=sys.stderr)
        sys.exit(1)

    # Parse story tokens into text/gap chunks and check every word appears once.
    seen_ids = []
    for ch in chapters:
        parsed_paragraphs = []
        for paragraph in ch["paragraphs"]:
            chunks = []
            pos = 0
            for m in re.finditer(r"\{\{(\d{1,3})\|([^}]+)\}\}", paragraph):
                before = paragraph[pos:m.start()]
                if before:
                    chunks.append({"type": "text", "value": before})
                gid = int(m.group(1))
                word = m.group(2).strip()
                chunks.append({"type": "gap", "id": gid, "word": word})
                seen_ids.append(gid)
                pos = m.end()
            tail = paragraph[pos:]
            if tail:
                chunks.append({"type": "text", "value": tail})
            parsed_paragraphs.append(chunks)
        ch["chunks"] = parsed_paragraphs

    if sorted(seen_ids) != list(range(1, 121)):
        missing = sorted(set(range(1, 121)) - set(seen_ids))
        dupes = sorted({i for i in seen_ids if seen_ids.count(i) > 1})
        print(f"Story gaps invalid. missing={missing} duplicates={dupes}", file=sys.stderr)
        sys.exit(1)

    for ch in chapters:
        if len([g for p in ch["chunks"] for g in p if g["type"] == "gap"]) != 20:
            print(f"Chapter {ch['chapter']} does not have 20 gaps", file=sys.stderr)
            sys.exit(1)

    write_module(items, chapters)


def ts(value):
    """Serialise a Python value as a TypeScript literal (JSON is valid TS)."""
    return json.dumps(value, ensure_ascii=False, indent=2)


def write_module(items, chapters):
    lines = []
    lines.append("// AUTO-GENERATED — do not edit by hand.")
    lines.append("// Source: Word_Vault_Listening_and_Story_Challenge.docx")
    lines.append("// Regenerate: py scripts/generate_word_vault_listening_content.py")
    lines.append('import "server-only";')
    lines.append("")
    lines.append("/** One Activity A dictation item (one per Word Vault word, IDs 1-120). */")
    lines.append("export type DictationItem = {")
    lines.append("  id: number;")
    lines.append("  /** 1..6 — the Word Vault category (see DICTATION_CATEGORY_NAMES). */")
    lines.append("  category: number;")
    lines.append("  /** The word whose spelling is being tested (the hidden key). */")
    lines.append("  target: string;")
    lines.append("  /** British (RP) phonetic transcription — never shown before marking. */")
    lines.append("  ipa: string;")
    lines.append("  /** Disambiguating note such as \"adj.\" / \"verb\" — empty when none. */")
    lines.append("  note: string;")
    lines.append("  /** The sentence read aloud; the student types it from memory. */")
    lines.append("  sentence: string;")
    lines.append("  /** The classic wrong spelling, used for feedback only. */")
    lines.append("  typicalError: string;")
    lines.append("  /** February and Wednesday must be typed with a capital first letter. */")
    lines.append("  capitalRequired: boolean;")
    lines.append("};")
    lines.append("")
    lines.append("/** A story chunk: plain text, or a gap the student must fill in. */")
    lines.append("export type StoryChunk =")
    lines.append('  | { type: "text"; value: string }')
    lines.append('  | { type: "gap"; id: number; word: string };')
    lines.append("")
    lines.append("/** One gap-fill story chapter (Activity B). */")
    lines.append("export type StoryChapter = {")
    lines.append("  chapter: number;")
    lines.append("  title: string;")
    lines.append("  /** paragraphs → chunks → text/gap. */")
    lines.append("  paragraphs: StoryChunk[][];")
    lines.append("};")
    lines.append("")
    lines.append("/** Category names, keyed by category number (1..6). */")
    lines.append("export const DICTATION_CATEGORY_NAMES: Record<number, string> = " + ts(CATEGORY_NAMES) + ";")
    lines.append("")
    lines.append("/** The 120 Activity A dictation items, in ID order. */")
    lines.append("export const DICTATION_ITEMS: DictationItem[] = " + ts(items) + ";")
    lines.append("")
    out_chapters = [
        {"chapter": ch["chapter"], "title": ch["title"], "paragraphs": ch["chunks"]}
        for ch in chapters
    ]
    lines.append("/** The 6 Activity B story chapters, in order. */")
    lines.append("export const STORY_CHAPTERS: StoryChapter[] = " + ts(out_chapters) + ";")
    lines.append("")
    lines.append("/** Total words / gaps in the challenge (120). */")
    lines.append("export const WORD_VAULT_TOTAL_WORDS = DICTATION_ITEMS.length;")
    lines.append("")

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    print(f"Wrote {OUT}")
    print(f"  dictation items : {len(items)}")
    print(f"  story chapters  : {len(chapters)}")
    gaps = sum(1 for ch in chapters for p in ch["chunks"] for g in p if g["type"] == "gap")
    print(f"  story gaps      : {gaps}")


if __name__ == "__main__":
    main()
