/**
 * jiushi.js — 玖时 API 中转站
 * API: GET https://api.jiushi.xin/api/pricing (证书有误，跳过验证)
 */
const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.jiushi.xin", source: "jiushi.xin", display: "玖时", insecure: true }) };
