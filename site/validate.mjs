import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/content.mjs";

const DIST = path.join(ROOT, "dist");
const htmlFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.name.endsWith(".html")) htmlFiles.push(fullPath);
  }
}

function localTarget(href) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || !clean.startsWith("/")) return null;
  const relative = clean.slice(1);
  if (!relative) return path.join(DIST, "index.html");
  if (clean.endsWith("/")) return path.join(DIST, relative, "index.html");
  return path.join(DIST, relative);
}

walk(DIST);
const titles = new Set();
const canonicals = new Set();
const indexedCanonicals = new Set();
const failures = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(DIST, file);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;
  const isIndexed = !html.includes('content="noindex,nofollow"');
  if (!title || titles.has(title)) failures.push(`${relative}: title 缺失或重复`);
  if (!description || (isIndexed && (description.length < 40 || description.length > 190))) failures.push(`${relative}: description 长度异常`);
  if (!canonical || canonicals.has(canonical)) failures.push(`${relative}: canonical 缺失或重复`);
  if (h1Count !== 1) failures.push(`${relative}: h1 数量为 ${h1Count}`);
  if ((isIndexed && !html.includes('application/ld+json')) || !html.includes('property="og:title"')) failures.push(`${relative}: 结构化数据或 OG 缺失`);
  if (html.includes("undefined") || html.includes("---\n")) failures.push(`${relative}: 出现未解析内容`);
  if (title) titles.add(title);
  if (canonical) canonicals.add(canonical);
  if (canonical && isIndexed) indexedCanonicals.add(canonical);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = localTarget(match[1]);
    if (target && !fs.existsSync(target)) failures.push(`${relative}: 链接目标不存在 ${match[1]}`);
  }

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); } catch { failures.push(`${relative}: JSON-LD 无法解析`); }
  }
}

const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
const sitemapCount = (sitemap.match(/<url>/g) || []).length;
if (sitemapCount !== indexedCanonicals.size) failures.push(`sitemap ${sitemapCount} 条，但可索引 canonical 有 ${indexedCanonicals.size} 条`);
for (const required of ["robots.txt", "rss.xml", "site.webmanifest", "search-index.json", "_headers", "_redirects"]) {
  if (!fs.existsSync(path.join(DIST, required))) failures.push(`${required} 缺失`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`站点验证通过：${htmlFiles.length} 个 HTML，${indexedCanonicals.size} 个可索引 canonical，所有本地链接有效`);
