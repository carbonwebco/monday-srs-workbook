// CLIENT CONTENT — the only file you edit to stand up a new Solution Hub.
// Outside monday (local preview, standalone build) the hub renders this object.
// Inside monday the hub reads the live board instead; this shape mirrors that board.
// Schema: see TEMPLATE.md. Worked example: examples/acme/content.js.
window.CW_CONTENT = {
  name: "Acme Industrial — Solution Hub",
  description: [
    "account: acme.monday.com",
    "client: Acme Industrial",
    "solution: One governed work system for Acme. Requests, planning and approvals live in acme.monday.com; engineering stays in GitHub; approved work orders reach Title without re-keying; capacity is read from ServiceNow; analysts report from Power BI.",
    "srs: https://carbonweb.co/srs/acme"
  ].join("\n"),
  groups: [
    { title: "Tools", items: [
      { id: "t1", name: "T-1 acme.monday.com", cols: { "Role": "System of work: intake, planning, approvals, governance. monday work management + monday dev.", "Owner": "Acme PMO", "State": "Current" } },
      { id: "t2", name: "T-2 Google Workspace", cols: { "Role": "Identity (SSO), docs, calendar", "Owner": "Acme IT", "State": "Current" } },
      { id: "t3", name: "T-3 GitHub", cols: { "Role": "Code of record for engineering", "Owner": "Acme Eng", "State": "Current" } },
      { id: "t4", name: "T-4 Title", cols: { "Role": "ERP. Receives approved work orders.", "Owner": "Acme Ops", "State": "Current" } },
      { id: "t5", name: "T-5 ServiceNow", cols: { "Role": "Capacity and ITSM source of truth", "Owner": "Acme SecOps", "State": "Current" } },
      { id: "t6", name: "T-6 Power BI", cols: { "Role": "Analyst reporting on work data", "Owner": "Acme Analytics", "State": "Future" } },
      { id: "t7", name: "T-7 Smartsheet", cols: { "Role": "Legacy PMO tracker. Replaced by T-1.", "Owner": "Acme PMO", "State": "Retiring" } }
    ]},
    { title: "Users & Depts", items: [
      { id: "u1", name: "D-1 Operations", cols: { "Users": "K. Ramos + 14 users", "Needs": "One place to request, track and approve work (FO001, FO003). Orders reach Title without re-keying (FO006).", "Notes": "Heaviest intake volume." } },
      { id: "u2", name: "D-2 Engineering", cols: { "Users": "M. Osei + 8 devs", "Needs": "Keep working in GitHub. Delivery status reaches the PMO without status meetings (FO004, FO005).", "Notes": "" } },
      { id: "u3", name: "D-3 SecOps", cols: { "Users": "D. Chen (approver)", "Needs": "Capacity stays mastered in ServiceNow. Every integration respects auth and rate policy (FO007).", "Notes": "Approves all integration credentials." } },
      { id: "u4", name: "D-4 Analytics", cols: { "Users": "S. Patel + 3 analysts", "Needs": "Self-serve reporting on live work data (FO008, FO009).", "Notes": "" } },
      { id: "u5", name: "D-5 PMO", cols: { "Users": "J. Whitfield", "Needs": "Portfolio view across BUs under one governance standard (FO002, FO008). Retire Smartsheet (FO010).", "Notes": "" } }
    ]},
    { title: "Requirements", items: [
      { id: "f1", name: "FO001 Single intake front door for all work requests", cols: { "Dept": "D-1", "Tools": "T-1", "Priority": "Must", "Status": "Designed", "Acceptance": "Any employee submits from one form; the request lands triaged within 1 min; no email or Slack side doors remain." } },
      { id: "f2", name: "FO002 Governed workspace and permission model", cols: { "Dept": "D-5", "Tools": "T-1, T-2", "Priority": "Must", "Status": "Accepted", "Acceptance": "A new BU user sees only their BU; guests see only their project; SSO via T-2; verified by permission audit." } },
      { id: "f3", name: "FO003 Standard request taxonomy across BUs", cols: { "Dept": "D-1", "Tools": "T-1", "Priority": "Must", "Status": "Accepted", "Acceptance": "Every request carries one of the agreed types; zero 'Other' after two weeks of UAT." } },
      { id: "f4", name: "FO004 Engineering delivery visible to PMO", cols: { "Dept": "D-2, D-5", "Tools": "T-1, T-3", "Priority": "Must", "Status": "Designed", "Acceptance": "PMO sees sprint status for all squads with data under 15 min old." } },
      { id: "f5", name: "FO005 PR and branch status on work items", cols: { "Dept": "D-2", "Tools": "T-3", "Priority": "Should", "Status": "Accepted", "Acceptance": "When a PR merges, the linked item updates within 5 min." } },
      { id: "f6", name: "FO006 Approved work orders push one-way to Title", cols: { "Dept": "D-1", "Tools": "T-1, T-4", "Priority": "Must", "Status": "Designed", "Acceptance": "An approved order exists in Title within 10 min with all mapped fields; failures alert the owner; 50-order batch, 0 duplicates." } },
      { id: "f7", name: "FO007 Capacity read from ServiceNow", cols: { "Dept": "D-3", "Tools": "T-5", "Priority": "Must", "Status": "Proposed", "Acceptance": "Capacity in monday matches ServiceNow within 1 hr under the OD-3 rate allowance." } },
      { id: "f8", name: "FO008 Portfolio KPI view across BUs", cols: { "Dept": "D-4, D-5", "Tools": "T-1, T-6", "Priority": "Should", "Status": "Proposed", "Acceptance": "Leadership answers 'what is blocked and why' from one view; KPI set signed off (OD-4)." } },
      { id: "f9", name: "FO009 Analyst-owned reporting model", cols: { "Dept": "D-4", "Tools": "T-6", "Priority": "Should", "Status": "Proposed", "Acceptance": "" } },
      { id: "f10", name: "FO010 Retire Smartsheet PMO tracker", cols: { "Dept": "D-5", "Tools": "T-1, T-7", "Priority": "Could", "Status": "Proposed", "Acceptance": "All active Smartsheet projects migrated; T-7 read-only for 90 days, then closed." } }
    ]},
    { title: "Integrations", items: [
      { id: "i1", name: "INT-1 Work orders to Title", cols: { "Flow": "T-1 → T-4 (one-way)", "Approach": "Built", "Note": "Serves FO006. Direction confirmed in OD-2." } },
      { id: "i2", name: "INT-2 Capacity from ServiceNow", cols: { "Flow": "T-5 → T-1 (hourly)", "Approach": "Built", "Note": "Serves FO007. Auth and rate limits pending OD-3." } },
      { id: "i3", name: "INT-3 GitHub", cols: { "Flow": "T-3 ↔ T-1", "Approach": "Native", "Note": "Serves FO004, FO005." } },
      { id: "i4", name: "INT-4 Power BI connector", cols: { "Flow": "T-1 → T-6", "Approach": "Configured", "Note": "Serves FO008, FO009." } },
      { id: "i5", name: "INT-5 Google SSO", cols: { "Flow": "T-2 → T-1", "Approach": "Native", "Note": "Serves FO002." } }
    ]},
    { title: "Open Decisions", items: [
      { id: "o1", name: "OD-1 Workspace topology: single vs per-BU", cols: { "Owner": "K. Ramos", "Affects": "FO002, T-1", "Status": "Decided", "Resolution": "Single workspace with per-BU folders; revisit at 200 users." } },
      { id: "o2", name: "OD-2 Title direction: one-way or two-way", cols: { "Owner": "Acme Ops", "Affects": "INT-1, FO006", "Status": "Decided", "Resolution": "One-way, monday to Title." } },
      { id: "o3", name: "OD-3 ServiceNow auth model and rate allowance", cols: { "Owner": "D. Chen", "Affects": "INT-2, FO007", "Status": "Open", "Resolution": "" } },
      { id: "o4", name: "OD-4 Portfolio KPI set", cols: { "Owner": "S. Patel", "Affects": "FO008", "Status": "Open", "Resolution": "" } },
      { id: "o5", name: "OD-5 Who owns the Power BI model long term", cols: { "Owner": "S. Patel", "Affects": "T-6, FO009", "Status": "Open", "Resolution": "" } },
      { id: "o6", name: "OD-6 Smartsheet retirement date", cols: { "Owner": "J. Whitfield", "Affects": "T-7, FO010", "Status": "Open", "Resolution": "" } }
    ]},
    { title: "Risks", items: [
      { id: "r1", name: "R1 ServiceNow rate limits", cols: { "Note": "If the OD-3 allowance is below hourly, FO007 acceptance must change to daily." } },
      { id: "r2", name: "R2 Shadow intake channels persist", cols: { "Note": "FO001 fails if email and Slack requests are still honored after launch. Needs D-5 policy backing." } },
      { id: "r3", name: "R3 Title field mapping drift", cols: { "Note": "Title schema changes break INT-1 silently. Needs a named owner in D-1." } }
    ]},
    { title: "Diagrams", items: [
      { id: "g1", name: "DG-1 System context", cols: { "Type": "System context", "Notation": "C4 model, level 1", "Status": "Reviewed", "Traces": "T-1, T-2, T-3, T-4, T-5, T-6, T-7, INT-1, INT-2, INT-3, INT-4, INT-5, D-1, D-2, D-3, D-4, D-5", "Purpose": "What is the system, who uses it, and which tools it exchanges data with. No internals.", "Mermaid": "flowchart LR\n  D1[\"D-1 Operations<br/>Person\"]:::person\n  D2[\"D-2 Engineering<br/>Person\"]:::person\n  D4[\"D-4 Analytics<br/>Person\"]:::person\n  D5[\"D-5 PMO<br/>Person\"]:::person\n  T1[\"T-1 acme.monday.com<br/>The system of work\"]:::system\n  T2[\"T-2 Google Workspace<br/>Identity, docs\"]:::external\n  T3[\"T-3 GitHub<br/>Code of record\"]:::external\n  T4[\"T-4 Title<br/>ERP\"]:::external\n  T5[\"T-5 ServiceNow<br/>Capacity, ITSM\"]:::external\n  T6[\"T-6 Power BI<br/>Reporting\"]:::external\n  T7[\"T-7 Smartsheet<br/>Retiring\"]:::retiring\n  D1 -->|\"submits and approves work\"| T1\n  D2 -->|\"tracks sprint delivery\"| T1\n  D5 -->|\"reviews portfolio\"| T1\n  D4 -->|\"builds reports\"| T6\n  T2 -->|\"SSO · INT-5\"| T1\n  T3 <-->|\"PR and branch status · INT-3\"| T1\n  T1 -->|\"approved work orders · INT-1\"| T4\n  T5 -->|\"capacity, hourly · INT-2\"| T1\n  T1 -->|\"work data · INT-4\"| T6\n  T7 -.->|\"migrate, then retire · FO010\"| T1" } },
      { id: "g2", name: "DG-2 Request to work order", cols: { "Type": "Process", "Notation": "BPMN 2.0 conventions", "Status": "Reviewed", "Traces": "FO001, FO003, FO006, INT-1, D-1, T-1, T-4", "Purpose": "How a work request becomes a Title work order. Lanes are roles or tools; every path ends in an end event.", "Mermaid": "flowchart LR\n  subgraph L1[\"Requester · D-1\"]\n    S((Need arises)):::event --> A1[Submit intake form]:::task\n    A7[Revise and resubmit]:::task\n  end\n  subgraph L2[\"Ops triage · D-1\"]\n    A2[Classify request type]:::task --> G1{Complete?}:::gateway\n    G1 -->|Yes| A3[Approve work order]:::task\n    A3 --> G3{Approved?}:::gateway\n    G3 -->|No| X(((Request rejected))):::endEvent\n  end\n  subgraph L3[\"acme.monday.com · T-1\"]\n    A4[Stamp status Approved]:::auto --> A5[Send order to Title · INT-1]:::auto\n    A5 --> G2{Accepted by Title?}:::gateway\n    G2 -->|No| A6[Alert owner, retry]:::auto\n  end\n  subgraph L4[\"Title · T-4\"]\n    E(((Work order created))):::endEvent\n  end\n  A1 --> A2\n  G1 -->|No| A7\n  A7 --> A2\n  G3 -->|Yes| A4\n  A6 --> A5\n  G2 -->|Yes| E" } },
      { id: "g3", name: "DG-3 Work data model", cols: { "Type": "Data model", "Notation": "ERD, crow's foot (IE)", "Status": "Draft", "Traces": "T-1, FO001, FO002, FO003, FO004, FO006, INT-1, INT-3", "Purpose": "Logical model of acme.monday.com. Entities are boards, attributes are columns, relationships are connect columns.", "Mermaid": "erDiagram\n  BUSINESS_UNIT ||--o{ REQUEST : raises\n  USER }o--o{ BUSINESS_UNIT : \"belongs to\"\n  USER ||--o{ REQUEST : submits\n  REQUEST_TYPE ||--o{ REQUEST : classifies\n  REQUEST ||--o| WORK_ORDER : \"approved as\"\n  WORK_ORDER ||--o{ SYNC_LOG : \"pushed via INT-1\"\n  REQUEST ||--o{ SPRINT_ITEM : \"delivered by\"\n  SPRINT_ITEM ||--o{ PULL_REQUEST : \"linked via INT-3\"\n  REQUEST {\n    item_id id PK\n    text name\n    status request_status \"Submitted to Sent\"\n    connect business_unit FK\n    connect request_type FK\n    people requester FK\n    date submitted_on\n  }\n  WORK_ORDER {\n    item_id id PK\n    connect request FK\n    text title_wo_number \"written back by INT-1\"\n    status sync_status \"Sent, Failed\"\n  }\n  BUSINESS_UNIT {\n    item_id id PK\n    text name\n    people owner\n  }\n  REQUEST_TYPE {\n    item_id id PK\n    text name \"FO003 taxonomy\"\n  }\n  SPRINT_ITEM {\n    item_id id PK\n    connect request FK\n    status sprint_status\n  }\n  SYNC_LOG {\n    item_id id PK\n    connect work_order FK\n    text response_code\n    date attempted_at\n  }" } },
      { id: "g4", name: "DG-4 Work order push to Title", cols: { "Type": "Sequence", "Notation": "UML 2.5 sequence", "Status": "Draft", "Traces": "INT-1, FO006, T-1, T-4, R3", "Purpose": "Runtime behavior of INT-1, including the failure path and the FO006 acceptance bar.", "Mermaid": "sequenceDiagram\n  autonumber\n  actor Ops as Ops approver (D-1)\n  participant M as acme.monday.com (T-1)\n  participant K as Integration (INT-1)\n  participant T as Title (T-4)\n  Ops->>M: Set status to Approved\n  M->>K: Webhook: item approved\n  K->>M: Read mapped columns\n  K->>T: Create work order, idempotency key = item id\n  alt Created\n    T-->>K: Title WO number\n    K->>M: Write WO number, sync status Sent\n  else Error or timeout\n    T-->>K: Error\n    K->>K: Retry 3x with backoff\n    K->>M: Sync status Failed, notify owner\n  end\n  Note over K,T: FO006: in Title within 10 min, 0 duplicates" } },
      { id: "g5", name: "DG-5 Request lifecycle", cols: { "Type": "State machine", "Notation": "UML 2.5 state machine", "Status": "Reviewed", "Traces": "FO001, FO003, FO006, INT-1", "Purpose": "Every legal value of the Request status column and what moves it. Transitions read trigger [guard].", "Mermaid": "stateDiagram-v2\n  state \"Needs info\" as NeedsInfo\n  state \"Sent to Title\" as Sent\n  state \"Sync failed\" as Failed\n  [*] --> Submitted\n  Submitted --> Triage : on create\n  Triage --> NeedsInfo : triage [incomplete]\n  NeedsInfo --> Triage : requester resubmits\n  Triage --> Approved : approver [type set]\n  Triage --> Rejected : approver\n  Approved --> Sent : INT-1 success\n  Approved --> Failed : INT-1 error\n  Failed --> Approved : retry\n  Sent --> [*]\n  Rejected --> [*]" } }
    ]}
  ]
};
