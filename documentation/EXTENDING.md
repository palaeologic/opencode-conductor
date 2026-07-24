# Extending the Kit

The upstream contract is deliberately neutral. Project-, organization-, service-, model-, and framework-specific behavior belongs in project guidance or a separate overlay.

## Asset types

- Commands: `commands/<name>.md`
- Skills: `skills/<name>/SKILL.md`
- Rules: `rules/<NAME>.md`
- Project guidance seed: `project-rules/AGENTS.md`
- Descriptor template: `descriptors/descriptor.template.json`
- Branch helper templates: `templates/mr/`
- Knowledge template: `templates/knowledge/`
- Runtime manifests: `runtime/`
- Bun engine and wrappers: `tools-off/`

## Add a command

1. Create the command markdown with valid frontmatter.
2. Define arguments, confirmation boundaries, output fields, and recovery behavior.
3. Keep shell-injection blocks static; never interpolate user input.
4. Add a structured audit block only after a mutation succeeds.
5. Add the command to `opencode.json.template`.
6. Update command reference documentation.
7. Run `python3 tests/contract_checks.py`.

Model bindings are optional deployment configuration. Do not pin them in upstream command frontmatter.

## Add a skill

1. Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter.
2. Keep the capability focused and state inputs, outputs, mutations, and out-of-scope behavior.
3. Skills normally do not load other skills; `git-safety` is the documented foundational exception.
4. Add the skill to the `permission.skill` registry in `opencode.json.template`.
5. Add it to the skill catalog and contract tests.

Artifact skills should use the central runtime variables and add pinned dependencies to the appropriate manifest instead of inventing a per-skill environment.

## Add a rule

Rules are always-on when selected, so keep them short and broadly applicable. Add opt-in rule paths to the configuration template only when the rule is safe for most projects. Put specialized conventions in a project's `AGENTS.md`.

## Add a branch helper

Schema v3 helper definitions live at `branchHandoff.helpers.<id>`:

```json
{
  "decisionLog": {
    "filename": "DECISIONS.md",
    "templateFilename": "DECISIONS.md",
    "role": "notes",
    "bootstrap": "ask",
    "description": "Branch-specific architectural decisions and consequences."
  }
}
```

Requirements:

- IDs and filenames must pass engine validation.
- Filenames are branch-context-relative basenames, not paths.
- `bootstrap` is `always`, `ask`, or `never`.
- Descriptions explain value in project-neutral language.
- A template is optional unless bootstrap needs initial content.
- Refresh never silently creates or deletes a helper.

If introducing a new role with engine semantics, update the compatibility adapter, refresh output, migration tests, and path contract.

## Extend package detection

`pseudoPackageDetection` is an ordered array. Each rule declares `area`, `kind`, and `pathPattern`; the prefix through `{packageName}` becomes the leaf knowledge stem. Longest matching stem wins, with descriptor order as the tie-breaker.

When adding an area:

1. Add `areas.<name>` and its `pathPrefix`.
2. Add matching refresh prefixes if needed.
3. Add package-detection rules when the area has meaningful leaves.
4. Run `/scaffold-knowledge <key> dry-run`.

## Add review filtering

Add Git-style globs to `reviewIgnoredPathGlobs`. Ignored paths remain visible in scope reporting but are excluded from findings. Add behavioral tests for both matched and unmatched paths.

## Validation checklist

- Neutral vocabulary and examples
- No pinned service or model configuration
- Safe paths and atomic writes
- Existing user configuration preserved
- Schema v1/v2 behavior preserved when changing v3
- Manual and tool refresh concepts remain aligned
- Command and skill registry updated
- Contract and tutorial documentation updated
- `python3 tests/contract_checks.py` passes
