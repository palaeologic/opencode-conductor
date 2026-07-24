---
name: branch-explore
description: Build a read-only branch exploration guide from code, commits, MR narrative, and dependency diffs so users can manually try new features without browser automation
---

## What I do

Produce a deterministic, manual `EXPLORE_GUIDE.md` for a target branch:

- setup commands (including dependency install hints),
- what changed (user-facing),
- step-by-step "how to try it" flows with URL paths,
- caveats and partial implementations.

I do not open a browser, run visual QA, or execute side effects beyond explicit user-confirmed git steps handled by the calling command.

## Inputs priority

Use these sources in order:

1. `MERGE_REQUEST.md` narrative sections (never treat `## OpenCode:` as user narrative).
2. Commits from `merge-base(origin/HEAD, HEAD)..HEAD`.
3. Branch `LOG.md`.
4. Code comments / docstrings / JSDoc on changed symbols.
5. Area-level `AGENTS.md` (especially `## Run locally` if present).
6. Dependency and lockfile diffs (`package.json`, lockfiles, `pyproject.toml`, `requirements.txt`, etc.).

## Output shape

`EXPLORE_GUIDE.md` should contain:

1. `## Setup`
2. `## What's new`
3. `## How to try it`
4. `## Caveats`

Use repo-style paths such as `/feature/foo` in "How to try it" unless the source explicitly provides an absolute host URL.

## Recommendation defaults

- Focus: user-facing changes first.
- URL format: repo-style paths.
- Dependency commands: suggest only, do not auto-run.
- Citations: include source hints (commit subject, file path, MR section).
- Session model: keep current model (no high-reasoning override needed by default).

## Out of scope

- Browser automation
- Screenshots
- Console/network inspection
- Auto-running dev servers

## Related

- Loaded by: `/project-branch-explore`
- Safety preflight and stash discipline: `skills/git-safety`
