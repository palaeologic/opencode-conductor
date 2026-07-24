# Upgrading

After updating the kit source:

1. Read [`CHANGELOG.md`](../CHANGELOG.md).
2. Preview the installation:

   ```bash
   bash bin/install-opencode-conductor.sh --dry-run
   ```

3. Apply it:

   ```bash
   bash bin/install-opencode-conductor.sh
   ```

The installer safely merges `opencode.json`, preserves local and provider configuration, synchronizes current assets, and removes only known obsolete Conductor files from legacy tool locations.

## Descriptor schema compatibility

The current schema is v3. The engine also reads v1 and v2 descriptors through an internal compatibility adapter.

| Descriptor | Package rules | Branch helper model | Support |
| --- | --- | --- | --- |
| v1 | One object or omitted | Fixed filename fields | Read-compatible |
| v2 | Ordered rule array | Fixed filename fields | Read-compatible |
| v3 | Ordered rule array | Extensible helper registry plus branch manifest | Current |

Existing v1/v2 fields remain valid. There is no forced migration deadline in this release.

## Migrating v1/v2 to v3

The migration utility is dry-run by default:

```bash
python3 bin/migrate-helper-registry.py --project-key <key>
```

Review the descriptor diff and every proposed branch manifest. Apply only after the preview is correct:

```bash
python3 bin/migrate-helper-registry.py --project-key <key> --apply
```

Optional path overrides:

```bash
python3 bin/migrate-helper-registry.py \
  --project-key <key> \
  --descriptor /path/to/descriptor.json \
  --branches-dir /path/to/branches
```

The utility:

- converts fixed helper fields into schema v3 helper definitions;
- preserves the old fields for rollback and interoperability;
- discovers nested branch names such as `feature/topic`;
- creates `HELPERS.json` atomically;
- refuses symbolic-link helper and manifest paths;
- preserves malformed manifests and reports them;
- never deletes helper files.

After applying, run:

```bash
python3 -m json.tool "$OPENCODE_HOME/projects/<key>/descriptor.json"
```

Then run `/project-refresh <key>` and resolve any reported `helper_drift`.

## Package detection from v1

If a v1 descriptor uses one `pseudoPackageDetection` object, v2 and v3 represent it as a one-element array whose rule includes an `area`:

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

Leaf knowledge uses `<opencodeProjectRootPath>/<source-relative-stem>/KNOWLEDGE.md`. Keep `trackedKnowledgeTargets.sharedPackageKnowledge` only for genuine path overrides.

## Moving global and project-local state

Changing storage mode is separate from upgrading the descriptor schema:

1. Back up the descriptor, branch contexts, templates, and knowledge files.
2. Update `opencodeProjectRootPath`, `branchHandoff.contextDirTemplate`, `branchHandoff.templatesDir`, and each `areas.*.areaAgentsPath`.
3. Move the data while preserving the `branches/<name>/` structure.
4. Update `.gitignore` if repo-local state should remain uncommitted.
5. Run `/project-refresh <key>` and inspect alternate-context and helper-drift warnings.

The engine never merges private and shared branch roots automatically.

## Runtime dependencies

Artifact skills can share a central runtime:

```bash
bash bin/install-opencode-conductor.sh --with-runtime-deps
```

The installer selects an available Python 3.10 or newer. Set `OPENCODE_PYTHON_BOOTSTRAP` when the desired interpreter is not on a standard versioned command name.

Add optional PDF conversion engines with:

```bash
bash bin/install-opencode-conductor.sh --with-runtime-deps --with-pdf-engines
```

System package installation is separate and explicit:

```bash
bash bin/install-opencode-conductor.sh --with-runtime-deps --with-system-deps
```

Dependency manifests in [`runtime/`](../runtime/) are the source of truth for requested packages and minimum Python versions.

## Recovery

Normal upgrades use a regular pull plus installer run. If a release explicitly announces rewritten Git history, preserve local work first and follow that announcement's recovery instructions; never reset an unreviewed working tree.
