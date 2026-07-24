# Descriptor Reference

A project descriptor connects generic Conductor workflows to one repository.
It defines where the source lives, where durable state is stored, which source
areas exist, how leaves are discovered, which branch helpers are supported,
and which files matter most during refresh.

This page is a field reference. Read
[`USER_GUIDE.md`](USER_GUIDE.md#9-understanding-the-descriptor) first if you
have not created a descriptor before. Normative path behavior lives in
[`PATH_CONTRACT.md`](PATH_CONTRACT.md).

## Location

The engine currently loads descriptors only from:

```text
$OPENCODE_HOME/projects/<projectKey>/descriptor.json
```

`OPENCODE_HOME` defaults to `~/.config/opencode`.

Project-local state does not change this control-plane location. In
project-local mode, the descriptor remains under `$OPENCODE_HOME`, while its
state paths point into the repository's selected state directory.

## Start from the maintained template

Use [`descriptors/descriptor.template.json`](../descriptors/descriptor.template.json)
as the complete starting point. A smaller populated example is available at
[`descriptors/examples/example-project.descriptor.json`](../descriptors/examples/example-project.descriptor.json).

The normal creation path is:

```text
/project-init <projectKey>
```

The command scans the repository, proposes a descriptor, and asks for approval
before writing it. Prefer this over copying a descriptor whose paths belong to
another machine.

## Schema versions

| Version | Package detection | Branch helpers | Recommended use |
| --- | --- | --- | --- |
| v1 | One object | Fixed filenames | Existing projects only |
| v2 | Ordered array | Fixed filenames | Existing projects only |
| v3 | Ordered array | Helper registry and per-branch manifest | All new projects |

The engine normalizes v1 and v2 through a compatibility adapter. Migration is
optional but recommended before adding custom helpers.

## Top-level fields

### Identity and roots

| Field | Type | Purpose |
| --- | --- | --- |
| `projectKey` | string | Stable safe identifier; normally matches the descriptor directory name |
| `descriptorSchemaVersion` | integer | Supported schema version: `1`, `2`, or `3` |
| `projectRootPath` | path string | Root of the source Git repository |
| `opencodeProjectRootPath` | path string | Root for durable knowledge and managed state |
| `projectAgentsPath` | path string | Project-level `AGENTS.md` |

`projectKey` must be safe to use as a directory segment. Do not use absolute
paths, separators, traversal, or a display name with spaces as a key.

Paths may use `~/`, which is expanded against the current user's home
directory. Repository-relative guesses are not made for arbitrary descriptor
fields.

The refresh engine resolves project guidance in this order:

1. `projectAgentsPath`;
2. `<projectRootPath>/AGENTS.md`;
3. `<opencodeProjectRootPath>/AGENTS.md` as a legacy fallback.

### Workflow defaults

| Field | Type | Purpose |
| --- | --- | --- |
| `baselineBranchForMaterialChanges` | string | Integration-base fallback when the repository's remote default cannot be resolved |
| `handoffModeDefault` | `"tracked"` or `"lite"` | Default branch-context depth |
| `conductorStateLocation` | `"global"` or `"project-local"` | Describes the selected durable-state layout |
| `localStateDirname` | string | State directory used for project-local mode |
| `branchSyncStaleAfterMinutes` | non-negative number | Age after which local remote-reference facts should be treated as possibly stale |

`conductorStateLocation` documents the chosen layout. The actual locations
still come from concrete path fields such as `opencodeProjectRootPath`,
`branchHandoff.contextDirTemplate`, and `branchHandoff.templatesDir`.

`localStateDirname` should be a single safe directory name, commonly
`.opencode-conductor`. It is not an arbitrary path.

### Optional local routing hints

| Field | Type | Purpose |
| --- | --- | --- |
| `subtaskModels` | object | Optional installation-owned per-workflow routing hints |

The shipped template leaves `subtaskModels` empty. The project does not require
or pin a named model. Treat this field as local deployment configuration, not
portable project policy.

## Areas

`areas` maps stable area keys to source scopes and guidance.

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

| Area field | Type | Purpose |
| --- | --- | --- |
| `pathPrefix` | relative path string | Maps changed source paths to the area |
| `areaAgentsPath` | path string | Area-level operating guidance |
| `commandsRoot` | relative path string | Working root used when resolving area-specific verification commands |

Area keys should be stable, short, and neutral. Every package-detection rule
must name an existing area.

`pathPrefix` is source-relative. Use an empty prefix only when the repository
truly has one flat area and the consuming workflow supports it.

## Package and leaf detection

`pseudoPackageDetection` is an ordered list in v2 and v3.

```json
{
  "pseudoPackageDetection": [
    {
      "area": "frontend",
      "kind": "pathAndAlias",
      "pathPattern": "frontend/src/{packageName}/**/*",
      "aliases": ["@org/{packageName}"]
    },
    {
      "area": "backend",
      "kind": "pathPrefix",
      "pathPattern": "backend/{packageName}/**/*",
      "namePrefixes": ["core_", "feature_"],
      "namedExtras": ["shared_core"]
    }
  ]
}
```

### Rule fields

| Field | Required | Purpose |
| --- | --- | --- |
| `area` | yes | Existing area to which detected leaves belong |
| `kind` | yes | Detection strategy, such as `pathAndAlias` or `pathPrefix` |
| `pathPattern` | yes | Source pattern containing `{packageName}` for leaf-producing rules |
| `aliases` | no | Import aliases associated with detected leaves |
| `namePrefixes` | no | Allowed or interesting directory-name prefixes for prefix detection |
| `namedExtras` | no | Explicit leaf names that do not follow a prefix |

The prefix of `pathPattern` through the first `{packageName}` becomes the
source-tree-mirrored knowledge stem.

```text
frontend/src/{packageName}/**/*
                    |
                    +-- frontend/src/<detected-name>/KNOWLEDGE.md
```

The knowledge file is rooted at `opencodeProjectRootPath`. For example:

```text
<opencodeProjectRootPath>/frontend/src/cards/KNOWLEDGE.md
```

When more than one rule matches, the longest matching stem wins. Descriptor
order breaks ties. See the
[stem derivation contract](PATH_CONTRACT.md#stem-derivation-contract) for the
exact rules and safety checks.

## Tracked knowledge targets

`trackedKnowledgeTargets` provides area tracking and exceptions to the normal
source-tree mirror.

```json
{
  "trackedKnowledgeTargets": {
    "sharedPackageKnowledge": {
      "shared-ui": "~/.config/opencode/projects/example/shared/KNOWLEDGE.md"
    },
    "trackedAreas": ["frontend", "backend"]
  }
}
```

| Field | Purpose |
| --- | --- |
| `trackedAreas` | Areas included in knowledge-aware workflows |
| `sharedPackageKnowledge` | Explicit knowledge-path overrides for legacy, generated, or intentionally shared leaves |

Do not add an override when the normal convention path is correct. Redundant
path maps are harder to migrate and easier to let drift.

## Review filtering

`reviewIgnoredPathGlobs` contains Git-style glob patterns.

```json
{
  "reviewIgnoredPathGlobs": [
    "**/generated/**",
    "**/*.snap"
  ]
}
```

Ignored files remain visible in review scope counts and previews but are
excluded from findings. Use this for generated output, snapshots, lockfiles, or
other files that should be visible without receiving line-by-line findings.

Avoid patterns so broad that meaningful code disappears from review.

## Branch handoff

Schema v3 defines branch helpers under `branchHandoff`.

```json
{
  "branchHandoff": {
    "contextDirTemplate": "~/.config/opencode/projects/{projectKey}/branches/{branchName}",
    "checkpointField": "reviewed_through",
    "templatesDir": "~/.config/opencode/projects/{projectKey}/_templates/mr",
    "helperManifestFilename": "HELPERS.json",
    "helpers": {
      "log": {
        "filename": "LOG.md",
        "templateFilename": "LOG.md",
        "role": "log",
        "bootstrap": "ask",
        "description": "Progress log for checkpoints and session handoffs."
      }
    }
  }
}
```

### Branch handoff fields

| Field | Type | Purpose |
| --- | --- | --- |
| `contextDirTemplate` | path template | Directory containing one branch's manifest and helper files |
| `checkpointField` | safe field name | Review or progress checkpoint key used by compatible flows |
| `templatesDir` | path template | Directory containing helper templates |
| `helperManifestFilename` | basename | Per-branch helper-selection manifest; normally `HELPERS.json` |
| `helpers` | object | Supported helper definitions keyed by stable helper ID |

Supported placeholders:

- `{projectKey}` — the descriptor's project key;
- `{branchName}` — the current branch, safely encoded for the path contract.

The resolved context directory and templates directory must remain inside their
configured roots. Placeholder support does not permit arbitrary template
expressions.

### Helper definition fields

| Field | Required | Purpose |
| --- | --- | --- |
| `filename` | yes | Helper basename under the branch context directory |
| `role` | yes | Semantic role used by commands |
| `bootstrap` | yes | Creation policy: `always`, `ask`, or `never` |
| `description` | yes | Plain-language explanation shown during selection |
| `templateFilename` | when templated | Basename under `templatesDir` |
| `branchPlaceholder` | no | Text placeholder replaced with the current branch when rendering |

Recognized built-in roles include:

- `log`;
- `review`;
- `merge_request`;
- `phases`;
- `notes`.

Custom helper IDs are allowed. A custom role without engine semantics behaves
as a generic helper until commands or engine logic are extended to understand
it.

Filenames and template filenames are basenames, not paths. Absolute names,
separators, traversal segments, and unsafe values are rejected.

### Manifest reconciliation

Each branch's `HELPERS.json` records the helper selection independently of the
descriptor.

The engine compares:

1. descriptor support;
2. manifest intent;
3. filesystem reality.

This produces states such as `present`, `missing`, `untracked`, `unsupported`,
`removed`, and `available`. Refresh reports these states but never silently
creates or deletes helper files.

Use `/project-helper <projectKey>` to resolve drift. A malformed manifest is
preserved and must be repaired explicitly.

## Refresh heuristics

`refreshToolHeuristics` identifies high-signal changes without imposing a
framework.

```json
{
  "refreshToolHeuristics": {
    "changedFilesAreaPrefixes": [
      "frontend/",
      "backend/"
    ],
    "highSignalChangedSubstrings": [
      "package.json",
      "pyproject.toml",
      "go.mod"
    ]
  }
}
```

| Field | Purpose |
| --- | --- |
| `changedFilesAreaPrefixes` | Fast area association for changed paths |
| `highSignalChangedSubstrings` | Paths or path fragments worth emphasizing during refresh |

Use substrings that indicate project structure, dependency, configuration,
routing, entry-point, or build changes. These are hints, not ignored-path
rules.

## Global and project-local examples

### Global state

```json
{
  "projectRootPath": "~/projects/example",
  "opencodeProjectRootPath": "~/.config/opencode/projects/example",
  "conductorStateLocation": "global",
  "branchHandoff": {
    "contextDirTemplate": "~/.config/opencode/projects/{projectKey}/branches/{branchName}",
    "templatesDir": "~/.config/opencode/projects/{projectKey}/_templates/mr"
  }
}
```

### Project-local state

```json
{
  "projectRootPath": "~/projects/example",
  "opencodeProjectRootPath": "~/projects/example/.opencode-conductor",
  "conductorStateLocation": "project-local",
  "localStateDirname": ".opencode-conductor",
  "branchHandoff": {
    "contextDirTemplate": "~/projects/example/.opencode-conductor/branches/{branchName}",
    "templatesDir": "~/projects/example/.opencode-conductor/_templates/mr"
  }
}
```

In both examples, the descriptor itself stays under
`$OPENCODE_HOME/projects/<projectKey>/descriptor.json`.

## Validation and write safety

The engine and commands enforce the following boundaries:

- project keys, helper IDs, roles, basenames, and relative fields are
  validated;
- descriptor-derived writes must stay inside configured roots;
- symbolic-link targets are refused where they could escape or replace state;
- helper creation is exclusive rather than overwriting;
- descriptor and manifest replacements are atomic;
- malformed manifests are preserved;
- refresh performs no remote input/output;
- scaffolding does not overwrite existing knowledge files.

Atomic replacement protects against partial files but is not a concurrency
lock. Do not run multiple mutating helper operations against the same branch
context simultaneously.

## Migration

Preview migration:

```bash
python3 bin/migrate-helper-registry.py --project-key <key>
```

Apply after reviewing the plan:

```bash
python3 bin/migrate-helper-registry.py --project-key <key> --apply
```

The migrator:

- upgrades the descriptor to schema v3;
- derives helper definitions from fixed legacy fields;
- discovers branch context directories;
- creates manifests atomically;
- preserves legacy fields and helper files for compatibility and rollback;
- becomes idempotent once the migration has been applied.

See [`UPGRADING.md`](UPGRADING.md) for recovery instructions and custom path
arguments.

## Descriptor review checklist

Before accepting a new or changed descriptor, verify:

- `projectKey` matches the descriptor directory;
- `projectRootPath` is the intended Git root;
- guidance paths point to project-owned files;
- every area prefix and command root exists or is intentionally future-facing;
- every package-detection rule names an existing area;
- knowledge paths mirror the intended source leaves;
- ignored review patterns are narrow enough;
- helper filenames are unique safe basenames;
- every templated helper has an existing template;
- branch state stays in the selected global or project-local root;
- the integration base exists or has an intentional fallback;
- refresh staleness matches the team's remote-update expectations;
- no secret, credential, service endpoint, or personal machine detail has been
  embedded unnecessarily.
