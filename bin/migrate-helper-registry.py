#!/usr/bin/env python3
"""Preview or apply a compatibility-preserving branch-helper registry migration."""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

COMMON_HELPER_FILES = {"MERGE_REQUEST.md", "MR.md", "LOG.md", "PHASES.md", "REVIEW.md"}
LEGACY_HANDOFF_FIELDS = {
    "mrFilename",
    "mrFilenames",
    "logFilename",
    "phasesFilename",
    "reviewFilename",
    "mrTemplateFilename",
    "logTemplateFilename",
    "phasesTemplateFilename",
    "mrBranchPlaceholder",
}


def expand_path(value: str) -> Path:
    return Path(os.path.expanduser(value)).resolve()


def atomic_json_write(path: Path, value: dict[str, Any], mode: int = 0o600) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            json.dump(value, stream, indent=2)
            stream.write("\n")
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def safe_relative_path(value: str) -> bool:
    candidate = Path(value)
    return (
        bool(value)
        and value != "."
        and "\\" not in value
        and not re.match(r"^[A-Za-z]:", value)
        and not candidate.is_absolute()
        and ".." not in candidate.parts
    )


def has_symlink_component(root: Path, candidate: Path) -> bool:
    try:
        relative = candidate.relative_to(root)
    except ValueError:
        return True
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            return True
    return False


def legacy_helper_definitions(handoff: dict[str, Any]) -> dict[str, dict[str, Any]]:
    raw_mr_names = handoff.get("mrFilenames")
    if isinstance(raw_mr_names, list) and raw_mr_names:
        mr_names = [str(value) for value in raw_mr_names]
    elif isinstance(handoff.get("mrFilename"), str):
        mr_names = [str(handoff["mrFilename"])]
    else:
        mr_names = ["MERGE_REQUEST.md"]

    helpers: dict[str, dict[str, Any]] = {}
    for index, filename in enumerate(mr_names):
        if not safe_relative_path(filename):
            continue
        helper_id = "mergeRequest" if index == 0 else f"mergeRequest{index + 1}"
        helpers[helper_id] = {
            "filename": filename,
            "templateFilename": handoff.get("mrTemplateFilename", "MERGE_REQUEST.md")
            if index == 0
            else filename,
            "role": "merge_request",
            "bootstrap": "ask" if index == 0 else "never",
            "branchPlaceholder": handoff.get("mrBranchPlaceholder", "<branch-name>"),
            "description": "Local change-request context.",
        }

    fixed = [
        (
            "log",
            "log",
            str(handoff.get("logFilename", "LOG.md")),
            str(handoff.get("logTemplateFilename", "LOG.md")),
            "Progress log for checkpoints and handoffs.",
        ),
        (
            "review",
            "review",
            str(handoff.get("reviewFilename", "REVIEW.md")),
            None,
            "Structured review notes and triage.",
        ),
        (
            "phasePlan",
            "phases",
            str(handoff.get("phasesFilename", "PHASES.md")),
            str(handoff.get("phasesTemplateFilename", "PHASES.md")),
            "Optional staged phase plan.",
        ),
    ]
    for helper_id, role, filename, template, description in fixed:
        if not safe_relative_path(filename):
            continue
        definition: dict[str, Any] = {
            "filename": filename,
            "role": role,
            "bootstrap": "ask" if role in {"log", "phases"} else "never",
            "description": description,
        }
        if template:
            definition["templateFilename"] = template
        helpers[helper_id] = definition
    return helpers


def helper_definitions(descriptor: dict[str, Any]) -> dict[str, dict[str, Any]]:
    handoff = descriptor.setdefault("branchHandoff", {})
    existing = handoff.get("helpers")
    if isinstance(existing, dict) and existing:
        handoff.setdefault("helperManifestFilename", "HELPERS.json")
        descriptor["descriptorSchemaVersion"] = 3
        return existing
    helpers = legacy_helper_definitions(handoff)
    handoff["helpers"] = helpers
    handoff.setdefault("helperManifestFilename", "HELPERS.json")
    descriptor["descriptorSchemaVersion"] = 3
    return helpers


def context_root(
    descriptor: dict[str, Any],
    project_key: str,
    override: str | None,
) -> Path:
    if override:
        return expand_path(override)
    template = str(
        descriptor.get("branchHandoff", {}).get(
            "contextDirTemplate",
            f"~/.config/opencode/projects/{project_key}/branches/{{branchName}}",
        )
    ).replace("{projectKey}", project_key)
    if template.count("{branchName}") != 1:
        raise ValueError("contextDirTemplate must contain one {branchName}; pass --branches-dir to override")
    marker = "__BRANCH_NAME__"
    expanded = expand_path(template.replace("{branchName}", marker))
    if expanded.name != marker:
        raise ValueError("{branchName} must be the final path segment; pass --branches-dir to override")
    return expanded.parent


def discover_branch_dirs(root: Path, helpers: dict[str, dict[str, Any]]) -> list[Path]:
    if not root.exists():
        return []
    filenames = {
        str(definition.get("filename"))
        for definition in helpers.values()
        if isinstance(definition, dict) and safe_relative_path(str(definition.get("filename", "")))
    }
    filenames |= COMMON_HELPER_FILES
    branch_dirs: set[Path] = set()
    for filename in filenames:
        if "/" in filename:
            for match in root.rglob(Path(filename).name):
                if match.is_file() and match.as_posix().endswith(filename):
                    branch_dirs.add(match.parents[len(Path(filename).parts) - 1])
        else:
            for match in root.rglob(filename):
                if match.is_file():
                    branch_dirs.add(match.parent)
    return sorted(branch_dirs)


def load_manifest(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"schemaVersion": 1, "helpers": {}}
    data = json.loads(path.read_text(encoding="utf-8"))
    if (
        not isinstance(data, dict)
        or data.get("schemaVersion", 1) != 1
        or not isinstance(data.get("helpers"), dict)
    ):
        raise ValueError(f"invalid helper manifest: {path}")
    for helper_id, entry in data["helpers"].items():
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", helper_id):
            raise ValueError(f"invalid helper id in manifest: {path}")
        if not isinstance(entry, dict) or not safe_relative_path(str(entry.get("path", ""))):
            raise ValueError(f"invalid helper entry in manifest: {path}")
        if entry.get("state", "present") not in {"present", "missing", "removed"}:
            raise ValueError(f"invalid helper state in manifest: {path}")
    data["schemaVersion"] = 1
    return data


def reconcile_manifest(
    branch_dir: Path,
    helpers: dict[str, dict[str, Any]],
    manifest_filename: str,
) -> tuple[dict[str, Any], list[str], list[str]]:
    manifest_path = branch_dir / manifest_filename
    if has_symlink_component(branch_dir, manifest_path):
        raise ValueError(f"symbolic link refused: {manifest_path}")
    manifest = load_manifest(manifest_path)
    timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    tracked: list[str] = []
    ambiguous: list[str] = []
    supported_filenames: set[str] = set()

    for helper_id, definition in helpers.items():
        if not isinstance(definition, dict):
            continue
        filename = str(definition.get("filename", ""))
        if not safe_relative_path(filename):
            continue
        supported_filenames.add(filename)
        helper_path = branch_dir / filename
        if has_symlink_component(branch_dir, helper_path):
            raise ValueError(f"symbolic link refused: {helper_path}")
        if helper_path.is_file():
            current = manifest["helpers"].get(helper_id)
            if not (
                isinstance(current, dict)
                and current.get("path") == filename
                and current.get("state", "present") == "present"
            ):
                manifest["helpers"][helper_id] = {
                    "path": filename,
                    "state": "present",
                    "updatedAt": timestamp,
                    "lastSeenAt": timestamp,
                }
            tracked.append(helper_id)

    for filename in sorted(COMMON_HELPER_FILES - supported_filenames):
        helper_path = branch_dir / filename
        if has_symlink_component(branch_dir, helper_path):
            raise ValueError(f"symbolic link refused: {helper_path}")
        if helper_path.is_file():
            ambiguous.append(filename)
    return manifest, tracked, ambiguous


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-key", required=True)
    parser.add_argument("--target-root", default=os.environ.get("OPENCODE_HOME", "~/.config/opencode"))
    parser.add_argument("--descriptor")
    parser.add_argument("--branches-dir")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", args.project_key):
        raise SystemExit("invalid project key")

    target_root = expand_path(args.target_root)
    descriptor_path = (
        expand_path(args.descriptor)
        if args.descriptor
        else target_root / "projects" / args.project_key / "descriptor.json"
    )
    descriptor = json.loads(descriptor_path.read_text(encoding="utf-8"))
    if not isinstance(descriptor, dict):
        raise SystemExit("descriptor must be a JSON object")
    if descriptor.get("projectKey") not in {None, args.project_key}:
        raise SystemExit("descriptor projectKey does not match --project-key")
    original_descriptor = copy.deepcopy(descriptor)
    helpers = helper_definitions(descriptor)
    if not helpers:
        raise SystemExit("descriptor produced no safe helper definitions")
    handoff = descriptor["branchHandoff"]
    manifest_filename = str(handoff.get("helperManifestFilename", "HELPERS.json"))
    if not safe_relative_path(manifest_filename):
        raise SystemExit("unsafe helper manifest filename")

    branches_root = context_root(descriptor, args.project_key, args.branches_dir)
    branch_dirs = discover_branch_dirs(branches_root, helpers)
    mode = "apply" if args.apply else "dry-run"
    print(f"mode: {mode}")
    print(f"descriptor: {descriptor_path}")
    print(f"branches: {branches_root}")
    print(f"legacy_fields_preserved: {bool(LEGACY_HANDOFF_FIELDS & set(handoff))}")

    if args.apply and descriptor != original_descriptor:
        atomic_json_write(descriptor_path, descriptor)

    manifests = 0
    ambiguous_total = 0
    for branch_dir in branch_dirs:
        try:
            if has_symlink_component(branches_root, branch_dir):
                raise ValueError(f"symbolic link refused in branch path: {branch_dir}")
            manifest, tracked, ambiguous = reconcile_manifest(branch_dir, helpers, manifest_filename)
        except (OSError, ValueError, json.JSONDecodeError) as error:
            print(f"branch: {branch_dir} error={error}")
            continue
        if tracked:
            manifests += 1
            if args.apply:
                manifest_path = branch_dir / manifest_filename
                existing_manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else None
                if existing_manifest != manifest:
                    atomic_json_write(manifest_path, manifest)
        ambiguous_total += len(ambiguous)
        print(
            f"branch: {branch_dir.relative_to(branches_root)} "
            f"tracked={','.join(tracked) or 'none'} "
            f"ambiguous={','.join(ambiguous) or 'none'}"
        )

    print(
        f"summary: branches={len(branch_dirs)} "
        f"manifests={'written' if args.apply else 'would_write'}:{manifests} "
        f"ambiguous_files={ambiguous_total}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
