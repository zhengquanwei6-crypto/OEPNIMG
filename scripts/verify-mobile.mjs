#!/usr/bin/env node
/**
 * 静态校验 mobile/ 目录：
 *   - *.kt              大括号 / 圆括号 平衡
 *   - *.gradle / .kts   大括号平衡
 *   - AndroidManifest.xml / *-additions.xml 标签平衡 + 必须有 <manifest> 根节点
 *   - *.ts / *.tsx      大括号平衡（不依赖 typescript 包，节省 CI 时间）
 *
 * 不依赖 Android SDK / kotlinc / gradle / typescript —— 在任何 Node 22 环境都能运行。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../mobile", import.meta.url));
const failures = [];
const passes = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "android" || name === "www") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

function stripCodeNoise(source) {
  let s = source;
  // 三引号字符串先处理，避免内部的引号被当成行内字符串
  s = s.replace(/"""[\s\S]*?"""/g, '""');
  // 行注释 / 块注释
  s = s.replace(/\/\/[^\n]*/g, "");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");
  // 字符串字面量
  s = s.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
  s = s.replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
  // 模板字符串（粗略）
  s = s.replace(/`(?:[^`\\]|\\.)*`/g, "``");
  return s;
}

function bracketBalance(source) {
  const s = stripCodeNoise(source);
  const counts = { "{": 0, "(": 0, "[": 0 };
  const pairs = { "}": "{", ")": "(", "]": "[" };
  for (const ch of s) {
    if (ch in counts) counts[ch]++;
    else if (ch in pairs) counts[pairs[ch]]--;
  }
  return counts;
}

function checkBalance(file) {
  const src = readFileSync(file, "utf8");
  const c = bracketBalance(src);
  if (c["{"] !== 0 || c["("] !== 0 || c["["] !== 0) {
    failures.push(`${relative(ROOT, file)}: 括号不平衡 ${JSON.stringify(c)}`);
  } else {
    passes.push(relative(ROOT, file));
  }
}

function checkXml(file) {
  const src = readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  // 必须包含 <manifest 根节点
  if (!/<manifest[\s>]/.test(src)) {
    failures.push(`${relative(ROOT, file)}: 缺少 <manifest> 根节点`);
    return;
  }
  // 标签数量平衡（含自闭合）
  const opens = (src.match(/<[a-zA-Z][^>]*[^/]>/g) || []).length;
  const closes = (src.match(/<\/[a-zA-Z][^>]*>/g) || []).length;
  if (opens !== closes) {
    failures.push(
      `${relative(ROOT, file)}: XML 标签不平衡 open=${opens} close=${closes}`,
    );
  } else {
    passes.push(relative(ROOT, file));
  }
}

let total = 0;
for (const file of walk(ROOT)) {
  total++;
  if (file.endsWith(".kt")) checkBalance(file);
  else if (file.endsWith(".gradle") || file.endsWith(".gradle.kts"))
    checkBalance(file);
  else if (file.endsWith("AndroidManifest.xml") || file.endsWith("-additions.xml"))
    checkXml(file);
  else if (file.endsWith(".ts") || file.endsWith(".tsx"))
    checkBalance(file);
}

console.log(`扫描 ${total} 个文件，校验 ${passes.length + failures.length} 个：\n`);
console.log(`✓ ${passes.length} 个通过：`);
for (const p of passes) console.log(`  - ${p}`);
if (failures.length > 0) {
  console.log(`\n✗ ${failures.length} 个失败：`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\nALL PASS");
