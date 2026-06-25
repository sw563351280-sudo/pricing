/**
 * camel.js — Camel Hub API 中转站
 * API: GET https://api.camel-hub.com/api/pricing (无需认证)
 */
const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.camel-hub.com", source: "camel-hub.com", display: "Camel Hub" }) };
