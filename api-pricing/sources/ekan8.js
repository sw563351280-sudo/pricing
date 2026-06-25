/**
 * ekan8.js — Ekan8 API 中转站
 * API: GET https://api.ekan8.com/api/pricing (无需认证)
 */
const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.ekan8.com", source: "ekan8.com", display: "Ekan8" }) };
