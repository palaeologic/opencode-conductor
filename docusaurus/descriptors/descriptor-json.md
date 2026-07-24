---
title: descriptor.json Reference
sidebar_position: 1
---

# `descriptor.json` Reference

The descriptor is the per-project control plane for paths, areas, branch helpers, review filtering, and refresh heuristics.

## Location

The engine reads:

```text
$OPENCODE_HOME/projects/<projectKey>/descriptor.json
```

`OPENCODE_HOME` defaults to `~/.config/opencode`. Durable branch and knowledge files may live elsewhere because their paths are descriptor fields.

## Schema versions

Schema v3 is current. V1 and v2 remain read-compatible through an internal adapter.

| Version | Package detection | Branch helpers |
| --- | --- | --- |
| v1 | Single rule object | Fixed filenames |
| v2 | Ordered rule array | Fixed filenames |
| v3 | Ordered rule array | Helper registry plus per-branch manifest |

## Core fields

- `projectKey` — safe stable key matching the descriptor directory.
- `descriptorSchemaVersion` — `1`, `2`, or `3`.
- `projectRootPath` — source repository root.
- `opencodeProjectRootPath` — durable knowledge/state root.
- `projectAgentsPath` — project-root guidance file.
- `baselineBranchForMaterialChanges` — fallback integration branch.
- `handoffModeDefault` — `tracked` or `lite`.
- `conductorStateLocation` — descriptive storage-mode selection.
- `localStateDirname` — repo-local state directory name.
- `areas` — source scopes and their area guidance.
- `reviewIgnoredPathGlobs` — paths visible in scope but excluded from findings.
- `branchSyncStaleAfterMinutes` — remote-ref staleness threshold, default `60`.

## Areas

```json
{
  "areas": {
    "frontend": {
      "pathPrefix": "frontend",
      "areaAgentsPath": "~/projects/example/frontend/AGENTS.md",
      "commandsRoot": "frontend"
    }
  }
}
```

`pathPrefix` maps changed paths to areas. `areaAgentsPath` is the durable orientation/rules anchor for that area.

## Helper registry

```json
{
  "branchHandoff": {
    "contextDirTemplate": "~/.config/opencode/projects/{projectKey}/branches/{branchName}",
    "templatesDir": "~/.config/opencode/projects/{projectKey}/_templates/mr",
    "helperManifestFilename": "HELPERS.json",
    "helpers": {
      "log": {
        "filename": "LOG.md",
        "templateFilename": "LOG.md",
        "role": "log",
        "bootstrap": "ask",
        "description": "Progress log for checkpoints and session handoffs."
      },
      "review": {
        "filename": "REVIEW.md",
        "role": "review",
        "bootstrap": "never",
        "description": "Review findings, triage, and verification notes."
      }
    }
  }
}
```

Helper fields:

- `filename` — basename under the branch context directory.
- `templateFilename` — optional basename under `templatesDir`.
- `role` — semantic role used by commands and refresh.
- `bootstrap` — `always`, `ask`, or `never`.
- `description` — neutral, plain-language purpose shown during selection.
- `branchPlaceholder` — optional template placeholder for the branch name.

Each branch's `HELPERS.json` records its selection. Descriptor support, manifest intent, and actual files are reconciled independently. Refresh reports drift but never silently recreates or deletes helpers.

## Review filtering

```json
{
  "reviewIgnoredPathGlobs": [
    "**/generated/**",
    "**/*.snap"
  ]
}
```

Filtering is deterministic. Refresh reports bounded previews and counts for both reviewable and ignored changed paths.

## Package detection

```json
{
  "pseudoPackageDetection": [
    {
      "area": "frontend",
      "kind": "pathAndAlias",
      "pathPattern": "frontend/src/{packageName}/**/*",
      "aliases": ["@org/{packageName}"]
    }
  ]
}
```

The source prefix through `{packageName}` becomes the source-tree-mirrored leaf knowledge path:

```text
<opencodeProjectRootPath>/<resolved-stem>/KNOWLEDGE.md
```

Every rule declares an existing area. Longest matching stem wins; descriptor order breaks ties.

## Full example

Use [`descriptors/descriptor.template.json`](../../descriptors/descriptor.template.json) as the maintained full example.

## Migration

Preview a v1/v2 migration:

```bash
python3 bin/migrate-helper-registry.py --project-key <key>
```

Apply only after review:

```bash
python3 bin/migrate-helper-registry.py --project-key <key> --apply
```

The migrator preserves fixed fields and helper files for compatibility and rollback.

## Safety

- Project keys, helper IDs, filenames, and relative paths are validated.
- Resolved writes must remain inside their configured roots.
- Invalid manifests are preserved and surfaced as errors.
- Descriptor and manifest writes use atomic replacement.
- Refresh performs no network operations.

The normative behavior lives in [`documentation/PATH_CONTRACT.md`](../../documentation/PATH_CONTRACT.md).
