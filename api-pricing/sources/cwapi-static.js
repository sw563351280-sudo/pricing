/**
 * cwapi-static.js — 🦔刺猬 API 中转站 (静态数据)
 *
 * API 需要登录，无法自动抓取。
 * 数据从浏览器手动导出后存为 api-pricing/data/cwapi-raw.json。
 * 更新方式：登录 cc.cwapi.vip → F12 Console 粘贴：
 *   fetch('/api/pricing',{credentials:'include'}).then(r=>r.json()).then(d=>{const b=document.createElement('a');b.href=URL.createObjectURL(new Blob([JSON.stringify(d)]));b.download='cwapi-raw.json';b.click()})
 * 下载后替换 data/cwapi-raw.json，重新运行 fetch-all.js。
 */

const fs = require("fs");
const path = require("path");

const BASE_PRICE_PER_1K = 0.002;

function round(v, d = 6) { return Math.round(v * 10 ** d) / 10 ** d; }

function buildVendorMap(vendors) {
  const map = {};
  for (const v of vendors) {
    if (v.id != null && v.name && !map[v.id]) map[v.id] = v.name;
  }
  return map;
}

async function fetch() {
  const rawPath = path.join(__dirname, "..", "data", "cwapi-raw.json");
  if (!fs.existsSync(rawPath)) throw new Error("cwapi-raw.json not found — export from browser first");

  const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

  if (raw.success !== true) throw new Error("Invalid cwapi-raw.json: success ≠ true");
  if (!Array.isArray(raw.data)) throw new Error("Missing data array");
  if (!raw.group_ratio) throw new Error("Missing group_ratio");

  const vendorMap = buildVendorMap(raw.vendors || []);
  const usableGroup = raw.usable_group || {};
  const missingGroups = new Set();

  const models = raw.data.map((m) => {
    const isToken = m.quota_type === 0;
    const groups = [];
    for (const gName of m.enable_groups || []) {
      const gr = raw.group_ratio[gName];
      if (gr === undefined) { missingGroups.add(gName); continue; }

      if (isToken && !m.billing_expr) {
        // 标准 token 计费
        const input = m.model_ratio * gr * BASE_PRICE_PER_1K * 1000;
        groups.push({
          name: gName,
          label: usableGroup[gName] || null,
          input_per_1m: round(input),
          output_per_1m: round(input * m.completion_ratio),
          cache_per_1m: m.cache_ratio != null ? round(input * m.cache_ratio) : null,
          cache_write_per_1m: m.create_cache_ratio != null ? round(input * m.create_cache_ratio) : null,
        });
      } else if (isToken && m.billing_expr) {
        // 阶梯计费，展示为按次（因为公式复杂无法统一）
        groups.push({
          name: gName,
          label: usableGroup[gName] || null,
          price_per_request: round(m.model_ratio * gr * BASE_PRICE_PER_1K * 1000),
        });
      } else {
        groups.push({
          name: gName,
          label: usableGroup[gName] || null,
          price_per_request: round(m.model_price * gr),
        });
      }
    }

    return {
      name: m.model_name,
      vendor: vendorMap[m.vendor_id] || "Unknown",
      quota_type: isToken && !m.billing_expr ? "token" : "per_request",
      groups,
      supported_endpoints: m.supported_endpoint_types || [],
    };
  });

  const groupMeta = {};
  for (const [k, v] of Object.entries(raw.group_ratio)) {
    groupMeta[k] = { ratio: v, label: usableGroup[k] || null };
  }

  return {
    source: "cc.cwapi.vip",
    display_name: "刺猬",
    base_currency: "USD",
    pricing_version: raw.pricing_version || null,
    group_meta: groupMeta,
    _missing_group_ratios: [...missingGroups].sort(),
    models,
  };
}

module.exports = { fetch };
