/**
 * msuicode.js — MSUICode API 中转站
 * API: GET https://www.msuicode.com/api/pricing (无需认证)
 */
const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://www.msuicode.com", source: "msuicode.com", display: "MSUICode" }) };
