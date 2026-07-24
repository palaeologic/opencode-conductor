#!/usr/bin/env python3
"""Convert common source formats to PDF.

This dispatcher intentionally routes to existing, format-appropriate tools
instead of pretending one library can render every source format faithfully.
"""

from __future__ import annotations

import argparse
import csv
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterable

from office.soffice import run_soffice


OFFICE_EXTENSIONS = {
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".odt",
    ".ods",
    ".odp",
    ".rtf",
}
MARKDOWN_EXTENSIONS = {".md", ".markdown"}
TEXT_EXTENSIONS = {".txt"}
CSV_EXTENSIONS = {".csv", ".tsv"}
HTML_EXTENSIONS = {".html", ".htm"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp", ".gif"}

# PDF-generation engines selectable via --engine. "reportlab" is the default and
# keeps the historical behavior unchanged. The pandoc-* and chrome engines trade
# extra system dependencies for better typography, CSS fidelity, or Mermaid
# diagram rendering.
RENDER_ENGINES = (
    "reportlab",
    "pandoc-latex",
    "pandoc-weasyprint",
    "pandoc-wkhtmltopdf",
    "chrome",
)
# Priority order used when --engine auto is requested: best fidelity first,
# dependency-light ReportLab last as the always-available fallback.
AUTO_ENGINE_ORDER = (
    "pandoc-latex",
    "pandoc-weasyprint",
    "pandoc-wkhtmltopdf",
    "chrome",
    "reportlab",
)

# Candidate executables for a headless Chrome / Chromium print-to-PDF path.
CHROME_CANDIDATES = (
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
)
# Candidate LaTeX engines for the pandoc-latex path, preferring xelatex (TinyTeX).
LATEX_ENGINE_CANDIDATES = ("xelatex", "tectonic", "lualatex", "pdflatex")


def convert(args: argparse.Namespace) -> None:
    source = Path(args.input).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()
    if not source.exists():
        raise FileNotFoundError(f"input not found: {source}")
    if output.suffix.lower() != ".pdf":
        raise ValueError("output path must end in .pdf")

    output.parent.mkdir(parents=True, exist_ok=True)
    ext = source.suffix.lower()

    if ext in MARKDOWN_EXTENSIONS:
        convert_markdown(source, output, args)
    elif ext in TEXT_EXTENSIONS:
        convert_text(source, output, args)
    elif ext in CSV_EXTENSIONS:
        convert_csv(source, output, args)
    elif ext in IMAGE_EXTENSIONS:
        convert_image(source, output)
    elif ext in OFFICE_EXTENSIONS:
        convert_office(source, output, args.soffice_timeout)
    elif ext in HTML_EXTENSIONS:
        convert_html(source, output, args)
    elif ext == ".pdf":
        if source != output:
            shutil.copyfile(source, output)
    else:
        raise ValueError(
            f"unsupported input extension {ext!r}; use a source-specific skill "
            "or convert through Markdown, HTML, Office, image, CSV/TSV, or PDF"
        )

    print(f"Wrote {output}")


def convert_markdown(source: Path, output: Path, args: argparse.Namespace) -> None:
    engine = resolve_engine(getattr(args, "engine", "reportlab"))
    if engine == "reportlab":
        convert_markdown_reportlab(source, output, args)
    elif engine in {"pandoc-latex", "pandoc-weasyprint", "pandoc-wkhtmltopdf"}:
        convert_markdown_pandoc(source, output, args, engine)
    elif engine == "chrome":
        convert_markdown_chrome(source, output, args)
    else:  # pragma: no cover - resolve_engine validates the value
        raise ValueError(f"unknown engine {engine!r}")


def convert_markdown_reportlab(source: Path, output: Path, args: argparse.Namespace) -> None:
    command = [
        sys.executable,
        str(pdf_generator_script()),
        str(output),
        "--from-markdown",
        str(source),
        "--title",
        args.title or source.stem,
        "--page-size",
        args.page_size,
    ]
    if args.font:
        command.extend(["--font", args.font])
    if args.bold_font:
        command.extend(["--bold-font", args.bold_font])
    run(command)


def convert_markdown_pandoc(
    source: Path, output: Path, args: argparse.Namespace, engine: str
) -> None:
    """Render Markdown via pandoc, choosing the PDF backend by engine name."""
    pandoc = require_executable(
        "pandoc",
        "pandoc is required for the pandoc-* engines. Install it with your OS "
        "package manager (e.g. `brew install pandoc`) or rerun the installer "
        "with --with-runtime-deps.",
    )
    command = [pandoc, str(source), "-o", str(output)]

    if engine == "pandoc-latex":
        latex_engine = find_first_executable(LATEX_ENGINE_CANDIDATES)
        if not latex_engine:
            raise RuntimeError(
                "pandoc-latex needs a LaTeX engine (xelatex/tectonic/lualatex/pdflatex). "
                "Install TinyTeX (https://yihui.org/tinytex/) and ensure its bin dir is on "
                "PATH, then retry; or choose --engine pandoc-weasyprint / chrome."
            )
        command += [f"--pdf-engine={Path(latex_engine).name}"]
        # Conservative, readable defaults. Section numbering is left OFF on
        # purpose: sources that already carry manual numbers would otherwise be
        # double-numbered.
        command += [
            "-V", "geometry:margin=22mm",
            "-V", "colorlinks=true",
            "-V", "linkcolor=NavyBlue",
            "-V", "urlcolor=NavyBlue",
        ]
    elif engine == "pandoc-weasyprint":
        require_python_module(
            "weasyprint",
            "weasyprint is required for --engine pandoc-weasyprint. Install it with "
            "the central opencode-pip wrapper or rerun the "
            "installer with --with-pdf-engines.",
        )
        command += ["--pdf-engine=weasyprint"]
    elif engine == "pandoc-wkhtmltopdf":
        require_executable(
            "wkhtmltopdf",
            "wkhtmltopdf is required for --engine pandoc-wkhtmltopdf. Install it with "
            "your OS package manager (e.g. `brew install wkhtmltopdf`) or rerun the "
            "installer with --with-pdf-engines.",
        )
        command += ["--pdf-engine=wkhtmltopdf"]

    if args.title:
        command += ["-V", f"title={args.title}", "--metadata", f"title={args.title}"]
    if mermaid_filter_arg(args):
        command += ["-F", mermaid_filter_arg(args)]
    if getattr(args, "header_includes", None):
        command += ["-H", str(Path(args.header_includes).expanduser())]

    run_in_source_dir(command, source)


def convert_markdown_chrome(source: Path, output: Path, args: argparse.Namespace) -> None:
    """Markdown -> standalone HTML -> headless Chrome print-to-PDF."""
    pandoc = require_executable(
        "pandoc",
        "pandoc is used to turn Markdown into HTML for the chrome engine. Install it "
        "with your OS package manager, or pass an .html source directly.",
    )
    with tempfile.TemporaryDirectory(prefix="md2chrome_") as tmp:
        html_path = Path(tmp) / "doc.html"
        html_cmd = [pandoc, str(source), "-s", "-o", str(html_path)]
        if mermaid_filter_arg(args):
            html_cmd += ["-F", mermaid_filter_arg(args)]
        if args.title:
            html_cmd += ["--metadata", f"title={args.title}"]
        run_in_source_dir(html_cmd, source)
        convert_html_chrome(html_path, output)


def convert_text(source: Path, output: Path, args: argparse.Namespace) -> None:
    text = source.read_text(encoding=args.encoding)
    with tempfile.NamedTemporaryFile("w", suffix=".md", encoding="utf-8", delete=False) as tmp:
        tmp.write(text)
        tmp_path = Path(tmp.name)
    try:
        markdown_args = argparse.Namespace(**vars(args))
        markdown_args.title = args.title or source.stem
        convert_markdown(tmp_path, output, markdown_args)
    finally:
        tmp_path.unlink(missing_ok=True)


def convert_csv(source: Path, output: Path, args: argparse.Namespace) -> None:
    delimiter = "\t" if source.suffix.lower() == ".tsv" else ","
    with source.open("r", encoding=args.encoding, newline="") as handle:
        rows = list(csv.reader(handle, delimiter=delimiter))

    markdown = csv_rows_to_markdown(rows, source.stem)
    with tempfile.NamedTemporaryFile("w", suffix=".md", encoding="utf-8", delete=False) as tmp:
        tmp.write(markdown)
        tmp_path = Path(tmp.name)
    try:
        markdown_args = argparse.Namespace(**vars(args))
        markdown_args.title = args.title or source.stem
        convert_markdown(tmp_path, output, markdown_args)
    finally:
        tmp_path.unlink(missing_ok=True)


def csv_rows_to_markdown(rows: list[list[str]], title: str) -> str:
    if not rows:
        return f"# {title}\n\nEmpty table.\n"

    column_count = max(len(row) for row in rows)
    normalized = [row + [""] * (column_count - len(row)) for row in rows]
    header = normalized[0]
    body = normalized[1:] or [[""] * column_count]

    def cell(value: str) -> str:
        return value.replace("|", "\\|").replace("\n", " ").strip()

    lines = [f"# {title}", ""]
    lines.append("| " + " | ".join(cell(value) for value in header) + " |")
    lines.append("| " + " | ".join("---" for _ in header) + " |")
    for row in body:
        lines.append("| " + " | ".join(cell(value) for value in row) + " |")
    lines.append("")
    return "\n".join(lines)


def convert_image(source: Path, output: Path) -> None:
    try:
        from PIL import Image, ImageSequence
    except ImportError as exc:
        raise RuntimeError(
            "Pillow is required for image-to-PDF conversion. "
            "Run bin/install-opencode-conductor.sh --with-runtime-deps from the conductor repo."
        ) from exc

    with Image.open(source) as image:
        frames = [normalize_image(frame.copy()) for frame in ImageSequence.Iterator(image)]

    if not frames:
        raise RuntimeError(f"no image frames found in {source}")

    first, *rest = frames
    first.save(output, "PDF", save_all=True, append_images=rest, resolution=100.0)


def normalize_image(image):
    from PIL import Image

    if image.mode in {"RGBA", "LA"}:
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        return background
    return image.convert("RGB")


def convert_office(source: Path, output: Path, timeout: int) -> None:
    with tempfile.TemporaryDirectory(prefix="convert_to_pdf_") as tmp:
        tmp_path = Path(tmp)
        result = run_soffice(
            [
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                str(tmp_path),
                str(source),
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            raise RuntimeError(f"LibreOffice conversion failed:\n{result.stderr or result.stdout}")

        candidates = sorted(tmp_path.glob("*.pdf"))
        if not candidates:
            raise RuntimeError(f"LibreOffice did not create a PDF for {source}")
        shutil.move(str(candidates[0]), output)


def convert_html(source: Path, output: Path, args: argparse.Namespace) -> None:
    """Convert an HTML source to PDF using the selected engine.

    The default engine for HTML is pandoc. WeasyPrint, wkhtmltopdf, and Chrome
    give higher CSS fidelity; Chrome is the most faithful for complex CSS and
    client-side rendered content.
    """
    requested = getattr(args, "engine", "reportlab")
    # ReportLab cannot render HTML; fall back to pandoc for the default case so
    # that `--engine reportlab some.html` still produces a PDF.
    engine = "pandoc-latex" if requested == "reportlab" else resolve_engine(requested)

    if engine == "chrome":
        convert_html_chrome(source, output)
        return
    if engine == "pandoc-weasyprint":
        require_python_module(
            "weasyprint",
            "weasyprint is required for --engine pandoc-weasyprint.",
        )
        backend = "weasyprint"
    elif engine == "pandoc-wkhtmltopdf":
        require_executable("wkhtmltopdf", "wkhtmltopdf is required for this engine.")
        backend = "wkhtmltopdf"
    else:
        backend = None  # pandoc default (uses its built-in HTML->PDF path)

    pandoc = require_executable(
        "pandoc",
        "pandoc is required for HTML-to-PDF conversion in this helper. "
        "For CSS-heavy pages, use --engine chrome instead.",
    )
    command = [pandoc, str(source), "-o", str(output)]
    if backend:
        command += [f"--pdf-engine={backend}"]
    run_in_source_dir(command, source)


def convert_html_chrome(source: Path, output: Path) -> None:
    """Print an HTML file to PDF with headless Chrome/Chromium."""
    chrome = find_first_executable(CHROME_CANDIDATES)
    if not chrome:
        raise RuntimeError(
            "No Chrome/Chromium binary found for --engine chrome. Install Google "
            "Chrome or Chromium, or choose --engine pandoc-weasyprint / pandoc-latex."
        )
    source_uri = source.resolve().as_uri()
    command = [
        chrome,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={output}",
        source_uri,
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0 or not output.exists():
        # Older Chrome builds reject --headless=new; retry with legacy flag.
        command[1] = "--headless"
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0 or not output.exists():
            raise RuntimeError(
                f"Headless Chrome print-to-PDF failed:\n{result.stderr or result.stdout}"
            )


def pdf_generator_script() -> Path:
    script = Path(__file__).resolve().parents[2] / "pdf" / "scripts" / "create_reportlab_pdf.py"
    if not script.exists():
        raise FileNotFoundError(f"PDF generator script not found: {script}")
    return script


# --- engine resolution + dependency helpers -------------------------------


def resolve_engine(requested: str) -> str:
    """Validate the requested engine, resolving 'auto' to the best available.

    A concrete engine name is returned as-is (its dependencies are checked later
    by the per-engine converter so the error message can be specific). 'auto'
    walks AUTO_ENGINE_ORDER and returns the first engine whose dependencies are
    present, guaranteeing at least the always-available reportlab fallback.
    """
    if requested == "auto":
        for candidate in AUTO_ENGINE_ORDER:
            if engine_available(candidate):
                return candidate
        return "reportlab"
    if requested not in RENDER_ENGINES:
        raise ValueError(
            f"unknown engine {requested!r}; choose one of "
            f"{', '.join(RENDER_ENGINES)} or 'auto'"
        )
    return requested


def engine_available(engine: str) -> bool:
    """Best-effort availability check used only for --engine auto selection."""
    if engine == "reportlab":
        return True
    if engine == "pandoc-latex":
        return bool(shutil.which("pandoc")) and bool(
            find_first_executable(LATEX_ENGINE_CANDIDATES)
        )
    if engine == "pandoc-weasyprint":
        return bool(shutil.which("pandoc")) and module_available("weasyprint")
    if engine == "pandoc-wkhtmltopdf":
        return bool(shutil.which("pandoc")) and bool(shutil.which("wkhtmltopdf"))
    if engine == "chrome":
        return bool(find_first_executable(CHROME_CANDIDATES))
    return False


def find_first_executable(candidates: Iterable[str]) -> str | None:
    for name in candidates:
        # Absolute path candidate (e.g. macOS .app bundle).
        if "/" in name and Path(name).exists():
            return name
        found = shutil.which(name)
        if found:
            return found
    return None


def require_executable(name: str, message: str) -> str:
    found = name if ("/" in name and Path(name).exists()) else shutil.which(name)
    if not found:
        raise RuntimeError(message)
    return found


def module_available(module: str) -> bool:
    from importlib.util import find_spec

    try:
        return find_spec(module) is not None
    except (ImportError, ValueError):
        return False


def require_python_module(module: str, message: str) -> None:
    if not module_available(module):
        raise RuntimeError(message)


def mermaid_filter_arg(args: argparse.Namespace) -> str | None:
    """Return the mermaid-filter executable to use, honoring --mermaid.

    'off' disables it; 'on' requires it (raising if absent); 'auto' uses it only
    when found on PATH. Mermaid rendering itself needs a Chrome/Chromium that
    mermaid-filter can drive (configured via a .puppeteer.json in the source dir).
    """
    mode = getattr(args, "mermaid", "auto")
    if mode == "off":
        return None
    found = shutil.which("mermaid-filter")
    if mode == "on" and not found:
        raise RuntimeError(
            "--mermaid on requested but mermaid-filter is not on PATH. Install it "
            "globally (`npm install -g mermaid-filter`) or use --mermaid off."
        )
    return found


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def run_in_source_dir(command: list[str], source: Path) -> None:
    """Run a command with cwd set to the source dir.

    mermaid-filter looks for .puppeteer.json relative to the working directory,
    and relative asset paths in Markdown/HTML resolve against the source.
    """
    subprocess.run(command, check=True, cwd=str(source.parent))


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert a common source file to PDF.")
    parser.add_argument("input", help="Source file")
    parser.add_argument("output", help="Output PDF path")
    parser.add_argument(
        "--engine",
        choices=[*RENDER_ENGINES, "auto"],
        default="reportlab",
        help=(
            "PDF-generation engine for Markdown/text/CSV/HTML sources. "
            "'reportlab' (default) is dependency-light; 'pandoc-latex' gives the "
            "best typography and Mermaid support; 'pandoc-weasyprint' and "
            "'pandoc-wkhtmltopdf' render via HTML/CSS; 'chrome' uses headless "
            "Chrome for maximum CSS fidelity; 'auto' picks the best available."
        ),
    )
    parser.add_argument(
        "--mermaid",
        choices=["auto", "on", "off"],
        default="auto",
        help=(
            "Mermaid diagram handling for pandoc/chrome engines. 'auto' (default) "
            "enables mermaid-filter when present; 'on' requires it; 'off' disables it."
        ),
    )
    parser.add_argument(
        "--header-includes",
        help="Path to a LaTeX header file (-H) for the pandoc-latex engine.",
    )
    parser.add_argument("--title", help="Document title for generated Markdown/text/CSV PDFs")
    parser.add_argument("--font", help="Unicode regular font path for generated PDFs")
    parser.add_argument("--bold-font", help="Unicode bold font path for generated PDFs")
    parser.add_argument("--page-size", choices=["letter", "a4"], default="a4")
    parser.add_argument("--encoding", default="utf-8-sig", help="Encoding for text, CSV, and TSV input")
    parser.add_argument("--soffice-timeout", type=int, default=120, help="LibreOffice timeout in seconds")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    try:
        convert(parse_args(argv))
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
