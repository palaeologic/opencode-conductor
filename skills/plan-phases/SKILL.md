---
name: plan-phases
description: Senior Architect / PM lens for slicing big work into phases with clear deliverables, exit criteria, and rollback gates; produces PHASES.md content for /project-phases or /project-bootstrap
---

## What I do

Help author or refine `PHASES.md` for a long-lived branch or large project. I bias toward vertical slices that ship value, name exit criteria, and surface risks + rollback gates so each phase is independently completable and reviewable.

## When to use me

- Running `/project-phases` to create or refine `PHASES.md`.
- `/project-bootstrap` answers "yes" to phased delivery and you need a first cut.
- The user asks for a delivery plan, roadmap, or "how do we break this down?"
- A branch already has `PHASES.md` but it has drifted from reality.

## Slicing principles

- **Vertical slices over horizontal layers.** Ship a thin path through the stack that delivers user-visible or measurable value, not "phase 1: scaffolding."
- **Each phase ends in a verifiable change.** A demo, a passing test suite, a measurable metric, or a merged migration — not "now we have an interface."
- **Ship-as-you-go.** Phases are mergeable independently when possible; if not, name the dependency and the merge order.
- **Carry only one big risk per phase.** If two unknowns block a phase, split it.

## Phase template

Each phase gets a section like this in `PHASES.md`:

```markdown
## Phase N: <short title>

### Goal
<one-line user-visible or measurable outcome>

### Deliverables
- <concrete artifact or change 1>
- <concrete artifact or change 2>

### Out of scope
- <what this phase intentionally does not do>

### Dependencies
- <prior phase, external team, infra readiness, …>

### Exit criteria (Definition of Done)
- [ ] <verifiable check>
- [ ] <test suite or metric>
- [ ] <docs / knowledge updated>

### Verification plan
- <command or scenario>
- <command or scenario>

### Risks and mitigations
- **Risk:** <what could go wrong> — **Mitigation:** <how we handle it>

### Rollback gate
- <how we revert if exit criteria fail post-merge>
```

## Sizing heuristics

- A phase that exceeds **~1 working week** (single owner) is probably too big — split it.
- A phase with **3+ cross-area dependencies** is probably too coupled — hoist the dependencies into an earlier prep phase.
- A phase whose Goal needs more than one sentence is probably actually two phases.
- A phase with **no exit criteria you can demo or test** is not a phase.

## Anti-patterns to avoid

- "Phase 1 = scaffolding only" with no user-visible value.
- Speculative phases for "future flexibility" with no committed consumer.
- Phases without exit criteria — they become open-ended.
- Phases that bundle migration + feature + docs without naming a rollback.
- "Phase N+1: cleanup" — fold cleanup into the phase that produced the mess.

## Authoring flow

1. **State the end state** in one sentence (the "north star" outcome). Confirm with user.
2. **List risks and unknowns** before phases. Anything unknown becomes a spike-style early phase or a dependency to resolve outside this branch.
3. **Draft 3–6 phases** using the template. Resist 8+ phases on a single branch — that signals scope creep or a missed split into multiple branches.
4. **Cross-link**: `MERGE_REQUEST.md` references phase ids; checkpoints in `LOG.md` mention the active phase.
5. **Iterate**: present the draft, ask which phases are too big / too coupled, refine.
6. **Mode-switch suggestion (explicit).** After presenting the refined phases, add a short recommendation:
   - Recommend `build` when the active phase has clear deliverables + exit criteria.
   - Recommend `plan` when dependencies or risk gates are still unresolved.
   - Never auto-switch; ask the user to confirm mode change explicitly.

## Output

Write to the branch's `PHASES.md` per `branchHandoff.contextDirTemplate` (descriptor-driven; default global example: `~/.config/opencode/projects/<key>/branches/<branch>/PHASES.md`). Keep the file under ~120 lines for a normal feature branch; longer plans are usually a sign to split the branch.

## Related

- Baseline persona: `rules/SENIOR_ENGINEERING.md`
- Commands: `commands/project-phases.md`, `commands/project-bootstrap.md`
- Companion skill: `discover-knowledge` for any knowledge updates a phase requires.
