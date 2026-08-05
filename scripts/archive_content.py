"""把经济学人邮件 HTML 归档转换为结构化 Markdown。"""
from __future__ import annotations

from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
import re


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    children: list["Node | str"] = field(default_factory=list)


class TreeParser(HTMLParser):
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {key: value or "" for key, value in attrs})
        self.stack[-1].children.append(node)
        if node.tag not in self.VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if self.stack[-1].tag == tag.lower():
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        if data:
            self.stack[-1].children.append(data)


def parse_html(path: Path) -> Node:
    parser = TreeParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser.root


def classes(node: Node) -> set[str]:
    return set(node.attrs.get("class", "").split())


def find_all(node: Node, *, tag: str | None = None, class_name: str | None = None) -> list[Node]:
    matches: list[Node] = []
    for child in node.children:
        if not isinstance(child, Node):
            continue
        if (tag is None or child.tag == tag) and (class_name is None or class_name in classes(child)):
            matches.append(child)
        matches.extend(find_all(child, tag=tag, class_name=class_name))
    return matches


def first(node: Node, *, tag: str | None = None, class_name: str | None = None) -> Node | None:
    matches = find_all(node, tag=tag, class_name=class_name)
    return matches[0] if matches else None


def plain_text(node: Node, separator: str = " ") -> str:
    chunks: list[str] = []

    def walk(current: Node) -> None:
        for child in current.children:
            if isinstance(child, str):
                chunks.append(child)
            elif child.tag == "br":
                chunks.append("\n")
            else:
                walk(child)

    walk(node)
    text = separator.join(part.strip() for part in chunks if part.strip())
    return re.sub(r"[ \t]+", " ", text).strip()


def markdown_text(node: Node) -> str:
    """转换邮件正文中会实际出现的 HTML 子集。"""
    parts: list[str] = []

    def walk(current: Node) -> None:
        if current.tag in {"style", "script", "head"}:
            return
        if current.tag == "br":
            parts.append("\n")
            return
        if current.tag in {"strong", "b"}:
            parts.append("**")
        elif current.tag in {"em", "i"}:
            parts.append("*")

        for child in current.children:
            if isinstance(child, str):
                parts.append(child)
            else:
                walk(child)

        if current.tag in {"strong", "b"}:
            parts.append("**")
        elif current.tag in {"em", "i"}:
            parts.append("*")
        elif current.tag == "p":
            parts.append("\n\n")

    walk(node)
    text = "".join(parts).replace("\r\n", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def front_matter(*, title: str, issue_date: str, edition: str, model: str) -> str:
    return (
        "---\n"
        f'title: "{title}"\n'
        f'issue_date: "{issue_date}"\n'
        f'edition: "{edition}"\n'
        f'translation_model: "{model}"\n'
        "language: zh-CN\n"
        "---\n\n"
    )


def build_full_markdown(*, archive_dir: Path, issue_date: str, model: str) -> tuple[str, int]:
    compact = issue_date.replace("-", "")
    part_paths = sorted(archive_dir.glob(f"{compact}_full_part*.html"))
    if not part_paths:
        single = archive_dir / f"{compact}_full.html"
        if single.exists():
            part_paths = [single]
    if not part_paths:
        raise FileNotFoundError(f"找不到 {issue_date} 的完整译文 HTML")

    articles: list[tuple[str, str, str, str]] = []
    for path in part_paths:
        root = parse_html(path)
        for article in find_all(root, class_name="article"):
            title_node = first(article, tag="h2")
            content_node = first(article, class_name="article-content")
            if not title_node or not content_node:
                continue
            original_node = first(article, class_name="original-title")
            summary_node = first(article, class_name="article-summary")
            title = re.sub(r"^\d+\.\s*", "", plain_text(title_node))
            original = plain_text(original_node).removeprefix("原文标题：").strip() if original_node else ""
            summary = markdown_text(summary_node) if summary_node else ""
            summary = re.sub(r"^核心提炼\s*", "", summary).strip()
            content = markdown_text(content_node)
            articles.append((title, original, summary, content))

    if not articles:
        raise ValueError(f"{issue_date} 的完整译文没有可导出的文章")

    title = f"《经济学人》中文译刊｜{issue_date}｜完整版"
    output = [front_matter(title=title, issue_date=issue_date, edition="full", model=model)]
    output.extend(
        [
            f"# {title}\n",
            f"> 翻译模型：{model}  \n> 本文档由 AI 翻译生成，仅供个人研究与学习。\n",
            "## 目录说明\n",
            f"本期完整版共收录 {len(articles)} 篇译文，按原刊顺序排列。\n",
        ]
    )
    for index, (article_title, original, summary, content) in enumerate(articles, 1):
        output.append(f"## {index}. {article_title}\n")
        if original:
            output.append(f"*原文标题：{original}*\n")
        if summary:
            output.append(f"### 核心提炼\n\n{summary}\n")
        output.append(f"### 正文\n\n{content}\n")
    return "\n".join(output).strip() + "\n", len(articles)


def iter_nodes(node: Node):
    """按文档顺序遍历节点，兼容邮件模板增加的任意包装层。"""
    for child in node.children:
        if not isinstance(child, Node):
            continue
        yield child
        yield from iter_nodes(child)


def build_digest_markdown(*, archive_dir: Path, issue_date: str, model: str) -> tuple[str, int]:
    compact = issue_date.replace("-", "")
    path = archive_dir / f"{compact}_briefing.html"
    if not path.exists():
        raise FileNotFoundError(f"找不到 {issue_date} 的核心简报 HTML")
    root = parse_html(path)
    container = first(root, class_name="container") or first(root, tag="body") or root

    entries: list[tuple[str, str, str]] = []
    current_section = "Magazine"
    for child in iter_nodes(container):
        if child.tag == "h2":
            current_section = plain_text(child)
            continue
        if child.tag not in {"ol", "ul"}:
            continue
        for item in find_all(child, tag="li"):
            title_node = first(item, tag="b") or first(item, tag="strong")
            paragraphs = find_all(item, tag="p")
            title = plain_text(title_node) if title_node else ""
            summary = "\n\n".join(markdown_text(paragraph) for paragraph in paragraphs).strip()
            if title or summary:
                entries.append((current_section, title, summary))

    if not entries:
        raise ValueError(f"{issue_date} 的核心简报没有可导出的条目")

    title = f"《经济学人》中文译刊｜{issue_date}｜简版"
    output = [front_matter(title=title, issue_date=issue_date, edition="digest", model=model)]
    output.extend(
        [
            f"# {title}\n",
            f"> 翻译模型：{model}  \n> 本版只保留每篇文章的核心提炼，适合快速阅读。\n",
        ]
    )
    last_section = None
    for index, (section, entry_title, summary) in enumerate(entries, 1):
        if section != last_section:
            output.append(f"## {section}\n")
            last_section = section
        clean_title = re.sub(r"^\d+\.\s*", "", entry_title) or f"第 {index} 篇"
        output.append(f"### {index}. {clean_title}\n\n{summary}\n")
    return "\n".join(output).strip() + "\n", len(entries)
