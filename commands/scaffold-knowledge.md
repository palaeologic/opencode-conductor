---
description: Scaffold KNOWLEDGE.md package knowledge files for project areas, leaves, and packages
subtask: true
---

Loads skill: `discover-knowledge` (when available) for the Senior Architect lens.

Scaffold knowledge files for project key `$ARGUMENTS`.

This command generates **`KNOWLEDGE.md`** files for detected project areas and **leaves** (packages, modules, or other meaningful sub-trees) so that future sessions can orient immediately without exploratory subtasks. Re-running it is the standard way to **add** newly-detected leaves into knowledge — no JSON edits needed. **Rules** for the OpenCode project stay in **`opencodeProjectRootPath`/AGENTS.md** (not created by leaf/area discovery steps below).

## Modes

`$ARGUMENTS` may be just a `<projectKey>` (defaults to discovery mode), or `<projectKey> list`, or `<projectKey> dry-run`:

- **discovery (default)** — detect leaves from `pseudoPackageDetection` rules, prompt for untracked ones, write scaffolds at the convention path.
- **list** — print the table of all currently tracked leaves, grouped by area, showing convention vs override path and per-leaf existence. **No writes.**
- **dry-run** — same as discovery but only **previews** what would be written. **No writes.**

### Opt-out flag

- **`no-source-guard`** — disable the source-path existence guard so leaves whose source directory is missing on the current branch are still considered for scaffolding. Default is on; bypass only when intentionally staging knowledge ahead of source. Composes with `discovery` and `dry-run`; ignored in `list` mode.

## When to run

- **Typical:** once after `/project-init`, then **re-run any time** you add a new module / package / source folder you want recorded. Shared knowledge under **`KNOWLEDGE.md`** is **not branch-specific** — switching Git branches does **not** require re-running this command.
- **List mode** is useful for ops/audit (what's currently tracked?).
- **Dry-run** is useful before bulk scaffolds.

**Branch-specific** work (MR goals, checkpoints, logs, phases) lives under `branches/<branch-name>/` — created by `/project-bootstrap` or the refresh/bootstrap tools, not by `/scaffold-knowledge`.

## Workflow

1. **Resolve projectKey and mode**: parse `$ARGUMENTS`. The first token is `projectKey`; the optional second token is `list` or `dry-run` (omit for discovery). If `projectKey` is missing, auto-detect from cwd by matching against known descriptors.

2. **Load descriptor**: read `~/.config/opencode/projects/<projectKey>/descriptor.json` to get `projectRootPath`, `opencodeProjectRootPath`, `areas`, `pseudoPackageDetection`, and optional `trackedKnowledgeTargets.sharedPackageKnowledge`.

3. **Normalize `pseudoPackageDetection`**:
   - If absent or empty: skip leaf discovery (proceed to area-only scaffolding below).
   - If an object (legacy v1): wrap in a single-element array.
   - For each rule, require `area` and a known `kind` (`pathAndAlias` or `pathPrefix`). Reject the descriptor with `invalid_rule` if `area` is missing.
   - Rules whose `pathPattern` lacks `{packageName}` are **area-level documentation only** and contribute no leaves.

4. **Discover leaves** (skip in legacy area-only flow):
   - Use `git ls-files --directory` from `projectRootPath` whenever possible (much faster than fs walks on large monorepos); fall back to `find -type d -maxdepth N` if not in a git repo.
   - For `pathAndAlias` rules: enumerate directories matching `pathPattern`'s `{packageName}` slot.
   - For `pathPrefix` rules: filter by basename (`namePrefixes` OR `namedExtras`).
   - Reject any leaf name that does not match `^[A-Za-z0-9_][A-Za-z0-9_-]*$` — emit `invalid_package_name` with the offending name; continue with remaining leaves.
   - For each surviving leaf, derive the convention path per the **stem derivation contract** in [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md): `<opencodeProjectRootPath>/<rel>/KNOWLEDGE.md`.
   - Resolve overrides: if `sharedPackageKnowledge[packageName]` is set, that path wins (may still be `.md` knowledge file).
   - Apply safety guardrails: verify root containment under `opencodeProjectRootPath`; refuse symlinks (`lstat` -> if symlink at target, mark `symlink_refused`).
   - **Source-path existence guard (default on):** for every candidate leaf, resolve the leaf's expected source directory under `projectRootPath` (the path the leaf's stem mirrors) and verify it exists in the **current working tree** (`git ls-tree --name-only HEAD <leaf-source-rel>` non-empty, or `test -d <abs-leaf-source>`). If missing, classify the leaf as `skipped` with reason `source_missing` and **do not write** a knowledge file for it. Prevents "ghost knowledge" — durable files about packages absent on the current branch (matters in project-local storage where knowledge is shared across branches). Pass `no-source-guard` (in `$ARGUMENTS`, e.g. `/scaffold-knowledge <projectKey> discovery no-source-guard`) to bypass; useful when intentionally staging knowledge ahead of the source landing.

5. **Classify each leaf**:
   - `existing` — **`KNOWLEDGE.md`** (or legacy sibling **`AGENTS.md`** at the same stem) already present at the resolved path.
   - `override` — `sharedPackageKnowledge` declares the path; respect it (still classified `existing`/`untracked` based on file presence).
   - `untracked` — neither convention path nor override has the file.
   - `skipped` — guardrail tripped (e.g. `symlink_refused`, `path_outside_root`, `invalid_package_name`, or `source_missing` from the source-path guard). Records the reason but performs no write.

6. **Mode dispatch**:

   - **list mode**: print a markdown table grouped by area:

     ```
     | Area | Leaf | Path | Status |
     | ---- | ---- | ---- | ------ |
     | <a>  | <l>  | <p>  | <e/u/override> |
     ```

     Then stop. No writes.

   - **dry-run mode**: list the `untracked` leaves and the path each would be created at. Stop. No writes.

   - **discovery mode (default)**: present the `untracked` leaves to the user as a checklist:

     > "Detected leaves without knowledge files. Track which?"
     >
     > - [ ] `<area>/<leaf>` -> `<convention-path>`
     > - ...

     Wait for confirmation. For each chosen leaf, write the package-level **`KNOWLEDGE.md`** template (see step 11 below) at the resolved path. **Non-destructive**: skip silently if the file appeared between detection and write (concurrent session). Do **not** mutate `descriptor.json` for convention-path leaves.

7. **Idempotency**: re-running discovery with no new leaves produces zero writes and prints "no new leaves to track".

8. **Present areas (initial scaffolding only — typically the first run)**: list all areas from the descriptor. Ask the user:
   > "Which areas should receive **area `AGENTS.md`** orientation scaffolding (stack, layout, starter `## Verification scripts`)? (Select all that apply)"
   >
   > - [ ] <area1>
   > - [ ] <area2>
   > - ...

   Wait for user confirmation. Skip this step on subsequent re-runs once area files exist.

9. **Scan each selected area** — for each area, inspect the actual directory at `<projectRootPath>/<area.pathPrefix>`:
   - Look for `package.json` → extract `dependencies`, `devDependencies`, `scripts`
   - Look for `tsconfig.json` → note TypeScript
   - Look for `pyproject.toml` / `requirements.txt` → note Python + framework
   - Look for `go.mod` → note Go
   - Look for `Cargo.toml` → note Rust
   - Look for `Makefile` / `Justfile` → extract targets as commands
   - List top-level subdirectories for folder structure hints

10. **Generate area-level orientation** — for each area, resolve the write path:
    - If **`areas[area].areaKnowledgePath`** is set, merge into that path (teams using a dedicated area **`KNOWLEDGE.md`**).
    - Else resolve **`areas[area].areaAgentsPath`** (typically `.../<area>/AGENTS.md`) and merge into that **`AGENTS.md`** file. **Do not** create a sibling **`KNOWLEDGE.md`** at the area root by default — `/project-init` uses **area `AGENTS.md` only** unless the user later adds **`areaKnowledgePath`** or an optional sibling file.
    - If neither field is present (degenerate descriptor), default to `<opencodeProjectRootPath>/<areaKey>/AGENTS.md` using the `areas` object key as `<areaKey>`.

    ```markdown
    # <ProjectKey> <AreaName> — area orientation

    These notes apply to work in `<projectRootPath>/<pathPrefix>`.

    ## Stack
    - Language: <detected>
    - Package manager: <detected>
    - Framework: <detected from deps>
    - Build: <detected>
    - Linting: <detected>

    ## Folder structure
    <top-level dirs listed with one-line descriptions where inferrable>

    ## Key patterns
    <!-- Fill after first exploration session -->

    ## Commands
    From `<projectRootPath>/<pathPrefix>`:
    - <detected from package.json scripts, Makefile targets, or common conventions>

    ## Verification order
    <ordered list based on detected tooling: lint → typecheck → test → build>

    ## Verification scripts
    <!-- Structured-knowledge-table schema: Trigger | Command | When — copy commands from MR/CI/README; do not invent app labels -->
    | Trigger | Command | When |
    | --- | --- | --- |
    | `<area-path>/**` | `<primary verify command>` | baseline check for this area |

    ## Conventions
    <!-- Fill with local conventions as they are discovered -->
    ```

    If the file already exists, **merge**: prepend the Stack/Folder/Commands sections above the existing content, preserving all existing rules.

11. **Leaf-level `KNOWLEDGE.md` template** — used by step 6 (discovery mode) when writing scaffolds. The convention path is `<opencodeProjectRootPath>/<rel>/KNOWLEDGE.md` (source-tree-mirror; see [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md)). For overrides, use the path from `sharedPackageKnowledge`.

    ```markdown
    ---
    package: <packageName>
    area: <areaName>
    aliases: []
    documentation_depth: template
    last_reviewed_commit: unknown
    update_policy: stable-knowledge-only
    ---

    # Package: <packageName>

    ## Purpose
    <!-- What this package owns and why it exists -->

    ## Use When
    <!-- When an agent should consult this package knowledge -->

    ## Avoid When
    <!-- When work belongs elsewhere -->

    ## Key Entry Points
    <!-- Fill after first focused exploration -->

    ## Core Patterns
    <!-- Fill after first focused exploration -->

    ## Invariants
    - Package consumers should prefer stable public entrypoints over deep implementation imports.

    ## Boundaries
    - Within-package imports: prefer relative paths.
    - Cross-package imports: prefer aliases.

    ## Change Checklist
    - Re-read this file before substantial edits.
    - Refresh if architectural patterns change.

    ## Verification
    - Minimum: lint + typecheck
    - Risky changes: test + import/cycle checks

    ## Known Pitfalls
    <!-- Fill as pitfalls are discovered -->

    ## Keep Updated
    Update when stable patterns, entrypoints, or boundaries change.
    Do not update for branch-specific progress or temporary debugging.
    ```

12. **Enrich project-root `AGENTS.md` (rules only)** — ensure the file at **`opencodeProjectRootPath`/AGENTS.md** (from the descriptor) contains a project routing section listing all areas with their paths. **Do not** move rules content into **`KNOWLEDGE.md`**.

13. **Report**: list all files created or updated, and (in `list` / `dry-run` modes) what was inspected without writing.

## Constraints

- Never overwrite existing content without merging — always preserve existing operational rules.
- **Non-destructive writes** in discovery mode: if **`KNOWLEDGE.md`** already exists at the target path, skip it (treat as `existing`). Concurrent sessions are safe (first-writer-wins).
- Keep area-level files under ~80 lines. Do not enumerate entire directory trees.
- Leaf-level templates are intentionally sparse — they get filled during real work sessions.
- Do not include secrets or environment-specific paths.
- Always ask for user confirmation before writing in discovery mode. `list` and `dry-run` never write.
- Apply the safety guardrails from [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md): package name regex, root containment, symlink refusal.
- Do not mutate `descriptor.json` for convention-path leaves; only write descriptor entries when the user explicitly chose a non-default path.

## Output

Return a summary of all created/updated paths and any sections left as placeholders for future enrichment. In `list` mode, return only the table. In `dry-run` mode, return only the preview.
