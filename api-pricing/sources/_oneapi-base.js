/**
 * _oneapi-base.js — 通用 "OneAPI" 格式定价抓取
 *
 * 适用于使用相同 API 结构的中转站:
 *   GET {api_url}/api/pricing → { success, data[], group_ratio{}, vendors[], usable_group{} }
 *
 * 价格公式:
 *   quota_type=0 (token): 输入 $/1M = model_ratio × group_ratio × 0.002 × 1000
 *   quota_type=1 (按次):  单价 = model_price × group_ratio
 *
 * 用法: 见 msuicode.js / dzzi.js 等
 */

const https = require("https");

const BASE_PRICE_PER_1K = 0.002;
const TIMEOUT_MS = 30_000;

function httpGet(url, insecure) {
  const opts = { timeout: TIMEOUT_MS };
  if (insecure) opts.rejectUnauthorized = false;
  return new Promise((resolve, reject) => {
    const req = https.get(url, opts, (res) => {
      if (res.statusCode !== 200) {
        req.destroy();
        return reject(new Error(`HTTP ${res.statusCode} (expected 200)`));
      }
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("JSON parse failed: " + e.message)); }
      });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.on("error", (e) => reject(new Error("Network error: " + e.message)));
  });
}

function round(v, d = 6) {
  return Math.round(v * 10 ** d) / 10 ** d;
}

function calcTokenGroups(model, groupRatio, usableGroup, missing) {
  const groups = [];
  for (const gName of model.enable_groups) {
    const gr = groupRatio[gName];
    if (gr === undefined) { missing.add(gName); continue; }
    const input = model.model_ratio * gr * BASE_PRICE_PER_1K * 1000;
    groups.push({
      name: gName,
      label: usableGroup[gName] || null,
      input_per_1m: round(input),
      output_per_1m: round(input * model.completion_ratio),
      cache_per_1m: model.cache_ratio != null ? round(input * model.cache_ratio) : null,
      cache_write_per_1m: model.create_cache_ratio != null ? round(input * model.create_cache_ratio) : null,
    });
  }
  return groups;
}

function calcPerReqGroups(model, groupRatio, usableGroup, missing) {
  const groups = [];
  for (const gName of model.enable_groups) {
    const gr = groupRatio[gName];
    if (gr === undefined) { missing.add(gName); continue; }
    groups.push({
      name: gName,
      label: usableGroup[gName] || null,
      price_per_request: round(model.model_price * gr),
    });
  }
  return groups;
}

function buildVendorMap(vendors) {
  const map = {};
  for (const v of vendors) {
    if (v.id != null && v.name && !map[v.id]) map[v.id] = v.name;
  }
  return map;
}

/**
 * 创建 fetch 函数
 * @param {Object} cfg
 * @param {string} cfg.api_url   - API 基础地址 (如 "https://www.msuicode.com")
 * @param {string} cfg.source    - 唯一标识 (如 "msuicode.com")
 * @param {string} cfg.display   - 页面显示名 (如 "MSUICode")
 */
function createFetcher(cfg) {
  return async function fetch() {
    const raw = await httpGet(cfg.api_url + "/api/pricing", cfg.insecure);

    if (raw.success !== true) throw new Error("API returned success ≠ true");
    if (!Array.isArray(raw.data)) throw new Error('Missing "data" array');
    if (!raw.group_ratio) throw new Error('Missing "group_ratio"');

    const vendorMap = buildVendorMap(raw.vendors || []);
    const usableGroup = raw.usable_group || {};
    const missingGroups = new Set();

    const models = raw.data.map((m) => {
      const isToken = m.quota_type === 0;
      return {
        name: m.model_name,
        vendor: vendorMap[m.vendor_id] || "Unknown",
        quota_type: isToken ? "token" : "per_request",
        groups: isToken
          ? calcTokenGroups(m, raw.group_ratio, usableGroup, missingGroups)
          : calcPerReqGroups(m, raw.group_ratio, usableGroup, missingGroups),
        supported_endpoints: m.supported_endpoint_types || [],
      };
    });

    const groupMeta = {};
    for (const [k, v] of Object.entries(raw.group_ratio)) {
      groupMeta[k] = { ratio: v, label: usableGroup[k] || null };
    }

    return {
      source: cfg.source,
      display_name: cfg.display,
      base_currency: "USD",
      pricing_version: raw.pricing_version || null,
      group_meta: groupMeta,
      _missing_group_ratios: [...missingGroups].sort(),
      models,
    };
  };
}

module.exports = { createFetcher };
