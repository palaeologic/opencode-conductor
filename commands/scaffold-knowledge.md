---
description: Scaffold AGENTS.md knowledge files for project areas and packages
subtask: true
---

Scaffold knowledge files for project key `$ARGUMENTS`.

This command generates `AGENTS.md` files for detected project areas so that future sessions can orient immediately without exploratory subtasks.

## When to run

- **Typical:** once after `/project-init` (or the first time you adopt Conductor on an existing project). Shared knowledge under `AGENTS.md` is **not branch-specific** — switching Git branches does **not** require re-running this command.
- **Re-run only when** you add a new area to the descriptor, onboard a new pseudo-package, or the stack/architecture section is materially wrong and you want a guided refresh (the command merges; it does not replace operational rules blindly).

**Branch-specific** work (MR goals, checkpoints, logs, phases) lives under `branches/<branch-name>/` — created by `/project-bootstrap` or the refresh/bootstrap tools, not by `/scaffold-knowledge`.

## Workflow

1. **Resolve projectKey**: use `$ARGUMENTS` if provided, otherwise auto-detect from cwd by matching against known descriptors.

2. **Load descriptor**: read `~/.config/opencode/projects/<projectKey>/descriptor.json` to get `projectRootPath` and `areas`.

3. **Present areas**: list all areas from the descriptor. Ask the user:
   > "Which areas should have AGENTS.md knowledge files? (Select all that apply)"
   >
   > - [ ] <area1>
   > - [ ] <area2>
   > - ...

   Wait for user confirmation.

4. **Scan each selected area** — for each area, inspect the actual directory at `<projectRootPath>/<area.pathPrefix>`:
   - Look for `package.json` → extract `dependencies`, `devDependencies`, `scripts`
   - Look for `tsconfig.json` → note TypeScript
   - Look for `pyproject.toml` / `requirements.txt` → note Python + framework
   - Look for `go.mod` → note Go
   - Look for `Cargo.toml` → note Rust
   - Look for `Makefile` / `Justfile` → extract targets as commands
   - List top-level subdirectories for folder structure hints

5. **Generate area-level AGENTS.md** — for each area, write to `~/.config/opencode/projects/<projectKey>/<areaName>/AGENTS.md`:

   ```markdown
   # <ProjectKey> <AreaName> Instructions

   These instructions apply to work in `<projectRootPath>/<pathPrefix>`.

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

   ## Conventions
   <!-- Fill with local conventions as they are discovered -->
   ```

   If the file already exists, **merge**: prepend the Stack/Folder/Commands sections above the existing content, preserving all existing rules.

6. **Ask about pseudo-packages**:
   > "Should any sub-packages within these areas have their own knowledge file? (e.g., monorepo packages, large subdirectories)"

   If yes, ask for package names and their path within the area.

7. **Generate package-level AGENTS.md** — for each package, write to `~/.config/opencode/projects/<projectKey>/<areaName>/packages/<packageName>/AGENTS.md`:

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

8. **Enrich project-root AGENTS.md** — ensure the root `~/.config/opencode/projects/<projectKey>/AGENTS.md` contains a project routing section listing all areas with their paths.

9. **Report**: list all files created or updated.

## Constraints

- Never overwrite existing content without merging — always preserve existing operational rules.
- Keep area-level files under ~80 lines. Do not enumerate entire directory trees.
- Package-level templates are intentionally sparse — they get filled during real work sessions.
- Do not include secrets or environment-specific paths.
- Always ask for user confirmation before writing.

## Output

Return a summary of all created/updated paths and any sections left as placeholders for future enrichment.
