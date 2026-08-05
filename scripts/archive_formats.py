"""从 Markdown 生成无外部服务依赖的 EPUB 与 PDF。"""
from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from html import escape
from pathlib import Path
import re
import uuid
import zipfile


def split_front_matter(markdown: str) -> tuple[dict[str, str], str]:
    if not markdown.startswith("---\n"):
        return {}, markdown
    end = markdown.find("\n---\n", 4)
    if end < 0:
        return {}, markdown
    metadata: dict[str, str] = {}
    for line in markdown[4:end].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip().strip('"')
    return metadata, markdown[end + 5 :].lstrip()


def inline_html(text: str) -> str:
    value = escape(text, quote=False)
    value = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<em>\1</em>", value)
    value = re.sub(r"\[([^]]+)]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', value)
    return value


def markdown_blocks(markdown: str) -> list[tuple[str, str]]:
    _, body = split_front_matter(markdown)
    blocks: list[tuple[str, str]] = []
    paragraph: list[str] = []

    def flush() -> None:
        if paragraph:
            blocks.append(("p", "\n".join(paragraph).strip()))
            paragraph.clear()

    for raw_line in body.splitlines():
        line = raw_line.rstrip()
        heading = re.match(r"^(#{1,4})\s+(.+)$", line)
        if heading:
            flush()
            blocks.append((f"h{len(heading.group(1))}", heading.group(2).strip()))
        elif line.startswith("> "):
            flush()
            blocks.append(("quote", line[2:].replace("  ", "").strip()))
        elif re.match(r"^[-*]\s+", line):
            flush()
            blocks.append(("li", re.sub(r"^[-*]\s+", "", line)))
        elif not line.strip():
            flush()
        else:
            paragraph.append(line)
    flush()
    return blocks


def markdown_to_xhtml(markdown: str) -> tuple[str, list[tuple[str, str]]]:
    html_parts: list[str] = []
    toc: list[tuple[str, str]] = []
    heading_index = 0
    for kind, text in markdown_blocks(markdown):
        if kind.startswith("h"):
            heading_index += 1
            anchor = f"heading-{heading_index}"
            html_parts.append(f'<{kind} id="{anchor}">{inline_html(text)}</{kind}>')
            if kind in {"h1", "h2"}:
                toc.append((anchor, re.sub(r"[*_`]", "", text)))
        elif kind == "quote":
            html_parts.append(f"<blockquote><p>{inline_html(text)}</p></blockquote>")
        elif kind == "li":
            html_parts.append(f"<p class=\"bullet\">• {inline_html(text)}</p>")
        else:
            content = inline_html(text).replace("\n", "<br/>")
            html_parts.append(f"<p>{content}</p>")
    return "\n".join(html_parts), toc


def write_epub(markdown: str, output_path: Path) -> None:
    metadata, _ = split_front_matter(markdown)
    title = metadata.get("title", output_path.stem)
    language = metadata.get("language", "zh-CN")
    document_id = f"urn:uuid:{uuid.uuid5(uuid.NAMESPACE_URL, title)}"
    content, toc = markdown_to_xhtml(markdown)
    nav_items = "\n".join(
        f'<li><a href="content.xhtml#{anchor}">{escape(label)}</a></li>' for anchor, label in toc
    )
    modified = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    container = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>"""
    css = """body{font-family:serif;line-height:1.75;margin:5%;color:#24211f}h1,h2,h3{line-height:1.35;color:#7f241b}h2{border-bottom:1px solid #d9cec7;padding-bottom:.3em}blockquote{background:#fff6e9;border-left:4px solid #bd5337;margin:1em 0;padding:.7em 1em}.bullet{margin-left:1.2em}a{color:#8f3024}p{margin:.65em 0}"""
    xhtml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="{escape(language)}" lang="{escape(language)}">
<head><meta charset="UTF-8"/><title>{escape(title)}</title><link rel="stylesheet" href="style.css" type="text/css"/></head>
<body>{content}</body></html>"""
    nav = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><meta charset="UTF-8"/><title>目录</title></head>
<body><nav epub:type="toc" id="toc"><h1>目录</h1><ol>{nav_items}</ol></nav></body></html>"""
    opf = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="{escape(language)}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:identifier id="pub-id">{document_id}</dc:identifier><dc:title>{escape(title)}</dc:title>
  <dc:language>{escape(language)}</dc:language><dc:creator>AI 中文译刊</dc:creator>
  <meta property="dcterms:modified">{modified}</meta>
</metadata>
<manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/></manifest>
<spine><itemref idref="content"/></spine></package>"""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w") as epub:
        epub.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        epub.writestr("META-INF/container.xml", container)
        epub.writestr("OEBPS/style.css", css)
        epub.writestr("OEBPS/content.xhtml", xhtml)
        epub.writestr("OEBPS/nav.xhtml", nav)
        epub.writestr("OEBPS/content.opf", opf)


def _reportlab_text(text: str) -> str:
    value = escape(text, quote=False)
    value = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", value)
    return value.replace("\n", "<br/>")


def write_pdf(markdown: str, output_path: Path) -> None:
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer
    except ModuleNotFoundError as exc:
        raise RuntimeError("生成 PDF 需要安装 requirements.txt 中的 reportlab") from exc

    font_candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        Path("/System/Library/Fonts/Hiragino Sans GB.ttc"),
    ]
    font_path = next((path for path in font_candidates if path.exists()), None)
    if not font_path:
        raise FileNotFoundError("未找到支持中文的 Arial Unicode 或 Hiragino Sans GB 字体")
    font_name = "ArchiveCJK"
    pdfmetrics.registerFont(TTFont(font_name, str(font_path), subfontIndex=0))
    pdfmetrics.registerFontFamily(font_name, normal=font_name, bold=font_name, italic=font_name, boldItalic=font_name)

    metadata, _ = split_front_matter(markdown)
    title = metadata.get("title", output_path.stem)
    issue_date = metadata.get("issue_date", "")
    edition = "完整版" if metadata.get("edition") == "full" else "简版"
    model = metadata.get("translation_model", "Gemini 3.6 Flash")
    base = getSampleStyleSheet()
    styles = {
        "cover": ParagraphStyle("Cover", parent=base["Title"], fontName=font_name, fontSize=26, leading=38, alignment=TA_CENTER, textColor=colors.HexColor("#7f241b"), spaceAfter=18 * mm),
        "meta": ParagraphStyle("Meta", parent=base["BodyText"], fontName=font_name, fontSize=12, leading=20, alignment=TA_CENTER, textColor=colors.HexColor("#5e5752")),
        "h1": ParagraphStyle("H1", parent=base["Heading1"], fontName=font_name, fontSize=21, leading=30, textColor=colors.HexColor("#7f241b"), spaceBefore=8 * mm, spaceAfter=5 * mm),
        "h2": ParagraphStyle("H2", parent=base["Heading2"], fontName=font_name, fontSize=16, leading=24, textColor=colors.HexColor("#91372a"), spaceBefore=7 * mm, spaceAfter=3 * mm),
        "h3": ParagraphStyle("H3", parent=base["Heading3"], fontName=font_name, fontSize=13, leading=20, textColor=colors.HexColor("#493f38"), spaceBefore=4 * mm, spaceAfter=2 * mm),
        "h4": ParagraphStyle("H4", parent=base["Heading4"], fontName=font_name, fontSize=11.5, leading=18, spaceBefore=3 * mm),
        "p": ParagraphStyle("Body", parent=base["BodyText"], fontName=font_name, fontSize=10.5, leading=18, textColor=colors.HexColor("#24211f"), spaceAfter=2.5 * mm, wordWrap="CJK"),
        "quote": ParagraphStyle("Quote", parent=base["BodyText"], fontName=font_name, fontSize=10, leading=17, leftIndent=6 * mm, rightIndent=4 * mm, borderColor=colors.HexColor("#bd5337"), borderWidth=1, borderPadding=6, backColor=colors.HexColor("#fff6e9"), spaceAfter=3 * mm, wordWrap="CJK"),
        "li": ParagraphStyle("List", parent=base["BodyText"], fontName=font_name, fontSize=10.5, leading=18, leftIndent=5 * mm, firstLineIndent=-3 * mm, spaceAfter=1.5 * mm, wordWrap="CJK"),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(output_path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm, title=title, author="AI 中文译刊",
    )
    story = [
        Spacer(1, 38 * mm), Paragraph("《经济学人》中文译刊", styles["cover"]),
        Paragraph(
            _reportlab_text(f"期刊日期：{issue_date}\n版本：{edition}\n翻译模型：{model}"),
            styles["meta"],
        ),
        Spacer(1, 18 * mm),
        Paragraph("AI 翻译内容，仅供个人研究与学习。原刊版权归其权利人所有。", styles["meta"]),
        PageBreak(),
    ]
    for kind, text in markdown_blocks(markdown):
        style = styles.get(kind, styles["p"])
        prefix = "• " if kind == "li" else ""
        story.append(Paragraph(_reportlab_text(prefix + text), style))

    def footer(canvas, doc) -> None:  # noqa: ANN001
        canvas.saveState()
        canvas.setFont(font_name, 8)
        canvas.setFillColor(colors.HexColor("#837a73"))
        canvas.drawCentredString(A4[0] / 2, 9 * mm, f"{issue_date} · {edition} · {doc.page}")
        canvas.restoreState()

    document.build(story, onFirstPage=footer, onLaterPages=footer)


def file_sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
