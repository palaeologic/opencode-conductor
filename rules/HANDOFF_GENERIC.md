# Generic Handoff Rule

For descriptor-driven projects:

1. Resolve active branch.
2. Resolve project descriptor from `~/.config/opencode/projects/<projectKey>/descriptor.json`.
3. Read branch context in order:
  - `MERGE_REQUEST.md`
  - `PHASES.md` (if present)
  - latest `LOG.md`
4. Before substantial work, run refresh and follow `reread_files`.
5. Keep branch-specific findings in branch `LOG.md`.
6. Promote to shared package/area guides only when durable.

Phase support:

- On first branch bootstrap, ask whether phased delivery is needed.
- If yes, create `PHASES.md`.
- Allow retroactive phase creation later.