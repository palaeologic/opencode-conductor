#!/usr/bin/env python3
"""Estimate the static prompt footprint of Conductor commands, skills, and rules."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BYTES_PER_PROXY_TOKEN = 4


def proxy_tokens(byte_count: int) -> int:
    """Return a provider-neutral planning estimate, rounded up."""

    return math.ceil(byte_count / BYTES_PER_PROXY_TOKEN)


def collect(pattern: str, name_from_path) -> dict:
    items = []
    for path in sorted(ROOT.glob(pattern)):
        byte_count = len(path.read_bytes())
        items.append(
            {
                "name": name_from_path(path),
                "path": path.relative_to(ROOT).as_posix(),
                "bytes": byte_count,
                "proxy_tokens": proxy_tokens(byte_count),
            }
        )
    total_bytes = sum(item["bytes"] for item in items)
    return {
        "items": items,
        "count": len(items),
        "total_bytes": total_bytes,
        "proxy_tokens": proxy_tokens(total_bytes),
    }


def build_report() -> dict:
    commands = collect("commands/*.md", lambda path: path.stem)
    skills = collect("skills/*/SKILL.md", lambda path: path.parent.name)
    rules = collect("rules/*.md", lambda path: path.stem)

    config = json.loads((ROOT / "opencode.json.template").read_text(encoding="utf-8"))
    enabled_paths = {
        Path(instruction).name
        for instruction in config.get("instructions", [])
        if "/rules/" in instruction
    }
    enabled_items = [
        item for item in rules["items"] if Path(item["path"]).name in enabled_paths
    ]
    enabled_bytes = sum(item["bytes"] for item in enabled_items)

    return {
        "estimator": {
            "formula": "ceil(UTF-8 bytes / 4)",
            "bytes_per_proxy_token": BYTES_PER_PROXY_TOKEN,
            "warning": (
                "Planning proxy only. Provider tokenizers, injected tool schemas, "
                "reasoning tokens, cache behavior, and runtime context change billed usage."
            ),
        },
        "commands": commands,
        "skills": skills,
        "rules": rules,
        "default_enabled_rules": {
            "items": enabled_items,
            "count": len(enabled_items),
            "total_bytes": enabled_bytes,
            "proxy_tokens": proxy_tokens(enabled_bytes),
        },
    }


def render_section(title: str, section: dict) -> list[str]:
    lines = [
        f"## {title}",
        "",
        "| Name | File | UTF-8 bytes | Proxy tokens |",
        "| --- | --- | ---: | ---: |",
    ]
    for item in section["items"]:
        lines.append(
            f"| `{item['name']}` | `{item['path']}` | "
            f"{item['bytes']:,} | {item['proxy_tokens']:,} |"
        )
    lines.extend(
        [
            "",
            f"Total: **{section['count']} files**, "
            f"**{section['total_bytes']:,} bytes**, "
            f"**~{section['proxy_tokens']:,} proxy tokens**.",
            "",
        ]
    )
    return lines


def render_markdown(report: dict) -> str:
    enabled = report["default_enabled_rules"]
    lines = [
        "# Static prompt footprint",
        "",
        f"Estimator: `{report['estimator']['formula']}`.",
        "",
        f"> {report['estimator']['warning']}",
        "",
    ]
    lines.extend(render_section("Commands", report["commands"]))
    lines.extend(render_section("Skills", report["skills"]))
    lines.extend(render_section("Rules", report["rules"]))
    enabled_names = ", ".join(f"`{item['name']}`" for item in enabled["items"])
    lines.extend(
        [
            "## Default enabled rules",
            "",
            f"{enabled_names}",
            "",
            f"Total: **{enabled['count']} files**, "
            f"**{enabled['total_bytes']:,} bytes**, "
            f"**~{enabled['proxy_tokens']:,} proxy tokens**.",
            "",
        ]
    )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--format",
        choices=("markdown", "json"),
        default="markdown",
        help="Output format (default: markdown).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = build_report()
    if args.format == "json":
        print(json.dumps(report, indent=2))
    else:
        print(render_markdown(report), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
