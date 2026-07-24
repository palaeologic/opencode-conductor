# FAQ

## Installation and configuration

### Where is configuration installed?

Under `$OPENCODE_HOME`, which defaults to `~/.config/opencode`.

### Does installation overwrite my configuration?

No. The installer seeds or merges the kit registry while preserving existing local and service configuration.

### Can it create project guidance?

Yes. Use `--seed-agents <existing-project-dir>`, or accept the interactive offer. Existing `AGENTS.md` files are never overwritten.

### Why are tool sources under `tools-off/`?

Activation stays explicit and internal engine modules are not accidentally exposed as tools by hosts that scan `tools/`.

## Descriptors and helpers

### Which descriptor schema should a new project use?

Schema v3.

### Must existing v1/v2 projects migrate immediately?

No. The engine reads them through a compatibility adapter.

### What does schema v3 add?

An extensible helper registry and a per-branch manifest recording which helpers the branch uses.

### Will refresh recreate a missing helper?

No. It reports helper drift. Use `/project-helper` to choose what to do.

### What if `HELPERS.json` is malformed?

Refresh reports `manifest_error` and preserves it. Repair it explicitly.

## Refresh and shared branches

### Does refresh fetch or pull?

No. `/project-refresh` and `/manual-refresh` are read-only.

### How do I reconcile a shared branch?

Use `/project-pull-refresh`; it asks before network operations and refuses dirty or diverged state.

### How is remote-ref staleness decided?

From `FETCH_HEAD` age and `branchSyncStaleAfterMinutes`. Missing age is reported as unknown.

## Reviews

### How are ignored paths handled?

`reviewIgnoredPathGlobs` partitions the changed paths. Ignored paths stay visible in scope but do not receive findings.

### What finding IDs are current?

New findings use separate three-digit namespaces for implementation, review, and metadata/knowledge. Older IDs already present in an artifact remain valid and are never renumbered automatically.

### What happens when commits are added after review?

Refresh reports `existing_head_moved`. Use `/project-review` or `/project-review-sync` and preserve existing triage.

## Knowledge

### Where should guidance live?

Project rules in project `AGENTS.md`, area orientation in area `AGENTS.md`, and leaf facts in source-tree-mirrored `KNOWLEDGE.md`.

### Can knowledge be updated automatically?

Scaffolding is non-destructive. Promotion through `/project-knowledge-refresh` is proposal-first and requires approval per file.

## Skills and runtime

### Do all skills load every turn?

No. Skills load on demand.

### Do artifact skills need separate environments?

No. They share the optional central runtime installed with `--with-runtime-deps`.

### Are models pinned?

No. Upstream commands use the active session model unless an installation explicitly configures an override.

## Documentation

### Where is the maintained documentation?

All maintained guides and contracts live under `documentation/`. The repository
uses one Markdown tree so direct repository links, contract checks, and
site-rendered copies all refer to the same source.

### Does `/project-help-docs` publish a documentation site?

No. It generates and audits Markdown beneath an approved output root. Human
review and publication remain separate steps.

### Why are in-repository help-document writes refused by default?

User-facing help often belongs in a separate repository or publishing
pipeline. Refusing in-repository output prevents accidental source-tree writes.
Use `--allow-in-repo` only when the chosen repository intentionally owns the
generated pages.

### What is the difference between terminology replacement and a prohibited term?

`--brand=<from:to>` rewrites terminology. `--ban-term=<term>` verifies that a
term no longer appears. Use both during a rename.

### Can generated pages include site metadata?

Yes. Portable YAML frontmatter is enabled by default and can be disabled with
`--no-frontmatter`. Destination-specific metadata can be added in a local
overlay or publishing step.

### Does branch exploration install dependencies or open a browser?

No. `/project-branch-explore` can describe setup and interaction steps in
`EXPLORE_GUIDE.md`, but dependency installation and browser use remain
explicit user actions.
