import { SITE, absoluteUrl, escapeHtml } from "../config.mjs";

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function seoHead({ title, description, pathname, type = "website", jsonLd = [], noindex = false }) {
  const pageTitle = title === SITE.name ? title : `${title}｜${SITE.name}`;
  const canonical = absoluteUrl(pathname);
  const image = absoluteUrl(SITE.ogImage);
  const schemas = (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    .filter(Boolean)
    .map((schema) => `<script type="application/ld+json">${safeJson(schema)}</script>`)
    .join("\n");
  return `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="author" content="${SITE.name}">
    <meta name="keywords" content="经济学人中文,经济学人翻译,The Economist 中文,国际新闻,财经分析,中文译刊,Gemini 3.6 Flash">
    <meta name="robots" content="${noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"}">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="zh-CN" href="${canonical}">
    <link rel="alternate" hreflang="x-default" href="${canonical}">
    <link rel="alternate" type="application/rss+xml" title="${SITE.name}" href="${absoluteUrl("/rss.xml")}">
    <meta property="og:locale" content="zh_CN">
    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="${SITE.name}">
    <meta property="og:title" content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="深色书桌上的报刊与红色书签">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${image}">
    ${schemas}`;
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl("/favicon.svg"),
  };
}

export function collectionSchema(issues) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    inLanguage: SITE.locale,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: issues.map((issue, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${issue.date} 中文译刊`,
        url: absoluteUrl(`/issues/${issue.date}/`),
      })),
    },
  };
}

export function issueSchema(issue, edition = null) {
  const editionLabel = edition === "full" ? "完整版" : edition === "digest" ? "简版" : "双版本";
  const pathname = edition
    ? `/issues/${issue.date}/${edition}/`
    : `/issues/${issue.date}/`;
  return {
    "@context": "https://schema.org",
    "@type": edition ? "Article" : "PublicationIssue",
    headline: `《经济学人》${issue.date} 中文译刊 ${editionLabel}`,
    name: `《经济学人》${issue.date} 中文译刊 ${editionLabel}`,
    description: issue.description,
    datePublished: issue.date,
    dateModified: issue.modified,
    inLanguage: SITE.locale,
    isAccessibleForFree: true,
    url: absoluteUrl(pathname),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(pathname) },
    image: absoluteUrl(SITE.ogImage),
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: absoluteUrl("/favicon.svg") } },
    about: ["国际政治", "商业", "金融", "科技", "中国", "世界经济"],
    additionalProperty: {
      "@type": "PropertyValue",
      name: "翻译模型",
      value: issue.model,
    },
  };
}
