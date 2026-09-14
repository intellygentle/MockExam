const katex = require("katex");

// ── Faithful replica of autoWrapLatex (from LatexRenderer.tsx), using String.raw ──
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

const RE_FRAC = /\frac\{/g; // form-feed + "rac{" (CSV ate \f of \frac)
const RE_TIMES = /\times/g; // tab + "imes" (CSV ate \t of \times)
const RE_TEXT = /\text\{/g; // tab + "ext{" (CSV ate \t of \text)
const RE_CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g; // preserves \n \r \t
const RE_BARE_IMES = String.raw`(?<![a-zA-Z\\])imes(?!\w)`;
const RE_BARE_EXT = String.raw`(?<![a-zA-Z\\])ext\{`;
const RE_BARE_RAC = String.raw`(?<![a-zA-Z\\])rac\{`;
const RE_BARE_SQRT = String.raw`(?<![a-zA-Z\\])sqrt\{`;
const RE_BARE_TIMES = String.raw`(?<![a-zA-Z\\])times(?!\w)`;
const RE_BARE_TEXT = String.raw`(?<![a-zA-Z\\])text\{`;
const RE_BARE_DIV = String.raw`(?<![a-zA-Z\\])div(?!\w)`;
const RE_BARE_PM = String.raw`(?<![a-zA-Z\\])pm(?!\w)`;
const RE_BARE_LEQ = String.raw`(?<![a-zA-Z\\])leq(?!\w)`;
const RE_BARE_GEQ = String.raw`(?<![a-zA-Z\\])geq(?!\w)`;
const RE_BARE_NEQ = String.raw`(?<![a-zA-Z\\])neq(?!\w)`;
const RE_BARE_CDOT = String.raw`(?<![a-zA-Z\\])cdot(?!\w)`;

function readBalancedBrace(text, start) {
  if (text[start] !== "{") return null;
  let depth = 0, pos = start;
  while (pos < text.length) {
    const ch = text[pos];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return { content: text.slice(start, pos + 1), nextIndex: pos + 1 };
    }
    pos++;
  }
  return null;
}

function wrapLatexCommands(text) {
  const result = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\\") {
      const cmdMatch = text.slice(i).match(/^\\([a-zA-Z]+)/);
      if (cmdMatch && KNOWN_LATEX_COMMANDS.includes(cmdMatch[1])) {
        const cmd = cmdMatch[1];
        const cmdLen = cmdMatch[0].length;
        let expr = cmdMatch[0];
        let pos = i + cmdLen;
        let argCount = 0;
        while (pos < text.length && text[pos] === "{" && argCount < 3) {
          const braceResult = readBalancedBrace(text, pos);
          if (braceResult === null) break;
          expr += braceResult.content;
          pos = braceResult.nextIndex;
          argCount++;
        }
        while (pos < text.length && /[\s+\-=\d.()\[\]{}^_]/.test(text[pos])) {
          if (text[pos] === "{") {
            const braceResult = readBalancedBrace(text, pos);
            if (braceResult) { expr += braceResult.content; pos = braceResult.nextIndex; continue; }
          }
          expr += text[pos];
          pos++;
        }
        result.push(String.raw`\(` + expr + String.raw`\)`);
        i = pos;
        continue;
      }
    }
    result.push(text[i]);
    i++;
  }
  return result.join("");
}

function autoWrapLatex(text) {
  let result = text;
  // NOTE: replacement strings use 2 literal backslashes (`\times`), exactly like the
  // component's `"\\\\times"` JS strings, so the replica stays faithful (a 4-backslash
  // String.raw literal would produce a stray double backslash in the output).
  result = result.replace(RE_FRAC, String.raw`\frac{`);
  result = result.replace(RE_TIMES, String.raw`\times`);
  result = result.replace(RE_TEXT, String.raw`\text{`);
  result = result.replace(RE_CTRL, "");
  result = result.replace(new RegExp(RE_BARE_IMES, "g"), String.raw`\times`);
  result = result.replace(new RegExp(RE_BARE_EXT, "g"), String.raw`\text{`);
  result = result.replace(new RegExp(RE_BARE_RAC, "g"), String.raw`\frac{`);
  result = result.replace(new RegExp(RE_BARE_SQRT, "g"), String.raw`\sqrt{`);
  result = result.replace(new RegExp(RE_BARE_TIMES, "g"), String.raw`\times`);
  result = result.replace(new RegExp(RE_BARE_TEXT, "g"), String.raw`\text{`);
  result = result.replace(new RegExp(RE_BARE_DIV, "g"), String.raw`\div`);
  result = result.replace(new RegExp(RE_BARE_PM, "g"), String.raw`\pm`);
  result = result.replace(new RegExp(RE_BARE_LEQ, "g"), String.raw`\leq`);
  result = result.replace(new RegExp(RE_BARE_GEQ, "g"), String.raw`\geq`);
  result = result.replace(new RegExp(RE_BARE_NEQ, "g"), String.raw`\neq`);
  result = result.replace(new RegExp(RE_BARE_CDOT, "g"), String.raw`\cdot`);
  // Step 4: only if no explicit delimiters
  if (!/\\\(/.test(result) && !/\\\[/.test(result)) {
    result = wrapLatexCommands(result);
    result = result.replace(/\b([a-zA-Z0-9]+)\^\{?([a-zA-Z0-9]+)\}?\b/g, String.raw`\($1^{$2}\)`);
  }
  return result;
}

function renderThroughPipeline(raw) {
  const prepared = autoWrapLatex(raw);
  const combinedRegex = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  let html = "";
  let lastIndex = 0;
  let m;
  let errors = [];
  while ((m = combinedRegex.exec(prepared)) !== null) {
    html += prepared.slice(lastIndex, m.index);
    const content = m[1] !== undefined ? m[1] : m[2];
    try {
      html += katex.renderToString(content, { throwOnError: true, displayMode: false, output: "html", trust: false, maxSize: 10, maxExpand: 10 });
    } catch (e) {
      errors.push(e.message.slice(0, 70));
      html += `[ERR]`;
    }
    lastIndex = m.index + m[0].length;
  }
  html += prepared.slice(lastIndex);
  return { prepared, html, errors };
}

const cases = [
  String.raw`The principal gave an \(\mathbf{EXTEMPORE}\) speech during the graduation ceremony.`,
  String.raw`The school authorities decided to \(\underline{\mathrm{curtail}}\) the closing time due to the approaching storm.`,
  String.raw`The project was completed \(\textit{just in the nick of time}\). This means it was done:`,
  String.raw`What does the word \(\textit{equilibrium}\) mean as used in the third paragraph?`,
  String.raw`Statistics is considered one of the most difficult modules (no latex here).`,
  String.raw`If the word SCHOOL is written in a secret code as TDIPPM, how would the word BOOKS be written?`,
  String.raw`Sometimes the invigilator collects the scripts.`,
  // Regression: "Sometimes" ends in "imes" — must NOT become "Somet×"
  String.raw`Sometimes it is hard to concentrate.`,
  // Positive: corrupted \times (t consumed by CSV \t) is still fixed when not inside a word
  String.raw`Solve: 3imes 4 and 2imes 5.`,
  // Positive: bare \times (backslash consumed, t preserved) after a digit is still fixed
  String.raw`The value is 5times 6.`,
  // Regression: multi-paragraph passage must KEEP its paragraph breaks
  // (control-char cleanup must not strip \n newlines)
  "Paragraph one ends here.\n\nHowever, critics point out the flaws.\n\nTherefore, a balance is needed.",
];

for (const c of cases) {
  const { prepared, html, errors } = renderThroughPipeline(c);
  const hasUnderline = /text-decoration:underline|border-bottom/.test(html);
  const hasBold = /class="[^"]*textbf/.test(html);
  const hasItalic = /class="[^"]*textit/.test(html);
  // Newline preservation: \n paragraph breaks must survive the pipeline
  const newlineCount = (html.match(/\n/g) || []).length;
  const hasNewlines = /\n/.test(c) && newlineCount >= (c.match(/\n/g) || []).length;
  const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  console.log(
    (errors.length ? "FAIL " : "OK   ") +
      (hasUnderline ? "[UNDERLINE] " : "") +
      (hasBold ? "[BOLD] " : "") +
      (hasItalic ? "[ITALIC] " : "") +
      (hasNewlines ? "[PARAGRAPHS] " : "") +
      "| " + JSON.stringify(prepared) +
      "\n      => text: " + JSON.stringify(text.slice(0, 110)) +
      (errors.length ? " ERRORS: " + errors.join("; ") : "")
  );
}
