---
title: descriptor.json Reference
sidebar_position: 1
---

`descriptor.json` is the control-plane contract for path resolution, handoff behavior, and area discovery.

## Required core fields

- `descriptorSchemaVersion` (recommended `2`)
- `projectRootPath`
- `opencodeProjectRootPath`
- `baselineBranchForMaterialChanges`
- `handoffModeDefault`
- `areas`
- `branchHandoff`

## Key sections

### `areas`

Each area defines at least:

- `name`
- `areaPath` or equivalent source scope
- `areaAgentsPath` (durable knowledge path)

### `branchHandoff`

Defines branch artifact paths and filenames:

- `contextDirTemplate`
- `templatesDir`
- `mrFilenames`
- `logFilename`
- `phasesFilename`

### `pseudoPackageDetection` (schema v2)

Use an array of rules, each with:

- `area`
- `kind` (`pathAndAlias` or `pathPrefix`)
- `pathPattern`

Optional:

- `aliases`
- `namePrefixes`
- `namedExtras`

## Minimal example (v2)

```json
{
  "descriptorSchemaVersion": 2,
  "projectRootPath": "~/projects/my-app",
  "opencodeProjectRootPath": "~/.config/opencode/projects/my-app",
  "baselineBranchForMaterialChanges": "main",
  "handoffModeDefault": "tracked",
  "areas": [
    {
      "name": "frontend",
      "areaAgentsPath": "~/.config/opencode/projects/my-app/frontend/AGENTS.md"
    },
    {
      "name": "api",
      "areaAgentsPath": "~/.config/opencode/projects/my-app/api/AGENTS.md"
    }
  ],
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
      "namePrefixes": ["core_", "feature_"],
      "namedExtras": ["shared_core"]
    }
  ]
}
```

## Canonical contracts

For safety, containment, and normalization details, treat these as normative:

- `docs/PATH_CONTRACT.md`
- `docs/UPGRADING.md`
- `descriptors/descriptor.template.json`
