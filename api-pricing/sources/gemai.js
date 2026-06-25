const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api2.gemai.cc", source: "gemai.cc", display: "哈基米" }) };
