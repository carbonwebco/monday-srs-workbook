# Agent instructions

This repo is the canonical CarbonWeb Solution Hub. Treat it as a CMS: to make a hub for a
new client, write content, not code.

- Edit only `app/content.js` (or a content file passed to the build with `--content`).
- Do not modify `app/app.js`, `app/styles.css`, `app/index.html` or `app/vendor/`. If the
  hub can't show something the client needs, say so rather than patching the code in a
  client session.
- Never edit `examples/acme/content.js`. It is the reference.
- The content shape, column labels and diagram rules are in `TEMPLATE.md`. Follow it exactly.
- Build with `node scripts/build.mjs --out dist/<client>-solution-hub.html` and deliver that file.
- Don't commit client content or client source documents to this repo. Client hubs belong
  in the client's own project or in a repo generated from this template.
