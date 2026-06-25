/**
 * 68886868.js — 68886868 API 中转站
 * API: GET https://api.68886868.xyz/api/pricing (无需认证)
 */
const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.68886868.xyz", source: "68886868.xyz", display: "68886868" }) };
