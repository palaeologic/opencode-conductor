# Extending the Kit (contract)

Contract-level guide for adding/upgrading kit assets. The tutorial walkthrough with worked examples lives at `docusaurus/contributing/extending.md`.

## What you can add

- **Commands**: markdown templates in `commands/<name>.md`. Frontmatter must follow `documentation/PATH_CONTRACT.md` § Frontmatter conventions.
- **Skills**: `skills/<name>/SKILL.md`. Each skill exposes a single, focused capability with deterministic inputs/outputs. Skills do not load other skills (single exception: `git-safety` as foundational primitive).
- **Rules**: `rules/<NAME>.md`. Always-on; keep small and opinion-light.
- **Descriptor rules**: extend `pseudoPackageDetection` in your project's `descriptor.json` (schema v2 array form). Each rule must declare `area`, `kind`, `pathPattern`.
- **Structured-knowledge tables**: add `## Verification scripts` (and forthcoming run-locally) tables to area-level `AGENTS.md`. Schema lives in `documentation/PATH_CONTRACT.md`.

## Required for upstream contributions

- Vendor-neutrality: zero `aimos`, `Anocca`, brand, or domain-specific terms in committed artifacts.
- Frontmatter must follow the kit table.
- `subtask: false` only when the command needs primary-context audit (kickoff family).
- Mutating commands must honor `git-safety` preflight.
- Mutating commands must emit structured audit blocks (`LOG.md` `### <Activity>` and MR `## OpenCode:`).
- No `$ARGUMENTS` in shell-injection blocks.
- No raw user prompt text in audit blocks.
- Pre-write secret scan applies to anything that writes durable knowledge.

## Required for fork additions (downstream forks)

- Match upstream behavior unless intentionally diverging.
- Document divergence in fork-only architecture page.
- Record `Tracks upstream:` pointer bump.
- Mirror docs in both `documentation/` and `docusaurus/` planes.

## Adding a new command

1. Create `commands/<name>.md` with frontmatter (`description`, `agent`, `subtask`, `model`).
2. Document arguments and opt-out flags.
3. Document outputs as a structured markdown block.
4. Add audit-trail step at the end if mutating.
5. Update `README.md` command tables, `documentation/COMMAND_WORKFLOW.md` matrix, `documentation/WORKFLOW.md` scenarios when applicable.
6. Add a tutorial page or section in `docusaurus/commands/`.

## Adding a new skill

1. Create `skills/<name>/SKILL.md` with `name` + `description` frontmatter.
2. Define what the skill does, inputs, outputs, defaults, and out-of-scope items.
3. Set recommended `permission.skill` if it mutates state (`ask`).
4. Reference loader commands in `## Related`.
5. Add an entry under `docusaurus/skills/` for the user-manual page.

## Adding a descriptor rule

1. Add a rule to `pseudoPackageDetection` (array). Use `pathAndAlias` or `pathPrefix`.
2. Verify the stem derivation contract: prefix up to and including the first `{packageName}` is the knowledge stem.
3. Run `/scaffold-knowledge <key> dry-run` to preview convention paths before discovery.
4. Document the rule purpose in your project's area `AGENTS.md`.

## Adding a structured-knowledge table

1. Place the block in the relevant area-level `AGENTS.md` under a `##` heading (e.g., `## Verification scripts`).
2. Use the schema from `documentation/PATH_CONTRACT.md`: `Trigger | Command | When`.
3. Use literal command strings (no `$ARGUMENTS`).
4. Trigger globs follow `git diff --name-only` semantics; the optional `(added or modified)` qualifier filters change kind.
5. Verify `/project-review` deterministically picks up the rules on the next run.

## Mirroring to a fork

1. Port the upstream commit changes (`git cherry-pick` or manual patch).
2. Update fork-specific frontmatter (e.g., `model:` overrides).
3. Bump `Tracks upstream:` pointer in fork `README.md`.
4. Add a `### Fork` block in `documentation/CHANGELOG.md` (or repo-root `CHANGELOG.md`) summarizing fork deltas.
5. Run vendor-neutrality grep against upstream sources only.

## Validation checklist

- [ ] Frontmatter conforms to `documentation/PATH_CONTRACT.md`.
- [ ] No vendor-specific terms in upstream sources.
- [ ] Audit blocks follow shape contract.
- [ ] Documentation updated in both `documentation/` and `docusaurus/` planes.
- [ ] `documentation/FAQ.md` updated if the change introduces new user-facing concepts.
- [ ] `documentation/TEST_PLAN.md` and `documentation/TESTING_THE_KIT.md` updated with new verification.
