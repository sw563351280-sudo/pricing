const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.kbq.de5.net", source: "kbq.de5.net", display: "KBQ" }) };
