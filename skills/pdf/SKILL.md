---
name: pdf
description: Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging multiple PDFs into one, splitting PDFs apart, rotating pages, adding watermarks, creating new PDFs, filling PDF forms, encrypting/decrypting PDFs, extracting images, and OCR on scanned PDFs to make them searchable. If the user mentions a .pdf file or asks to produce one, use this skill.
---

# PDF Processing Guide

## OpenCode Resource Handling

OpenCode loads this `SKILL.md` on demand. Supporting files in this folder are not preloaded; read or run them only when the task needs them. Resolve paths relative to this skill directory. After installation it lives under `<config-root>/skills/pdf/`; in this repo it is `skills/pdf/`.

When running bundled scripts, either `cd` into the skill directory first or prefix the script path. Keep user inputs and generated outputs in the user's working project or a requested output directory, not inside the skill directory.

## Central Runtime

Prefer the central OpenCode runtime created by `bash bin/install-opencode-conductor.sh --with-runtime-deps`.
Use `$OPENCODE_HOME/bin/opencode-python` (default config root: `~/.config/opencode`) for Python helpers and do not install PDF dependencies into the current project repo. If a dependency is missing, rerun the installer with `--with-runtime-deps` or use `$OPENCODE_HOME/bin/opencode-pip`.

## Overview

This guide covers essential PDF processing operations using Python libraries and command-line tools. Use ReportLab for native PDF creation. Use the separate `convert-to-pdf` skill when the task is primarily converting another source file type into PDF. For advanced features, JavaScript libraries, and detailed examples, read `reference.md`. If you need to fill out a PDF form, read `forms.md` and follow its instructions before writing code.

## Bundled Resources

- `forms.md` - required workflow for filling PDF forms, including fillable-field detection, coordinate extraction, annotations, and validation.
- `reference.md` - advanced processing notes, additional libraries, JavaScript examples, troubleshooting, and deeper implementation details.
- `scripts/` - helper scripts for ReportLab PDF generation, form-field extraction, PDF-to-image conversion, bounding-box checks, filling fillable fields, annotation overlays, and validation images.

## Quick Start

```python
from pypdf import PdfReader, PdfWriter

# Read a PDF
reader = PdfReader("document.pdf")
print(f"Pages: {len(reader.pages)}")

# Extract text
text = ""
for page in reader.pages:
    text += page.extract_text()
```

## Python Libraries

### pypdf - Basic Operations

#### Merge PDFs
```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)

with open("merged.pdf", "wb") as output:
    writer.write(output)
```

#### Split PDF
```python
reader = PdfReader("input.pdf")
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as output:
        writer.write(output)
```

#### Extract Metadata
```python
reader = PdfReader("document.pdf")
meta = reader.metadata
print(f"Title: {meta.title}")
print(f"Author: {meta.author}")
print(f"Subject: {meta.subject}")
print(f"Creator: {meta.creator}")
```

#### Rotate Pages
```python
reader = PdfReader("input.pdf")
writer = PdfWriter()

page = reader.pages[0]
page.rotate(90)  # Rotate 90 degrees clockwise
writer.add_page(page)

with open("rotated.pdf", "wb") as output:
    writer.write(output)
```

### pdfplumber - Text and Table Extraction

#### Extract Text with Layout
```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        print(text)
```

#### Extract Tables
```python
with pdfplumber.open("document.pdf") as pdf:
    for i, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for j, table in enumerate(tables):
            print(f"Table {j+1} on page {i+1}:")
            for row in table:
                print(row)
```

#### Advanced Table Extraction
```python
import pandas as pd

with pdfplumber.open("document.pdf") as pdf:
    all_tables = []
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if table:  # Check if table is not empty
                df = pd.DataFrame(table[1:], columns=table[0])
                all_tables.append(df)

# Combine all tables
if all_tables:
    combined_df = pd.concat(all_tables, ignore_index=True)
    combined_df.to_excel("extracted_tables.xlsx", index=False)
```

### ReportLab - Create PDFs

Use ReportLab for new PDFs, Markdown-derived reports, simple tables/lists, cover sheets, generated appendices, and other native PDF deliverables. Prefer the bundled generator for common document creation:

```bash
python scripts/create_reportlab_pdf.py output.pdf --title "Åäö Report" --body "Swedish text: å ä ö Å Ä Ö"
python scripts/create_reportlab_pdf.py output.pdf --from-markdown input.md --title "Generated Report"
```

#### Choosing a generation engine

ReportLab is the recommended **native** generator: dependency-light and
Unicode-safe. When a Markdown or HTML source needs layout/diagram fidelity that
ReportLab does not provide, route it through the `convert-to-pdf` skill and pick
an engine with `--engine`:

| Engine | Best for | Extra dependencies |
| --- | --- | --- |
| `reportlab` (default) | Native, Unicode-safe PDFs with no system toolchain. | None beyond the central runtime. |
| `pandoc-latex` | Best typography and **Mermaid** diagrams. | pandoc + LaTeX (TinyTeX `xelatex`). |
| `pandoc-weasyprint` | CSS-styled output without a browser. | pandoc + `weasyprint` (pip). |
| `pandoc-wkhtmltopdf` | Fast HTML/CSS rendering. | pandoc + `wkhtmltopdf`. |
| `chrome` | Pixel-faithful CSS, web fonts, client-rendered content, Mermaid. | Chrome/Chromium (+ pandoc for Markdown). |
| `auto` | Best installed engine, falling back to ReportLab. | None required. |

```bash
# From the convert-to-pdf skill directory:
python scripts/convert_to_pdf.py input.md output.pdf --engine pandoc-latex --mermaid on
python scripts/convert_to_pdf.py page.html output.pdf --engine chrome
```

See the `convert-to-pdf` skill for full engine, Mermaid, and dependency details,
including the **agent decision rules** (when to ask the user which engine vs.
auto-pick) and the **one-step vs. inspect-the-markup-first** workflows.

#### Required Quality Rules

- **Unicode and Swedish characters**: Always embed a TrueType/OpenType font before writing non-ASCII text. Do not rely on ReportLab's built-in Helvetica/Times/Courier fonts for Swedish characters (`å`, `ä`, `ö`, `Å`, `Ä`, `Ö`) or other Unicode text.
- **Verification string**: For Swedish or multilingual output, include or spot-check `Åäö ÄÖÅ svenska tecken` in the generated PDF during validation.
- **No orphan headers**: Headers must never be the last item on a page. In ReportLab Platypus, set `keepWithNext = 1` on heading styles and keep headings adjacent to the following paragraph/list/table.
- **Markdown structures**: For Markdown-derived PDFs, preserve headings, paragraphs, unordered lists, ordered lists, fenced code blocks, and simple pipe tables. Use `convert-to-pdf` or pandoc for complex Markdown that needs HTML/CSS/LaTeX fidelity.
- **Tables**: Use `Table(..., repeatRows=1)` for multi-page tables and style header rows distinctly.

#### Basic PDF Creation
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont("BodyFont", "/path/to/NotoSans-Regular.ttf"))

c = canvas.Canvas("hello.pdf", pagesize=letter)
width, height = letter

# Add text
c.setFont("BodyFont", 12)
c.drawString(100, height - 100, "Hello World!")
c.drawString(100, height - 120, "Swedish text: å ä ö Å Ä Ö")

# Add a line
c.line(100, height - 140, 400, height - 140)

# Save
c.save()
```

#### Create PDF with Multiple Pages
```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("report.pdf", pagesize=letter)
styles = getSampleStyleSheet()
styles["Heading1"].keepWithNext = 1
story = []

# Add content
title = Paragraph("Report Title", styles['Title'])
story.append(title)
story.append(Spacer(1, 12))

body = Paragraph("This is the body of the report. " * 20, styles['Normal'])
story.append(body)
story.append(PageBreak())

# Page 2 - keep header with first body block
story.append(KeepTogether([
    Paragraph("Page 2", styles['Heading1']),
    Paragraph("Content for page 2", styles['Normal'])
]))

# Build PDF
doc.build(story)
```

#### Subscripts and Superscripts

**IMPORTANT**: Never use Unicode subscript/superscript characters (₀₁₂₃₄₅₆₇₈₉, ⁰¹²³⁴⁵⁶⁷⁸⁹) in ReportLab PDFs. The built-in fonts do not include these glyphs, causing them to render as solid black boxes.

Instead, use ReportLab's XML markup tags in Paragraph objects:
```python
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet

styles = getSampleStyleSheet()

# Subscripts: use <sub> tag
chemical = Paragraph("H<sub>2</sub>O", styles['Normal'])

# Superscripts: use <super> tag
squared = Paragraph("x<super>2</super> + y<super>2</super>", styles['Normal'])
```

For canvas-drawn text (not Paragraph objects), manually adjust font the size and position rather than using Unicode subscripts/superscripts.

## Command-Line Tools

### pdftotext (poppler-utils)
```bash
# Extract text
pdftotext input.pdf output.txt

# Extract text preserving layout
pdftotext -layout input.pdf output.txt

# Extract specific pages
pdftotext -f 1 -l 5 input.pdf output.txt  # Pages 1-5
```

### qpdf
```bash
# Merge PDFs
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf

# Split pages
qpdf input.pdf --pages . 1-5 -- pages1-5.pdf
qpdf input.pdf --pages . 6-10 -- pages6-10.pdf

# Rotate pages
qpdf input.pdf output.pdf --rotate=+90:1  # Rotate page 1 by 90 degrees

# Remove password
qpdf --password=mypassword --decrypt encrypted.pdf decrypted.pdf
```

### pdftk (if available)
```bash
# Merge
pdftk file1.pdf file2.pdf cat output merged.pdf

# Split
pdftk input.pdf burst

# Rotate
pdftk input.pdf rotate 1east output rotated.pdf
```

## Common Tasks

### Extract Text from Scanned PDFs
```python
# Requires the central runtime plus Tesseract from --with-runtime-deps
import pytesseract
from pdf2image import convert_from_path

# Convert PDF to images
images = convert_from_path('scanned.pdf')

# OCR each page
text = ""
for i, image in enumerate(images):
    text += f"Page {i+1}:\n"
    text += pytesseract.image_to_string(image)
    text += "\n\n"

print(text)
```

### Add Watermark
```python
from pypdf import PdfReader, PdfWriter

# Create watermark (or load existing)
watermark = PdfReader("watermark.pdf").pages[0]

# Apply to all pages
reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark)
    writer.add_page(page)

with open("watermarked.pdf", "wb") as output:
    writer.write(output)
```

### Extract Images
```bash
# Using pdfimages (poppler-utils)
pdfimages -j input.pdf output_prefix

# This extracts all images as output_prefix-000.jpg, output_prefix-001.jpg, etc.
```

### Password Protection
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

# Add password
writer.encrypt("userpassword", "ownerpassword")

with open("encrypted.pdf", "wb") as output:
    writer.write(output)
```

## Quick Reference

| Task | Best Tool | Command/Code |
|------|-----------|--------------|
| Merge PDFs | pypdf | `writer.add_page(page)` |
| Split PDFs | pypdf | One page per file |
| Extract text | pdfplumber | `page.extract_text()` |
| Extract tables | pdfplumber | `page.extract_tables()` |
| Create PDFs | ReportLab | `scripts/create_reportlab_pdf.py` or Platypus |
| Convert files to PDF | convert-to-pdf skill | Route source formats through the conversion skill |
| Command line merge | qpdf | `qpdf --empty --pages ...` |
| OCR scanned PDFs | pytesseract | Convert to image first |
| Fill PDF forms | pdf-lib or pypdf (see `forms.md`) | Read `forms.md` first |

## Next Steps

- For advanced pypdfium2 usage, read `reference.md`
- For JavaScript libraries (pdf-lib), read `reference.md`
- If you need to fill out a PDF form, follow the instructions in `forms.md`
- If you need to convert DOCX, PPTX, XLSX, HTML, images, Markdown, CSV, or text into PDF, use the `convert-to-pdf` skill
- For troubleshooting guides, read `reference.md`

## Dependencies

- Central runtime Python packages from `runtime/python-requirements.txt`: ReportLab, pypdf, pdfplumber, pdf2image, Pillow, mistune, pytesseract, pandas, openpyxl, defusedxml, lxml, markitdown, imageio, and numpy.
- Poppler (`pdftotext`, `pdfimages`, `pdftoppm`) - command-line extraction and image conversion.
- Tesseract (`tesseract`) - OCR for scanned PDFs through pytesseract.
- `qpdf` - robust command-line PDF manipulation.
- Optional Markdown/HTML→PDF engines (via the `convert-to-pdf` skill, not installed by default): pandoc, a LaTeX engine (TinyTeX `xelatex`), `weasyprint`, `wkhtmltopdf`, Chrome/Chromium, and global `mermaid-filter`. Install with `bash bin/install-opencode-conductor.sh --with-pdf-engines`.
