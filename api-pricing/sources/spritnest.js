const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://spritnest.com", source: "spritnest.com", display: "SpritNest" }) };
