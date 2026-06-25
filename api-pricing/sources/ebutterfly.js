const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.ebutterfly.cc", source: "ebutterfly.cc", display: "电子蝴蝶" }) };
