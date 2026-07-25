"use client";

import { useMemo } from "react";
import katex from "katex";

type Props = {
  text: string;
  className?: string;
  as?: "span" | "p" | "div";
};

/**
 * Renders text containing LaTeX math expressions using KaTeX.
 *
 * Handles:
 * 1. Explicit delimiters: `\(...\)` (inline) and `\[...\]` (display)
 * 2. Bare LaTeX commands: `\frac{a}{b}`, `\sqrt{x}`, `\times`, etc.
 * 3. Missing backslashes: `rac{a}{b}` → `\(\frac{a}{b}\)`
 * 4. Simple exponents: `x^2` or `y^3`
 */
export default function LatexRenderer({ text, className, as: Tag = "span" }: Props) {
  const parts = useMemo(() => {
    // Step 1: Auto-detect and fix bare LaTeX, wrap in delimiters
    const prepared = autoWrapLatex(text);

    // Step 2: Parse into segments by delimiters
    const combinedRegex = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
    const segments: Array<{ type: "text" | "inline" | "display"; content: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = combinedRegex.exec(prepared)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: "text", content: prepared.slice(lastIndex, match.index) });
      }
      if (match[1] !== undefined) {
        segments.push({ type: "display", content: match[1] });
      } else {
        segments.push({ type: "inline", content: match[2] });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < prepared.length) {
      segments.push({ type: "text", content: prepared.slice(lastIndex) });
    }

    return segments;
  }, [text]);

  return (
    <Tag className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.content}</span>;
        }

        try {
          const html = katex.renderToString(part.content, {
            throwOnError: false,
            displayMode: part.type === "display",
            output: "html",
            trust: false,
            maxSize: 10,
            maxExpand: 10,
          });
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{ __html: html }}
              className={part.type === "display" ? "block my-3 text-center" : "inline"}
            />
          );
        } catch {
          return (
            <span key={i} className="text-red-400">
              {"\\("}{part.content}{"\\)"}
            </span>
          );
        }
      })}
    </Tag>
  );
}

/**
 * Known LaTeX commands that can take brace-delimited arguments.
 * These are scanned in the auto-detection step.
 */
const KNOWN_LATEX_COMMANDS = [
  "frac", "sqrt", "times", "div", "pm", "mp",
  "leq", "geq", "neq", "approx", "sim", "equiv",
  "cdot", "cdots", "vdots", "ddots",
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta",
  "eta", "theta", "iota", "kappa", "lambda", "mu",
  "nu", "xi", "omicron", "pi", "rho", "sigma",
  "tau", "upsilon", "phi", "chi", "psi", "omega",
  "infty", "partial", "nabla", "sum", "prod", "int",
  "to", "rightarrow", "leftarrow", "Rightarrow", "Leftarrow",
  "implies", "iff", "forall", "exists",
  "circ", "angle", "triangle", "square",
  "mathrm", "mathbf", "mathit", "text",
];

/**
 * Auto-detect bare LaTeX expressions in text and wrap them in \(...\) delimiters
 * so the KaTeX renderer can process them.
 *
 * ALWAYS runs corruption fixes (control character cleanup, missing backslashes).
 * Only runs auto-wrapping into delimiters if NO \(...\) delimiters exist yet.
 *
 * This handles CSV data where:
 * - `\frac` got corrupted to `\f rac` (form feed + "rac")
 * - `\text` got corrupted to `<tab>ext`
 * - Backslashes are missing: `rac{a}{b}` instead of `\frac{a}{b}`
 */
function autoWrapLatex(text: string): string {
  let result = text;

  // ── STEP 1: Fix commands where the backslash was consumed by CSV escape parsing ──
  // CSV parsers interpret \t as tab, \f as form feed, consuming the backslash.
  // The escape consumes both the backslash AND the following character (e.g., t in \t).
  // \frac{ → \frac{   (form feed + "rac{" from CSV interpreting \frac)
  result = result.replace(/\frac\{/g, "\\frac{");
  // \times  → \times    (tab + "imes" from CSV interpreting \times, t consumed by \t)
  result = result.replace(/\times/g, "\\times");
  // \text{  → \text{    (tab + "ext{" from CSV interpreting \text, t consumed by \t)
  result = result.replace(/\text\{/g, "\\text{");

  // ── STEP 2: Strip ALL remaining control characters (including tabs now) ──
  // After fixing the patterns above, remaining control chars are pure corruption
  result = result.replace(/[\x00-\x1F]/g, "");

  // ── STEP 3: Fix remaining missing backslashes after strip ──
  // Some commands may have the `t` consumed (\times → imes, \text → ext)
  // Fix: "imes" (without t) → \times  (the \t was consumed, t is gone)
  result = result.replace(/(?<!\\)imes(?!\w)/g, "\\times");
  // Fix: "ext{" (without t) → \text{  (the \t was consumed, t is gone)
  result = result.replace(/(?<!\\)ext\{/g, "\\text{");
  // Fix: "rac{" (without backslash) → \frac{
  result = result.replace(/(?<!\\)rac\{/g, "\\frac{");
  // Fix: "sqrt{" (without backslash) → \sqrt{
  result = result.replace(/(?<!\\)sqrt\{/g, "\\sqrt{");
  // Fix: "times" (without backslash) → \times
  result = result.replace(/(?<!\\)times(?!\w)/g, "\\times");
  // Fix: "text{" (without backslash) → \text{
  result = result.replace(/(?<!\\)text\{/g, "\\text{");

  // Common operators (word boundaries to avoid matching inside words)
  result = result.replace(/(?<!\\)div(?!\w)/g, "\\div");
  result = result.replace(/(?<!\\)pm(?!\w)/g, "\\pm");
  result = result.replace(/(?<!\\)leq(?!\w)/g, "\\leq");
  result = result.replace(/(?<!\\)geq(?!\w)/g, "\\geq");
  result = result.replace(/(?<!\\)neq(?!\w)/g, "\\neq");
  result = result.replace(/(?<!\\)cdot(?!\w)/g, "\\cdot");

  // ── STEP 4: Auto-wrap bare LaTeX in delimiters (only if none exist) ──
  if (!/\\\(/.test(result) && !/\\\[/.test(result)) {
    // Uses a character-by-character scan to properly handle nested braces.
    result = wrapLatexCommands(result);

    // Wrap simple exponents: x^2 or y^3 → \(x^{2}\)
    result = result.replace(
      /\b([a-zA-Z0-9]+)\^\{?([a-zA-Z0-9]+)\}?\b/g,
      "\\($1^{$2}\\)"
    );
  }

  return result;
}

/**
 * Scan text for \command{...} patterns using proper balanced-brace matching,
 * and wrap each found expression in \(...\) delimiters.
 */
function wrapLatexCommands(text: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < text.length) {
    // Check if we're at \command
    if (text[i] === "\\") {
      const cmdMatch = text.slice(i).match(/^\\([a-zA-Z]+)/);
      if (cmdMatch && KNOWN_LATEX_COMMANDS.includes(cmdMatch[1])) {
        const cmd = cmdMatch[1];
        const cmdLen = cmdMatch[0].length; // includes the backslash
        let expr = cmdMatch[0]; // "\command"
        let pos = i + cmdLen;

        // Collect brace-delimited arguments (e.g., {a}{b})
        let argCount = 0;
        while (pos < text.length && text[pos] === "{" && argCount < 3) {
          const braceResult = readBalancedBrace(text, pos);
          if (braceResult === null) break;
          expr += braceResult.content;
          pos = braceResult.nextIndex;
          argCount++;
        }

        // Collect trailing operators and numbers that are clearly part of the math
        // (spaces, +, -, =, digits, decimal points, parentheses, braces for superscripts)
        while (pos < text.length && /[\s+\-=\d.()\[\]{}^_]/.test(text[pos])) {
          // Track brace balance so we collect entire ^{...} or _{...} blocks
          if (text[pos] === "{") {
            const braceResult = readBalancedBrace(text, pos);
            if (braceResult) {
              expr += braceResult.content;
              pos = braceResult.nextIndex;
              continue;
            }
          }
          expr += text[pos];
          pos++;
        }

        // Wrap in \(...\) and push
        result.push(`\\(${expr}\\)`);
        i = pos;
        continue;
      }
    }

    // Not a LaTeX command — copy character as-is
    result.push(text[i]);
    i++;
  }

  return result.join("");
}

/**
 * Read a balanced brace expression `{...}` from the given position.
 * Returns the matched content (including braces) and the index after the closing brace.
 * Returns null if braces are not balanced.
 *
 * Properly handles nested braces like `{x^{2}}` or `{a + {b}}`.
 */
function readBalancedBrace(text: string, start: number): { content: string; nextIndex: number } | null {
  if (text[start] !== "{") return null;

  let depth = 0;
  let pos = start;

  while (pos < text.length) {
    const ch = text[pos];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        // Found matching closing brace
        return {
          content: text.slice(start, pos + 1),
          nextIndex: pos + 1,
        };
      }
    }
    pos++;
  }

  // Unbalanced — return null
  return null;
}
