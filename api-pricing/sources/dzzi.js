/**
 * dzzi.js — DZZI API 中转站
 * API: GET https://api.dzzi.ai/api/pricing (无需认证)
 */
const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.dzzi.ai", source: "dzzi.ai", display: "DZZI" }) };
