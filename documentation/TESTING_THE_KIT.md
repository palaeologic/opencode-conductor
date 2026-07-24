# Testing the Kit

## Automated contract suite

Run:

```bash
python3 tests/contract_checks.py
```

The suite uses temporary directories and repositories. It verifies:

- neutral source vocabulary;
- the standardized `tools-off/` layout;
- descriptor v3 validation plus v1/v2 behavior;
- fresh, merge, dry-run, and project-guidance installer flows;
- helper bootstrap, manifest reconciliation, and migration;
- review lifecycle metadata and deterministic ignored-path filtering;
- shared-branch status and read-only refresh behavior;
- command and skill registry completeness;
- artifact runtime assets;
- shell, JSON, Python, and Bun static checks.

## Manual smoke test

Use a disposable project with a clean Git working tree.

| Scenario | Action | Expected result |
| --- | --- | --- |
| Install preview | Installer `--dry-run` | Reports copies; writes nothing |
| Safe merge | Install over an existing `opencode.json` | Preserves local/provider values and adds missing kit entries |
| Guidance seed | Install with `--seed-agents <dir>` | Creates generic `AGENTS.md`; refuses to overwrite an existing one |
| Initialize | `/project-init <key>` | Writes a reviewed descriptor and templates |
| Bootstrap | `/project-bootstrap <key>` | Creates selected helpers and `HELPERS.json` |
| Refresh | `/project-refresh <key>` | Returns schema/contract versions, helper states, delta, review, and sync fields |
| Manual parity | `/manual-refresh <key>` | Same handoff concepts without calling custom tools |
| Helper change | `/project-helper <key>` | Creates, relinks, removes, or skips only after confirmation |
| Review filter | Change one ignored and one normal path | Review scope reports both partitions; findings exclude ignored path |
| Review continuity | Refresh an existing review | Preserves open current and legacy finding identifiers |
| Pull refresh | `/project-pull-refresh <key>` | Asks before network operations and refuses dirty/diverged states |
| Migration | Run migration preview, then `--apply` | Preserves fixed fields and helper files; writes atomic manifests |
| Artifact runtime | Installer `--with-runtime-deps` | Creates central environment files and installs pinned manifests |

## Focused checks

```bash
bash -n bin/install-opencode-conductor.sh
python3 -m json.tool descriptors/descriptor.template.json
bun build tools-off/_opencode_engine.ts --target=bun --outfile=/tmp/opencode-engine-check.js
git diff --check
```

`bun build` must use `--target=bun` because the engine imports server-side modules.

## Failure expectations

The suite should also prove that unsafe input fails cleanly:

- invalid project keys and branch/path traversal;
- malformed descriptors and helper manifests;
- dirty working trees before branch mutation;
- unknown helper IDs;
- symlink or root-containment violations;
- missing descriptors and detached heads.

Errors should provide a structured reason and a practical next step without modifying unrelated state.
