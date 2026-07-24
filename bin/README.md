# Bin scripts

## `install-opencode-conductor.sh`

Runs a safe, idempotent sync of **kit** files from this repo into `~/.config/opencode/` (or `$OPENCODE_HOME`). Use `--dry-run` to preview changes and `--with-templates` to seed `templates/mr/MERGE_REQUEST.md` when missing.

**What the installer does:** copies **commands**, **skills**, **rules**, and **tools-off** into the OpenCode home so slash-commands and bundled assets match this git clone.

**What it does *not* do:** it does **not** move or rewrite per-project **`descriptor.json`**, branch handoff folders, or `AGENTS.md` trees. Those live wherever your descriptor points (`opencodeProjectRootPath`, `branchHandoff.contextDirTemplate`, `areaAgentsPath` — see [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md)). After changing a descriptor by hand, you do not need to re-run the install script unless kit files also changed.

**Typical loop:** `git pull` → `bash bin/install-opencode-conductor.sh` → restart OpenCode if command lists look stale.

## `estimate-prompt-footprint.py`

Reports a provider-neutral planning estimate for the static text in commands, skills, and rules:

```bash
python3 bin/estimate-prompt-footprint.py
python3 bin/estimate-prompt-footprint.py --format json
```

The estimate is `ceil(UTF-8 bytes / 4)`. It is useful for detecting prompt growth, but it is not a bill: use provider telemetry for real token, cache, reasoning, tool, and retry costs.
