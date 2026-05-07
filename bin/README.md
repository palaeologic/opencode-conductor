# Bin scripts

## `install-opencode-conductor.sh`

Runs a safe, idempotent sync of **kit** files from this repo into `~/.config/opencode/` (or `$OPENCODE_HOME`). Use `--dry-run` to preview changes and `--with-templates` to seed `templates/mr/MERGE_REQUEST.md` when missing.

**What the installer does:** copies **commands**, **skills**, **rules** (and optionally **tools**) into the OpenCode home so slash-commands and bundled assets match this git clone.

**What it does *not* do:** it does **not** move or rewrite per-project **`descriptor.json`**, branch handoff folders, or `AGENTS.md` trees. Those live wherever your descriptor points (`opencodeProjectRootPath`, `branchHandoff.contextDirTemplate`, `areaAgentsPath` — see [`docs/PATH_CONTRACT.md`](../docs/PATH_CONTRACT.md)). After changing a descriptor by hand, you do not need to re-run the install script unless kit files also changed.

**Typical loop:** `git pull` → `bash bin/install-opencode-conductor.sh` → restart OpenCode if command lists look stale.
