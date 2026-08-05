import { SITE, compactDate, escapeHtml, formatDate } from "../config.mjs";
import { collectionSchema, issueSchema, organizationSchema, seoHead } from "./seo.mjs";

function icon(name) {
  const paths = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    download: '<path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    moon: '<path d="M20 15.5A8.5 8.5 0 118.5 4 7 7 0 0020 15.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    top: '<path d="M6 14l6-6 6 6"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function header() {
  return `<header class="site-header">
    <a class="wordmark" href="/" aria-label="${SITE.name}首页">
      <span class="wordmark-mark" aria-hidden="true"></span>
      <span>${SITE.shortName}</span>
    </a>
    <nav class="site-nav" aria-label="主导航">
      <a href="/#archive">期刊</a>
      <a href="/about/">关于</a>
      <a href="https://github.com/sorrow233/economist-zh-archive" rel="noopener noreferrer">GitHub</a>
      <button class="icon-button" type="button" data-theme-toggle aria-label="切换深色模式">${icon("moon")}</button>
    </nav>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div><span class="footer-mark"></span><strong>${SITE.shortName}</strong></div>
    <p>AI 翻译内容，仅供个人研究与学习。原刊版权归其权利人所有。</p>
    <p>由 Markdown 自动构建 · Cloudflare Pages</p>
  </footer>`;
}

function layout({ title, description, pathname, body, bodyClass = "", type, jsonLd, noindex = false }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="${SITE.accent}">
  ${seoHead({ title, description, pathname, type, jsonLd, noindex })}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="/site.webmanifest">
  ${bodyClass.includes("home-page") ? '<link rel="preload" href="/assets/editorial-hero.png" as="image" fetchpriority="high">' : ""}
  <link rel="stylesheet" href="/assets/styles.css">
  <script>document.documentElement.dataset.theme=localStorage.getItem('reader-theme')||'light'</script>
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#content">跳到正文</a>
  ${header()}
  ${body}
  ${footer()}
  <script src="/assets/site.js" defer></script>
</body>
</html>`;
}

function formatLinks(issue, edition) {
  const base = `/downloads/${issue.date}/${edition}`;
  return `<div class="format-links" aria-label="下载${edition === "full" ? "完整版" : "简版"}">
    <a href="${base}.md" download>MD</a>
    <a href="${base}.epub" download>EPUB</a>
    <a href="${base}.pdf" download>PDF</a>
  </div>`;
}

export function homePage({ issues, latest }) {
  const totalArticles = issues.reduce((sum, issue) => sum + issue.full_articles, 0);
  const rows = issues.map((issue, index) => `<article class="archive-row reveal" style="--delay:${index * 45}ms">
    <div class="archive-date"><span>${compactDate(issue.date)}</span><small>${index === 0 ? "LATEST" : `ISSUE ${String(issues.length - index).padStart(2, "0")}`}</small></div>
    <div class="archive-summary">
      <h3><a href="/issues/${issue.date}/">世界这一周：${formatDate(issue.date)}</a></h3>
      <p>${escapeHtml(issue.description)}</p>
    </div>
    <div class="archive-meta"><span>${issue.full_articles} 篇</span><span>${escapeHtml(issue.model)}</span></div>
    <a class="row-arrow" href="/issues/${issue.date}/" aria-label="打开 ${issue.date} 期">${icon("arrow")}</a>
  </article>`).join("");
  const body = `<main id="content">
    <section class="hero" data-hero>
      <div class="hero-image" aria-hidden="true"></div>
      <div class="hero-shade" aria-hidden="true"></div>
      <div class="hero-copy">
        <p class="eyebrow">THE ECONOMIST · CHINESE ARCHIVE</p>
        <p class="hero-brand">${SITE.name}</p>
        <h1>每周世界，<br>完整读懂。</h1>
        <p class="hero-deck">完整译文与核心简报，按期归档为可阅读、可下载、可检索的中文版本。</p>
        <a class="primary-link" href="/issues/${latest.date}/full/">阅读最新一期 ${icon("arrow")}</a>
      </div>
      <div class="hero-index"><span>VOL. ${issues.length}</span><span>${compactDate(latest.date)}</span></div>
    </section>

    <section class="proof-band" aria-label="归档概况">
      <p><strong>${issues.length}</strong><span>期双版本归档</span></p>
      <p><strong>${totalArticles}</strong><span>篇完整中文译文</span></p>
      <p><strong>3</strong><span>种开放下载格式</span></p>
      <p><strong>100%</strong><span>由 Markdown 构建</span></p>
    </section>

    <section class="archive-section" id="archive">
      <div class="section-intro">
        <p class="eyebrow dark">WEEKLY EDITIONS</p>
        <h2>期刊归档</h2>
        <p>先用简版掌握关键判断，再进入完整版阅读论证与细节。</p>
      </div>
      <div class="archive-list">${rows}</div>
    </section>

    <section class="method-section reveal">
      <p class="eyebrow dark">READING SYSTEM</p>
      <h2>一份内容，两种阅读速度。</h2>
      <div class="method-columns">
        <div><span>01</span><h3>简版</h3><p>提炼每篇文章的核心判断，适合通勤和快速了解一周变化。</p></div>
        <div><span>02</span><h3>完整版</h3><p>保留中文正文与核心提炼，适合系统阅读、检索和长期归档。</p></div>
      </div>
    </section>
  </main>`;
  return layout({
    title: SITE.name,
    description: SITE.description,
    pathname: "/",
    body,
    bodyClass: "home-page",
    jsonLd: [organizationSchema(), collectionSchema(issues)],
  });
}

export function issuePage(issue) {
  const body = `<main id="content" class="issue-page">
    <header class="issue-masthead">
      <p class="eyebrow dark">WEEKLY EDITION · ${compactDate(issue.date)}</p>
      <h1>世界这一周</h1>
      <p class="issue-date">${formatDate(issue.date)}</p>
      <p class="issue-description">${escapeHtml(issue.description)}</p>
      <dl class="issue-facts">
        <div><dt>文章</dt><dd>${issue.full_articles} 篇</dd></div>
        <div><dt>翻译模型</dt><dd>${escapeHtml(issue.model)}</dd></div>
        <div><dt>格式</dt><dd>MD · EPUB · PDF</dd></div>
      </dl>
    </header>
    <section class="edition-picker" aria-label="选择阅读版本">
      <article>
        <p>01 · FAST READ</p><h2>简版</h2>
        <p>只读核心提炼，快速掌握本期 ${issue.digest_articles} 篇文章的观点。</p>
        <a class="edition-read" href="/issues/${issue.date}/digest/">开始阅读 ${icon("arrow")}</a>
        ${formatLinks(issue, "digest")}
      </article>
      <article>
        <p>02 · FULL EDITION</p><h2>完整版</h2>
        <p>核心提炼与完整中文正文，按原刊顺序收录 ${issue.full_articles} 篇。</p>
        <a class="edition-read" href="/issues/${issue.date}/full/">开始阅读 ${icon("arrow")}</a>
        ${formatLinks(issue, "full")}
      </article>
    </section>
    <nav class="back-nav"><a href="/#archive">← 返回全部期刊</a></nav>
  </main>`;
  return layout({
    title: `《经济学人》${issue.date} 中文译刊`,
    description: issue.description,
    pathname: `/issues/${issue.date}/`,
    body,
    jsonLd: [organizationSchema(), issueSchema(issue)],
  });
}

export function readerPage(issue, edition) {
  const document = issue[edition];
  const label = edition === "full" ? "完整版" : "简版";
  const opposite = edition === "full" ? "digest" : "full";
  const oppositeLabel = opposite === "full" ? "完整版" : "简版";
  const toc = document.toc.map((entry) => `<a href="#${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</a>`).join("");
  const body = `<div class="reading-progress" aria-hidden="true"><span data-progress></span></div>
  <main id="content" class="reader-shell" data-reader>
    <aside class="reader-aside" data-toc>
      <div class="reader-edition"><span>${compactDate(issue.date)}</span><strong>${label}</strong></div>
      <nav aria-label="本文目录">${toc}</nav>
    </aside>
    <article class="reader-article">
      <div class="reader-toolbar">
        <a href="/issues/${issue.date}/">本期首页</a>
        <a href="/issues/${issue.date}/${opposite}/">切换到${oppositeLabel}</a>
        <div class="type-controls" aria-label="字号控制">
          <button type="button" data-font="down" aria-label="减小字号">${icon("minus")}</button>
          <button type="button" data-font="up" aria-label="增大字号">${icon("plus")}</button>
        </div>
      </div>
      <div class="reader-markdown">${document.html}</div>
      <footer class="article-end">
        <p>本期阅读完毕</p>
        <a href="/issues/${issue.date}/${opposite}/">继续阅读${oppositeLabel} ${icon("arrow")}</a>
        ${formatLinks(issue, edition)}
      </footer>
    </article>
  </main>
  <button class="back-to-top" type="button" data-back-to-top aria-label="返回顶部">${icon("top")}</button>`;
  return layout({
    title: `《经济学人》${issue.date} 中文${label}`,
    description: `${formatDate(issue.date)}《经济学人》中文${label}，${issue[`${edition}_articles`] || issue.full_articles} 篇文章，翻译模型 ${issue.model}。`,
    pathname: `/issues/${issue.date}/${edition}/`,
    body,
    bodyClass: "reader-page",
    type: "article",
    jsonLd: [organizationSchema(), issueSchema(issue, edition)],
  });
}

export function aboutPage() {
  const body = `<main id="content" class="about-page">
    <p class="eyebrow dark">ABOUT THE ARCHIVE</p>
    <h1>把每周的世界，<br>整理成可以返回的文字。</h1>
    <div class="about-copy">
      <p>经纬译刊是按周更新的《经济学人》AI 中文阅读归档。每一期同时保留完整译文和核心简报，并提供网页、Markdown、EPUB 与 PDF。</p>
      <h2>内容从哪里来</h2>
      <p>网页由仓库中的 Markdown 自动构建，不会在部署阶段再次调用模型。每一期页面都会标注实际翻译模型；当前补发批次使用 Gemini 3.6 Flash（Google Vertex AI）。</p>
      <h2>使用说明</h2>
      <p>译文仅供个人研究与学习，不是《经济学人》官方译本，也可能存在事实、术语或语义偏差。原刊文字、商标及其他内容的权利归各自权利人所有。</p>
      <a class="primary-link dark-link" href="/#archive">浏览期刊 ${icon("arrow")}</a>
    </div>
  </main>`;
  return layout({ title: "关于", description: `了解${SITE.name}的内容来源、翻译模型、自动构建方式、版权边界与各类阅读格式。`, pathname: "/about/", body, jsonLd: organizationSchema() });
}

export function notFoundPage() {
  const body = `<main id="content" class="not-found"><p>404</p><h1>这一页不在本期目录里。</h1><a class="primary-link dark-link" href="/">返回归档首页 ${icon("arrow")}</a></main>`;
  return layout({ title: "页面未找到", description: "请求的页面不存在，请返回经济学人中文译刊归档首页继续浏览。", pathname: "/404.html", body, noindex: true });
}
