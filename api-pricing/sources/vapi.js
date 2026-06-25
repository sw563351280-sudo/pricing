const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://v-api.zeabur.app", source: "v-api.zeabur.app", display: "V-API" }) };
