#!/usr/bin/env node
// Inlines app/ into one self-contained HTML file (CSS, Mermaid, content, app.js).
// No dependencies. Usage:
//   node scripts/build.mjs                                   -> dist/solution-hub.html from app/content.js
//   node scripts/build.mjs --content clients/foo/content.js --out dist/foo-solution-hub.html
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? resolve(process.cwd(), args[i + 1]) : fallback;
};
const contentPath = arg("--content", resolve(root, "app/content.js"));
const outPath = arg("--out", resolve(root, "dist/solution-hub.html"));

const read = (p) => readFileSync(p, "utf8");
// Keep inlined code from closing its own <script>/<style> tag early.
const safeScript = (s) => s.replace(/<\/script/gi, "<\\/script");
const safeStyle = (s) => s.replace(/<\/style/gi, "<\\/style");

const content = read(contentPath);
// Sanity-check the content file before inlining it.
const sandbox = { window: {} };
new Function("window", content)(sandbox.window);
const board = sandbox.window.CW_CONTENT;
if (!board || !Array.isArray(board.groups)) {
  console.error(`✗ ${contentPath} must assign window.CW_CONTENT = { name, description, groups: [...] }`);
  process.exit(1);
}

let html = read(resolve(root, "app/index.html"));
const replaceTag = (tag, replacement) => {
  if (!html.includes(tag)) throw new Error(`build: tag not found in app/index.html: ${tag}`);
  html = html.replace(tag, () => replacement);
};
replaceTag('<link rel="stylesheet" href="styles.css">', `<style>\n${safeStyle(read(resolve(root, "app/styles.css")))}\n</style>`);
replaceTag('<script src="vendor/mermaid.min.js"></script>', `<script>\n${safeScript(read(resolve(root, "app/vendor/mermaid.min.js")))}\n</script>`);
replaceTag('<script src="content.js"></script>', `<script>\n${safeScript(content)}\n</script>`);
replaceTag('<script src="app.js"></script>', `<script>\n${safeScript(read(resolve(root, "app/app.js")))}\n</script>`);
if (board.name) html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${board.name.replace(/[<&]/g, "")}</title>`);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
const counts = board.groups.map((g) => `${g.title}: ${(g.items || []).length}`).join(", ");
console.log(`✓ ${outPath} (${(html.length / 1024).toFixed(0)} KB)\n  ${board.name}\n  ${counts}`);
