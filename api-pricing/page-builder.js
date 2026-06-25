/**
 * page-builder.js — 从 merged.json 生成多源对比 HTML 页面
 *
 * 用法: node page-builder.js
 * 输出: ../index.html (GitHub Pages 自动 serve)
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
  .model-link { color: var(--accent); font-weight:600; }
  .vendor-text { color: var(--dim); font-size:12px; }

  .count-bar { color: var(--dim); font-size:12px; padding:8px 24px; }
  .footer { color: var(--dim); font-size:12px; padding:20px 24px; text-align:center; }
  .no-result { text-align:center; padding:40px; color: var(--dim); }

  /* group cards */
  .group-cards { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
  .gcard { background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:6px 10px; font-size:11px; line-height:1.4; }
  .gcard .gn { font-weight:600; color:var(--text); }
  tr:hover td { background: rgba(88,166,255,0.03); }

  /* ── 手机端适配 ── */
  @media (max-width: 768px) {
    header { padding:10px 12px; }
    header .title { font-size:16px; }
    header .meta { font-size:11px; display:none; }
    .controls { padding:10px 8px; gap:6px; }
    .controls input, .controls select { font-size:12px; padding:5px 8px; }
    .controls input { min-width:140px; }
    .controls select { min-width:100px; }
    table { font-size:11px; }
    thead th { padding:6px 8px; font-size:10px; }
    td { padding:6px 8px; }
    .group-cards { gap:4px; }
    .gcard { padding:4px 6px; font-size:10px; }
    .detail-grid { grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:6px; }
    .detail-card { padding:8px; }
    .count-bar { font-size:11px; padding:6px 12px; }
    .footer { font-size:11px; padding:12px; }
    .source-tag { font-size:9px; }
    .badge { font-size:10px; padding:1px 6px; }
  }
  @media (max-width: 480px) {
    table { font-size:10px; }
    thead th { padding:4px 6px; font-size:9px; }
    td { padding:4px 6px; }
    .detail-grid { grid-template-columns:1fr; }
    .gcard { font-size:9px; }
    .controls { flex-direction:column; }
    .controls input, .controls select { width:100%; }
    .suggest-wrap { width:100%; }
  }
</style>
</head>
<body>`);

// ═══════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════

parts.push(`<header>
  <div>
    <div class="title">API 中转站模型定价</div>
    <div class="meta">数据源: ${data.sources.map((s) => s.display_name).join(", ")} · 共 ${data.models.length} 个模型条目 · 更新时间: ${esc(data.generated_at)}</div>
  </div>
</header>`);


parts.push(`<div id="tab-browse">
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

var browseSortKey = "name";
var browseSortAsc = true;

(function() {
  // Fill select dropdowns
  var srcMap = {}; D.models.forEach(function(m) { srcMap[m.source] = m.display_name; });
  var sSel = document.getElementById("browseSource");
  Object.keys(srcMap).sort().forEach(function(k) { var o = document.createElement("option"); o.value = k; o.textContent = srcMap[k]; sSel.appendChild(o); });

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
console.log("  双击即可用浏览器打开，或运行: start " + OUTPUT_PATH);
