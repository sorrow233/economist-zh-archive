import fs from "node:fs";
import path from "node:path";
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

const ROOT = path.resolve(import.meta.dirname, "../..");

function parseFrontMatter(markdown) {
  if (!markdown.startsWith("---\n")) return { data: {}, body: markdown };
  const end = markdown.indexOf("\n---\n", 4);
  if (end < 0) return { data: {}, body: markdown };
  const data = {};
  for (const line of markdown.slice(4, end).split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
    data[key] = value;
  }
  return { data, body: markdown.slice(end + 5).trimStart() };
}

function createRenderer() {
  const seen = new Map();
  const slugify = (value) => {
    const base = value
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[\s/]+/g, "-")
      .replace(/[^\p{Letter}\p{Number}-]/gu, "")
      .replace(/^-+|-+$/g, "") || "section";
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
  return new MarkdownIt({ html: false, linkify: true, typographer: true })
    .use(markdownItAnchor, { slugify, permalink: false });
}

function plainExcerpt(markdown, length = 150) {
  const value = markdown
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/^(?:#{1,6}|>)\s.*$/gm, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return value.length > length ? `${value.slice(0, length).trim()}……` : value;
}

function renderMarkdown(markdown) {
  const { data, body } = parseFrontMatter(markdown);
  const md = createRenderer();
  const tokens = md.parse(body, {});
  const toc = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "heading_open" || token.tag !== "h2") continue;
    const inline = tokens[index + 1];
    toc.push({ id: token.attrGet("id"), label: inline?.content || "章节" });
  }
  return {
    data,
    body,
    html: md.renderer.render(tokens, md.options, {}),
    toc,
    excerpt: plainExcerpt(body),
    characterCount: body.replace(/\s/g, "").length,
  };
}

export function loadArchive() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  const issues = manifest.issues.map((entry) => {
    const issueDir = path.join(ROOT, "issues", entry.issue_date);
    const metadata = JSON.parse(fs.readFileSync(path.join(issueDir, "metadata.json"), "utf8"));
    const full = renderMarkdown(fs.readFileSync(path.join(issueDir, "full.md"), "utf8"));
    const digest = renderMarkdown(fs.readFileSync(path.join(issueDir, "digest.md"), "utf8"));
    return {
      ...entry,
      metadata,
      date: entry.issue_date,
      model: entry.translation_model,
      modified: manifest.updated_at || entry.issue_date,
      full,
      digest,
      description: digest.excerpt,
    };
  });
  return { manifest, issues, latest: issues[0] };
}

export { ROOT };
