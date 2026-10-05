/* CarbonWeb — Solution Hub (monday.com board view)
   The system is the client's monday account (abc.monday.com) plus the tools it
   connects to. This view documents that system: who it serves, what it must do,
   how it is composed, and what is still undecided. Delivery lives elsewhere.
   Read-only: never writes to the board. Only write: monday.storage (active tab,
   per view instance). Diagrams are Mermaid source stored on board items and
   rendered locally (vendor/mermaid.min.js); no external network calls. */
(function () {
  "use strict";

  var IN_MONDAY = false;
  var mondaySdk = window.mondaySdk ? window.mondaySdk() : null;
  var TAB_KEY = "cw_hub_active_tab";

  var GROUPS = {
    tools: ["Tools", "System", "Systems"],
    users: ["Users & Depts", "Users and Depts"],
    requirements: ["Requirements"],
    integrations: ["Integrations"],
    decisions: ["Open Decisions", "Decisions"],
    risks: ["Risks"],
    diagrams: ["Diagrams"],
    meta: ["Meta"]
  };
  var TABS = [
    { id: "overview", label: "Overview" },
    { id: "system", label: "System" },
    { id: "users", label: "Users & Depts" },
    { id: "requirements", label: "Requirements" },
    { id: "decisions", label: "Decisions" },
    { id: "risks", label: "Risks" },
    { id: "diagrams", label: "Diagrams" }
  ];
  var TAB_COUNTS = { system: ["tools", "integrations"], users: ["users"], requirements: ["requirements"], decisions: ["decisions"], risks: ["risks"], diagrams: ["diagrams"] };
  var TOKEN_TAB = { tools: "system", integrations: "system", users: "users", requirements: "requirements", decisions: "decisions", risks: "risks", diagrams: "diagrams" };
  var TOKEN_RE = /\b(OD-\d+|INT-\d+|DG-\d+|D-\d+|T-\d+|R\d+|FO\d+)\b/g;
  var TOKEN_HEAD = /^(OD-\d+|INT-\d+|DG-\d+|D-\d+|T-\d+|R\d+|FO\d+)\b/;

  var state = {
    board: null, meta: {}, registry: {}, gk: {},
    activeTab: "overview", pendingFlash: null,
    error: null, loading: true, demo: false,
    theme: "light", dgFilter: "All", dgSource: {}, svgCache: {}
  };
  var root = document.getElementById("app");

  // ---------- utils ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function col(item) {
    for (var i = 1; i < arguments.length; i++) {
      var v = item.cols[arguments[i]];
      if (v != null && v !== "") return v;
    }
    return null;
  }
  var DASH = '<span class="empty-dash">\u2014</span>';
  function dash(v) { return v == null ? DASH : esc(v); }
  function tokenOf(name) { var m = TOKEN_HEAD.exec(name || ""); return m ? m[1] : null; }
  function nameRest(name) {
    var t = tokenOf(name);
    return t ? name.slice(t.length).replace(/^[\s\u2014:-]+/, "") : name;
  }
  function linkify(text) {
    if (text == null || text === "") return DASH;
    return esc(text).replace(TOKEN_RE, function (tok) {
      if (state.registry[tok]) return '<a class="tok" data-tok="' + tok + '">' + tok + "</a>";
      if (/^FO/.test(tok) && state.meta.srs) return '<a class="tok" href="' + esc(state.meta.srs) + '" target="_blank" rel="noopener">' + tok + "</a>";
      return '<span class="tok-plain">' + tok + "</span>";
    });
  }
  function items(key) { return state.gk[key] ? state.gk[key].items : []; }
  function count(key) { return items(key).length; }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "\u2026" : s; }

  function label(v, cls) { return v == null ? DASH : '<span class="sl ' + cls + '">' + esc(v) + "</span>"; }
  function reqPill(v) {
    if (v == null) return DASH;
    if (/verified/i.test(v)) return label(v, "sl-done");
    if (/designed/i.test(v)) return label(v, "sl-work");
    if (/accepted/i.test(v)) return label(v, "sl-conf");
    return label(v, "sl-none");
  }
  function statePill(v) {
    if (v == null) return DASH;
    if (/current|live/i.test(v)) return label(v, "sl-done");
    if (/future|planned/i.test(v)) return label(v, "sl-conf");
    if (/retir|sunset/i.test(v)) return label(v, "sl-stuck");
    return label(v, "sl-none");
  }
  function decisionPill(v) {
    if (v == null) return DASH;
    return label(v, /decided/i.test(v) ? "sl-done" : "sl-warn");
  }
  function approachPill(v) {
    if (v == null) return DASH;
    if (/built|custom|api/i.test(v)) return label(v, "sl-built");
    if (/configured|make/i.test(v)) return label(v, "sl-conf");
    return label(v, "sl-native");
  }
  function priorityPill(v) {
    if (v == null) return DASH;
    return '<span class="pill' + (/could/i.test(v) ? " optional" : "") + '">' + esc(v) + "</span>";
  }

  // ---------- storage ----------
  function storeGet(key) {
    if (IN_MONDAY) return mondaySdk.storage.instance.getItem(key).then(function (r) { return r && r.data ? r.data.value : null; }).catch(function () { return null; });
    try { return Promise.resolve(localStorage.getItem("cwhub_" + key)); } catch (e) { return Promise.resolve(null); }
  }
  function storeSet(key, val) {
    if (IN_MONDAY) return mondaySdk.storage.instance.setItem(key, val).catch(function () {});
    try { localStorage.setItem("cwhub_" + key, val); } catch (e) {}
    return Promise.resolve();
  }

  // ---------- meta ----------
  function parseMeta(description, metaGroup) {
    var meta = {};
    function url(s) { var m = /(https?:\/\/\S+)/.exec(s); return m ? m[1] : null; }
    function absorb(key, val) {
      if (!val) return;
      key = key.toLowerCase().replace(/[\s_-]/g, "");
      if (key === "account" || key === "slug" || key === "instance") meta.account = val.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      else if (key === "client") meta.client = val;
      else if (key.indexOf("solution") === 0) meta.solution = val;
      else if (key.indexOf("srs") === 0) meta.srs = url(val) || val;
    }
    String(description || "").split(/\n+/).forEach(function (line) {
      var m = /^\s*([A-Za-z][A-Za-z ._-]*?)\s*:\s*(.+)$/.exec(line);
      if (m) absorb(m[1], m[2].trim());
    });
    if (metaGroup && metaGroup.items[0]) {
      var it = metaGroup.items[0];
      Object.keys(it.cols).forEach(function (k) { absorb(k, it.cols[k]); });
    }
    return meta;
  }

  // ---------- fetch ----------
  function normalizeApiBoard(board, rawItems) {
    var groups = {};
    rawItems.forEach(function (raw) {
      var g = raw.group ? raw.group.title : "";
      if (!groups[g]) groups[g] = { title: g, items: [] };
      var cols = {};
      (raw.column_values || []).forEach(function (cv) {
        var t = cv.column ? cv.column.title : null;
        if (t && cv.text != null && cv.text !== "") cols[t] = cv.text;
      });
      groups[g].items.push({ id: raw.id, name: raw.name, cols: cols });
    });
    return { name: board.name, description: board.description || "", groups: Object.keys(groups).map(function (k) { return groups[k]; }) };
  }
  function fetchBoard(boardId) {
    var f = "cursor items{id name group{title} column_values{text column{title}}}";
    var q1 = "query($ids:[ID!]){boards(ids:$ids){name description items_page(limit:100){" + f + "}}}";
    var qN = "query($cursor:String!){next_items_page(limit:100,cursor:$cursor){" + f + "}}";
    return mondaySdk.api(q1, { variables: { ids: [String(boardId)] } }).then(function (res) {
      var b = res.data.boards && res.data.boards[0];
      if (!b) throw new Error("Board not found");
      var all = b.items_page.items.slice(), cursor = b.items_page.cursor;
      function next() {
        if (!cursor) return Promise.resolve();
        return mondaySdk.api(qN, { variables: { cursor: cursor } }).then(function (r2) {
          all = all.concat(r2.data.next_items_page.items);
          cursor = r2.data.next_items_page.cursor;
          return next();
        });
      }
      return next().then(function () { return normalizeApiBoard(b, all); });
    });
  }
  function loadBoard(boardId, isRetry) {
    state.loading = true; state.error = null; render();
    fetchBoard(boardId).then(function (board) {
      ingest(board); state.loading = false; render();
    }).catch(function (err) {
      if (!isRetry) return loadBoard(boardId, true);
      state.loading = false; state.error = (err && err.message) || "monday API error"; render();
    });
  }
  function ingest(board) {
    state.board = board;
    var byTitle = {};
    board.groups.forEach(function (g) { byTitle[g.title] = g; });
    state.gk = {};
    Object.keys(GROUPS).forEach(function (k) {
      for (var i = 0; i < GROUPS[k].length; i++) if (byTitle[GROUPS[k][i]]) { state.gk[k] = byTitle[GROUPS[k][i]]; break; }
    });
    state.meta = parseMeta(board.description, state.gk.meta);
    state.registry = {};
    Object.keys(TOKEN_TAB).forEach(function (k) {
      items(k).forEach(function (it) {
        var tok = tokenOf(it.name);
        if (tok) state.registry[tok] = { tab: TOKEN_TAB[k], itemId: it.id };
      });
    });
  }

  // ---------- coverage checks (requirements engineering) ----------
  // Every requirement: tied to who needs it (Dept), where the system meets it
  // (Tools), and how we know it is met (Acceptance). Every dept has at least
  // one requirement; every tool is justified by at least one requirement.
  function toks(s) { return (s || "").match(TOKEN_RE) || []; }
  function computeCoverage() {
    var reqs = items("requirements");
    var noDept = [], noTool = [], noAcc = [], deptHit = {}, toolHit = {};
    reqs.forEach(function (it) {
      var t = tokenOf(it.name); if (!t) return;
      var d = toks(col(it, "Dept", "Depts")), s = toks(col(it, "Tools", "Systems"));
      d.forEach(function (x) { deptHit[x] = true; });
      s.forEach(function (x) { toolHit[x] = true; });
      if (!d.length) noDept.push(t);
      if (!s.length) noTool.push(t);
      if (!col(it, "Acceptance")) noAcc.push(t);
    });
    var deptNoReq = [], toolNoReq = [];
    if (reqs.length) {
      items("users").forEach(function (it) { var t = tokenOf(it.name); if (t && !deptHit[t]) deptNoReq.push(t); });
      items("tools").forEach(function (it) { var t = tokenOf(it.name); if (t && !toolHit[t]) toolNoReq.push(t); });
    }
    var checks = [
      { label: "Requirements with no department", toks: noDept },
      { label: "Requirements not placed in the system", toks: noTool },
      { label: "Requirements without acceptance criteria", toks: noAcc },
      { label: "Departments with no requirements", toks: deptNoReq },
      { label: "Tools no requirement calls for", toks: toolNoReq }
    ];
    return { checks: checks, gaps: checks.reduce(function (a, c) { return a + c.toks.length; }, 0), hasReqs: reqs.length > 0 };
  }
  function renderCoverage() {
    var c = computeCoverage();
    if (!c.hasReqs) return "";
    return '<div class="trace-box"><div class="pk">Coverage checks</div>' + c.checks.map(function (ch) {
      var ok = !ch.toks.length;
      return '<div class="trace-row"><span class="sl ' + (ok ? "sl-done" : "sl-warn") + '">' + (ok ? "Pass" : ch.toks.length) + "</span><span>" +
        ch.label + (ok ? "" : ": " + linkify(ch.toks.join(", "))) + "</span></div>";
    }).join("") + "</div>";
  }

  // ---------- render ----------
  function render() {
    if (state.loading) { root.innerHTML = '<div class="state"><h2>Loading solution\u2026</h2><p>Reading the solution board.</p></div>'; return; }
    if (state.error) {
      root.innerHTML = '<div class="state"><h2>Couldn\u2019t reach the board</h2><p>' + esc(state.error) + ' (retried once)</p><button class="retry" id="retry">Retry</button></div>';
      document.getElementById("retry").onclick = function () { init(); };
      return;
    }
    var hasAny = ["tools", "users", "requirements", "integrations", "decisions", "risks", "diagrams"].some(function (k) { return count(k); });
    if (!hasAny) { root.innerHTML = renderSetup(); return; }
    var body = {
      overview: renderOverview, system: renderSystem, users: renderUsers, requirements: renderRequirements,
      decisions: renderDecisions, risks: renderRisks, diagrams: renderDiagrams
    }[state.activeTab] || renderOverview;
    root.innerHTML = renderHeader() + renderTabs() + body();
    wire();
    if (state.activeTab === "diagrams") wireDiagrams();
    if (state.pendingFlash) {
      var el = root.querySelector('[data-item-id="' + state.pendingFlash + '"]');
      if (el) {
        el.classList.add("flash");
        window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - 90), behavior: "smooth" });
        setTimeout(function () { el.classList.remove("flash"); }, 1900);
      }
      state.pendingFlash = null;
    }
  }

  function renderHeader() {
    var m = state.meta;
    var title = m.account || state.board.name;
    var sub = m.client || (m.account ? state.board.name : "");
    return '<header class="hd"><div><div class="kicker">Solution hub</div><h1>' + esc(title) + "</h1>" +
      (sub ? '<div class="hd-sub">' + esc(sub) + "</div>" : "") + "</div>" +
      '<div class="sum-chips">' +
      (m.srs ? '<a class="btn-sec" href="' + esc(m.srs) + '" target="_blank" rel="noopener">SRS workbook \u2197</a>' : "") +
      (state.demo ? '<span class="demo-tag">static snapshot</span>' : "") + "</div></header>";
  }

  function renderTabs() {
    return '<nav class="tabs" role="tablist">' + TABS.map(function (t) {
      var ct = "";
      if (TAB_COUNTS[t.id]) ct = ' <span class="ct">' + TAB_COUNTS[t.id].reduce(function (a, k) { return a + count(k); }, 0) + "</span>";
      return '<button class="tab" role="tab" aria-selected="' + (state.activeTab === t.id) + '" data-tab="' + t.id + '">' + t.label + ct + "</button>";
    }).join("") + "</nav>";
  }

  function renderOverview() {
    var m = state.meta;
    var h = '<div class="sum">';
    if (m.solution) h += '<p class="solution-lead">' + linkify(m.solution) + "</p>";

    var tools = items("tools");
    if (tools.length) {
      h += '<section><h2>The system <span class="h-sub">' + esc(m.account || "") + "</span></h2><div class=\"sum-chips\">" + tools.map(function (it) {
        return '<button class="comp-chip" data-goto="' + esc(tokenOf(it.name) || "") + '"><span class="cid">' + esc(nameRest(it.name)) + "</span> " + statePill(col(it, "State", "Status")) + "</button>";
      }).join("") + "</div></section>";
    }

    var depts = items("users");
    if (depts.length) {
      h += '<section><h2>Who it serves</h2><div class="needs-grid">' + depts.map(function (it) {
        return '<div class="need-card"><button class="need-dept" data-goto="' + esc(tokenOf(it.name) || "") + '">' + esc(nameRest(it.name)) + "</button>" +
          (col(it, "Users") ? '<div class="need-users">' + esc(col(it, "Users")) + "</div>" : "") +
          '<div class="need-body">' + linkify(col(it, "Needs")) + "</div></div>";
      }).join("") + "</div></section>";
    }

    var reqs = items("requirements");
    var openD = items("decisions").filter(function (it) { return !/decided/i.test(col(it, "Status") || ""); }).length;
    if (reqs.length || openD) {
      var b = { Proposed: 0, Accepted: 0, Designed: 0, Verified: 0 };
      reqs.forEach(function (it) {
        var v = col(it, "Status") || "";
        if (/verified/i.test(v)) b.Verified++; else if (/designed/i.test(v)) b.Designed++; else if (/accepted/i.test(v)) b.Accepted++; else b.Proposed++;
      });
      var cov = computeCoverage();
      h += '<section><h2>Requirements <span class="h-sub">' + reqs.length + " on register</span></h2><div class=\"sum-chips\">" +
        ["Proposed", "Accepted", "Designed", "Verified"].map(function (k) {
          return '<button class="comp-chip" data-goto-tab="requirements">' + reqPill(k) + '<span class="num-ct">' + b[k] + "</span></button>";
        }).join("") +
        (openD ? '<button class="comp-chip warn-chip" data-goto-tab="decisions">' + openD + " open decision" + (openD === 1 ? "" : "s") + "</button>" : "") +
        (cov.gaps ? '<button class="comp-chip warn-chip" data-goto-tab="requirements">' + cov.gaps + " coverage gap" + (cov.gaps === 1 ? "" : "s") + "</button>" : "") +
        "</div></section>";
    }
    return h + "</div>";
  }

  function table(head, rows) {
    return '<div class="tbl-wrap"><table><thead><tr>' + head.map(function (x) { return "<th>" + x + "</th>"; }).join("") + "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }
  function idCell(it) { return '<td><span class="tok-plain">' + esc(tokenOf(it.name) || "") + "</span></td>"; }

  function renderSystem() {
    var tools = items("tools"), ints = items("integrations");
    if (!tools.length && !ints.length) return emptyGroup("Tools");
    var h = "";
    if (tools.length) {
      h += '<h2 class="sec-h">Tools in ' + esc(state.meta.account || "the system") + "</h2>" + table(
        ["ID", "Tool", "Role in the system", "Owner", "State"],
        tools.map(function (it) {
          return '<tr data-item-id="' + esc(it.id) + '">' + idCell(it) + "<td>" + esc(nameRest(it.name)) + "</td>" +
            "<td>" + linkify(col(it, "Role")) + "</td><td>" + dash(col(it, "Owner")) + "</td><td>" + statePill(col(it, "State", "Status")) + "</td></tr>";
        }).join(""));
    }
    if (ints.length) {
      h += '<h2 class="sec-h" style="margin-top:24px">How the tools connect</h2>' + table(
        ["ID", "Integration", "From \u2192 To", "Approach", "Note"],
        ints.map(function (it) {
          return '<tr data-item-id="' + esc(it.id) + '">' + idCell(it) + "<td>" + esc(nameRest(it.name)) + "</td>" +
            "<td>" + linkify(col(it, "Flow", "From → To")) + "</td><td>" + approachPill(col(it, "Approach", "Build Class")) + "</td><td>" + linkify(col(it, "Note")) + "</td></tr>";
        }).join(""));
    }
    return h;
  }

  function renderUsers() {
    var g = items("users");
    if (!g.length) return emptyGroup("Users & Depts");
    return table(["ID", "Department", "Users", "Needs", "Notes"], g.map(function (it) {
      return '<tr data-item-id="' + esc(it.id) + '">' + idCell(it) + "<td>" + esc(nameRest(it.name)) + "</td>" +
        "<td>" + dash(col(it, "Users")) + "</td><td>" + linkify(col(it, "Needs")) + "</td><td>" + linkify(col(it, "Notes")) + "</td></tr>";
    }).join(""));
  }

  function renderRequirements() {
    var g = items("requirements");
    if (!g.length) return emptyGroup("Requirements");
    return renderCoverage() + table(["ID", "Requirement", "Dept", "Tools", "Priority", "Status"], g.map(function (it) {
      var acc = col(it, "Acceptance");
      return '<tr data-item-id="' + esc(it.id) + '">' + idCell(it) +
        "<td>" + esc(nameRest(it.name)) + (acc ? '<div class="notes acc"><b>Accept:</b> ' + linkify(acc) + "</div>" : "") + "</td>" +
        "<td>" + linkify(col(it, "Dept", "Depts")) + "</td><td>" + linkify(col(it, "Tools", "Systems")) + "</td>" +
        "<td>" + priorityPill(col(it, "Priority")) + "</td><td>" + reqPill(col(it, "Status")) + "</td></tr>";
    }).join(""));
  }

  function renderDecisions() {
    var g = items("decisions");
    if (!g.length) return emptyGroup("Open Decisions");
    return table(["ID", "Decision", "Owner", "Affects", "Status"], g.map(function (it) {
      var decided = /decided/i.test(col(it, "Status") || "");
      var res = col(it, "Resolution");
      return '<tr class="' + (decided ? "muted" : "") + '" data-item-id="' + esc(it.id) + '">' + idCell(it) +
        "<td>" + esc(nameRest(it.name)) + (decided && res ? '<div class="notes acc">' + linkify(res) + "</div>" : "") + "</td>" +
        "<td>" + dash(col(it, "Owner")) + "</td><td>" + linkify(col(it, "Affects", "Blocks")) + "</td><td>" + decisionPill(col(it, "Status")) + "</td></tr>";
    }).join(""));
  }

  function renderRisks() {
    var g = items("risks");
    if (!g.length) return emptyGroup("Risks");
    return table(["ID", "Risk", "Note"], g.map(function (it) {
      return '<tr data-item-id="' + esc(it.id) + '">' + idCell(it) + "<td>" + esc(nameRest(it.name)) + "</td><td>" + linkify(col(it, "Note")) + "</td></tr>";
    }).join(""));
  }

  // ---------- diagrams (Mermaid source lives in board items; rendered read-only) ----------
  var DG_THEMES = {
    light: { surface: "#FFFFFF", muted: "#F6F7FB", ink: "#323338", sub: "#676879", line: "#9699A6", primary: "#0073EA", tint: "#CCE5FF", warnBg: "#FFF6D6", warnLine: "#C79A00", bad: "#DF2F4A", dark: false },
    dark: { surface: "#30324E", muted: "#292F4C", ink: "#D5D8DF", sub: "#9699A5", line: "#797E93", primary: "#0073EA", tint: "#1E3A5F", warnBg: "#4A3F12", warnLine: "#FFCB00", bad: "#E06C75", dark: true },
    black: { surface: "#2C2C2C", muted: "#1A1A1A", ink: "#EEEEEE", sub: "#AAAAAA", line: "#8D8D8D", primary: "#0073EA", tint: "#13325A", warnBg: "#3D3510", warnLine: "#FFCB00", bad: "#E06C75", dark: true }
  };
  function pal() { return DG_THEMES[state.theme] || DG_THEMES.light; }
  // House classes: diagram source never carries colors; the hub themes these per monday theme.
  function houseClasses(p) {
    return [
      "classDef person fill:" + p.tint + ",stroke:" + p.primary + ",color:" + p.ink,
      "classDef system fill:" + p.primary + ",stroke:" + p.primary + ",color:#FFFFFF,font-weight:600",
      "classDef external fill:" + p.muted + ",stroke:" + p.line + ",color:" + p.ink,
      "classDef retiring fill:" + p.muted + ",stroke:" + p.bad + ",color:" + p.sub + ",stroke-dasharray:4 3",
      "classDef task fill:" + p.surface + ",stroke:" + p.line + ",color:" + p.ink,
      "classDef auto fill:" + p.tint + ",stroke:" + p.primary + ",color:" + p.ink,
      "classDef gateway fill:" + p.warnBg + ",stroke:" + p.warnLine + ",color:" + p.ink,
      "classDef event fill:" + p.surface + ",stroke:" + p.ink + ",stroke-width:2px,color:" + p.ink,
      "classDef endEvent fill:" + p.surface + ",stroke:" + p.ink + ",stroke-width:4px,color:" + p.ink
    ].join("\n");
  }
  var mmdReady = false, mmdSeq = 0;
  function initMermaid() {
    var p = pal(), font = "Figtree, Helvetica Neue, Arial, sans-serif";
    window.mermaid.initialize({
      startOnLoad: false, securityLevel: "strict", theme: "base", suppressErrorRendering: true, fontFamily: font,
      flowchart: { htmlLabels: true, curve: "basis", padding: 12 },
      sequence: { mirrorActors: false },
      themeVariables: {
        darkMode: p.dark, background: p.surface, fontFamily: font, fontSize: "13px",
        primaryColor: p.surface, primaryTextColor: p.ink, primaryBorderColor: p.line, lineColor: p.line,
        secondaryColor: p.muted, tertiaryColor: p.muted, textColor: p.ink, titleColor: p.ink,
        clusterBkg: p.muted, clusterBorder: p.line, edgeLabelBackground: p.surface,
        actorBkg: p.surface, actorBorder: p.line, actorTextColor: p.ink, actorLineColor: p.line,
        signalColor: p.ink, signalTextColor: p.ink, labelBoxBkgColor: p.muted, labelBoxBorderColor: p.line,
        labelTextColor: p.ink, loopTextColor: p.ink, sequenceNumberColor: p.surface,
        noteBkgColor: p.warnBg, noteBorderColor: p.warnLine, noteTextColor: p.ink,
        activationBkgColor: p.tint, activationBorderColor: p.primary,
        attributeBackgroundColorOdd: p.surface, attributeBackgroundColorEven: p.muted,
        stateBkg: p.surface, stateLabelColor: p.ink, transitionColor: p.line, transitionLabelColor: p.sub
      }
    });
  }
  function prepSource(src) {
    var s = String(src || "").replace(/\r\n/g, "\n").trim();
    if (/^(flowchart|graph)\b/.test(s)) s += "\n" + houseClasses(pal());
    return s;
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function findItem(k, id) { return items(k).filter(function (it) { return it.id === id; })[0]; }
  function dgType(it) { return col(it, "Type") || "Diagram"; }
  function dgSrc(it) { return col(it, "Mermaid", "Source"); }
  function reviewPill(v) { return v == null ? "" : label(v, /reviewed|approved/i.test(v) ? "sl-done" : "sl-none"); }

  function renderDiagrams() {
    var g = items("diagrams");
    if (!g.length) return '<div class="state"><h2>No diagrams yet</h2><p>Add items to the <code>Diagrams</code> group with Mermaid source in the <code>Mermaid</code> column. The hub renders them; it never edits them.</p></div>';
    var types = ["All"];
    g.forEach(function (it) { var t = dgType(it); if (types.indexOf(t) === -1) types.push(t); });
    if (types.indexOf(state.dgFilter) === -1) state.dgFilter = "All";
    var h = '<div class="dg-filter">' + types.map(function (t) {
      var n = t === "All" ? g.length : g.filter(function (it) { return dgType(it) === t; }).length;
      return '<button class="dg-chip" aria-pressed="' + (state.dgFilter === t) + '" data-dg-filter="' + esc(t) + '">' + esc(t) + ' <span class="ct">' + n + "</span></button>";
    }).join("") + "</div>";
    h += '<div class="dg-list">' + g.filter(function (it) { return state.dgFilter === "All" || dgType(it) === state.dgFilter; }).map(function (it) {
      var src = dgSrc(it), open = !!state.dgSource[it.id];
      return '<article class="card dg-card" data-item-id="' + esc(it.id) + '">' +
        '<header class="dg-hd"><div class="dg-title"><span class="tok-plain">' + esc(tokenOf(it.name) || "") + '</span><span class="dg-name">' + esc(nameRest(it.name)) + "</span></div>" +
        '<div class="dg-meta"><span class="pill">' + esc(dgType(it)) + "</span>" +
        (col(it, "Notation") ? '<span class="dg-notation">' + esc(col(it, "Notation")) + "</span>" : "") + reviewPill(col(it, "Status")) + "</div></header>" +
        (col(it, "Purpose") ? '<p class="dg-purpose">' + linkify(col(it, "Purpose")) + "</p>" : "") +
        (col(it, "Traces") ? '<div class="dg-traces"><b>Traces</b> ' + linkify(col(it, "Traces")) + "</div>" : "") +
        '<div class="dg-canvas" data-mmd="' + esc(it.id) + '">' + (src ? '<div class="dg-loading">Rendering\u2026</div>' : '<div class="dg-err">No Mermaid source on this item.</div>') + "</div>" +
        (src ? '<div class="dg-actions"><button class="btn-sec" data-dg-src="' + esc(it.id) + '">' + (open ? "Hide source" : "View source") + '</button><button class="btn-sec" data-dg-copy="' + esc(it.id) + '">Copy source</button></div>' : "") +
        (open && src ? '<pre class="dg-src">' + esc(src) + "</pre>" : "") +
        "</article>";
    }).join("") + "</div>";
    return h;
  }
  function wireDiagrams() {
    root.querySelectorAll("[data-dg-filter]").forEach(function (b) { b.onclick = function () { state.dgFilter = b.getAttribute("data-dg-filter"); render(); }; });
    root.querySelectorAll("[data-dg-src]").forEach(function (b) { b.onclick = function () { var id = b.getAttribute("data-dg-src"); state.dgSource[id] = !state.dgSource[id]; render(); }; });
    root.querySelectorAll("[data-dg-copy]").forEach(function (b) {
      b.onclick = function () {
        var it = findItem("diagrams", b.getAttribute("data-dg-copy")), src = it && dgSrc(it);
        if (!src || !navigator.clipboard) return;
        navigator.clipboard.writeText(src).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy source"; }, 1400); }, function () {});
      };
    });
    renderMermaidAll();
  }
  // rAF never fires in a hidden iframe, so every wait is raced against a timer.
  function frameOrTimeout(ms) {
    return new Promise(function (r) {
      var done = false, go = function () { if (!done) { done = true; r(); } };
      requestAnimationFrame(go); setTimeout(go, ms);
    });
  }
  var layoutSettled = false;
  function whenLayoutReady() {
    if (layoutSettled) return Promise.resolve();
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    var fontsOrTimeout = Promise.race([fonts, new Promise(function (r) { setTimeout(r, 1500); })]);
    return fontsOrTimeout.then(function () { return frameOrTimeout(120); }).then(function () { return frameOrTimeout(120); })
      .then(function () { layoutSettled = true; });
  }
  function svgUsable(svg) {
    var m = /viewBox="([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)"/.exec(svg || "");
    return !!m && parseFloat(m[3]) >= 40 && parseFloat(m[4]) >= 40;
  }
  var TRANSIENT = /getPointAtLength|render tree|suitable point|getBBox|NaN/i;
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function renderOne(src, attempt) {
    var id = "mmd" + (++mmdSeq);
    function cleanup() { var j = document.getElementById("d" + id) || document.getElementById(id); if (j && !j.closest("[data-mmd]")) j.remove(); }
    return window.mermaid.render(id, prepSource(src)).then(function (r) {
      if (svgUsable(r.svg)) return { svg: r.svg };
      cleanup();
      if (attempt < 2) return wait(250).then(function () { return renderOne(src, attempt + 1); });
      return { error: "layout", svg: r.svg };
    }, function (e) {
      cleanup();
      var msg = String((e && e.message) || e).split("\n")[0];
      if (TRANSIENT.test(msg) && attempt < 2) return wait(250).then(function () { return renderOne(src, attempt + 1); });
      return Promise.resolve(window.mermaid.parse(prepSource(src))).then(
        function () { return { error: "render", msg: msg }; },
        function (pe) { return { error: "syntax", msg: String((pe && pe.message) || pe).split("\n")[0] }; });
    });
  }
  var renderGen = 0;
  function renderMermaidAll() {
    var nodes = Array.prototype.slice.call(root.querySelectorAll("[data-mmd]"));
    if (!nodes.length) return;
    if (!window.mermaid) { nodes.forEach(function (n) { n.innerHTML = '<div class="dg-err">Diagram renderer unavailable. Use View source.</div>'; }); return; }
    var gen = ++renderGen;
    whenLayoutReady().then(function () {
      if (gen !== renderGen) return;
      if (!mmdReady) { initMermaid(); mmdReady = true; }
      var chain = Promise.resolve();
      nodes.forEach(function (n) {
        chain = chain.then(function () {
          if (gen !== renderGen || !document.body.contains(n)) return;
          var it = findItem("diagrams", n.getAttribute("data-mmd")), src = it && dgSrc(it);
          if (!src) return;
          var key = state.theme + "|" + it.id + "|" + hash(src);
          if (state.svgCache[key]) { n.innerHTML = state.svgCache[key]; return; }
          return renderOne(src, 0).then(function (res) {
            if (!document.body.contains(n)) return;
            if (!res.error) { state.svgCache[key] = res.svg; n.innerHTML = res.svg; return; }
            if (res.error === "syntax") n.innerHTML = '<div class="dg-err"><b>Mermaid syntax error.</b> ' + esc(res.msg) + "</div>";
            else if (res.error === "layout") n.innerHTML = res.svg;
            else n.innerHTML = '<div class="dg-err"><b>Couldn\u2019t lay out this diagram.</b> ' + esc(res.msg || "") + ' <button class="btn-sec" data-dg-retry>Retry</button></div>';
            var rb = n.querySelector("[data-dg-retry]");
            if (rb) rb.onclick = function () { renderMermaidAll(); };
          });
        });
      });
    });
  }

  function emptyGroup(title) {
    return '<div class="state"><h2>No items yet</h2><p>Add items to the <code>' + esc(title) + "</code> group on this board and they will appear here.</p></div>";
  }
  function renderSetup() {
    return '<div class="state"><h2>Solution board not detected</h2>' +
      "<p>This view expects the CarbonWeb Solution Hub board template. Create these groups (exact titles):</p><ul>" +
      "<li><code>Tools</code>: items T-n, the parts of the system (the monday account first). Role, Owner, State (Current / Future / Retiring)</li>" +
      "<li><code>Users & Depts</code>: items D-n. Users, Needs, Notes</li>" +
      "<li><code>Requirements</code>: items FO001\u2026 Dept (D-n), Tools (T-n), Priority (Must / Should / Could), Acceptance, Status (Proposed / Accepted / Designed / Verified)</li>" +
      "<li><code>Integrations</code>: items INT-n. Flow (T-n \u2192 T-n), Approach (Native / Configured / Built), Note</li>" +
      "<li><code>Open Decisions</code>: items OD-n. Owner, Affects, Status (Open / Decided), Resolution</li>" +
      "<li><code>Risks</code>: items R1\u2026 Note</li>" +
      "<li><code>Diagrams</code>: items DG-n. Type, Notation, Status (Draft / Reviewed), Purpose, Traces, Mermaid (long text: diagram source)</li></ul>" +
      "<p>Board description: <code>account: abc.monday.com</code>, <code>client:</code>, <code>solution:</code>, <code>srs:</code>.</p></div>";
  }

  // ---------- interaction ----------
  function setTab(tab) {
    state.activeTab = tab; storeSet(TAB_KEY, tab); render();
  }
  function goToToken(tok) {
    var e = state.registry[tok]; if (!e) return;
    state.pendingFlash = e.itemId; setTab(e.tab);
  }
  function wire() {
    root.querySelectorAll(".tab").forEach(function (b) { b.onclick = function () { setTab(b.getAttribute("data-tab")); }; });
    root.querySelectorAll("[data-tok]").forEach(function (a) { a.onclick = function (e) { e.preventDefault(); goToToken(a.getAttribute("data-tok")); }; });
    root.querySelectorAll("[data-goto]").forEach(function (b) { b.onclick = function () { goToToken(b.getAttribute("data-goto")); }; });
    root.querySelectorAll("[data-goto-tab]").forEach(function (b) { b.onclick = function () { setTab(b.getAttribute("data-goto-tab")); }; });
  }

  function applyTheme(theme) {
    var t = /black/i.test(theme) ? "black" : /dark/i.test(theme) ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
    if (t !== state.theme) {
      state.theme = t; mmdReady = false;
      if (state.board && !state.loading && state.activeTab === "diagrams") render();
    }
  }

  // ---------- boot ----------
  var refetchTimer = null;
  function loadPrefs() {
    return storeGet(TAB_KEY).then(function (v) {
      if (v && TABS.some(function (t) { return t.id === v; })) state.activeTab = v;
    });
  }
  function init() {
    var settled = false;
    var fallback = setTimeout(function () { if (!settled) { settled = true; bootDemo(); } }, 900);
    if (!mondaySdk) { clearTimeout(fallback); bootDemo(); return; }
    mondaySdk.get("context").then(function (res) {
      var ctx = res && res.data;
      if (!ctx || !ctx.boardId) return;
      settled = true; IN_MONDAY = true; clearTimeout(fallback);
      if (ctx.theme) applyTheme(ctx.theme);
      loadPrefs().then(function () { loadBoard(ctx.boardId); });
      mondaySdk.listen("context", function (r) { if (r.data && r.data.theme) applyTheme(r.data.theme); });
      mondaySdk.listen("events", function () { clearTimeout(refetchTimer); refetchTimer = setTimeout(function () { loadBoard(ctx.boardId); }, 400); });
    }).catch(function () {});
  }
  function bootDemo() {
    state.demo = true;
    applyTheme("light");
    loadPrefs().then(function () { ingest(window.CW_CONTENT); state.loading = false; render(); });
    var sw = document.createElement("div");
    sw.style.cssText = "position:fixed;right:14px;bottom:12px;display:flex;gap:6px;opacity:.7;z-index:9";
    ["light", "dark", "black"].forEach(function (t) {
      var b = document.createElement("button");
      b.textContent = t;
      b.style.cssText = "font:500 11px 'Figtree',sans-serif;border:1px solid var(--line2);background:var(--surface);color:var(--text2);border-radius:4px;padding:4px 10px;cursor:pointer";
      b.onclick = function () { applyTheme(t); };
      sw.appendChild(b);
    });
    document.body.appendChild(sw);
  }
  init();
})();
