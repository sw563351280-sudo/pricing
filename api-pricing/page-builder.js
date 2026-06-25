/**
 * page-builder.js — 从 merged.json 生成多源对比 HTML 页面
 *
 * 用法: node page-builder.js
 * 输出: ../index.html (仓库根目录，GitHub Pages 自动 serve)
 */

const fs = require("fs");
const path = require("path");

const MERGED_PATH = path.join(__dirname, "data", "merged.json");
const OUTPUT_PATH = path.join(__dirname, "..", "index.html");

const data = JSON.parse(fs.readFileSync(MERGED_PATH, "utf-8"));
const dataJSON = JSON.stringify(data);

function esc(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const parts = [];

// ═══════════════════════════════════════════════════════════
// HTML head + CSS
// ═══════════════════════════════════════════════════════════

parts.push(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>API 中转站模型定价对比</title>
<style>
  :root {
    --bg: #0d1117; --surface: #161b22; --border: #30363d;
    --text: #c9d1d9; --dim: #8b949e; --accent: #58a6ff;
    --green: #3fb950; --orange: #d2991d; --red: #f85149;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); line-height:1.5; min-height:100vh; }
  header { position:sticky; top:0; z-index:10; background: var(--surface); border-bottom:1px solid var(--border); padding:14px 24px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
  header .title { font-size:18px; font-weight:700; }
  header .meta { color: var(--dim); font-size:12px; }

  /* tabs */
  .tab-bar { display:flex; gap:0; background: var(--surface); border-bottom:1px solid var(--border); padding:0 24px; }
  .tab-btn { padding:10px 20px; border:none; background:none; color: var(--dim); font-size:14px; cursor:pointer; border-bottom:2px solid transparent; transition: all .15s; }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

  .tab-content { display:none; }
  .tab-content.active { display:block; }

  /* controls */
  .controls { display:flex; gap:10px; flex-wrap:wrap; padding:14px 24px; align-items:center; }
  .controls input, .controls select { background: var(--bg); color: var(--text); border:1px solid var(--border); padding:6px 12px; border-radius:6px; font-size:13px; }
  .controls input { flex:1; min-width:200px; }
  .controls input::placeholder { color: var(--dim); }
  .controls select { min-width:130px; cursor:pointer; }

  /* badges */
  .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; }
  .badge-token { background: #1f3a5f; color: #58a6ff; }
  .badge-request { background: #3d2e1a; color: #d2991d; }
  .source-tag { display:inline-block; padding:1px 6px; border-radius:4px; font-size:10px; background: #1a2332; color: var(--accent); margin-right:3px; text-transform:uppercase; letter-spacing:.5px; }

  /* tables */
  table { width:100%; border-collapse:collapse; font-size:13px; }
  thead th { position:sticky; top:0; z-index:5; background: var(--surface); color: var(--dim); font-weight:600; padding:10px 12px; text-align:left; border-bottom:2px solid var(--border); white-space:nowrap; cursor:pointer; user-select:none; }
  thead th:hover { color: var(--text); }
  th .si { margin-left:4px; font-size:10px; }
  td { padding:8px 12px; border-bottom:1px solid var(--border); vertical-align:top; }
  .highlight { color: var(--green); font-weight:600; }
  .price-input { color: var(--accent); font-weight:600; }
  .price-output { color: var(--green); font-weight:600; }
  .price-cache { color: var(--dim); }
  .price-req { color: var(--orange); font-weight:600; }
  .model-link { color: var(--accent); font-weight:600; cursor:pointer; }
  .model-link:hover { text-decoration:underline; }
  .vendor-text { color: var(--dim); font-size:12px; }

  /* compare table */
  .cmp-table { margin:0 24px; overflow-x:auto; }
  .cmp-table td, .cmp-table th { white-space:nowrap; }
  .cmp-best { color: var(--green); font-weight:700; }

  .count-bar { color: var(--dim); font-size:12px; padding:8px 24px; }
  .footer { color: var(--dim); font-size:12px; padding:20px 24px; text-align:center; }
  .no-result { text-align:center; padding:40px; color: var(--dim); }

  /* suggestion dropdown */
  .suggest-wrap { position:relative; flex:1; min-width:250px; }
  .suggest-list { position:absolute; top:100%; left:0; right:0; background:var(--surface); border:1px solid var(--border); border-top:none; border-radius:0 0 6px 6px; max-height:200px; overflow-y:auto; z-index:20; display:none; }
  .suggest-list .item { padding:8px 12px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--border); }
  .suggest-list .item:hover { background: rgba(88,166,255,0.08); }
  .suggest-list .item .src { color:var(--dim); font-size:11px; margin-left:6px; }

  /* group cards in browse view */
  .group-cards { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
  .gcard { background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:6px 10px; font-size:11px; line-height:1.4; }
  .gcard .gn { font-weight:600; color:var(--text); }
  tr:hover td { background: rgba(88,166,255,0.03); }
</style>
</head>
<body>`);

// ═══════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════

parts.push(`<header>
  <div>
    <div class="title">API 中转站模型定价对比</div>
    <div class="meta">数据源: ${data.sources.map((s) => s.display_name).join(", ")} · 共 ${data.models.length} 个模型条目 · 更新时间: ${esc(data.generated_at)}</div>
  </div>
</header>

<div class="tab-bar">
  <button class="tab-btn active" onclick="switchTab('compare')">📊 价格对比</button>
  <button class="tab-btn" onclick="switchTab('browse')">📋 全部模型</button>
</div>`);

// ═══════════════════════════════════════════════════════════
// Tab 1: Compare View
// ═══════════════════════════════════════════════════════════

parts.push(`<div id="tab-compare" class="tab-content active">
<div class="controls">
  <div class="suggest-wrap">
    <input type="text" id="cmpSearch" placeholder="输入模型名搜索对比…" oninput="cmpSuggest()" onfocus="cmpSuggest()" autocomplete="off">
    <div class="suggest-list" id="cmpSuggestList"></div>
  </div>
</div>
<div class="count-bar" id="cmpBar"></div>
<div class="cmp-table"><table id="cmpTable"></table></div>
<div class="no-result" id="cmpNoResult" style="display:none">输入模型名开始对比，或从下拉建议中选择</div>
</div>`);

// ═══════════════════════════════════════════════════════════
// Tab 2: Browse View
// ═══════════════════════════════════════════════════════════

parts.push(`<div id="tab-browse" class="tab-content">
<div class="controls">
  <input type="text" id="browseSearch" placeholder="搜索模型名…" oninput="browseRender()">
  <select id="browseSource" onchange="browseRender()"><option value="">全部数据源</option></select>
  <select id="browseVendor" onchange="browseRender()"><option value="">全部厂商</option></select>
  <select id="browseType" onchange="browseRender()"><option value="">全部计费方式</option><option value="token">Token</option><option value="per_request">按次</option></select>
  <select id="browseGroup" onchange="browseRender()"><option value="">全部分组</option></select>
</div>
<div class="count-bar" id="browseCount"></div>
<div style="overflow-x:auto; padding:0 24px;">
<table>
<thead><tr>
  <th onclick="browseSort('source')">数据源 <span class="si" id="bsi-source"></span></th>
  <th onclick="browseSort('name')">模型 <span class="si" id="bsi-name">▲</span></th>
  <th onclick="browseSort('vendor')">厂商 <span class="si" id="bsi-vendor"></span></th>
  <th onclick="browseSort('type')">计费 <span class="si" id="bsi-type"></span></th>
  <th onclick="browseSort('groups')">分组数 <span class="si" id="bsi-groups"></span></th>
  <th>端点</th>
</tr></thead>
<tbody id="browseTbody"></tbody>
</table>
</div>
<div class="no-result" id="browseNoResult" style="display:none">没有匹配的结果</div>
<div class="footer">共 <span id="browseTotal">0</span> 个模型条目</div>
</div>`);

// ═══════════════════════════════════════════════════════════
// JavaScript
// ═══════════════════════════════════════════════════════════

parts.push(`<script>
var D = ${dataJSON};

// ── Utilities ──
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fm(n) { if (n == null) return "—"; return n < 0.01 ? n.toFixed(4) : n.toFixed(2); }

// ── Tab switching ──
function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.toggle("active", b.textContent.indexOf(name) >= 0 || (name==="compare" && b.textContent.indexOf("对比")>=0) || (name==="browse" && b.textContent.indexOf("全部")>=0)); });
  // simpler: just use the buttons' onclick
  var btns = document.querySelectorAll(".tab-btn");
  btns[0].classList.toggle("active", name === "compare");
  btns[1].classList.toggle("active", name === "browse");
  document.getElementById("tab-compare").classList.toggle("active", name === "compare");
  document.getElementById("tab-browse").classList.toggle("active", name === "browse");
}

// ═══════════════════════════════════════════════════════════
// COMPARE TAB
// ═══════════════════════════════════════════════════════════

// Build autocomplete index: normalized_name → all entries
var cmpIndex = {};
D.models.forEach(function(m) {
  var n = m.normalized_name;
  if (!cmpIndex[n]) cmpIndex[n] = [];
  cmpIndex[n].push(m);
});

function cmpSuggest() {
  var q = document.getElementById("cmpSearch").value.toLowerCase().trim();
  var list = document.getElementById("cmpSuggestList");
  if (q.length < 1) { list.style.display = "none"; return; }

  var matches = Object.keys(cmpIndex).filter(function(k) { return k.indexOf(q) !== -1; }).slice(0, 15);
  if (!matches.length) { list.style.display = "none"; return; }

  list.innerHTML = matches.map(function(k) {
    var sources = [...new Set(cmpIndex[k].map(function(m) { return m.display_name; }))];
    return '<div class="item" onclick="cmpSelect(' + JSON.stringify(k) + ')">' + esc(k) + '<span class="src">(' + sources.join(", ") + ')</span></div>';
  }).join("");
  list.style.display = "block";
}

function cmpSelect(normName) {
  document.getElementById("cmpSearch").value = normName;
  document.getElementById("cmpSuggestList").style.display = "none";
  cmpRender(normName);
}

// Hide suggestions when clicking outside
document.addEventListener("click", function(e) {
  if (!e.target.closest(".suggest-wrap")) document.getElementById("cmpSuggestList").style.display = "none";
});

function cmpRender(normName) {
  var entries = cmpIndex[normName] || [];
  var bar = document.getElementById("cmpBar");
  var table = document.getElementById("cmpTable");
  var noRes = document.getElementById("cmpNoResult");

  if (!normName || !entries.length) {
    bar.textContent = "";
    table.innerHTML = "";
    noRes.style.display = "block";
    return;
  }
  noRes.style.display = "none";
  bar.textContent = entries.length + " 个条目 (来自 " + [...new Set(entries.map(function(e) { return e.display_name; }))].join(", ") + ")";

  // Collect all groups across all entries, find min prices
  var allRows = []; // { source, display_name, group_name, g }
  entries.forEach(function(e) {
    e.groups.forEach(function(g) {
      allRows.push({ source: e.source, display_name: e.display_name, group_name: g.name, g: g, quota_type: e.quota_type });
    });
  });

  if (entries[0].quota_type === "token") {
    var minInput = Infinity, minOutput = Infinity, minCache = Infinity;
    allRows.forEach(function(r) {
      if (r.g.input_per_1m != null && r.g.input_per_1m < minInput) minInput = r.g.input_per_1m;
      if (r.g.output_per_1m != null && r.g.output_per_1m < minOutput) minOutput = r.g.output_per_1m;
      if (r.g.cache_per_1m != null && r.g.cache_per_1m < minCache) minCache = r.g.cache_per_1m;
    });

    table.innerHTML = '<thead><tr>' +
      '<th>数据源</th><th>分组</th>' +
      '<th>输入 $/1M</th><th>输出 $/1M</th><th>缓存 $/1M</th>' +
      (allRows.some(function(r) { return r.g.cache_write_per_1m != null; }) ? '<th>缓存写入 $/1M</th>' : '') +
      '</tr></thead><tbody>' +
      allRows.map(function(r) {
        var cls = function(v, best) { return v != null && v === best ? "cmp-best" : ""; };
        return '<tr>' +
          '<td><span class="source-tag">' + esc(r.display_name) + '</span></td>' +
          '<td><strong>' + esc(r.group_name) + '</strong></td>' +
          '<td class="' + cls(r.g.input_per_1m, minInput) + '">$' + fm(r.g.input_per_1m) + '</td>' +
          '<td class="' + cls(r.g.output_per_1m, minOutput) + '">$' + fm(r.g.output_per_1m) + '</td>' +
          '<td class="' + cls(r.g.cache_per_1m, minCache) + '">$' + fm(r.g.cache_per_1m) + '</td>' +
          (allRows.some(function(rr) { return rr.g.cache_write_per_1m != null; }) ? '<td>$' + fm(r.g.cache_write_per_1m) + '</td>' : '') +
          '</tr>';
      }).join("") + '</tbody>';
  } else {
    // per-request: just show price_per_request
    var minReq = Infinity;
    allRows.forEach(function(r) {
      if (r.g.price_per_request != null && r.g.price_per_request < minReq) minReq = r.g.price_per_request;
    });

    table.innerHTML = '<thead><tr><th>数据源</th><th>分组</th><th>价格 $/次</th></tr></thead><tbody>' +
      allRows.map(function(r) {
        var cls = r.g.price_per_request != null && r.g.price_per_request === minReq ? "cmp-best" : "";
        return '<tr>' +
          '<td><span class="source-tag">' + esc(r.display_name) + '</span></td>' +
          '<td><strong>' + esc(r.group_name) + '</strong></td>' +
          '<td class="' + cls + '">$' + fm(r.g.price_per_request) + '</td>' +
          '</tr>';
      }).join("") + '</tbody>';
  }
}

// Also render on Enter key
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("cmpSearch").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      var q = this.value.toLowerCase().trim();
      if (cmpIndex[q]) cmpSelect(q);
      else {
        // pick first match
        var keys = Object.keys(cmpIndex).filter(function(k) { return k.indexOf(q) !== -1; });
        if (keys.length) cmpSelect(keys[0]);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════
// BROWSE TAB
// ═══════════════════════════════════════════════════════════

var browseSortKey = "name";
var browseSortAsc = true;

(function() {
  // Fill select dropdowns
  var srcs = [...new Set(D.models.map(function(m) { return m.source; }))].sort();
  var sSel = document.getElementById("browseSource");
  srcs.forEach(function(v) { var o = document.createElement("option"); o.value = v; o.textContent = v; sSel.appendChild(o); });

  var vends = [...new Set(D.models.map(function(m) { return m.vendor; }))].sort();
  var vSel = document.getElementById("browseVendor");
  vends.forEach(function(v) { var o = document.createElement("option"); o.value = v; o.textContent = v; vSel.appendChild(o); });

  var grps = new Set();
  D.models.forEach(function(m) { m.groups.forEach(function(g) { grps.add(g.name); }); });
  var gSel = document.getElementById("browseGroup");
  Array.from(grps).sort().forEach(function(v) { var o = document.createElement("option"); o.value = v; o.textContent = v; gSel.appendChild(o); });
})();

function browseSort(key) {
  if (browseSortKey === key) browseSortAsc = !browseSortAsc; else { browseSortKey = key; browseSortAsc = true; }
  document.querySelectorAll("#tab-browse .si").forEach(function(el) { el.textContent = ""; });
  var el = document.getElementById("bsi-" + key); if (el) el.textContent = browseSortAsc ? "▲" : "▼";
  browseRender();
}

function browseRender() {
  var search = document.getElementById("browseSearch").value.toLowerCase();
  var sf = document.getElementById("browseSource").value;
  var vf = document.getElementById("browseVendor").value;
  var tf = document.getElementById("browseType").value;
  var gf = document.getElementById("browseGroup").value;

  var models = D.models.filter(function(m) {
    if (search && m.name.toLowerCase().indexOf(search) === -1 && m.normalized_name.indexOf(search) === -1) return false;
    if (sf && m.source !== sf) return false;
    if (vf && m.vendor !== vf) return false;
    if (tf && m.quota_type !== tf) return false;
    if (gf && !m.groups.some(function(g) { return g.name === gf; })) return false;
    return true;
  });

  models.sort(function(a, b) {
    var va, vb;
    switch (browseSortKey) {
      case "source": va = a.display_name; vb = b.display_name; break;
      case "name":   va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
      case "vendor": va = a.vendor.toLowerCase(); vb = b.vendor.toLowerCase(); break;
      case "type":   va = a.quota_type; vb = b.quota_type; break;
      case "groups": va = a.groups.length; vb = b.groups.length; break;
      default: va = 0; vb = 0;
    }
    if (typeof va === "string") return browseSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return browseSortAsc ? va - vb : vb - va;
  });

  document.getElementById("browseTotal").textContent = models.length;
  document.getElementById("browseCount").textContent = "显示 " + models.length + " / " + D.models.length + " 个模型条目";
  document.getElementById("browseNoResult").style.display = models.length ? "none" : "block";

  document.getElementById("browseTbody").innerHTML = models.map(function(m) {
    var badge = m.quota_type === "token" ? '<span class="badge badge-token">Token</span>' : '<span class="badge badge-request">按次</span>';
    var gc = m.groups.map(function(g) {
      if (m.quota_type === "token") {
        return '<div class="gcard"><span class="gn">' + esc(g.name) + '</span> 入:$' + fm(g.input_per_1m) + ' 出:$' + fm(g.output_per_1m) + (g.cache_per_1m != null ? ' 缓存:$' + fm(g.cache_per_1m) : '') + '</div>';
      } else {
        return '<div class="gcard"><span class="gn">' + esc(g.name) + '</span> $' + fm(g.price_per_request) + '/次</div>';
      }
    }).join("");
    var eps = m.supported_endpoints.map(function(e) { return '<span class="source-tag" style="background:var(--surface);color:var(--dim);">' + esc(e) + '</span>'; }).join("");

    return '<tr>' +
      '<td><span class="source-tag">' + esc(m.display_name) + '</span></td>' +
	      '<td><span class="model-link" data-cmp="' + esc(m.normalized_name) + '">' + esc(m.name) + '</span></td>' +
      '<td><span class="vendor-text">' + esc(m.vendor) + '</span></td>' +
      '<td>' + badge + '</td>' +
      '<td><div class="group-cards">' + gc + '</div></td>' +
      '<td>' + eps + '</td>' +
      '</tr>';
  }).join("");
}

// Click delegation: clicking model name jumps to compare view
document.getElementById("browseTbody").addEventListener("click", function(e) {
  var link = e.target.closest(".model-link");
  if (!link) return;
  var name = link.getAttribute("data-cmp");
  if (!name) return;
  switchTab("compare");
  document.getElementById("cmpSearch").value = name;
  cmpRender(name);
});

// Initial render
browseRender();
</script>
</body>
</html>`);

// ═══════════════════════════════════════════════════════════
// Write
// ═══════════════════════════════════════════════════════════

fs.writeFileSync(OUTPUT_PATH, parts.join("\n"), "utf-8");
console.log("✔ 已生成 " + OUTPUT_PATH + " (" + (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1) + " KB)");
