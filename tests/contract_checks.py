#!/usr/bin/env python3
"""Executable compatibility and safety checks for the generic conductor."""

from __future__ import annotations

import json
import importlib.util
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.parse
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True


def run(
    command: list[str],
    *,
    cwd: Path = ROOT,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def check_neutral_vocabulary() -> None:
    forbidden = [("ai" + "mos").encode(), ("ano" + "cca").encode(), ("co" + "dex").encode()]
    ignored_parts = {".git", "__pycache__"}
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in ignored_parts for part in path.relative_to(ROOT).parts):
            continue
        data = path.read_bytes().lower()
        for token in forbidden:
            assert token not in data, f"non-neutral identifier found in {path}"


def check_tools_off_layout() -> None:
    assert not (ROOT / "tools").exists(), "legacy tools directory still exists"
    engine = ROOT / "tools-off" / "_opencode_engine.ts"
    assert engine.exists(), "tools-off engine missing"
    for wrapper in ["opencode_bootstrap_branch.ts", "opencode_refresh_context.ts"]:
        assert (ROOT / "tools-off" / wrapper).exists(), f"missing wrapper {wrapper}"

    installer = (ROOT / "bin" / "install-opencode-conductor.sh").read_text(encoding="utf-8")
    assert 'copy_tree "$REPO_ROOT/tools-off" "$TARGET_ROOT/tools-off"' in installer
    assert 'copy_tree "$REPO_ROOT/tools" "$TARGET_ROOT/tools"' not in installer


def check_descriptor_contract() -> None:
    template = load_json(ROOT / "descriptors" / "descriptor.template.json")
    example = load_json(ROOT / "descriptors" / "examples" / "example-project.descriptor.json")
    for descriptor in [template, example]:
        assert descriptor["descriptorSchemaVersion"] == 3
        assert descriptor["projectAgentsPath"].endswith("AGENTS.md")
        handoff = descriptor["branchHandoff"]
        assert handoff["helperManifestFilename"] == "HELPERS.json"
        helpers = handoff["helpers"]
        roles = {entry["role"] for entry in helpers.values()}
        assert {"log", "review", "merge_request", "phases"} <= roles
        for entry in helpers.values():
            filename = entry["filename"]
            assert not Path(filename).is_absolute()
            assert ".." not in Path(filename).parts
    assert example["reviewIgnoredPathGlobs"]


def run_installer(
    target: Path,
    *extra: str,
) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["OPENCODE_HOME"] = str(target)
    return run(
        ["bash", "bin/install-opencode-conductor.sh", "--no-seed-agents", *extra],
        env=env,
    )


def check_installer_contract() -> None:
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        target = root / "fresh"
        result = run_installer(target)
        assert "Synced" in result.stdout
        config = target / "opencode.json"
        assert config.exists()
        assert stat.S_IMODE(config.stat().st_mode) == 0o600
        config_data = load_json(config)
        assert "provider" not in config_data
        assert "project-helper" in config_data["command"]
        assert config_data["command"]["project-helper"]["template"] == str(
            target / "commands" / "project-helper.md"
        )
        assert str(target / "projects" / "**") in config_data["permission"]["external_directory"]
        assert (target / "tools-off" / "_opencode_engine.ts").exists()
        assert not (target / "tools" / "_opencode_engine.ts").exists()
        assert (target / "skills" / "pdf" / "SKILL.md").exists()
        assert (target / "project-rules" / "AGENTS.md").exists()
        assert (target / "runtime" / "python-requirements.txt").exists()
        installer = (ROOT / "bin" / "install-opencode-conductor.sh").read_text(encoding="utf-8")
        assert '$TARGET_ROOT/runtime.env' in installer
        assert '$TARGET_ROOT/.env"' not in installer
        assert 'npm --prefix "$TARGET_ROOT/runtime/node"' in installer

        config.write_text(
            json.dumps(
                {
                    "provider": {"local": {"options": {"baseURL": "LOCAL_SENTINEL"}}},
                    "instructions": ["custom-rule.md"],
                    "command": {"project-refresh": {"model": "local/model"}},
                }
            ),
            encoding="utf-8",
        )
        run_installer(target)
        merged = load_json(config)
        assert stat.S_IMODE(config.stat().st_mode) == 0o600
        assert merged["provider"]["local"]["options"]["baseURL"] == "LOCAL_SENTINEL"
        assert merged["command"]["project-refresh"]["model"] == "local/model"
        assert "custom-rule.md" in merged["instructions"]
        assert "project-helper" in merged["command"]

    with tempfile.TemporaryDirectory() as temp:
        target = Path(temp) / "dry-run"
        result = run_installer(target, "--dry-run")
        assert "Would seed" in result.stdout
        assert not target.exists()

    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        target = root / "home"
        project = root / "project" / "src" / "feature"
        project.mkdir(parents=True)
        env = os.environ.copy()
        env["OPENCODE_HOME"] = str(target)
        run(
            [
                "bash",
                "bin/install-opencode-conductor.sh",
                "--no-seed-agents",
                "--seed-agents",
                str(project),
            ],
            env=env,
        )
        agents = project / "AGENTS.md"
        assert agents.exists()
        agents.write_text("project-owned\n", encoding="utf-8")
        run(
            [
                "bash",
                "bin/install-opencode-conductor.sh",
                "--no-seed-agents",
                "--seed-agents",
                str(project),
            ],
            env=env,
        )
        assert agents.read_text(encoding="utf-8") == "project-owned\n"

    with tempfile.TemporaryDirectory() as temp:
        target = Path(temp) / "legacy"
        legacy_tools = target / "tools"
        legacy_tools.mkdir(parents=True)
        (legacy_tools / "_opencode_engine.ts").write_text("legacy\n", encoding="utf-8")
        run_installer(target)
        assert not (legacy_tools / "_opencode_engine.ts").exists()
        archived = list((target / "backups" / "opencode-conductor" / "legacy").glob("tool-_opencode_engine.ts*"))
        assert len(archived) == 1
        assert archived[0].read_text(encoding="utf-8") == "legacy\n"

    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        target = root / "symlink-home"
        target.mkdir()
        linked_config = root / "project-owned-config.json"
        linked_config.write_text('{"projectOwned": true}\n', encoding="utf-8")
        (target / "opencode.json").symlink_to(linked_config)
        run_installer(target)
        assert (target / "opencode.json").is_symlink()
        assert linked_config.read_text(encoding="utf-8") == '{"projectOwned": true}\n'

    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        target = root / "symlink-child-home"
        outside_commands = root / "outside-commands"
        target.mkdir()
        outside_commands.mkdir()
        (target / "commands").symlink_to(outside_commands, target_is_directory=True)
        result = run_installer(target)
        assert "reached through a symlink" in result.stderr
        assert list(outside_commands.iterdir()) == []

    with tempfile.TemporaryDirectory() as temp:
        target = Path(temp) / "invalid-flags"
        env = os.environ.copy()
        env["OPENCODE_HOME"] = str(target)
        invalid_flags = subprocess.run(
            [
                "bash",
                "bin/install-opencode-conductor.sh",
                "--no-seed-agents",
                "--with-pdf-engines",
            ],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        assert invalid_flags.returncode != 0
        assert "--with-pdf-engines requires --with-runtime-deps" in invalid_flags.stderr
        assert not target.exists()

    unsafe_env = os.environ.copy()
    unsafe_env["OPENCODE_HOME"] = "/"
    unsafe = subprocess.run(
        ["bash", "bin/install-opencode-conductor.sh", "--no-seed-agents"],
        cwd=ROOT,
        env=unsafe_env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert unsafe.returncode != 0
    assert "unsafe OPENCODE_HOME" in unsafe.stderr


def git(repo: Path, *args: str) -> str:
    return run(["git", *args], cwd=repo).stdout.strip()


def write_v2_descriptor(home: Path, repo: Path, context_root: Path) -> Path:
    project_dir = home / "projects" / "sample"
    templates = project_dir / "_templates" / "mr"
    templates.mkdir(parents=True)
    (templates / "MERGE_REQUEST.md").write_text("# Change request\nBranch: <branch-name>\n", encoding="utf-8")
    (templates / "LOG.md").write_text(
        "# Progress log\n\n## 2000-01-01 00:00\nreviewed_through: <commit-sha>\narea: unknown\n",
        encoding="utf-8",
    )
    (templates / "PHASES.md").write_text("# Phases\n", encoding="utf-8")
    (templates / "MR.md").write_text("# Short context\n", encoding="utf-8")
    descriptor = {
        "projectKey": "sample",
        "descriptorSchemaVersion": 2,
        "projectRootPath": str(repo),
        "opencodeProjectRootPath": str(project_dir),
        "projectAgentsPath": str(repo / "AGENTS.md"),
        "baselineBranchForMaterialChanges": "main",
        "handoffModeDefault": "tracked",
        "areas": {"src": {"pathPrefix": "src", "areaAgentsPath": str(repo / "src" / "AGENTS.md")}},
        "reviewIgnoredPathGlobs": ["**/generated/**", "**/*.snap"],
        "branchHandoff": {
            "contextDirTemplate": str(context_root / "{branchName}"),
            "mrFilenames": ["MERGE_REQUEST.md", "MR.md"],
            "logFilename": "LOG.md",
            "phasesFilename": "PHASES.md",
            "checkpointField": "reviewed_through",
            "templatesDir": str(templates),
            "mrTemplateFilename": "MERGE_REQUEST.md",
            "logTemplateFilename": "LOG.md",
            "phasesTemplateFilename": "PHASES.md",
            "mrBranchPlaceholder": "<branch-name>",
        },
    }
    descriptor_path = project_dir / "descriptor.json"
    descriptor_path.write_text(json.dumps(descriptor, indent=2) + "\n", encoding="utf-8")
    return descriptor_path


def bun_engine_call(
    function_name: str,
    arguments: str,
    *,
    repo: Path,
    home: Path,
) -> dict:
    bun = shutil.which("bun")
    if not bun:
        raise RuntimeError("bun is required for engine integration checks")
    engine_url = (ROOT / "tools-off" / "_opencode_engine.ts").as_uri()
    source = (
        f'import {{ {function_name} }} from "{engine_url}";'
        f"const value = await {function_name}({arguments});"
        "console.log(JSON.stringify(value));"
    )
    env = os.environ.copy()
    env["OPENCODE_HOME"] = str(home)
    output = run([bun, "-e", source], cwd=repo, env=env).stdout.strip()
    return json.loads(output.splitlines()[-1])


def check_engine_behavior() -> None:
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        repo = root / "repo"
        home = root / "opencode-home"
        context_root = root / "branch-context"
        repo.mkdir()
        git(repo, "init", "-b", "main")
        git(repo, "config", "user.email", "test@example.invalid")
        git(repo, "config", "user.name", "Conductor Test")
        (repo / "AGENTS.md").write_text("# Rules\n", encoding="utf-8")
        (repo / "src").mkdir()
        (repo / "src" / "AGENTS.md").write_text("# Area rules\n", encoding="utf-8")
        (repo / "src" / "base.ts").write_text("export const base = 1;\n", encoding="utf-8")
        git(repo, "add", ".")
        git(repo, "commit", "-m", "base")
        base = git(repo, "rev-parse", "HEAD")
        descriptor_path = write_v2_descriptor(home, repo, context_root)

        bootstrap = bun_engine_call(
            "bootstrapBranchEngine",
            '"sample", { includePhases: true }, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert bootstrap["applicable"] is True
        assert bootstrap["descriptor_schema_version"] == 2
        assert {"mergeRequest", "log", "phasePlan"} <= set(bootstrap["tracked_helpers"])
        branch_dir = context_root / "main"
        assert (branch_dir / "HELPERS.json").exists()
        assert (branch_dir / "MERGE_REQUEST.md").exists()
        assert (branch_dir / "LOG.md").exists()
        assert (branch_dir / "PHASES.md").exists()

        review = branch_dir / "REVIEW.md"
        review.write_text(
            "<!-- OpenCode: review metadata\n"
            f"reviewed_head: {base}\n"
            "-->\n"
            "### Triage checklist (by Id)\n"
            "- [ ] F001 - open\n"
            "- [ ] F-02 — open\n",
            encoding="utf-8",
        )
        manifest = load_json(branch_dir / "HELPERS.json")
        manifest["helpers"]["review"] = {"path": "REVIEW.md", "state": "present"}
        (branch_dir / "HELPERS.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

        generated = repo / "src" / "generated"
        generated.mkdir()
        (generated / "schema.ts").write_text("export const generated = true;\n", encoding="utf-8")
        (repo / "src" / "feature.ts").write_text("export const feature = true;\n", encoding="utf-8")
        git(repo, "add", ".")
        git(repo, "commit", "-m", "feature")

        refresh = bun_engine_call(
            "refreshContextEngine",
            '"sample", { refreshMode: "full" }, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert refresh["applicable"] is True
        assert refresh["refresh_contract_version"] == 3
        assert refresh["descriptor_schema_version"] == 2
        assert refresh["review_state"] == "existing_head_moved"
        assert set(refresh["open_review_findings"]) == {"F001", "F-02"}
        assert refresh["mr_update_recommended"] is True
        assert refresh["reviewable_changed_files_count"] == 1
        assert refresh["ignored_changed_files_count"] == 1
        assert refresh["branch_sync_state"] == "no_upstream"

        v2_descriptor = load_json(descriptor_path)
        schema1_descriptor = json.loads(json.dumps(v2_descriptor))
        schema1_descriptor["descriptorSchemaVersion"] = 1
        schema1_descriptor["pseudoPackageDetection"] = {
            "kind": "pathPrefix",
            "pathPattern": "src/{packageName}/**/*",
        }
        descriptor_path.write_text(json.dumps(schema1_descriptor, indent=2) + "\n", encoding="utf-8")
        schema1_refresh = bun_engine_call(
            "refreshContextEngine",
            '"sample", {}, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert schema1_refresh["applicable"] is True
        assert schema1_refresh["descriptor_schema_version"] == 1
        descriptor_path.write_text(json.dumps(v2_descriptor, indent=2) + "\n", encoding="utf-8")

        run(
            [
                "python3",
                "bin/migrate-helper-registry.py",
                "--project-key",
                "sample",
                "--descriptor",
                str(descriptor_path),
                "--branches-dir",
                str(context_root),
                "--apply",
            ]
        )
        schema3_refresh = bun_engine_call(
            "refreshContextEngine",
            '"sample", { refreshMode: "full" }, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert schema3_refresh["applicable"] is True
        assert schema3_refresh["descriptor_schema_version"] == 3
        assert schema3_refresh["manifest_error"] is None

        valid_manifest = (branch_dir / "HELPERS.json").read_text(encoding="utf-8")
        (branch_dir / "HELPERS.json").write_text("{ invalid\n", encoding="utf-8")
        malformed_refresh = bun_engine_call(
            "refreshContextEngine",
            '"sample", {}, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert malformed_refresh["applicable"] is True
        assert str(malformed_refresh["manifest_error"]).startswith("invalid_manifest_json")
        assert (branch_dir / "HELPERS.json").read_text(encoding="utf-8") == "{ invalid\n"
        malformed_bootstrap = bun_engine_call(
            "bootstrapBranchEngine",
            '"sample", { helperIds: ["log"] }, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert malformed_bootstrap["reason"] == "invalid_helper_manifest"
        assert (branch_dir / "HELPERS.json").read_text(encoding="utf-8") == "{ invalid\n"
        (branch_dir / "HELPERS.json").write_text(valid_manifest, encoding="utf-8")

        outside_manifest = root / "outside-manifest.json"
        outside_manifest.write_text(valid_manifest, encoding="utf-8")
        (branch_dir / "HELPERS.json").unlink()
        (branch_dir / "HELPERS.json").symlink_to(outside_manifest)
        symlink_manifest_refresh = bun_engine_call(
            "refreshContextEngine",
            '"sample", {}, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert str(symlink_manifest_refresh["manifest_error"]).startswith("unsafe_manifest_path")
        assert outside_manifest.read_text(encoding="utf-8") == valid_manifest
        (branch_dir / "HELPERS.json").unlink()
        (branch_dir / "HELPERS.json").write_text(valid_manifest, encoding="utf-8")

        schema3_descriptor = load_json(descriptor_path)
        schema3_descriptor["branchHandoff"]["helpers"]["decisionLog"] = {
            "filename": "DECISIONS.md",
            "templateFilename": "MISSING-TEMPLATE.md",
            "role": "notes",
            "bootstrap": "ask",
            "description": "Branch-local decision record.",
        }
        descriptor_path.write_text(json.dumps(schema3_descriptor, indent=2) + "\n", encoding="utf-8")
        manifest_before_failed_bootstrap = (branch_dir / "HELPERS.json").read_text(encoding="utf-8")
        missing_template = bun_engine_call(
            "bootstrapBranchEngine",
            '"sample", { helperIds: ["decisionLog", "log"] }, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert missing_template["reason"] == "missing_helper_template"
        assert not (branch_dir / "DECISIONS.md").exists()
        assert (branch_dir / "HELPERS.json").read_text(encoding="utf-8") == manifest_before_failed_bootstrap

        outside_helper = root / "outside-helper.md"
        outside_helper.write_text("outside\n", encoding="utf-8")
        (branch_dir / "DECISIONS.md").symlink_to(outside_helper)
        unsafe_helper = bun_engine_call(
            "bootstrapBranchEngine",
            '"sample", { helperIds: ["decisionLog"] }, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert unsafe_helper["reason"] == "unsafe_helper_path"
        assert outside_helper.read_text(encoding="utf-8") == "outside\n"
        (branch_dir / "DECISIONS.md").unlink()

        invalid_max_commits = bun_engine_call(
            "refreshContextEngine",
            '"sample", { maxCommits: 0 }, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert invalid_max_commits["reason"] == "invalid_max_commits"

        invalid_descriptor = load_json(descriptor_path)
        invalid_descriptor["branchHandoff"]["helpers"]["decisionLog"]["filename"] = "../DECISIONS.md"
        descriptor_path.write_text(json.dumps(invalid_descriptor, indent=2) + "\n", encoding="utf-8")
        invalid_schema3 = bun_engine_call(
            "refreshContextEngine",
            '"sample", {}, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert invalid_schema3["reason"] == "invalid_descriptor"
        assert any("unsafe helper filename" in error for error in invalid_schema3["validation_errors"])

        invalid_home = bun_engine_call(
            "refreshContextEngine",
            '"sample", {}, { directory: process.cwd() }',
            repo=repo,
            home=Path("/"),
        )
        assert invalid_home["reason"] == "invalid_opencode_home"

        invalid = bun_engine_call(
            "refreshContextEngine",
            '"../escape", {}, { directory: process.cwd() }',
            repo=repo,
            home=home,
        )
        assert invalid["reason"] == "invalid_project_key"


def check_helper_migration() -> None:
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        descriptor_path = root / "descriptor.json"
        branches = root / "branches"
        branch = branches / "feature" / "nested"
        branch.mkdir(parents=True)
        (branch / "MERGE_REQUEST.md").write_text("# Context\n", encoding="utf-8")
        (branch / "LOG.md").write_text("# Log\n", encoding="utf-8")
        broken_branch = branches / "feature" / "broken"
        broken_branch.mkdir(parents=True)
        (broken_branch / "LOG.md").write_text("# Log\n", encoding="utf-8")
        (broken_branch / "HELPERS.json").write_text("{ invalid\n", encoding="utf-8")
        linked_branch = branches / "feature" / "linked"
        linked_branch.mkdir(parents=True)
        outside_log = root / "outside-log.md"
        outside_log.write_text("# Outside\n", encoding="utf-8")
        (linked_branch / "LOG.md").symlink_to(outside_log)
        descriptor_path.write_text(
            json.dumps(
                {
                    "projectKey": "sample",
                    "descriptorSchemaVersion": 2,
                    "projectRootPath": str(root / "repo"),
                    "branchHandoff": {
                        "contextDirTemplate": str(branches / "{branchName}"),
                        "mrFilenames": ["MERGE_REQUEST.md"],
                        "logFilename": "LOG.md",
                    },
                }
            ),
            encoding="utf-8",
        )
        preview = run(
            [
                "python3",
                "bin/migrate-helper-registry.py",
                "--project-key",
                "sample",
                "--descriptor",
                str(descriptor_path),
                "--branches-dir",
                str(branches),
            ]
        )
        assert "dry-run" in preview.stdout
        assert not (branch / "HELPERS.json").exists()

        applied = run(
            [
                "python3",
                "bin/migrate-helper-registry.py",
                "--project-key",
                "sample",
                "--descriptor",
                str(descriptor_path),
                "--branches-dir",
                str(branches),
                "--apply",
            ]
        )
        assert "feature/broken" in applied.stdout
        assert "error=" in applied.stdout
        assert "feature/linked" in applied.stdout
        assert "symbolic link refused" in applied.stdout
        assert (broken_branch / "HELPERS.json").read_text(encoding="utf-8") == "{ invalid\n"
        assert not (linked_branch / "HELPERS.json").exists()
        upgraded = load_json(descriptor_path)
        assert upgraded["descriptorSchemaVersion"] == 3
        assert "helpers" in upgraded["branchHandoff"]
        assert "mrFilenames" in upgraded["branchHandoff"], "legacy fields should remain during compatible migration"
        manifest = load_json(branch / "HELPERS.json")
        assert {"mergeRequest", "log"} <= set(manifest["helpers"])
        descriptor_bytes = descriptor_path.read_bytes()
        manifest_bytes = (branch / "HELPERS.json").read_bytes()
        run(
            [
                "python3",
                "bin/migrate-helper-registry.py",
                "--project-key",
                "sample",
                "--descriptor",
                str(descriptor_path),
                "--branches-dir",
                str(branches),
                "--apply",
            ]
        )
        assert descriptor_path.read_bytes() == descriptor_bytes
        assert (branch / "HELPERS.json").read_bytes() == manifest_bytes


def check_command_and_skill_registry() -> None:
    config = load_json(ROOT / "opencode.json.template")
    assert "provider" not in config
    command_files = {path.stem for path in (ROOT / "commands").glob("*.md")}
    assert set(config["command"]) == command_files, "command files and registry differ"
    for command_name, entry in config["command"].items():
        path = Path(entry["template"].replace("~/.config/opencode", str(ROOT)))
        assert path.exists(), f"registered command missing: {command_name}"
        assert "model" not in entry, f"upstream command pins a model: {command_name}"
        lines = path.read_text(encoding="utf-8").splitlines()
        assert lines and lines[0] == "---", f"command frontmatter missing: {command_name}"
        try:
            frontmatter_end = lines[1:].index("---") + 1
        except ValueError as error:
            raise AssertionError(f"command frontmatter unterminated: {command_name}") from error
        assert frontmatter_end <= 12, f"command frontmatter unexpectedly long: {command_name}"
        assert any(line.startswith("description:") for line in lines[1:frontmatter_end])

    skill_permissions = config["permission"]["skill"]
    skill_files = {path.parent.name for path in (ROOT / "skills").glob("*/SKILL.md")}
    assert set(skill_permissions) - {"*"} == skill_files, "skill files and permission registry differ"
    for skill_name in skill_permissions:
        if skill_name == "*":
            continue
        skill_path = ROOT / "skills" / skill_name / "SKILL.md"
        assert skill_path.exists(), f"registered skill missing: {skill_name}"
        lines = skill_path.read_text(encoding="utf-8").splitlines()
        assert lines and lines[0] == "---", f"skill frontmatter missing: {skill_name}"
        try:
            frontmatter_end = lines[1:].index("---") + 1
        except ValueError as error:
            raise AssertionError(f"skill frontmatter unterminated: {skill_name}") from error
        assert any(line == f"name: {skill_name}" for line in lines[1:frontmatter_end])
        assert any(line.startswith("description:") for line in lines[1:frontmatter_end])

    user_guide = (ROOT / "documentation" / "USER_GUIDE.md").read_text(encoding="utf-8")
    command_reference = user_guide
    referenced_commands = set(re.findall(r"`/([a-z0-9-]+)", command_reference))
    assert referenced_commands == command_files, "command reference and command registry differ"
    skill_reference = user_guide
    referenced_skills = set(re.findall(r"`([a-z0-9-]+)`", skill_reference))
    assert skill_files <= referenced_skills, "skill reference is missing registered skills"

    model_guide = (ROOT / "documentation" / "MODEL_ROUTING_AND_COST.md").read_text(
        encoding="utf-8"
    )
    for command_name in command_files:
        assert f"`{command_name}`" in model_guide, (
            f"model routing guide is missing command: {command_name}"
        )
    for skill_name in skill_files:
        assert f"`{skill_name}`" in model_guide, (
            f"model routing guide is missing skill: {skill_name}"
        )
    for rule_path in (ROOT / "rules").glob("*.md"):
        assert f"`{rule_path.stem}`" in model_guide, (
            f"model routing guide is missing rule: {rule_path.stem}"
        )

    footprint = json.loads(
        run(
            [
                "python3",
                "bin/estimate-prompt-footprint.py",
                "--format",
                "json",
            ]
        ).stdout
    )
    assert footprint["commands"]["count"] == len(command_files)
    assert footprint["skills"]["count"] == len(skill_files)
    assert footprint["rules"]["count"] == len(list((ROOT / "rules").glob("*.md")))
    assert footprint["default_enabled_rules"]["count"] == len(config["instructions"])
    assert footprint["default_enabled_rules"]["proxy_tokens"] > 0

    manual = (ROOT / "commands" / "manual-refresh.md").read_text(encoding="utf-8")
    tool = (ROOT / "commands" / "project-refresh.md").read_text(encoding="utf-8")
    required_fields = [
        "refresh_contract_version",
        "descriptor_schema_version",
        "reviewable_changed_files_count",
        "ignored_changed_files_count",
        "helper_manifest_path",
        "manifest_error",
        "review_state",
        "branch_sync_state",
        "branch_sync_stale_after_minutes",
        "narrative_drift_suspected",
    ]
    for field in required_fields:
        assert field in manual, f"manual refresh missing {field}"
        assert field in tool, f"tool refresh missing {field}"
    assert "seed missing `AGENTS.md`" not in manual
    assert "project_key: <resolved projectKey>" in manual
    assert "project_key: <resolved projectKey>" in tool

    bootstrap = (ROOT / "commands" / "project-bootstrap.md").read_text(encoding="utf-8")
    helper = (ROOT / "commands" / "project-helper.md").read_text(encoding="utf-8")
    for requirement in [
        "Manual bootstrap fallback",
        "symbolic links",
        "exclusive-create",
        "atomically replace",
        "remove only helper files created by this attempt",
    ]:
        assert requirement in bootstrap, f"manual bootstrap missing safety contract: {requirement}"
    assert "Manual bootstrap fallback" in helper
    project_init = (ROOT / "commands" / "project-init.md").read_text(encoding="utf-8")
    assert "Never overwrite an existing descriptor" in project_init
    assert "atomic no-replace installation" in project_init


def check_markdown_links() -> None:
    pattern = re.compile(r"!?\[[^\]\n]*\]\(([^)\n]+)\)")
    for markdown in ROOT.rglob("*.md"):
        if ".git" in markdown.parts:
            continue
        text = markdown.read_text(encoding="utf-8")
        text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
        for raw_target in pattern.findall(text):
            target = raw_target.strip()
            if target.startswith("<") and ">" in target:
                target = target[1 : target.index(">")]
            else:
                target = target.split(maxsplit=1)[0]
            if target.startswith(("http://", "https://", "mailto:", "tel:", "data:", "#", "/")):
                continue
            path_text = urllib.parse.unquote(target.split("#", 1)[0].split("?", 1)[0])
            if not path_text:
                continue
            resolved = (markdown.parent / path_text).resolve()
            assert resolved.exists(), f"broken local markdown link in {markdown}: {target}"


def check_artifact_pack() -> None:
    required_skills = [
        "canvas-design",
        "convert-to-pdf",
        "docx",
        "pdf",
        "pptx",
        "slack-gif-creator",
        "xlsx",
    ]
    for skill in required_skills:
        assert (ROOT / "skills" / skill / "SKILL.md").exists(), f"artifact skill missing: {skill}"
    for manifest in [
        ROOT / "runtime" / "node-packages.txt",
        ROOT / "runtime" / "python-requirements.txt",
        ROOT / "runtime" / "python-requirements-pdf-engines.txt",
    ]:
        assert manifest.exists(), f"runtime manifest missing: {manifest.name}"


def check_safe_zip_extraction() -> None:
    helper_path = ROOT / "skills" / "xlsx" / "scripts" / "office" / "helpers" / "safe_zip.py"
    spec = importlib.util.spec_from_file_location("conductor_safe_zip", helper_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        safe_archive = root / "safe.zip"
        with zipfile.ZipFile(safe_archive, "w") as archive:
            archive.writestr("folder/content.txt", "safe")
        with zipfile.ZipFile(safe_archive) as archive:
            module.safe_extract_zip(archive, root / "safe-output")
        assert (root / "safe-output" / "folder" / "content.txt").read_text(encoding="utf-8") == "safe"

        unsafe_names = ["../escape.txt", "/absolute.txt", "..\\windows-escape.txt", "C:/drive.txt"]
        for index, unsafe_name in enumerate(unsafe_names):
            archive_path = root / f"unsafe-{index}.zip"
            with zipfile.ZipFile(archive_path, "w") as archive:
                archive.writestr(unsafe_name, "unsafe")
            with zipfile.ZipFile(archive_path) as archive:
                try:
                    module.safe_extract_zip(archive, root / f"unsafe-output-{index}")
                except ValueError:
                    pass
                else:
                    raise AssertionError(f"unsafe ZIP path accepted: {unsafe_name}")

        symlink_archive = root / "symlink.zip"
        symlink_entry = zipfile.ZipInfo("link")
        symlink_entry.create_system = 3
        symlink_entry.external_attr = (stat.S_IFLNK | 0o777) << 16
        with zipfile.ZipFile(symlink_archive, "w") as archive:
            archive.writestr(symlink_entry, "../outside")
        with zipfile.ZipFile(symlink_archive) as archive:
            try:
                module.safe_extract_zip(archive, root / "symlink-output")
            except ValueError:
                pass
            else:
                raise AssertionError("symlink ZIP entry accepted")


def check_soffice_shim_safety() -> None:
    helper_path = ROOT / "skills" / "docx" / "scripts" / "office" / "soffice.py"
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        previous_home = os.environ.get("OPENCODE_HOME")
        os.environ["OPENCODE_HOME"] = str(root / "runtime")
        try:
            spec = importlib.util.spec_from_file_location("conductor_soffice", helper_path)
            assert spec and spec.loader
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        finally:
            if previous_home is None:
                os.environ.pop("OPENCODE_HOME", None)
            else:
                os.environ["OPENCODE_HOME"] = previous_home

        outside = root / "outside"
        outside.mkdir()
        module._SHIM_DIR.parent.mkdir(parents=True)
        module._SHIM_DIR.symlink_to(outside, target_is_directory=True)
        try:
            module._ensure_shim()
        except RuntimeError:
            pass
        else:
            raise AssertionError("symlinked LibreOffice shim cache accepted")


def check_static_validation() -> None:
    run(["bash", "-n", "bin/install-opencode-conductor.sh"])
    run(["python3", "-m", "json.tool", "opencode.json.template"])
    run(["python3", "-m", "json.tool", "descriptors/descriptor.template.json"])
    run(["python3", "-m", "json.tool", "descriptors/examples/example-project.descriptor.json"])
    python_files = [str(path) for path in ROOT.rglob("*.py") if ".git" not in path.parts]
    compatible_python = next(
        (
            executable
            for name in ["python3.13", "python3.12", "python3.11", "python3.10"]
            if (executable := shutil.which(name))
        ),
        None,
    )
    assert compatible_python, "Python 3.10 or newer is required to validate artifact scripts"
    run(
        [
            compatible_python,
            "-c",
            (
                "import pathlib,sys;"
                "[(compile(pathlib.Path(p).read_bytes(),p,'exec')) for p in sys.argv[1:]]"
            ),
            *python_files,
        ]
    )
    bun = shutil.which("bun")
    if bun:
        with tempfile.TemporaryDirectory() as temp:
            run(
                [
                    bun,
                    "build",
                    "tools-off/_opencode_engine.ts",
                    "--target=bun",
                    f"--outfile={Path(temp) / 'engine.js'}",
                ]
            )


def main() -> int:
    checks = [
        check_neutral_vocabulary,
        check_tools_off_layout,
        check_descriptor_contract,
        check_installer_contract,
        check_engine_behavior,
        check_helper_migration,
        check_command_and_skill_registry,
        check_markdown_links,
        check_artifact_pack,
        check_safe_zip_extraction,
        check_soffice_shim_safety,
        check_static_validation,
    ]
    for check in checks:
        check()
        print(f"ok - {check.__name__}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
