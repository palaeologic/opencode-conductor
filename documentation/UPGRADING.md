# Upgrading

Re-run `bash bin/install-opencode-conductor.sh` after each `git pull` from your **kit source-of-truth** clone. Read **`CHANGELOG.md`** for breaking or notable changes.

## Stale clone (“last pulled before a large kit drop”)

1. `cd` to your `opencode-conductor` clone and `git pull` on the **default branch** (this repo uses **`main`**; your fork or org clone may use **`master`** — use whatever `origin/HEAD` points at).
2. Read `CHANGELOG.md` from the date you last updated forward; anything **BREAKING** may need manual steps below.
3. Run `bash bin/install-opencode-conductor.sh` (use `--dry-run` first if you prefer).
4. If **`opencode.json`** or **descriptor** schema changed, merge new keys from [`descriptors/descriptor.template.json`](../descriptors/descriptor.template.json) (and your own `opencode.json` template if your fork ships one) into your live files — **never blind overwrite** (preserve API keys and custom paths).

Worked example (generic):

> You last synced months ago. Since then the kit added `SECURITY.md`, `CHANGELOG.md`, path-contract docs, and `/project-init` options for project-local state. Pull `main`, run the install script, skim `CHANGELOG.md`, then merge any new `opencode.json` keys you need from the template in **your** clone.

## After rewritten git history

If maintainers rewrite this kit’s history (for example to remove commit / PR attribution trailers or other unwanted metadata), existing clones must reset to the rewritten remote branch. First save or commit any local work elsewhere, then run:

```bash
git fetch origin
git reset --hard origin/<default-branch>
git fetch origin --tags --force
```

Use the repo’s actual default branch (`main`, `master`, or whatever `origin/HEAD` points at). This is only needed after an announced history rewrite; normal upgrades use `git pull`.

## Global ↔ project-local durable state

**There is no automatic migrator.** `/project-init` targets **new** onboarding. To switch layouts on an existing project:

1. **Back up** `~/.config/opencode/projects/<projectKey>/descriptor.json` and any existing branch folders / `AGENTS.md` trees.
2. **Edit `descriptor.json`** so `opencodeProjectRootPath`, `branchHandoff.contextDirTemplate`, `branchHandoff.templatesDir`, and each `areas.*.areaAgentsPath` match the **locked scheme** in [`PATH_CONTRACT.md`](PATH_CONTRACT.md) (global vs `<git-root>/.opencode-conductor/...`).
3. **`mv` or `rsync`** existing data from the old roots to the new roots (preserve `branches/<name>/` structure under the new `contextDirTemplate`).
4. Update **`.gitignore`** if you intend repo-local data to stay private to each clone.
5. Run `/project-refresh <projectKey>` and fix paths if refresh reports missing files.

Alternatively, for a clean cut: archive old state, re-run **`/project-init`** with the desired layout, then restore narrative MR text manually if needed.

## Private downstream forks

If your team standardizes on a **fork** of this kit, treat **that fork** as the clone you `git pull` and install from so org-specific commands stay aligned. Upstream `CHANGELOG.md` remains vendor-neutral; your fork may add release notes for fork-only changes.

## Migrating to `descriptorSchemaVersion: 2`

Schema v2 introduces a small, additive change: `pseudoPackageDetection` becomes an **array of rules** so a single project can declare distinct detection strategies per area (e.g., a `pathAndAlias` rule for a frontend monorepo plus a `pathPrefix` rule for a flat backend with naming conventions). The legacy object form is still accepted for one minor release and is treated as a single-element array.

Steps:

1. Add `"descriptorSchemaVersion": 2` near the top of `descriptor.json`.
2. Wrap the existing `pseudoPackageDetection` object in an array and add an `"area": "<existing-area>"` field. Example:

   ```json
   "pseudoPackageDetection": [
     {
       "area": "frontend",
       "kind": "pathAndAlias",
       "pathPattern": "frontend/src/{packageName}/**/*",
       "aliases": ["@org/{packageName}"]
     }
   ]
   ```
3. (Optional) Add a second rule for any other area with package-like leaves (backend monorepo packages, prefix-named modules, etc.).
4. Drop redundant entries from `trackedKnowledgeTargets.sharedPackageKnowledge` for leaves whose knowledge already lives at the **convention path** (`<opencodeProjectRootPath>/<rel>/AGENTS.md` mirroring the leaf's path under `projectRootPath`). Keep `sharedPackageKnowledge` only for true overrides (legacy paths, generated knowledge, files shared across leaves).
5. If you previously placed leaf knowledge at a non-canonical path (e.g., `<opencodeRoot>/<area>/packages/<pkg>/AGENTS.md` when no `packages/` segment exists in the source tree), keep the legacy file with a short redirect note pointing to the new convention path; remove it in the next release cycle.

Validation:

- `python -m json.tool < descriptor.json` parses cleanly.
- `/scaffold-knowledge <projectKey> list` enumerates leaves at the expected convention paths.
- `/scaffold-knowledge <projectKey> dry-run` reports zero new writes after the initial pass on a healthy descriptor.

Backward compatibility: omit `descriptorSchemaVersion` and keep `pseudoPackageDetection` as an object — commands will normalize to a single-rule array on read. This is the deprecated path; please migrate before the next major release.

## Tags

Optional `git tag` releases (e.g. `v0.3.0`) on `main` are documented in the root [`CHANGELOG.md`](../CHANGELOG.md). Tags are optional; day-to-day upgrades follow `git pull` + install script.
