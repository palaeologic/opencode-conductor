# Testing the Kit (contract)

Terse, scenario-by-scenario walkthrough for verifying every command and skill in the kit using OpenCode. The tutorial version with prose, diagrams, and worked outputs lives at `docusaurus/contributing/testing-the-kit.md`. The full smoke-test script lives at `documentation/TEST_PLAN.md`.

Use this page when you want a fast checklist; use `documentation/TEST_PLAN.md` when you want full step-by-step setup.

## Preconditions

- OpenCode is installed and running.
- The kit is installed via `bin/install-opencode-conductor.sh` (copies `commands/`, `skills/`, and `tools/` into `~/.config/opencode/`).
- **Bun engine sanity (optional):** `bun build tools-off/_opencode_engine.ts --target=bun --outfile=/tmp/opencode-engine-check.js` — use **`--target=bun`**; a bare `bun build` may pick a browser target and fail on Node built-ins.
- A test project exists with `descriptor.json` either created via `/project-init` or already present.
- Working tree is clean.

## Coverage matrix

| Area | Command | What success looks like | What failure looks like |
| --- | --- | --- | --- |
| Init | `/project-init <key>` | `descriptor.json` written; templates seeded | `descriptor_not_found` if rerunning before approval |
| Refresh | `/project-refresh <key>` | structured `## Handoff refresh result` block | `missing_branch_context` -> bootstrap |
| Manual refresh | `/manual-refresh <key>` | same `## Handoff refresh result` shape as refresh (`missing_branch_context`, `branch_context_status`, `reread_files` order matches engine); no `opencode_*` tools | wrong template paths, skipped parity fields |
| Bootstrap | `/project-bootstrap <key>` | seeds `MERGE_REQUEST.md`, `LOG.md`, optional `PHASES.md`; optional inline phases prompt after paste-ingest | refuses if files exist and not asked to merge |
| Scaffold knowledge | `/scaffold-knowledge <key>` | shared/leaf **`KNOWLEDGE.md`** at convention paths (legacy `AGENTS.md` honored until renamed) | `invalid_package_name`, `symlink_refused`, `path_outside_root`, `source_missing` |
| Scaffold list | `/scaffold-knowledge <key> list` | tabular read-only output | n/a |
| Scaffold dry-run | `/scaffold-knowledge <key> dry-run` | preview only; no writes | n/a |
| Phases | `/project-phases <key>` | `PHASES.md` drafted/edited; mermaid prompt fires when phases > 3 | refuses on no-phases descriptor mode |
| Checkpoint | `/project-checkpoint <key>` | new `LOG.md` entry | append failure if path missing |
| Close | `/project-close <key>` | session-close `LOG.md` block | n/a |
| Cleanup | `/project-cleanup-candidates <key>` | read-only stale-folder report | n/a |
| Knowledge refresh | `/project-knowledge-refresh <key>` | proposal block; drift preflight runs | drift `F-xx` finding |
| Review | `/project-review <key>` | `REVIEW.md` produced; deterministic verifications from the **active area document** `## Verification scripts` (see PATH_CONTRACT: `areaKnowledgePath` / sibling KNOWLEDGE / `areaAgentsPath`) | missing-block `F-xx` note |
| Review sync | `/project-review-sync <key>` | merge-only updates to `REVIEW.md` and MR `OpenCode:` blocks | n/a |
| Update MR | `/project-update-mr <key>` | machine-block refresh in `MERGE_REQUEST.md` | n/a |
| Branch new | `/project-branch-new [<branch>]` | per-step git confirms; new branch created | refused on dirty tree |
| Branch kickoff | `/project-branch-kickoff [<key>]` | bootstrap-or-refresh -> phases -> scaffold; audit blocks appended | refuses on `main`/`master` |
| Branch explore | `/project-branch-explore [<branch>]` | `EXPLORE_GUIDE.md` written | refuses on dirty tree |
| State | `/project-state` | sectioned read-only report | n/a |
| Help docs | `/project-help-docs <output-root>` | five-phase generation; structured result | refused on in-repo unless `--allow-in-repo` |
| Verification | `/check-types`, `/run-tests`, `/lint-fix`, `/organize-imports` | area-detected; reports errors | tool not present |

## Recovery primitives

- Drop kit-stash: `git stash drop <ref>` after confirming via `/project-state`.
- Roll back scaffolds: convention-path leaf files are non-destructive; remove the file to retry.
- Reset a misnamed branch: `git branch -m <new>`; rerun `/project-state` to re-anchor.
- Reseed templates: rerun `/project-bootstrap <key>`; existing files are preserved unless explicitly merged.

## CI considerations

- Use `no-preflight` to skip drift gates in batch flows.
- Use `no-source-guard` only when intentionally staging knowledge ahead of source.
- Use `no-mermaid` to skip prompts in non-interactive contexts.
- Use `--no-frontmatter`, `--no-mermaid`, `--no-vocab-grep`, `--allow-in-repo` for `/project-help-docs` when generating docs into a CI artifact path.
