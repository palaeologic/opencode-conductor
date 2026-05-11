---
title: descriptor.json Reference
sidebar_position: 1
---

# `descriptor.json` Reference

`descriptor.json` is the per-project control-plane contract for path resolution, handoff behavior, and area discovery. It is read by virtually every command in the kit.

## Where it lives

**Kit contract:** `~/.config/opencode/projects/<projectKey>/descriptor.json` (always). **`projectRootPath`** in the JSON points at the application git root; durable handoff files may live under **`opencodeProjectRootPath`** (global or project-local per [`documentation/PATH_CONTRACT.md`](../../documentation/PATH_CONTRACT.md)).

A v2 descriptor has shape:

```json
{
  "descriptorSchemaVersion": 2,
  "projectRootPath": "~/projects/my-app",
  "opencodeProjectRootPath": "~/.config/opencode/projects/my-app",
  "baselineBranchForMaterialChanges": "main",
  "handoffModeDefault": "tracked",
  "areas": [...],
  "branchHandoff": {...},
  "pseudoPackageDetection": [...]
}
```

## Required core fields

- `descriptorSchemaVersion` — `2` for v2.1 features.
- `projectRootPath` — absolute path to the source repo.
- `opencodeProjectRootPath` — absolute path to the conductor state root.
- `baselineBranchForMaterialChanges` — typically `main` or `master`.
- `handoffModeDefault` — `tracked` (default) or `lite`.
- `areas` — list of areas (frontend, api, cli, etc.).
- `branchHandoff` — branch artifact paths.

## `areas`

`areas` is an object keyed by area name (for example `"frontend"`, `"api"`). Each value typically includes:

- `pathPrefix` — source-tree scope under `projectRootPath` (used for diffs and commands).
- `areaAgentsPath` — **default** durable document for that area (usually `.../<area>/AGENTS.md`): stack, conventions, routing, often **`## Verification scripts`**.
- `areaKnowledgePath` *(optional)* — explicit path to a **separate** area-level knowledge file when you split durable facts from the area `AGENTS.md` anchor. Not emitted by `/project-init`; add only when needed.
- `commandsRoot` — where slash-command overrides for that area live, if used.

```json
"areas": {
  "frontend": {
    "pathPrefix": "frontend",
    "areaAgentsPath": "~/.config/opencode/projects/my-app/frontend/AGENTS.md",
    "commandsRoot": "frontend"
  }
}
```

## `branchHandoff`

```json
{
  "contextDirTemplate": "~/.config/opencode/projects/my-app/branches/{branchName}",
  "templatesDir": "~/.config/opencode/projects/my-app/_templates/mr",
  "mrFilenames": ["MERGE_REQUEST.md", "MR.md"],
  "logFilename": "LOG.md",
  "phasesFilename": "PHASES.md"
}
```

## `pseudoPackageDetection` (schema v2)

An ordered array of rules. Each rule maps source-tree paths to convention-path knowledge files.

```json
{
  "area": "frontend",
  "kind": "pathAndAlias",
  "pathPattern": "frontend/src/{packageName}/**/*",
  "aliases": ["@app/{packageName}"]
}
```

### Fields

- `area` — must match a key in the `areas` object.
- `kind` — `pathAndAlias` or `pathPrefix`.
- `pathPattern` — must contain `{packageName}` exactly once.
- `aliases` (optional) — recognized import aliases.
- `namePrefixes` (optional) — restrict matched package names.
- `namedExtras` (optional) — explicit additional package names.

### Stem derivation contract

The knowledge stem is the prefix of `pathPattern` up to and including the first `{packageName}` token, with `{packageName}` replaced by the concrete package directory name. This stem becomes `<rel>` in `<opencodeProjectRootPath>/<rel>/KNOWLEDGE.md` (legacy leaf `AGENTS.md` still honored when `KNOWLEDGE.md` is absent).

```mermaid
flowchart LR
  Pat[pathPattern] --> Stem[Prefix with packageName resolved]
  Stem --> Mount[Under opencodeProjectRootPath]
  Mount --> Leaf[Leaf KNOWLEDGE.md path]
```

## Minimal v2 example

```json
{
  "descriptorSchemaVersion": 2,
  "projectRootPath": "~/projects/my-app",
  "opencodeProjectRootPath": "~/.config/opencode/projects/my-app",
  "baselineBranchForMaterialChanges": "main",
  "handoffModeDefault": "tracked",
  "areas": {
    "frontend": {
      "pathPrefix": "frontend",
      "areaAgentsPath": "~/.config/opencode/projects/my-app/frontend/AGENTS.md",
      "commandsRoot": "frontend"
    },
    "api": {
      "pathPrefix": "api",
      "areaAgentsPath": "~/.config/opencode/projects/my-app/api/AGENTS.md",
      "commandsRoot": "api"
    }
  },
  "branchHandoff": {
    "contextDirTemplate": "~/.config/opencode/projects/my-app/branches/{branchName}",
    "templatesDir": "~/.config/opencode/projects/my-app/_templates/mr",
    "mrFilenames": ["MERGE_REQUEST.md", "MR.md"],
    "logFilename": "LOG.md",
    "phasesFilename": "PHASES.md"
  },
  "pseudoPackageDetection": [
    {
      "area": "frontend",
      "kind": "pathAndAlias",
      "pathPattern": "frontend/src/{packageName}/**/*",
      "aliases": ["@app/{packageName}"]
    },
    {
      "area": "api",
      "kind": "pathPrefix",
      "pathPattern": "api/{packageName}/**/*",
      "namePrefixes": ["core_", "feature_"]
    }
  ]
}
```

## Safety and normalization

- All path templates are normalized at load-time.
- Symlinks are refused (containment).
- Paths that escape `opencodeProjectRootPath` are rejected.
- Tilde expansion is performed once and then locked.

## Canonical contracts

- `documentation/PATH_CONTRACT.md`
- `documentation/UPGRADING.md`
- `descriptors/descriptor.template.json` (in-repo template)
