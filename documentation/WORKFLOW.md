# Canonical Workflow

This is the ordered, normative workflow for OpenCode Conductor. Commands may provide more detailed prompts, but they must preserve these safety and state boundaries.

## 1. Install or update

```bash
bash bin/install-opencode-conductor.sh --dry-run
bash bin/install-opencode-conductor.sh
```

The installer synchronizes commands, skills, rules, templates, `tools-off/`, project-rule seeds, and runtime manifests. It safely creates or merges `opencode.json`.

In an interactive terminal, the installer may offer to seed a generic `AGENTS.md` in an existing project directory. Use `--seed-agents <dir>` to request it explicitly or `--no-seed-agents` to suppress the prompt. Existing files are never overwritten.

## 2. Register a project

Run:

```text
/project-init <projectKey>
```

Initialization should:

1. locate the Git root;
2. propose global or project-local state;
3. discover candidate areas and package rules;
4. propose project and area guidance paths;
5. propose the schema v3 helper registry;
6. show the descriptor before writing;
7. seed helper templates without replacing existing ones.

Descriptor files live under `$OPENCODE_HOME/projects/<projectKey>/descriptor.json`. Durable state paths are configurable inside the descriptor.

For an existing v1/v2 descriptor, initialization is unnecessary. The engine remains read-compatible. Use the migration utility only when the project wants schema v3 helper selection.

## 3. Seed durable knowledge

Run:

```text
/scaffold-knowledge <projectKey> dry-run
/scaffold-knowledge <projectKey> discovery
```

The knowledge hierarchy is:

1. project `AGENTS.md` — project-wide commands, boundaries, and rules;
2. area `AGENTS.md` — stack, routing, and area verification;
3. leaf `KNOWLEDGE.md` — source-tree-mirrored facts for a package or module.

Scaffolding is non-destructive, checks source-path existence, refuses unsafe names and symlinks, and writes only inside configured roots.

## 4. Start or resume a session

Preferred tool path:

```text
/project-refresh <projectKey>
```

Manual path:

```text
/manual-refresh <projectKey>
```

Both paths should orient the session with:

- descriptor and contract versions;
- branch, area, integration base, checkpoint, and changed paths;
- deterministic reviewable/ignored path partitions;
- ordered rules, knowledge, and helper rereads;
- helper support, selection, existence, and drift;
- current review metadata and open findings;
- local upstream divergence and remote-ref age;
- checkpoint and change-request recommendations.

Refresh is read-only. It does not fetch, pull, create helpers, repair manifests, or rewrite reviews.

## 5. Bootstrap branch context

If refresh reports missing branch context:

```text
/project-bootstrap <projectKey>
```

Bootstrap resolves each helper's policy:

- `always` — create when safe;
- `ask` — offer it with its plain-language description;
- `never` — do not create unless explicitly selected.

It writes selected helpers from templates and records selection in `HELPERS.json`. Existing helper files are preserved. A malformed manifest is an error, not permission to overwrite.

Use:

```text
/project-helper <projectKey>
```

to create, relink, mark removed, or skip helpers later. Refresh reports drift and leaves the decision to this command.

## 6. Create and kick off a branch

To create a new branch:

```text
/project-branch-new [<branchName>]
```

The command:

1. runs the Git safety preflight;
2. refuses a dirty tree or detached head;
3. resolves the integration branch;
4. asks before fetch, pull, checkout, and branch creation;
5. optionally chains into kickoff.

For substantial work:

```text
/project-branch-kickoff [<projectKey>]
```

Kickoff resolves seed material, refreshes or bootstraps context, drafts a phase plan when useful, runs knowledge discovery, and appends structured audit metadata only after successful mutations.

## 7. Work in phases

For a multi-stage branch:

```text
/project-phases <projectKey>
```

Each phase should have:

- goal and non-goals;
- concrete deliverables;
- dependencies;
- verification;
- exit criteria;
- status.

Use optional diagrams only when they clarify dependencies.

## 8. Checkpoint

At meaningful progress boundaries:

```text
/project-checkpoint <projectKey>
```

Checkpoint entries are append-only and distinguish:

- integration-base range;
- inherited or parent-branch commits;
- the narrow working range;
- local, upstream-reachable, mixed, or unknown commit source;
- completed work, verification, risks, and next step.

Do not include raw user prompt text, secrets, or unstructured personal data in audit metadata.

## 9. Reconcile a shared branch

Refresh reports only local-ref facts. When remote reconciliation is wanted:

```text
/project-pull-refresh <projectKey>
```

The command asks before `fetch --prune` and `pull --ff-only`, refuses dirty or diverged state, then runs the normal read-only refresh.

`branchSyncStaleAfterMinutes` controls the warning threshold for old remote refs. Missing `FETCH_HEAD` produces unknown age rather than a guessed value.

## 10. Review

Run:

```text
/project-review <projectKey>
```

Review should:

1. run a knowledge/rules preflight unless disabled;
2. select the narrow actionable commit window;
3. partition changed paths using `reviewIgnoredPathGlobs`;
4. keep ignored paths visible under review scope;
5. synthesize verification suggestions from area guidance;
6. preserve current review triage and existing finding identifiers;
7. generate new identifiers in separate implementation, review, and metadata/knowledge namespaces;
8. record `reviewed_head` and the reviewed range.

When `HEAD` moves, refresh reports `existing_head_moved`; it does not replace the review.

For a light preserve-only update:

```text
/project-review-sync <projectKey>
```

Use it to merge new checklist/narrative facts while preserving open findings and triage.

## 11. Update change-request context

Run:

```text
/project-update-mr <projectKey>
```

The command updates machine-owned metadata and fact-backed narrative while preserving human-authored content. A material code delta, new open finding, stale reviewed head, or helper drift may trigger an update recommendation.

## 12. Promote durable knowledge

Run:

```text
/project-knowledge-refresh <projectKey>
```

The command proposes project, area, or leaf updates from verified evidence. Users approve each target. Branch-specific decisions remain in branch helpers until they are stable enough to promote.

## 13. Close the session

Run:

```text
/project-close <projectKey>
```

Close records the final working range, verification, unresolved risks, review state, and a concrete next action. It should leave a fresh session able to resume from durable state without relying on chat history.

## 14. Lightweight paths

A full refresh is not required for every task:

- focused verification: `/check-types`, `/run-tests`, `/lint-fix`;
- browser testing: `/run-playwright-tests`;
- progress recording: `/project-checkpoint`;
- state inspection: `/project-state`;
- read-only branch exploration: use existing helpers directly.

Refresh after branch switches, rebases, shared-branch reconciliation, long pauses, and before review.

## 15. Recovery rules

- Invalid descriptor: fix the reported field; do not guess a fallback path.
- Invalid helper manifest: preserve it, repair manually, then refresh.
- Helper drift: use `/project-helper`; do not recreate silently.
- Alternate context detected: choose the authoritative root and migrate deliberately.
- Dirty tree before Git mutation: commit, stash manually, or stop.
- Diverged upstream: resolve with an explicit Git strategy outside the pull-refresh fast-forward flow.
- Stale review: preserve triage and sync/regenerate intentionally.

## 16. Opt-outs

Supported escape hatches include `no-preflight`, `no-source-guard`, `no-mermaid`, and `no-stash-check`. They disable one guard at a time and do not broaden unrelated permissions.
