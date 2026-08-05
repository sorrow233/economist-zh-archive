export const SITE = {
  name: "经济学人中文译刊",
  shortName: "经纬译刊",
  englishName: "The Economist Chinese Archive",
  url: (process.env.SITE_URL || "https://economist-zh-archive.pages.dev").replace(/\/$/, ""),
  description: "按周归档《经济学人》AI 中文译文，提供完整译文、核心简报以及 Markdown、EPUB、PDF 下载。",
  locale: "zh-CN",
  accent: "#a12b1f",
  ogImage: "/assets/og-cover.png",
};

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function absoluteUrl(pathname = "/") {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE.url}${normalized}`;
}

export function formatDate(dateString) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(`${dateString}T00:00:00+09:00`));
}

export function compactDate(dateString) {
  return dateString.replaceAll("-", ".");
}
