#!/usr/bin/env python3
"""生成一期双版本归档，并可提交推送到 GitHub。"""
from __future__ import annotations

import argparse
from datetime import date, datetime
import json
from pathlib import Path
import subprocess

from archive_content import build_digest_markdown, build_full_markdown
from archive_formats import file_sha256, write_epub, write_pdf


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "manifest.json"


def build_issue(*, archive_dir: Path, issue_date: str, model: str) -> dict:
    datetime.strptime(issue_date, "%Y-%m-%d")
    issue_dir = ROOT / "issues" / issue_date
    issue_dir.mkdir(parents=True, exist_ok=True)

    full_markdown, full_count = build_full_markdown(
        archive_dir=archive_dir, issue_date=issue_date, model=model
    )
    digest_markdown, digest_count = build_digest_markdown(
        archive_dir=archive_dir, issue_date=issue_date, model=model
    )
    outputs = {
        "full.md": full_markdown,
        "digest.md": digest_markdown,
    }
    for name, content in outputs.items():
        (issue_dir / name).write_text(content, encoding="utf-8")
        stem = Path(name).stem
        write_epub(content, issue_dir / f"{stem}.epub")
        write_pdf(content, issue_dir / f"{stem}.pdf")

    files = {}
    for path in sorted(issue_dir.glob("*")):
        if path.name == "metadata.json" or not path.is_file():
            continue
        files[path.name] = {"bytes": path.stat().st_size, "sha256": file_sha256(path)}
    metadata = {
        "issue_date": issue_date,
        "translation_model": model,
        "language": "zh-CN",
        "full_articles": full_count,
        "digest_articles": digest_count,
        "files": files,
    }
    (issue_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return metadata


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {"repository": "economist-zh-archive", "issues": []}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def update_index(metadata: dict) -> None:
    manifest = load_manifest()
    issues = [item for item in manifest.get("issues", []) if item.get("issue_date") != metadata["issue_date"]]
    issues.append({key: metadata[key] for key in ("issue_date", "translation_model", "full_articles", "digest_articles")})
    manifest["issues"] = sorted(issues, key=lambda item: item["issue_date"], reverse=True)
    manifest["updated_at"] = date.today().isoformat()
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    rows = []
    for issue in manifest["issues"]:
        issue_date = issue["issue_date"]
        base = f"issues/{issue_date}"
        rows.append(
            f"| {issue_date} | {issue['translation_model']} | "
            f"[MD]({base}/full.md) · [EPUB]({base}/full.epub) · [PDF]({base}/full.pdf) | "
            f"[MD]({base}/digest.md) · [EPUB]({base}/digest.epub) · [PDF]({base}/digest.pdf) |"
        )
    readme = """# 《经济学人》中文译刊归档

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
""" + "\n".join(rows) + """

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
python3 scripts/publish_issue.py \\
  --archive-dir /path/to/archive/economist \\
  --issue-date 2026-07-31 \\
  --model "Gemini 3.6 Flash"
```

加上 `--git-sync` 后，会提交本期文件并推送当前仓库的 `main` 分支。
GitHub Actions 会在 `main` 更新后自动构建并部署 Cloudflare Pages。

## 说明

本仓库内容由 AI 翻译生成，仅供个人研究与学习，不构成《经济学人》官方译本。原刊文字及品牌版权归其权利人所有。建议将包含完整译文的仓库保持为私有仓库。
"""
    (ROOT / "README.md").write_text(readme, encoding="utf-8")


def git_sync(issue_date: str, model: str) -> None:
    status = subprocess.run(
        ["git", "status", "--porcelain"], cwd=ROOT, check=True, capture_output=True, text=True
    ).stdout.strip()
    if not status:
        print("没有新的归档改动，跳过 Git 提交")
        return
    subprocess.run(
        ["git", "add", "README.md", "manifest.json", f"issues/{issue_date}"], cwd=ROOT, check=True
    )
    message = (
        f"发布《经济学人》{issue_date} 中文译刊\n\n"
        f"- 新增完整版 MD、EPUB、PDF\n"
        f"- 新增核心简版 MD、EPUB、PDF\n"
        f"- 记录翻译模型：{model}\n"
        f"- 更新期刊索引及文件校验信息"
    )
    subprocess.run(["git", "commit", "-m", message], cwd=ROOT, check=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="发布《经济学人》中文双版本归档")
    parser.add_argument("--archive-dir", type=Path, required=True)
    parser.add_argument("--issue-date", required=True, help="邮件归档日期，格式 YYYY-MM-DD")
    parser.add_argument("--model", default="Gemini 3.6 Flash")
    parser.add_argument("--git-sync", action="store_true")
    args = parser.parse_args()
    metadata = build_issue(
        archive_dir=args.archive_dir.resolve(), issue_date=args.issue_date, model=args.model
    )
    update_index(metadata)
    print(
        f"已生成 {args.issue_date}：完整版 {metadata['full_articles']} 篇，"
        f"简版 {metadata['digest_articles']} 篇"
    )
    if args.git_sync:
        git_sync(args.issue_date, args.model)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
