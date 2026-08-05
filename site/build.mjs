import fs from "node:fs";
import path from "node:path";
import { SITE, absoluteUrl } from "./config.mjs";
import { loadArchive, ROOT } from "./lib/content.mjs";
import { aboutPage, homePage, issuePage, notFoundPage, readerPage } from "./lib/templates.mjs";

const DIST = path.join(ROOT, "dist");
const SITE_DIR = path.join(ROOT, "site");

function write(relativePath, content) {
  const target = path.join(DIST, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function copy(source, destination) {
  const target = path.join(DIST, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const archive = loadArchive();
write("index.html", homePage(archive));
write("about/index.html", aboutPage());
write("404.html", notFoundPage());

for (const issue of archive.issues) {
  write(`issues/${issue.date}/index.html`, issuePage(issue));
  for (const edition of ["full", "digest"]) {
    write(`issues/${issue.date}/${edition}/index.html`, readerPage(issue, edition));
    for (const extension of ["md", "epub", "pdf"]) {
      copy(
        path.join(ROOT, "issues", issue.date, `${edition}.${extension}`),
        `downloads/${issue.date}/${edition}.${extension}`,
      );
    }
  }
}

for (const asset of fs.readdirSync(path.join(SITE_DIR, "assets"))) {
  copy(path.join(SITE_DIR, "assets", asset), `assets/${asset}`);
}

write("favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#a12b1f"/><path d="M18 14h28v7H25v8h18v7H25v8h21v7H18z" fill="#f5efe5"/></svg>`);
write("site.webmanifest", JSON.stringify({
  name: SITE.name,
  short_name: SITE.shortName,
  description: SITE.description,
  start_url: "/",
  display: "standalone",
  background_color: "#f3eee5",
  theme_color: SITE.accent,
  lang: SITE.locale,
  icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
}, null, 2));

const sitemapPaths = ["/", "/about/"];
for (const issue of archive.issues) {
  sitemapPaths.push(`/issues/${issue.date}/`, `/issues/${issue.date}/full/`, `/issues/${issue.date}/digest/`);
}
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapPaths.map((pathname) => {
  const issueDate = pathname.match(/\d{4}-\d{2}-\d{2}/)?.[0] || archive.latest.date;
  const priority = pathname === "/" ? "1.0" : pathname.includes("/full/") || pathname.includes("/digest/") ? "0.8" : "0.7";
  return `<url><loc>${xmlEscape(absoluteUrl(pathname))}</loc><lastmod>${issueDate}</lastmod><changefreq>${pathname === "/" ? "weekly" : "monthly"}</changefreq><priority>${priority}</priority></url>`;
}).join("")}</urlset>`);

write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`);
write("rss.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${xmlEscape(SITE.name)}</title><link>${SITE.url}</link><description>${xmlEscape(SITE.description)}</description><language>zh-CN</language>${archive.issues.map((issue) => `<item><title>${xmlEscape(`《经济学人》${issue.date} 中文译刊`)}</title><link>${absoluteUrl(`/issues/${issue.date}/`)}</link><guid isPermaLink="true">${absoluteUrl(`/issues/${issue.date}/`)}</guid><pubDate>${new Date(`${issue.date}T00:00:00+09:00`).toUTCString()}</pubDate><description>${xmlEscape(issue.description)}</description></item>`).join("")}</channel></rss>`);
write("search-index.json", JSON.stringify(archive.issues.map((issue) => ({
  date: issue.date,
  title: `《经济学人》${issue.date} 中文译刊`,
  description: issue.description,
  model: issue.model,
  url: `/issues/${issue.date}/`,
  sections: issue.digest.toc.map((item) => item.label),
})), null, 2));
write("_redirects", `/latest /issues/${archive.latest.date}/ 302\n`);
write("_headers", `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
  Link: <${absoluteUrl("/sitemap.xml")}>; rel="sitemap"

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/downloads/*
  Cache-Control: public, max-age=86400
  X-Robots-Tag: noindex
`);

console.log(`静态站构建完成：${archive.issues.length} 期，${sitemapPaths.length} 个可索引页面`);
