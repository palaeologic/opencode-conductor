---
name: add-feature-module
description: Plan, scaffold, integrate, and verify a feature module by following the host repository's existing architecture and conventions
---

# Add a feature module

Use this skill when a change introduces a coherent module, package, bounded feature, CRUD surface, or vertical slice.

## Inputs

- Feature name and user-visible goal.
- Intended area or package, when known.
- Required surfaces: API, storage, UI, routing, jobs, events, or documentation.
- Acceptance criteria and compatibility constraints.

If these are incomplete, inspect the repository first and ask only for decisions that materially change the design.

## Workflow

1. Read the project and nearest area-level `AGENTS.md`, applicable `KNOWLEDGE.md`, descriptor, and branch context.
2. Find one or two existing modules with similar responsibilities. Record their public entry points, registration mechanism, tests, and verification commands.
3. Propose a small module plan:
   - location and ownership boundary;
   - public API and data contracts;
   - required integrations or registrations;
   - migration and rollback needs;
   - focused and broad verification.
4. Confirm the plan before creating a new top-level package, database object, public route, or externally visible API.
5. Scaffold the minimum structure needed. Prefer repository-native generators when documented; otherwise copy only the structural pattern and remove irrelevant code.
6. Implement from the boundary inward:
   - types and contracts;
   - domain or service behavior;
   - adapters and persistence;
   - UI, routes, or command entry points;
   - registration and exports.
7. Add tests at the narrowest stable boundary. Cover failure paths and authorization or validation rules where applicable.
8. Run verification commands discovered from project rules, manifests, CI configuration, and neighboring modules. Do not invent commands.
9. Update durable knowledge only when the new module changes architecture, ownership, setup, or reusable conventions.

## Integration checklist

- [ ] Naming and paths match neighboring modules.
- [ ] Public exports and registration points are complete.
- [ ] API/schema/code generation is refreshed when applicable.
- [ ] Data migrations are reversible or have an explicit recovery plan.
- [ ] Errors, permissions, and input validation are covered.
- [ ] Focused tests pass.
- [ ] Required broad checks pass or are reported as not run.
- [ ] Generated files and documentation are current.

## Constraints

- Do not assume a framework, directory layout, package manager, database, or routing system.
- Do not introduce a new abstraction when an existing project pattern is adequate.
- Do not copy secrets, local environment values, generated reports, or test artifacts.
- Keep unrelated refactors outside the feature unless they are required and explicitly justified.
