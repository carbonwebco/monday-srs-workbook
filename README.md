# CarbonWeb Solution Hub (SRS template)

The canonical CarbonWeb Solution Hub: a read-only system-requirements view of a client's
monday.com account and the tools around it. It covers who the system serves, what it must
do, how it is put together, and what is still undecided.

**The code is finished. A new client only needs new content.** Everything client-specific
lives in one file, [`app/content.js`](app/content.js). Swap Acme's content for the new
client's and you have a new hub. Leave the HTML, CSS and JS alone.

The same app runs in two modes:

| Mode | Data source | Use |
|---|---|---|
| Standalone (`dist/*.html` or `app/index.html` opened locally) | `app/content.js` | Shareable SRS deliverable, review, demos |
| monday board view | The live board (same shape, see [TEMPLATE.md](TEMPLATE.md)) | Running hub inside the client's account |

## Stand up a new client (for agents)

1. Read [TEMPLATE.md](TEMPLATE.md) for the content shape, column labels, coverage checks and the
   diagram authoring standard. Use [`examples/acme/content.js`](examples/acme/content.js) as the
   worked example.
2. Rewrite `app/content.js` for the client. Keep `window.CW_CONTENT = { name, description, groups }`
   and the group titles: Tools, Users & Depts, Requirements, Integrations, Open Decisions, Risks,
   Diagrams.
3. Build a single shareable file (Node 18+, no install step):
   ```bash
   node scripts/build.mjs --out dist/<client>-solution-hub.html
   ```
   The build checks that the content file parses and prints item counts per group.
4. Deliver `dist/<client>-solution-hub.html`. It is self-contained apart from Google Fonts.

You can also keep content outside the repo:
`node scripts/build.mjs --content path/to/content.js --out path/to/hub.html`.

### Content rules that matter

- Tokens (`T-n`, `D-n`, `FO###`, `INT-n`, `OD-n`, `Rn`, `DG-n`) at the start of each item `name`
  become link targets. Anywhere they appear in text, they link back to that item, so cross-reference freely.
- `T-1` is always the client's monday account.
- Every requirement needs a Dept, Tools and Acceptance, otherwise it shows up as a coverage gap.
- Diagrams are Mermaid source in the `Mermaid` column. Follow the house classes and notations in
  TEMPLATE.md and don't add colors or styling, because the hub applies the theme.

## Repo map

```
app/                 the hub (vanilla JS, no build needed to run)
  content.js         ← the only file that changes per client
  app.js, styles.css, index.html, vendor/mermaid.min.js
examples/acme/       reference content, never edited
scripts/build.mjs    one-file HTML build into dist/
TEMPLATE.md          content and board contract, diagram standard
```

## Preview locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/app/index.html. Outside monday the hub shows a "static snapshot"
tag and a light/dark/black theme switcher.
