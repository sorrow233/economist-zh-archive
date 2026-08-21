# 《经济学人》中文译刊归档

按期跟进《经济学人》中文 AI 译文。每一期同时提供完整版和简版，并统一输出 Markdown、EPUB、PDF 三种格式。

**在线阅读：[economist-zh-archive.pages.dev](https://economist-zh-archive.pages.dev)**

静态阅读站直接读取仓库内的 Markdown 构建，提供单期页面、沉浸式长文阅读、目录定位、字号与主题切换，并自动生成 canonical、Open Graph、JSON-LD、站点地图和 RSS。

## 内容版本

- **完整版**：按原刊顺序收录每篇文章的核心提炼和中文正文。
- **简版**：只保留核心简报，适合快速了解本期重点。
- **模型标注**：每期目录内的 Markdown 头信息及 `metadata.json` 均记录实际翻译模型。2026 年 6 月 26 日至 7 月 31 日的补发批次使用 **Gemini 3.6 Flash（Google Vertex AI）**。

## 期刊目录

| 日期 | 翻译模型 | 完整版 | 简版 |
| --- | --- | --- | --- |
| 2026-08-21 | Gemini 3.6 Flash | [MD](issues/2026-08-21/full.md) · [EPUB](issues/2026-08-21/full.epub) · [PDF](issues/2026-08-21/full.pdf) | [MD](issues/2026-08-21/digest.md) · [EPUB](issues/2026-08-21/digest.epub) · [PDF](issues/2026-08-21/digest.pdf) |
| 2026-08-14 | Gemini 3.6 Flash | [MD](issues/2026-08-14/full.md) · [EPUB](issues/2026-08-14/full.epub) · [PDF](issues/2026-08-14/full.pdf) | [MD](issues/2026-08-14/digest.md) · [EPUB](issues/2026-08-14/digest.epub) · [PDF](issues/2026-08-14/digest.pdf) |
| 2026-08-07 | DeepSeek V4 Flash (NVIDIA NIM) + Gemini 3.6 Flash | [MD](issues/2026-08-07/full.md) · [EPUB](issues/2026-08-07/full.epub) · [PDF](issues/2026-08-07/full.pdf) | [MD](issues/2026-08-07/digest.md) · [EPUB](issues/2026-08-07/digest.epub) · [PDF](issues/2026-08-07/digest.pdf) |
| 2026-07-31 | Gemini 3.6 Flash | [MD](issues/2026-07-31/full.md) · [EPUB](issues/2026-07-31/full.epub) · [PDF](issues/2026-07-31/full.pdf) | [MD](issues/2026-07-31/digest.md) · [EPUB](issues/2026-07-31/digest.epub) · [PDF](issues/2026-07-31/digest.pdf) |
| 2026-07-24 | Gemini 3.6 Flash | [MD](issues/2026-07-24/full.md) · [EPUB](issues/2026-07-24/full.epub) · [PDF](issues/2026-07-24/full.pdf) | [MD](issues/2026-07-24/digest.md) · [EPUB](issues/2026-07-24/digest.epub) · [PDF](issues/2026-07-24/digest.pdf) |
| 2026-07-17 | Gemini 3.6 Flash | [MD](issues/2026-07-17/full.md) · [EPUB](issues/2026-07-17/full.epub) · [PDF](issues/2026-07-17/full.pdf) | [MD](issues/2026-07-17/digest.md) · [EPUB](issues/2026-07-17/digest.epub) · [PDF](issues/2026-07-17/digest.pdf) |
| 2026-07-10 | Gemini 3.6 Flash | [MD](issues/2026-07-10/full.md) · [EPUB](issues/2026-07-10/full.epub) · [PDF](issues/2026-07-10/full.pdf) | [MD](issues/2026-07-10/digest.md) · [EPUB](issues/2026-07-10/digest.epub) · [PDF](issues/2026-07-10/digest.pdf) |
| 2026-07-03 | Gemini 3.6 Flash | [MD](issues/2026-07-03/full.md) · [EPUB](issues/2026-07-03/full.epub) · [PDF](issues/2026-07-03/full.pdf) | [MD](issues/2026-07-03/digest.md) · [EPUB](issues/2026-07-03/digest.epub) · [PDF](issues/2026-07-03/digest.pdf) |
| 2026-06-26 | Gemini 3.6 Flash | [MD](issues/2026-06-26/full.md) · [EPUB](issues/2026-06-26/full.epub) · [PDF](issues/2026-06-26/full.pdf) | [MD](issues/2026-06-26/digest.md) · [EPUB](issues/2026-06-26/digest.epub) · [PDF](issues/2026-06-26/digest.pdf) |

## 目录约定

```text
issues/YYYY-MM-DD/
├── full.md
├── full.epub
├── full.pdf
├── digest.md
├── digest.epub
├── digest.pdf
└── metadata.json
```

## 更新方式

生成脚本读取邮件流程已归档的全刊 HTML 与核心简报 HTML，不会重新调用模型：

```bash
python3 scripts/publish_issue.py \
  --archive-dir /path/to/archive/economist \
  --issue-date 2026-07-31 \
  --model "Gemini 3.6 Flash"
```

加上 `--git-sync` 后，会提交本期文件并推送当前仓库的 `main` 分支。
GitHub Actions 会在 `main` 更新后自动构建并部署 Cloudflare Pages。

## 说明

本仓库内容由 AI 翻译生成，仅供个人研究与学习，不构成《经济学人》官方译本。原刊文字及品牌版权归其权利人所有。建议将包含完整译文的仓库保持为私有仓库。
