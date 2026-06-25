const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://i.orangepie.org", source: "orangepie.org", display: "橘子派" }) };
