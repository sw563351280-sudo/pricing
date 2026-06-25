const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api.camel-hub.com", source: "camel-hub.com", display: "Camel" }) };
