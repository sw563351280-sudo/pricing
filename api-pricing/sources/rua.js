const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.rua.chat", source: "rua.chat", display: "RuaChat" }) };
