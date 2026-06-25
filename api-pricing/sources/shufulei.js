const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://shufulei.net", source: "shufulei.net", display: "舒芙蕾", insecure: true }) };
