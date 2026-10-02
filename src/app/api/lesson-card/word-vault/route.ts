import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLessonCard } from "@/lib/server/lesson-cards";
import {
  DICTATION_ITEMS,
  DICTATION_CATEGORY_NAMES,
  STORY_CHAPTERS,
  WORD_VAULT_TOTAL_WORDS,
} from "@/lib/server/word-vault-challenge-content";
import {
  CAPITALISED_WORDS,
  gradeDictation,
  gradeStoryGap,
  targetTokenIndex,
  typicalErrorNote,
} from "@/lib/server/word-vault-grading";
import { applyWordVaultResults, loadWordVaultProgress } from "@/lib/server/word-vault-progress";

/**
 * /api/lesson-card/word-vault
 *
 * Backs the two Word Vault Listening & Story Challenge cards:
 *   - spelling_listening  (Activity A: listen to a sentence, type it)
 *   - spelling_story      (Activity B: listen to a chapter, fill the gaps)
 *
 * GET  ?drill_set_id=..&student_name=..   → the card payload + progress
 * POST { action, studentName, schoolName, drillSetId, ... }
 *   action "check"  → grade ONE answer against the hidden key (server-side)
 *   action "record" → fold a finished run's results into the progress table
 *
 * Answers never travel to the client for comparison: the sentences and the
 * hidden spelling keys stay in this server module (the sentence / gap word is
 * sent only so the browser's speech synthesiser can read it aloud).
 */

const CARD_TYPES = new Set(["spelling_listening", "spelling_story"]);

const ITEM_BY_ID = new Map(DICTATION_ITEMS.map((item) => [item.id, item]));
const WORD_KEY_BY_ID: Record<number, string> = Object.fromEntries(
  DICTATION_ITEMS.map((item) => [item.id, item.target])
);
const CAPITAL_BY_ID: Record<number, boolean> = Object.fromEntries(
  DICTATION_ITEMS.map((item) => [item.id, CAPITALISED_WORDS.has(item.target)])
);

function activityFor(cardType: string): "dictation" | "story" {
  return cardType === "spelling_story" ? "story" : "dictation";
}

async function loadSetAndCard(supabase: any, drillSetId: number) {
  const { data: set, error } = await supabase
    .from("drill_sets")
    .select("*")
    .eq("id", drillSetId)
    .maybeSingle();
  if (error || !set) return { error: NextResponse.json({ error: "Drill set not found" }, { status: 404 }) };
  const cardType = set.card_type || "quiz";
  if (!CARD_TYPES.has(cardType)) {
    return {
      error: NextResponse.json({ error: "This drill set is not a Word Vault card" }, { status: 400 }),
    };
  }
  const card = getLessonCard(cardType, set.capitalization_slug);
  if (!card) {
    return {
      error: NextResponse.json(
        { error: `No lesson is registered for slug "${set.capitalization_slug || "(empty)"}"` },
        { status: 404 }
      ),
    };
  }
  return { set, card, cardType };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const drillSetId = parseInt(url.searchParams.get("drill_set_id") || "", 10);
    const studentName = (url.searchParams.get("student_name") || "").trim();

    if (isNaN(drillSetId)) {
      return NextResponse.json({ error: "drill_set_id is required" }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const loaded = await loadSetAndCard(supabase, drillSetId);
    if (loaded.error) return loaded.error;
    const { card, cardType } = loaded;

    const progress = studentName
      ? await loadWordVaultProgress(supabase, studentName, drillSetId, WORD_VAULT_TOTAL_WORDS)
      : null;

    const activity = activityFor(cardType);

    return NextResponse.json({
      kind: card.kind,
      activity,
      title: card.title,
      description: card.description,
      lesson: card.lesson,
      totalWords: WORD_VAULT_TOTAL_WORDS,
      // Activity A: the sentence (for speech only) and its category label.
      items:
        activity === "dictation"
          ? DICTATION_ITEMS.map((item) => ({
              id: item.id,
              category: item.category,
              categoryName: DICTATION_CATEGORY_NAMES[item.category] || `Category ${item.category}`,
              sentence: item.sentence,
            }))
          : undefined,
      // Activity B: chapters with text/gap chunks. The gap word is present for
      // the speech engine, but the client blanks it out until it is answered.
      chapters: activity === "story" ? STORY_CHAPTERS : undefined,
      progress,
    });
  } catch (error: any) {
    console.error("Word Vault card API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load card" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, studentName, schoolName, drillSetId } = body;
    const name = (studentName || "").trim() || "Anonymous";
    const setId = parseInt(String(drillSetId ?? ""), 10);

    if (isNaN(setId)) {
      return NextResponse.json({ error: "drillSetId is required" }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const loaded = await loadSetAndCard(supabase, setId);
    if (loaded.error) return loaded.error;
    const { cardType } = loaded;
    const activity = activityFor(cardType);

    // ── Grade one answer ──
    if (action === "check") {
      const wordId = parseInt(String(body.wordId ?? ""), 10);
      const typed = typeof body.typed === "string" ? body.typed : "";
      const attempt = parseInt(String(body.attempt ?? "1"), 10);
      const item = ITEM_BY_ID.get(wordId);
      if (!item) return NextResponse.json({ error: "Unknown word id" }, { status: 400 });

      if (activity === "dictation") {
        const verdict = gradeDictation(item, typed);
        const reveal = verdict.result !== "incorrect" || attempt >= 2;
        return NextResponse.json({
          activity,
          result: verdict.result,
          wordCorrect: verdict.wordCorrect,
          mistakes: verdict.mistakes,
          note: verdict.note,
          canRetry: verdict.result === "incorrect" && attempt < 2,
          reveal: reveal
            ? {
                sentence: item.sentence,
                target: item.target,
                targetIndex: targetTokenIndex(item),
                ipa: item.ipa,
                typicalError: item.typicalError,
              }
            : null,
        });
      }

      // Activity B — single gap, compared exactly.
      const target = item.target;
      const correct = gradeStoryGap(typed, target, CAPITAL_BY_ID[wordId]);
      return NextResponse.json({
        activity,
        correct,
        note: correct ? "" : typicalErrorNote(target, item.typicalError, typed),
        reveal: { target, typicalError: item.typicalError },
      });
    }

    // ── Record a finished run ──
    if (action === "record") {
      const rawResults = Array.isArray(body.results) ? body.results : [];
      const results = rawResults
        .map((r: any) => {
          const wordId = parseInt(String(r?.wordId ?? ""), 10);
          const item = ITEM_BY_ID.get(wordId);
          if (!item) return null;
          const firstTyped = typeof r?.firstTyped === "string" ? r.firstTyped : "";
          const lastTyped = typeof r?.lastTyped === "string" ? r.lastTyped : firstTyped;
          const firstTryCorrect =
            activity === "dictation"
              ? gradeDictation(item, firstTyped).wordCorrect
              : gradeStoryGap(firstTyped, item.target, CAPITAL_BY_ID[wordId]);
          return { wordId, firstTryCorrect, lastTyped };
        })
        .filter(Boolean) as { wordId: number; firstTryCorrect: boolean; lastTyped: string }[];

      if (results.length === 0) {
        return NextResponse.json({ error: "results must not be empty" }, { status: 400 });
      }

      const outcome = await applyWordVaultResults(supabase, {
        studentName: name,
        schoolName,
        drillSetId: setId,
        wordKeyById: WORD_KEY_BY_ID,
        results,
        totalWords: WORD_VAULT_TOTAL_WORDS,
      });

      return NextResponse.json({
        activity,
        progress: outcome.progress,
        masteredNow: outcome.masteredNow,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Word Vault card API error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
