const katex = require("katex");
console.log("katex version:", require("katex/package.json").version);

// Emphasized strings as they would appear in question text (LaTeX inline math)
const tests = [
  String.raw`\(\underline{\text{curtail}}\)`,
  String.raw`\(\underline{curtail}\)`,
  String.raw`\(\mathbf{EXTEMPORE}\)`,
  String.raw`\(\textit{just in the nick of time}\)`,
  String.raw`The student was \(\underline{\text{vindicated}}\) of all charges.`,
  String.raw`\(\textit{equilibrium}\)`,
];

for (const t of tests) {
  // Mimic LatexRenderer: split by delimiters, render math parts with KaTeX
  const combinedRegex = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  let rendered = "";
  let lastIndex = 0;
  let m;
  let threw = false;
  while ((m = combinedRegex.exec(t)) !== null) {
    rendered += t.slice(lastIndex, m.index);
    const content = m[1] !== undefined ? m[1] : m[2];
    try {
      rendered += katex.renderToString(content, {
        throwOnError: true, displayMode: false, output: "html", trust: false, maxSize: 10, maxExpand: 10,
      });
    } catch (e) {
      threw = true;
      rendered += `[PARSE ERROR: ${e.message.slice(0, 60)}]`;
    }
    lastIndex = m.index + m[0].length;
  }
  rendered += t.slice(lastIndex);
  // check for katex error markup
  const hasError = threw || /ParseError|color:red/.test(rendered);
  const text = rendered.replace(/<[^>]+>/g, "");
  const hasUnderline = /text-decoration:underline|border-bottom/.test(rendered);
  const hasBold = /font-weight:bold|font-weight:700/.test(rendered);
  const hasItalic = /font-style:italic/.test(rendered);
  console.log(
    (hasError ? "FAIL" : "OK  ") +
      " | " + (hasUnderline ? "UNDERLINE" : "no-underline") +
      (hasBold ? "+BOLD" : "") + (hasItalic ? "+ITALIC" : "") +
      " | " + JSON.stringify(t) + " => " + JSON.stringify(text.slice(0, 80))
  );
}
