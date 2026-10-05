# CarbonWeb — Solution Hub

A monday.com **board view** app. One instance per client. The system being documented
is the client's monday account (`abc.monday.com`) plus the tools around it. The hub
answers four questions: who the system serves, what it must do, how it is composed,
and what is still undecided. Delivery tracking (components, scopes, COs, hours) is
out of scope and lives on other boards.

Read-only. The app never writes to the board; the only write is
`monday.storage.instance` (active tab).

## Files

- `app/index.html`: view entry (loads monday-sdk-js)
- `app/styles.css`: Vibe tokens for Light / Dark / Black
- `app/app.js`: all logic, vanilla JS, no build step
- `app/content.js`: client content (`window.CW_CONTENT`); renders outside monday
- `app/vendor/mermaid.min.js`: Mermaid 11.4.1, vendored so diagrams render with no external calls
- `examples/acme/content.js`: the reference example, never edited
- `scripts/build.mjs`: inlines everything into one HTML file in `dist/`

## Content file shape

`app/content.js` mirrors the monday board one to one, so the same spec drives both:

```js
window.CW_CONTENT = {
  name: "<Client> — Solution Hub",
  description: "account: …\nclient: …\nsolution: …\nsrs: …",   // see Board description
  groups: [
    { title: "Tools", items: [
      { id: "t1", name: "T-1 client.monday.com", cols: { "Role": "…", "Owner": "…", "State": "Current" } }
    ]}
    // …one entry per group below; `cols` keys are the column titles; all values are plain strings
  ]
};
```

- `id`: any string, unique across the file. `name`: token + title (`FO001 Single intake…`).
- Group title aliases accepted: `System`/`Systems` for Tools, `Users and Depts`, `Decisions`.
- Mermaid source goes in a JS string with `\n` line breaks.

## Board template

Groups matched by exact title; columns by title. Missing columns render "—".

### Board description
```
account: acme.monday.com
client: Acme Industrial
solution: One-paragraph statement of the whole system.
srs: https://…            (optional)
```
Or a `Meta` group with one item carrying the same fields as columns.

### Tools
The parts of the system. `T-1` is always the monday account itself.
| Column | Type | Labels |
|---|---|---|
| Role | Text | role in the system |
| Owner | Text / People | |
| State | Status | Current / Future / Retiring |

### Users & Depts
Items `D-1 Operations`, …
| Column | Type |
|---|---|
| Users | Text / People |
| Needs | Long text (FO refs) |
| Notes | Long text |

### Requirements
Items `FO001 …`
| Column | Type | Labels |
|---|---|---|
| Dept | Text | D-n tokens (who needs it) |
| Tools | Text | T-n tokens (where the system meets it) |
| Priority | Status | Must / Should / Could |
| Acceptance | Long text | testable criteria |
| Status | Status | Proposed / Accepted / Designed / Verified |

### Integrations
Items `INT-1 …`
| Column | Type | Labels |
|---|---|---|
| Flow | Text | `T-1 → T-4` |
| Approach | Status | Native / Configured / Built |
| Note | Long text | |

### Open Decisions
Items `OD-1 …`. Owner, Affects (tokens), Status (Open / Decided), Resolution.

### Risks
Items `R1 …`. Note.

### Diagrams
Items `DG-1 …`. The hub renders them read-only; source lives on the board.
| Column | Type | Labels |
|---|---|---|
| Type | Status | System context / Process / Data model / Sequence / State machine |
| Notation | Text | e.g. `C4 model, level 1` |
| Status | Status | Draft / Reviewed |
| Purpose | Long text | the one question this diagram answers |
| Traces | Text | tokens depicted (T-n, FO###, INT-n, D-n) |
| Mermaid | Long text | diagram source |

## Coverage checks

Run on every load, shown on Requirements and as a count on Overview:
- requirements with no department
- requirements not placed in the system (no tool)
- requirements without acceptance criteria
- departments with no requirements
- tools no requirement calls for

## Linking

Tokens `T-n`, `D-n`, `FO###`, `INT-n`, `OD-n`, `Rn`, `DG-n` in any text become links to
their row (tab switch + row flash).

## Behavior

- Paginates with `items_page` + `next_items_page` (100 per page).
- `listen("events")` re-fetches (400 ms debounce); `listen("context")` re-themes.
- API error: one retry, then inline error with Retry.
- Empty board: setup checklist.
- Diagrams: Mermaid, rendered locally and themed per monday theme; View source / Copy source per card.

## Diagram authoring standard

This section is the contract for the SRS drafting agent that writes `Diagrams` items.
A solution architect reviews each one and flips Status from Draft to Reviewed.

General rules
- One diagram answers one question, stated in Purpose.
- Labels use tokens (T-1, INT-2, FO006) so they link from the hub, and Traces lists every token depicted.
- Source carries no colors or styling. Use the house classes below; the hub themes them.
- Keep to about 15 nodes. Split anything larger into levels.

House classes (flowcharts): `person`, `system`, `external`, `retiring`, `task`, `auto`, `gateway`, `event`, `endEvent`.

System context: C4 model, level 1 (Simon Brown)
- `flowchart LR`. The monday account is the only `:::system`. Departments are `:::person`, other tools `:::external` or `:::retiring`.
- Every edge is labelled with what flows plus its INT token. No internals: boards belong in the data model.

Process: BPMN 2.0 conventions (OMG)
- Mermaid has no native BPMN, so a flowchart maps the core set: one `subgraph` lane per role or tool; start event `((…))` `:::event`; end event `(((…)))` `:::endEvent`; tasks as verb + noun `[…]`, `:::task` for people and `:::auto` for the system; exclusive gateways `{…?}` `:::gateway` with labelled outgoing flows.
- One start event. Every path reaches an end event. No flow leaves a gateway unlabelled.
- If an executable model is needed, export `.bpmn` separately. This diagram is for shared understanding.

Data model: ERD, crow's foot / IE notation
- `erDiagram`. Entities are singular UPPER_SNAKE and map to boards. Attributes read `type name PK|FK "note"`, using monday column types (status, people, connect, date, text).
- Label each relationship with a verb phrase and make both cardinalities explicit.
- Model the logical design (boards and connect columns), not API payloads.

Sequence: UML 2.5
- One diagram per integration. Participants are named with tokens and `autonumber` is on.
- `alt`/`else` covers the failure path. Show idempotency and retries.
- A `Note` restates the acceptance criteria from the traced requirement.

State machine: UML 2.5
- `stateDiagram-v2`, one per status column that carries rules.
- Each transition reads `trigger [guard]`. Include `[*]` start and end. Every column label appears as a state.
