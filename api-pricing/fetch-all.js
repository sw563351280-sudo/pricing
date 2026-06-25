/**
 * fetch-all.js — 统一抓取入口
 * 遍历 sources/ 目录中所有模块，执行抓取，合并输出。
 *
 * 用法: node fetch-all.js
 * 输出:
 *   data/<source>.json    各站独立数据
 *   data/merged.json      合并后的全量数据
 *   data/meta.json        抓取元信息
 */

const fs = require("fs");
const path = require("path");

const SOURCES_DIR = path.join(__dirname, "sources");
const DATA_DIR = path.join(__dirname, "data");

// ── 模型名标准化 ──
// 去掉渠道前缀，统一小写，用于跨站匹配

const PREFIX_PATTERNS = [
  /^ant-/i, /^kiro-/i, /^c\//i,        // 渠道前缀
  /^azure-/i, /^aws-/i, /^gcp-/i,
  /-[0-9]{8,}$/i,                       // 日期后缀: -20251101
];

function normalizeName(name) {
  let n = name.toLowerCase().trim();
  for (const re of PREFIX_PATTERNS) {
    n = n.replace(re, "");
  }
  return n.trim();
}

// ── 加载 source 模块 ──

function loadSources() {
  const files = fs.readdirSync(SOURCES_DIR).filter((f) => f.endsWith(".js") && !f.startsWith("_"));
  const sources = [];
  for (const f of files) {
    const mod = require(path.join(SOURCES_DIR, f));
    if (typeof mod.fetch !== "function") {
      console.warn(`  ⚠ ${f}: 缺少 fetch() 导出，跳过`);
      continue;
    }
    sources.push({ file: f, module: mod });
  }
  return sources;
}

// ── 构建跨站模型索引 ──

function buildCrossIndex(allResults) {
  // normalizedName → [{ source, originalName, model }]
  const index = {};

  for (const r of allResults) {
    for (const m of r.models) {
      const norm = normalizeName(m.name);
      if (!index[norm]) index[norm] = [];
      index[norm].push({ source: r.source, original_name: m.name, model: m });
    }
  }
  return index;
}

// ── 主流程 ──

async function main() {
  console.log("▸ 加载 sources …");
  const sources = loadSources();
  if (sources.length === 0) {
    console.error("✘ sources/ 目录下没有可用的模块");
    process.exit(1);
  }
  console.log(`  找到 ${sources.length} 个数据源: ${sources.map((s) => s.file).join(", ")}`);

  // 逐个抓取
  const results = [];
  for (const src of sources) {
    console.log(`\n▸ [${src.file}] 开始抓取 …`);
    try {
      const data = await src.module.fetch();
      console.log(`  ✔ 获取成功: ${data.models.length} 个模型`);

      if (data._missing_group_ratios && data._missing_group_ratios.length) {
        console.log(`  ⚠ group_ratio 缺失: ${data._missing_group_ratios.join(", ")}`);
      }

      // 去掉内部字段后保存
      const { _missing_group_ratios, ...clean } = data;
      clean.fetched_at = new Date().toISOString();

      const outPath = path.join(DATA_DIR, data.source.replace(/[^a-z0-9.-]/gi, "_") + ".json");
      fs.writeFileSync(outPath, JSON.stringify(clean, null, 2), "utf-8");
      results.push(clean);
    } catch (err) {
      console.error(`  ✘ 抓取失败: ${err.message}`);
      // 不中断，继续下一个源
    }
  }

  if (results.length === 0) {
    console.error("\n✘ 所有数据源抓取均失败");
    process.exit(1);
  }

  // 构建跨站索引
  console.log("\n▸ 构建跨站模型索引 …");
  const crossIndex = buildCrossIndex(results);
  const multiSourceModels = Object.entries(crossIndex)
    .filter(([, entries]) => entries.length > 1)
    .map(([norm, entries]) => ({
      normalized_name: norm,
      sources: entries.map((e) => e.source),
      entries: entries.map((e) => ({
        source: e.source,
        name: e.original_name,
        vendor: e.model.vendor,
        quota_type: e.model.quota_type,
        group_count: e.model.groups.length,
      })),
    }));

  // 构建 merged.json
  const merged = {
    generated_at: new Date().toISOString(),
    source_count: results.length,
    sources: results.map((r) => ({
      source: r.source,
      display_name: r.display_name,
      model_count: r.models.length,
      pricing_version: r.pricing_version,
      base_currency: r.base_currency,
    })),
    // 扁平化模型列表 (每个模型带 source 字段)
    models: results.flatMap((r) =>
      r.models.map((m) => ({
        source: r.source,
        display_name: r.display_name,
        normalized_name: normalizeName(m.name),
        ...m,
      }))
    ),
    // 跨站同名模型索引
    cross_reference: multiSourceModels,
  };

  const mergedPath = path.join(DATA_DIR, "merged.json");
  fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`  ✔ 合并完成: ${merged.models.length} 个模型条目 (${multiSourceModels.length} 个模型在多个站出现)`);

  // meta.json
  const meta = {
    last_fetch: new Date().toISOString(),
    source_count: results.length,
    total_models: merged.models.length,
    multi_source_models: multiSourceModels.length,
    sources: merged.sources,
  };
  fs.writeFileSync(path.join(DATA_DIR, "meta.json"), JSON.stringify(meta, null, 2), "utf-8");

  console.log(`\n✔ 数据抓取完成 → ${DATA_DIR}/`);
  console.log(`  · merged.json (${(fs.statSync(mergedPath).size / 1024).toFixed(1)} KB)`);
  console.log(`  · ${results.length} 个独立 JSON`);

  // 自动生成可视化页面
  console.log("\n▸ 生成页面 …");
  try {
    const { spawnSync } = require("child_process");
    const r = spawnSync("node", [path.join(__dirname, "page-builder.js")], {
      stdio: "inherit",
      cwd: __dirname,
    });
    if (r.status !== 0) {
      console.warn("  ⚠ 页面生成失败 (不影响数据文件)");
    }
  } catch (e) {
    console.warn("  ⚠ 页面生成失败: " + e.message);
  }
}

main().catch((err) => {
  console.error(`\n✘ 执行失败: ${err.message}`);
  process.exit(1);
});
