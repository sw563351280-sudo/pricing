/**
 * treeapi-static.js — Tree API 中转站 (静态数据)
 * 更新方式: 登录后从 Network 导出 pricing 请求的 Response → data/treapi-raw.json
 */
const fs = require("fs");
const path = require("path");
const BASE_PRICE_PER_1K = 0.002;
function round(v, d = 6) { return Math.round(v * 10 ** d) / 10 ** d; }
function buildVendorMap(vendors) { const m = {}; for (const v of vendors) { if (v.id != null && v.name && !m[v.id]) m[v.id] = v.name; } return m; }

async function fetch() {
  const rawPath = path.join(__dirname, "..", "data", "treapi-raw.json");
  if (!fs.existsSync(rawPath)) throw new Error("treapi-raw.json not found");
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8"));
  if (raw.success !== true) throw new Error("Invalid data");
  const vMap = buildVendorMap(raw.vendors || []);
  const uG = raw.usable_group || {};
  const missing = new Set();

  const models = raw.data.map((m) => {
    const isToken = m.quota_type === 0;
    const groups = [];
    for (const gName of m.enable_groups || []) {
      const gr = raw.group_ratio[gName];
      if (gr === undefined) { missing.add(gName); continue; }
      if (isToken && !m.billing_expr) {
        const input = m.model_ratio * gr * BASE_PRICE_PER_1K * 1000;
        groups.push({ name: gName, label: uG[gName] || null, input_per_1m: round(input), output_per_1m: round(input * m.completion_ratio), cache_per_1m: m.cache_ratio != null ? round(input * m.cache_ratio) : null, cache_write_per_1m: m.create_cache_ratio != null ? round(input * m.create_cache_ratio) : null });
      } else if (isToken && m.billing_expr) {
        groups.push({ name: gName, label: uG[gName] || null, price_per_request: round(m.model_ratio * gr * BASE_PRICE_PER_1K * 1000) });
      } else {
        groups.push({ name: gName, label: uG[gName] || null, price_per_request: round(m.model_price * gr) });
      }
    }
    return { name: m.model_name, vendor: vMap[m.vendor_id] || "Unknown", quota_type: isToken && !m.billing_expr ? "token" : "per_request", groups, supported_endpoints: m.supported_endpoint_types || [] };
  });

  return { source: "treeapi.cc", display_name: "Tree", base_currency: "USD", _missing_group_ratios: [...missing].sort(), models };
}
module.exports = { fetch };
