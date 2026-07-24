# Test Plan

Run the automated suite first:

```bash
python3 tests/contract_checks.py
```

Use the following matrix for release-level manual validation or when changing a specific contract.

## Installer

- Fresh target: all current assets copied to expected directories.
- Existing config: local/provider values preserved; missing commands, skills, and instructions merged.
- Dry run: no files changed.
- Repeated install: idempotent result.
- `tools-off/`: current wrappers and engine installed; only known obsolete kit files removed from old locations.
- Guidance seed: explicit and interactive paths create a generic `AGENTS.md`; existing files preserved.
- Runtime install: central environment and declared Python/Node packages configured.
- Optional PDF engines: installed only when explicitly requested.
- System artifact tools: unchanged unless `--with-system-deps` is explicitly requested.
- File modes: configuration and environment files are not world-readable.

## Descriptor validation

- Schema v3 template parses and loads.
- Schemas v1 and v2 load through the compatibility adapter.
- Invalid version, project key, area, helper ID, filename, role, bootstrap policy, glob, or sync threshold returns a structured error.
- Project root containment and branch path safety reject traversal.
- Custom `localStateDirname` affects alternate-context detection correctly.

## Helper registry

- Bootstrap policies `always`, `ask`, and `never` select correctly.
- Explicit helper ID selection rejects unknown IDs.
- Templates seed missing selected files only.
- Manifest records selected helpers and paths atomically.
- Existing files on legacy branches are implicitly tracked.
- Missing, untracked, unsupported, removed, and available helpers are distinct.
- Malformed manifest produces `manifest_error` and remains unchanged.
- Refresh never creates, deletes, or repairs a helper.

## Schema migration

- Dry run writes nothing.
- Apply converts v1/v2 descriptor to v3 while preserving fixed fields.
- Nested branch names are discovered.
- Existing manifests are preserved.
- Malformed manifests are skipped and reported.
- Helper files are never deleted.
- Re-running apply is idempotent.

## Refresh

- Clean tracked branch returns descriptor/contract versions and expected reread order.
- Missing context returns a bootstrap recommendation.
- Lite mode does not require branch helpers.
- Detached head, outside workspace, and missing descriptor fail safely.
- Checkpoint range and changed-area mapping are deterministic.
- Context staleness and checkpoint recommendations use configured evidence.
- Refresh runs no network or Git mutation.

## Review filtering and lifecycle

- Normal and ignored changed paths form disjoint partitions.
- Ignored counts and previews are present.
- Review findings do not target ignored paths.
- Current reviewed head reports `existing_current`.
- Moved head reports `existing_head_moved`.
- Missing metadata reports `existing_unknown_head`.
- New and older finding identifier forms are counted and preserved.
- Material deltas and open findings influence change-request recommendations.

## Shared branch

- Up-to-date, ahead, behind, diverged, no-upstream, and unknown states are distinguishable.
- Ahead/behind counts use local refs only.
- Fetch age and configured stale threshold produce correct stale/unknown results.
- `/project-pull-refresh` refuses dirty and diverged states.
- Network and fast-forward operations require confirmation.

## Commands and skills

- Every registered command has a markdown file.
- Every registered skill has `SKILL.md`.
- Every shipped command/skill intended for use is registered.
- No upstream command pins a model.
- No upstream configuration pins a provider.
- Git-mutating flows invoke the safety preflight.
- Commands do not interpolate user input into shell-injection blocks.
- Audit blocks contain structured metadata only.

## Knowledge safety

- Package-name validation rejects separators and traversal.
- Longest matching package stem wins; descriptor order breaks ties.
- Writes stay within configured roots.
- Existing files and symlinks are preserved/refused.
- Project/area rule targets are not confused with leaf knowledge targets.
- Secret-pattern detection stops durable writes.

## Artifact runtime

- All artifact skills and supporting scripts are installed.
- Runtime manifests are present and parseable.
- Archive extraction rejects absolute paths, traversal, and symlink entries.
- PDF conversion degrades clearly when optional engines are unavailable.
- Output files remain inside requested output roots.

## Static release checks

```bash
bash -n bin/install-opencode-conductor.sh
python3 -m json.tool descriptors/descriptor.template.json
python3 -m json.tool opencode.json.template
bun build tools-off/_opencode_engine.ts --target=bun --outfile=/tmp/opencode-engine-check.js
git diff --check
```

Also verify that:

- no generated caches or editor artifacts are tracked;
- all links to tool sources use `tools-off/`;
- current docs describe schema v3 as current and v1/v2 as compatible;
- forbidden project-specific vocabulary is absent;
- the source and destination worktrees contain only intended changes.
