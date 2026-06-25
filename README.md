# API 中转站模型定价对比

自动抓取多家 API 中转站的模型价格，生成静态对比页面。

🌐 **网址**: [sw563351280-sudo.github.io/pricing](https://sw563351280-sudo.github.io/pricing/)

## 收录站点（35 个）

| 站名 | 类型 | 自动更新 |
|------|------|----------|
| 满穗 (MSUICode) | 公开 | ✅ |
| 肘子 (DZZI) | 公开 | ✅ |
| 小鸡农场 (68886868) | 公开 | ✅ |
| Ekan8 | 公开 | ✅ |
| Camel | 公开 | ✅ |
| 玖时 | 公开 | ✅ |
| 哈基米 (Gemai) | 公开 | ✅ |
| CC-Coding | 公开 | ✅ |
| Chintao | 公开 | ✅ |
| DawClaudeCode | 公开 | ✅ |
| Fate86 | 公开 | ✅ |
| 芙卡 | 公开 | ✅ |
| Goodream/好梦 | 公开 | ✅ |
| 即享 | 公开 | ✅ |
| 橘子汽水 | 公开 | ✅ |
| KBQ | 公开 | ✅ |
| 幸运午餐 | 公开 | ✅ |
| QWQTao | 公开 | ✅ |
| RuaChat | 公开 | ✅ |
| 舒芙蕾 | 公开 | ✅ |
| SpritNest | 公开 | ✅ |
| 小雨云 | 公开 | ✅ |
| 转转 (UU6) | 公开 | ✅ |
| V-API | 公开 | ✅ |
| 幸福巷 | 公开 | ✅ |
| 宅恋 | 公开 | ✅ |
| 织云 | 公开 | ✅ |
| 蓝天 | 公开 | ✅ |
| 阿拉丁 | 公开 | ✅ |
| 电子蝴蝶 | 公开 | ✅ |
| 橙子派 | 公开 | ✅ |
| 刺猬 | 需登录 | 手动 |
| 沉默西林 | 需登录 | 手动 |
| 冻梨 | 需登录 | 手动 |
| Tree | 需登录 | 手动 |

## 使用方法

### 浏览

打开页面后：
- **搜索框** — 输入模型名过滤
- **下拉筛选** — 按数据源 / 厂商 / 计费方式 / 分组筛选
- **点击表头** — 按该列排序
- **手机端自适应** — 窄屏自动调整布局

### 价格说明

- 所有价格单位为 **元 (¥)**，各站统一换算
- Token 计费：元 / 1M tokens
- 按次计费：元 / 次

## 自动更新

每天 UTC 19:00（北京时间凌晨 3:00）GitHub Actions 自动抓取,无需手动操作。

## 开发指南

### 添加公开站

1. 复制 `api-pricing/sources/_template.js`，重命名
2. 实现 `fetch()` 函数，返回标准化格式
3. 跑 `node fetch-all.js`，提交推送

```js
// 最小示例 — 适用于 OneAPI 格式
const { createFetcher } = require("./_oneapi-base");
module.exports = { fetch: createFetcher({
  api_url: "https://example.com",
  source: "example.com",
  display: "示例站"
}) };
```

### 添加需登录的站

适用于刺猬、沉默西林等需要登录的站点：

1. 登录站点 → F12 → Network → 刷新 → 找到 `pricing` 请求
2. 右键 → Copy response → 粘贴到记事本
3. 保存为 `api-pricing/data/<站名>-raw.json`
4. 复制 `chenmo-static.js`，改里面的文件名和显示名
5. 跑 `node fetch-all.js`

### 本地运行

```bash
cd api-pricing
node fetch-all.js    # 抓取全部 → 合并 → 生成页面
# 输出: data/merged.json + ../index.html
```

## 项目结构

```
pricing-site/
├── index.html                 # 生成的静态页面 (GitHub Pages 入口)
├── api-pricing/
│   ├── sources/               # 数据源模块
│   │   ├── _oneapi-base.js    #   OneAPI 通用基类
│   │   ├── _template.js       #   新站开发模板
│   │   ├── msuicode.js        #   公开站 (一行配置)
│   │   ├── cwapi-static.js    #   需登录站 (静态文件)
│   │   └── ...
│   ├── data/                  # 数据文件
│   │   ├── merged.json        #   合并后的全量数据
│   │   ├── <source>.json      #   各站独立数据
│   │   └── *-raw.json         #   登录站的原始导出
│   ├── fetch-all.js           # 统一抓取入口
│   └── page-builder.js        # HTML 页面生成器
├── .github/workflows/
│   └── update.yml             # 每日自动抓取
└── README.md
```
