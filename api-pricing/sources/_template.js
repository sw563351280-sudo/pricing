/**
 * _template.js — 新 API 中转站抓取模块模板
 *
 * 使用方法: 复制此文件 → 重命名 → 实现 fetch() 函数
 *
 * fetch() 必须返回以下格式:
 * {
 *   source: "example.com",           // 唯一标识 (域名)
 *   display_name: "Example API",     // 页面显示名
 *   base_currency: "USD",           // 定价货币
 *   models: [ ... ]                 // 模型列表 (见下方 Model 定义)
 * }
 *
 * Model:
 * {
 *   name: "claude-opus-4-6",        // 原始模型名
 *   vendor: "Anthropic",            // 厂商名
 *   quota_type: "token",            // "token" | "per_request"
 *   groups: [
 *     {
 *       name: "default",            // 分组标识
 *       label: "默认分组",          // 分组描述 (可选)
 *       input_per_1m: 2.5,          // $/1M tokens (quota_type="token" 时必填)
 *       output_per_1m: 12.5,        // $/1M tokens (quota_type="token" 时必填)
 *       cache_per_1m: 0.25,         // $/1M tokens (可选, null 表示不支持)
 *       cache_write_per_1m: 3.125   // $/1M tokens (可选, null 表示不支持)
 *     }
 *   ],
 *   supported_endpoints: ["openai", "anthropic"]  // 支持的 API 端点类型
 * }
 *
 * 价格统一使用: 美元/1M tokens (token 计费) 或 美元/次 (按次计费)
 */

/**
 * 唯一的对外接口。返回标准化定价数据。
 * @returns {Promise<Object>}
 */
async function fetch() {
  // TODO: 实现抓取逻辑
  // 1. 请求 API
  // 2. 解析响应
  // 3. 转换为标准化格式
  // 4. 返回结果

  throw new Error("fetch() not implemented — implement this in your source module");
}

module.exports = { fetch };
