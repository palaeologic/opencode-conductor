---
name: convert-to-pdf
description: Convert common source files into PDF. Use when the user asks to convert Markdown, text, HTML, images, CSV/TSV, DOC/DOCX, PPT/PPTX, XLS/XLSX, OpenDocument files, or other common inputs to PDF. Route source editing to docx, pptx, xlsx, or pdf skills first when needed.
---

# Convert To PDF

## OpenCode Resource Handling

OpenCode loads this `SKILL.md` on demand. Supporting files in this folder are not preloaded; read or run them only when the task needs them. Resolve paths relative to this skill directory. After installation it lives under `<config-root>/skills/convert-to-pdf/`; in this repo it is `skills/convert-to-pdf/`.

When running bundled scripts, either `cd` into the skill directory first or prefix the script path. Keep user inputs and generated PDFs in the user's working project or a requested output directory, not inside the skill directory.

## Central Runtime

Prefer the central OpenCode runtime created by `bash bin/install-opencode-conductor.sh --with-runtime-deps`.
Use `$OPENCODE_HOME/bin/opencode-python` (default config root: `~/.config/opencode`) for conversion helpers and do not install conversion dependencies into the current project repo.

## Responsibility Boundary

Use this skill when the primary task is "turn this source file into a PDF."

Use sibling skills first when the source needs domain-specific editing before export:

- `docx` for Word document repair, comments, redlines, or source formatting.
- `pptx` for slide layout work or visual QA before PDF export.
- `xlsx` for formulas, spreadsheet formatting, recalculation, or workbook validation.
- `pdf` for existing PDF manipulation or native ReportLab PDF generation.

## Quality Rules

- Preserve Unicode, including Swedish characters (`å`, `ä`, `ö`, `Å`, `Ä`, `Ö`). For generated Markdown/text/CSV PDFs, prefer the PDF skill's ReportLab generator because it embeds a TrueType/OpenType font.
- Avoid orphan headers. Headers must not be the last item on a page. For generated PDFs, use the ReportLab generator's heading styles; for Office/HTML conversions, fix pagination in the source and visually verify the PDF.
- Use UTF-8 for text inputs. If the source encoding is uncertain, inspect or convert it before producing the PDF.
- For final deliverables with non-trivial layout, render or open the resulting PDF and spot-check tables, lists, page breaks, fonts, and Swedish text.

## Conversion Matrix

| Source | Primary path | Notes |
| --- | --- | --- |
| Markdown (`.md`, `.markdown`) | `python scripts/convert_to_pdf.py input.md output.pdf` | Defaults to the PDF skill's ReportLab generator (headings, paragraphs, lists, fenced code, simple pipe tables). Pass `--engine` to render via pandoc/LaTeX, WeasyPrint, wkhtmltopdf, or Chrome instead. |
| Plain text (`.txt`) | `python scripts/convert_to_pdf.py input.txt output.pdf` | Treats blank-line-separated text as paragraphs. Honors `--engine`. |
| CSV/TSV | `python scripts/convert_to_pdf.py input.csv output.pdf` | Renders a simple table through the ReportLab generator. Use `xlsx` first if formulas or spreadsheet semantics matter. |
| Images (`.png`, `.jpg`, `.jpeg`, `.tif`, `.tiff`, `.webp`) | `python scripts/convert_to_pdf.py image.png output.pdf` | Uses Pillow to place one or more images into a PDF. |
| Office/OpenDocument (`.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx`, `.odt`, `.ods`, `.odp`, `.rtf`) | `python scripts/convert_to_pdf.py input.docx output.pdf` | Uses LibreOffice via `scripts/office/soffice.py`. |
| HTML (`.html`, `.htm`) | `python scripts/convert_to_pdf.py input.html output.pdf` | Uses pandoc by default. Pass `--engine chrome` (or `pandoc-weasyprint` / `pandoc-wkhtmltopdf`) when CSS fidelity is critical. |
| Existing PDF (`.pdf`) | `python scripts/convert_to_pdf.py input.pdf output.pdf` | Copies the PDF. Use the `pdf` skill for merge/split/rotate/watermark/encryption. |

## Engine Selection

For Markdown, text, and HTML sources you can choose **how** the PDF is produced
with `--engine`. The default is unchanged, so existing invocations behave exactly
as before.

| Engine | Pipeline | Choose it when | Extra dependencies |
| --- | --- | --- | --- |
| `reportlab` (default) | Bundled ReportLab generator | You want a dependency-light, Unicode-safe PDF with no system toolchain. | None beyond the central runtime. |
| `pandoc-latex` | pandoc → LaTeX (`xelatex`) | You want the best typography, real section/figure layout, and **Mermaid** diagrams. | pandoc + a LaTeX engine (TinyTeX `xelatex` recommended). |
| `pandoc-weasyprint` | pandoc → HTML → WeasyPrint | You want CSS-styled output without a browser, good for web-like layouts. | pandoc + `weasyprint` (pip). |
| `pandoc-wkhtmltopdf` | pandoc → HTML → wkhtmltopdf | You need a fast HTML/CSS renderer and have wkhtmltopdf available. | pandoc + `wkhtmltopdf`. |
| `chrome` | Markdown/HTML → headless Chrome print-to-PDF | You need pixel-faithful CSS, web fonts, or client-rendered content, including Mermaid. | Google Chrome or Chromium (and pandoc for Markdown input). |
| `auto` | First available of latex → weasyprint → wkhtmltopdf → chrome → reportlab | You want the best engine that happens to be installed. | None required (falls back to reportlab). |

If a requested engine's dependencies are missing, the helper exits with a clear
message naming the install command. `--engine auto` instead degrades along the
priority order above and always succeeds via ReportLab.

### Agent decision rules: ask vs. auto-pick

Do not silently guess when the engine materially changes the result. Use this
policy:

**Ask the user which engine to use when any of these hold:**

- The PDF is a final or shared deliverable (report, brief, anything a human reviews).
- The source contains Mermaid diagrams, complex CSS, custom fonts, or heavy tables where fidelity matters.
- More than one engine is installed and the choice would visibly change the output.

When asking, offer the relevant engines with a one-line tradeoff each (typography
vs. CSS fidelity vs. no-extra-deps) rather than an open-ended question.

**Auto-pick without asking when any of these hold:**

- It is a quick or internal conversion where appearance is not important.
- The user already named an engine, a format ("LaTeX", "via Chrome"), or a fidelity goal.
- Only one engine's dependencies are present (use it; otherwise fall back to `reportlab`).

**Default:** if the request is simple and unspecified, use `reportlab` (the
script default) and mention that a higher-fidelity engine is available.

**Intent → engine mapping** (use when the user expresses a goal, not an engine):

| User says (intent) | Use engine |
| --- | --- |
| "publication quality", "best typography", "academic", "with diagrams" | `pandoc-latex` |
| "match this web page", "keep the CSS", "pixel-perfect", "web fonts" | `chrome` |
| "styled like HTML/CSS but no browser" | `pandoc-weasyprint` |
| "fast", "simple HTML to PDF" | `pandoc-wkhtmltopdf` |
| "no extra installs", "just make a PDF", "quick" | `reportlab` |
| "use whatever works" | `auto` |

### Workflows: one-step vs. inspect-the-markup-first

**One-step (default).** The helper goes straight from source to PDF in a single
command. This is what `--engine` does and is the right choice unless the user
wants to review or hand-tune the intermediate markup.

```bash
python scripts/convert_to_pdf.py input.md output.pdf --engine pandoc-latex --mermaid on
```

**Two-step (inspect/edit the intermediate `.tex` or HTML first).** When the user
asks to "create the LaTeX/HTML markup first, then the PDF" (e.g. to tweak a
preamble or CSS before rendering), produce the intermediate artifact with pandoc,
let the user inspect/edit it, then render that artifact:

```bash
# Markdown -> LaTeX source -> PDF
pandoc input.md -o draft.tex                       # (Mermaid is expanded here; add -F mermaid-filter if needed)
#   ...inspect / edit draft.tex (e.g. preamble, packages)...
pandoc draft.tex -o output.pdf --pdf-engine=xelatex

# Markdown -> standalone HTML/CSS -> PDF
pandoc input.md -s -o draft.html                   # add -F mermaid-filter for Mermaid
#   ...inspect / tune the CSS in draft.html...
python scripts/convert_to_pdf.py draft.html output.pdf --engine chrome
```

Notes:
- Mermaid runs at the **Markdown → intermediate** step, so pass `-F mermaid-filter`
  there (or use the helper's `--mermaid` on a Markdown source).
- The helper itself is one-shot; the two-step path is run as the raw pandoc
  commands above, with the final render optionally going back through the helper
  for the HTML/Chrome case.

### Mermaid diagrams

The `pandoc-latex`, `pandoc-weasyprint`, `pandoc-wkhtmltopdf`, and `chrome`
engines can render fenced ` ```mermaid ` blocks as diagrams when the global
[`mermaid-filter`](https://github.com/raghur/mermaid-filter) is on `PATH`.
Control this with `--mermaid {auto,on,off}` (default `auto`: use it when present).
`mermaid-filter` drives a headless Chrome/Chromium to render diagrams; it reads a
`.puppeteer.json` from the working directory, e.g.:

```json
{"executablePath":"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome","args":["--no-sandbox"]}
```

The helper runs pandoc with the source directory as the working directory so the
`.puppeteer.json` and any relative assets resolve correctly. If `mermaid-filter`
is absent and `--mermaid auto` is in effect, Mermaid blocks fall back to plain
fenced code rather than failing.

## Bundled Helper

```bash
python scripts/convert_to_pdf.py <input> <output.pdf>
```

Optional flags:

```bash
# Default ReportLab engine (unchanged behavior)
python scripts/convert_to_pdf.py input.md output.pdf --title "Åäö Report" --font /path/to/NotoSans-Regular.ttf

# Pandoc + LaTeX with Mermaid and an extra LaTeX header
python scripts/convert_to_pdf.py input.md output.pdf --engine pandoc-latex --mermaid on --header-includes style.tex

# Headless Chrome for an HTML source
python scripts/convert_to_pdf.py page.html output.pdf --engine chrome

# Let the helper pick the best installed engine
python scripts/convert_to_pdf.py input.md output.pdf --engine auto

python scripts/convert_to_pdf.py input.docx output.pdf --soffice-timeout 120
```

The helper is deliberately pragmatic. If it reports that a converter is missing, rerun the conductor installer with `--with-runtime-deps` or choose the appropriate source-format skill and export path.

## Dependencies

- Central runtime Python packages from `runtime/python-requirements.txt` - ReportLab, Pillow, PDF helpers, Markdown parsing, and OCR helpers.
- LibreOffice (`soffice`) - Office and OpenDocument conversion.
- pandoc - HTML conversion, complex Markdown, and all `pandoc-*` / `chrome` engines.
- Poppler (`pdftoppm`, `pdftotext`) - optional PDF/image verification.

### Optional engine toolchains

These are **not** installed by default. Install only the engines you intend to
use, then select them with `--engine`. The conductor installer can add them via
`bash bin/install-opencode-conductor.sh --with-pdf-engines`.

- `pandoc-latex`: a LaTeX engine. TinyTeX (`xelatex`) is recommended over full
  MacTeX/TeX Live; ensure its `bin` directory is on `PATH`.
- `pandoc-weasyprint`: `weasyprint` from the optional Python group
  (`runtime/python-requirements-pdf-engines.txt`), installable with
  `$OPENCODE_HOME/bin/opencode-pip install weasyprint`.
- `pandoc-wkhtmltopdf`: `wkhtmltopdf` from your OS package manager.
- `chrome`: Google Chrome or Chromium.
- Mermaid rendering (any pandoc/chrome engine): global `mermaid-filter`
  (`npm install -g mermaid-filter`) plus a Chrome/Chromium it can drive.
