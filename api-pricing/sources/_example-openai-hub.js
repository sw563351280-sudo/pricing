/**
 * example-openai-hub.js — 演示如何添加新数据源
 *
 * 这是一个「假」示例，展示需要做哪些事。
 * 拿到真实的 API 地址和返回格式后，替换 fetch() 里的逻辑即可。
 */

// 删掉下面这行即可启用（它只是防止模板被 fetch-all.js 误加载）
if (true) throw new Error("这是个示例模板，不能直接运行。复制后删掉此行。");

const https = require("https");

const API_URL = "https://openai-hub.com/api/models";  // ← 改成真实地址

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("JSON parse: " + e.message)); }
      });
    }).on("error", reject);
  });
}

async function fetch() {
  // 1. 请求 API
  const raw = await httpGet(API_URL);

  // 2. 校验
  if (!Array.isArray(raw.models)) throw new Error("Unexpected format");

  // 3. 转换为统一格式
  const models = raw.models.map((m) => ({
    name: m.id,                          // 模型名
    vendor: mapVendor(m.id),             // 厂商名 (自己写个映射函数)
    quota_type: "token",                 // "token" 或 "per_request"
    groups: [
      {
        name: "default",
        label: null,
        input_per_1m: m.input_price,     // ⚠️ 必须: $/1M tokens
        output_per_1m: m.output_price,
        cache_per_1m: m.cache_price || null,
        cache_write_per_1m: null,
      },
    ],
    supported_endpoints: ["openai"],
  }));

  return {
    source: "openai-hub.com",            // 唯一标识 (域名)
    display_name: "OpenAI Hub",          // 页面显示名
    base_currency: "USD",
    models,
  };
}

module.exports = { fetch };
