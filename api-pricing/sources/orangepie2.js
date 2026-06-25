/**
 * orangepie2.js — 橙子派 API 中转站
 * 定价单位: 橘子 (1 橘子 = ¥0.13699 ≈ $0.01889)
 * 基础单价: 1.0 橘子/1K tokens
 */
const { createFetcher } = require("./_oneapi-base");
// Override: base is 1.0 橘子/1K, not 0.002 USD/1K

const https = require("https");
const BASE_PER_1K = 0.2; // 橘子 (1.625 × 0.2 × 1000 = 325)
const JUZI_TO_RMB = 0.13699; // 1 橘子 = ¥0.13699
const TIMEOUT_MS = 30_000;

function round(v, d = 6) { return Math.round(v * 10 ** d) / 10 ** d; }
function buildVendorMap(vendors) { const m = {}; for (const v of vendors) { if (v.id != null && v.name && !m[v.id]) m[v.id] = v.name; } return m; }

async function fetch() {
  return new Promise((resolve, reject) => {
    https.get("https://i.orangepie.org/api/pricing", { timeout: TIMEOUT_MS }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try {
          const raw = JSON.parse(d);
          if (raw.success !== true) throw new Error("API success ≠ true");
          const vMap = buildVendorMap(raw.vendors || []);
          const uG = raw.usable_group || {};
          const missing = new Set();

          const models = raw.data.map(m => {
            const isToken = m.quota_type === 0;
            const groups = [];
            for (const gName of m.enable_groups || []) {
              const gr = raw.group_ratio[gName];
              if (gr === undefined) { missing.add(gName); continue; }
              if (isToken) {
                const inputJz = m.model_ratio * gr * BASE_PER_1K * 1000; // 橘子/1M
                groups.push({
                  name: gName, label: uG[gName] || null,
                  input_per_1m: round(inputJz * JUZI_TO_RMB),
                  output_per_1m: round(inputJz * m.completion_ratio * JUZI_TO_RMB),
                  cache_per_1m: m.cache_ratio != null ? round(inputJz * m.cache_ratio * JUZI_TO_RMB) : null,
                  cache_write_per_1m: m.create_cache_ratio != null ? round(inputJz * m.create_cache_ratio * JUZI_TO_RMB) : null,
                });
              } else {
                groups.push({
                  name: gName, label: uG[gName] || null,
                  price_per_request: round(m.model_price * gr * 100 * JUZI_TO_RMB),
                });
              }
            }
            return { name: m.model_name, vendor: vMap[m.vendor_id] || "Unknown", quota_type: isToken ? "token" : "per_request", groups, supported_endpoints: m.supported_endpoint_types || [] };
          });

          resolve({ source: "orangepie.org", display_name: "橙子派", base_currency: "USD", _missing_group_ratios: [...missing].sort(), models });
        } catch (e) { reject(e); }
      });
    }).on("timeout", () => reject(new Error("timeout"))).on("error", e => reject(e));
  });
}

module.exports = { fetch };
