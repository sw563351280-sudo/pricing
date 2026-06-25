const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.fate86.cn", source: "fate86.cn", display: "Fate86" }) };
