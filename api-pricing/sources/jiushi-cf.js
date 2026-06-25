const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({ api_url: "https://api-cf.jiushi.xin", source: "jiushi.xin-cf", display: "玖时(CF)", insecure: true }) };
