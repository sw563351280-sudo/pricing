/**
 * msuicode.js — MSUICode API 中转站定价抓取
 *
 * API: GET https://www.msuicode.com/api/pricing (无需认证)
 * 基础单价: 0.002 $/1K tokens
 * 价格 = model_ratio × group_ratio × base_price × 1000 → $/1M
 */

const https = require("https");

const API_URL = "https://www.msuicode.com/api/pricing";
const BASE_PRICE_PER_1K = 0.002;
const TIMEOUT_MS = 30_000;

// ── HTTP ──

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
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

// ── 价格计算 ──

function round(v, d = 6) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
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

// ── 厂商映射 ──

function buildVendorMap(vendors) {
  const map = {};
  for (const v of vendors) {
    if (v.id != null && v.name && !map[v.id]) map[v.id] = v.name;
  }
  return map;
}

// ── 主逻辑 ──

async function fetch() {
  const raw = await httpGet(API_URL);

  if (raw.success !== true) throw new Error("API returned success ≠ true");
  if (!Array.isArray(raw.data)) throw new Error('Missing "data" array');
  if (!raw.group_ratio) throw new Error('Missing "group_ratio"');

  const vendorMap = buildVendorMap(raw.vendors || []);
  const usableGroup = raw.usable_group || {};
  const missingGroups = new Set();

  const models = raw.data.map((m) => {
    const isToken = m.quota_type === 0;
    const groups = isToken
      ? calcTokenGroups(m, raw.group_ratio, usableGroup, missingGroups)
      : calcPerReqGroups(m, raw.group_ratio, usableGroup, missingGroups);

    return {
      name: m.model_name,
      vendor: vendorMap[m.vendor_id] || "Unknown",
      quota_type: isToken ? "token" : "per_request",
      groups,
      supported_endpoints: m.supported_endpoint_types || [],
    };
  });

  // 构造 group_ratios 说明 (给后续对比页用)
  const groupMeta = {};
  for (const [k, v] of Object.entries(raw.group_ratio)) {
    groupMeta[k] = { ratio: v, label: usableGroup[k] || null };
  }

  return {
    source: "msuicode.com",
    display_name: "MSUICode",
    base_currency: "USD",
    pricing_version: raw.pricing_version || null,
    group_meta: groupMeta,
    _missing_group_ratios: [...missingGroups].sort(),
    models,
  };
}

module.exports = { fetch };
