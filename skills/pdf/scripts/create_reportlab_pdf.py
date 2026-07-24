#!/usr/bin/env python3
"""Create a PDF with ReportLab using Unicode-safe fonts and flowable layout.

This helper is intentionally conservative: it supports common Markdown
structures without trying to become a full browser or LaTeX replacement.
For complex Markdown/HTML fidelity, use the convert-to-pdf skill.
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


FONT_CANDIDATES = [
    (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ),
    (
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    ),
    (
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ),
    (
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ),
    (
        "/Library/Fonts/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
    ),
    (
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ),
]


def register_unicode_fonts(font_path: str | None, bold_font_path: str | None) -> tuple[str, str]:
    regular, bold = _resolve_font_pair(font_path, bold_font_path)
    pdfmetrics.registerFont(TTFont("OCCBody", regular))
    pdfmetrics.registerFont(TTFont("OCCBodyBold", bold))
    return "OCCBody", "OCCBodyBold"


def _resolve_font_pair(font_path: str | None, bold_font_path: str | None) -> tuple[str, str]:
    if font_path:
        regular = Path(font_path).expanduser()
        if not regular.exists():
            raise FileNotFoundError(f"font not found: {regular}")
        bold = Path(bold_font_path).expanduser() if bold_font_path else regular
        if not bold.exists():
            raise FileNotFoundError(f"bold font not found: {bold}")
        return str(regular), str(bold)

    for regular, bold in FONT_CANDIDATES:
        if Path(regular).exists() and Path(bold).exists():
            return regular, bold

    raise RuntimeError(
        "No Unicode TrueType font found. Pass --font /path/to/font.ttf "
        "to preserve characters such as å, ä, and ö."
    )


def build_styles(body_font: str, bold_font: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "OCCTitle",
            parent=base["Title"],
            fontName=bold_font,
            fontSize=20,
            leading=24,
            keepWithNext=1,
            spaceAfter=12,
        ),
        "heading1": ParagraphStyle(
            "OCCHeading1",
            parent=base["Heading1"],
            fontName=bold_font,
            fontSize=16,
            leading=20,
            keepWithNext=1,
            spaceBefore=14,
            spaceAfter=6,
        ),
        "heading2": ParagraphStyle(
            "OCCHeading2",
            parent=base["Heading2"],
            fontName=bold_font,
            fontSize=14,
            leading=18,
            keepWithNext=1,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "heading3": ParagraphStyle(
            "OCCHeading3",
            parent=base["Heading3"],
            fontName=bold_font,
            fontSize=12,
            leading=15,
            keepWithNext=1,
            spaceBefore=10,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "OCCBody",
            parent=base["BodyText"],
            fontName=body_font,
            fontSize=10.5,
            leading=14,
            spaceAfter=7,
        ),
        "code": ParagraphStyle(
            "OCCCode",
            parent=base["Code"],
            fontName=body_font,
            fontSize=9,
            leading=11,
            leftIndent=8,
            rightIndent=8,
            backColor=colors.HexColor("#F4F4F4"),
            borderPadding=6,
            spaceBefore=6,
            spaceAfter=8,
        ),
    }
    return styles


def markdown_to_flowables(markdown: str, styles: dict[str, ParagraphStyle], doc_width: float) -> list:
    lines = markdown.splitlines()
    story: list = []
    paragraph: list[str] = []
    i = 0

    def flush_paragraph() -> None:
        nonlocal paragraph
        if paragraph:
            text = " ".join(part.strip() for part in paragraph if part.strip())
            if text:
                story.append(Paragraph(inline_markup(text), styles["body"]))
            paragraph = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            flush_paragraph()
            i += 1
            continue

        if stripped in {"---", "\\pagebreak"}:
            flush_paragraph()
            story.append(PageBreak())
            i += 1
            continue

        if stripped.startswith("```"):
            flush_paragraph()
            code_lines: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            story.append(Preformatted("\n".join(code_lines), styles["code"]))
            i += 1 if i < len(lines) else 0
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            level = len(heading.group(1))
            style_name = "heading1" if level == 1 else "heading2" if level == 2 else "heading3"
            story.append(Paragraph(inline_markup(heading.group(2)), styles[style_name]))
            i += 1
            continue

        if _looks_like_table(lines, i):
            flush_paragraph()
            table_lines = []
            while i < len(lines) and "|" in lines[i] and lines[i].strip():
                table_lines.append(lines[i])
                i += 1
            story.append(build_table(table_lines, styles, doc_width))
            story.append(Spacer(1, 8))
            continue

        list_match = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.+)$", line)
        if list_match:
            flush_paragraph()
            bullet_type = "1" if re.match(r"\d+[.)]", list_match.group(2)) else "bullet"
            items = []
            while i < len(lines):
                item_match = re.match(r"^(\s*)([-*+]|\d+[.)])\s+(.+)$", lines[i])
                if not item_match:
                    break
                items.append(
                    ListItem(
                        Paragraph(inline_markup(item_match.group(3)), styles["body"]),
                        leftIndent=18,
                    )
                )
                i += 1
            story.append(ListFlowable(items, bulletType=bullet_type, leftIndent=18))
            story.append(Spacer(1, 6))
            continue

        paragraph.append(line)
        i += 1

    flush_paragraph()
    return story


def _looks_like_table(lines: list[str], index: int) -> bool:
    if index + 1 >= len(lines):
        return False
    current = lines[index].strip()
    separator = lines[index + 1].strip()
    return "|" in current and re.match(r"^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$", separator) is not None


def build_table(table_lines: Iterable[str], styles: dict[str, ParagraphStyle], doc_width: float) -> Table:
    rows: list[list[str]] = []
    for raw in table_lines:
        stripped = raw.strip().strip("|")
        if re.match(r"^\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+$", stripped):
            continue
        rows.append([cell.strip() for cell in stripped.split("|")])

    column_count = max(len(row) for row in rows)
    normalized = [row + [""] * (column_count - len(row)) for row in rows]
    data = [
        [Paragraph(inline_markup(cell), styles["body"]) for cell in row]
        for row in normalized
    ]
    table = Table(data, colWidths=[doc_width / column_count] * column_count, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8E8E8")),
                ("FONTNAME", (0, 0), (-1, 0), styles["heading3"].fontName),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def inline_markup(text: str) -> str:
    escaped = html.escape(text, quote=False)
    escaped = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", escaped)
    escaped = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", escaped)
    return escaped


def body_to_flowables(body: str, styles: dict[str, ParagraphStyle]) -> list:
    flowables = []
    for paragraph in re.split(r"\n\s*\n", body.strip()):
        if paragraph.strip():
            flowables.append(Paragraph(inline_markup(" ".join(paragraph.splitlines())), styles["body"]))
    return flowables


def create_pdf(args: argparse.Namespace) -> None:
    output = Path(args.output).expanduser()
    output.parent.mkdir(parents=True, exist_ok=True)

    body_font, bold_font = register_unicode_fonts(args.font, args.bold_font)
    styles = build_styles(body_font, bold_font)
    pagesize = A4 if args.page_size.lower() == "a4" else letter
    doc = SimpleDocTemplate(
        str(output),
        pagesize=pagesize,
        rightMargin=args.margin * inch,
        leftMargin=args.margin * inch,
        topMargin=args.margin * inch,
        bottomMargin=args.margin * inch,
    )

    story: list = []
    if args.title:
        story.append(Paragraph(inline_markup(args.title), styles["title"]))

    if args.from_markdown:
        markdown_path = Path(args.from_markdown).expanduser()
        markdown = markdown_path.read_text(encoding="utf-8")
        story.extend(markdown_to_flowables(markdown, styles, doc.width))

    if args.body:
        story.extend(body_to_flowables(args.body, styles))

    if not story:
        story.append(Paragraph("Empty PDF", styles["body"]))

    doc.build(story)
    print(f"Wrote {output}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a Unicode-safe PDF with ReportLab.")
    parser.add_argument("output", help="Output PDF path")
    parser.add_argument("--title", help="Optional document title")
    parser.add_argument("--body", help="Optional body text. Blank lines create paragraphs.")
    parser.add_argument("--from-markdown", help="Read Markdown content from this UTF-8 file")
    parser.add_argument("--font", help="Path to a Unicode TrueType/OpenType regular font")
    parser.add_argument("--bold-font", help="Path to a matching bold font")
    parser.add_argument("--page-size", choices=["letter", "a4"], default="a4")
    parser.add_argument("--margin", type=float, default=0.7, help="Page margin in inches")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    try:
        create_pdf(parse_args(argv))
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
