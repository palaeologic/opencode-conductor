---
description: Replace manual flex containers with established project wrappers
subtask: true
argument: [--file <path>] [--dry-run]
---

# `/migrate-to-flex-wrapper`

Replace component instances that manually reproduce a project's established row or column flex wrapper. This command discovers local conventions before editing and does not assume component names, UI libraries, import paths, or styling syntax.

## Procedure

1. Resolve the target file from `--file` or the active file. Require one readable source file inside the current workspace; reject directories and paths outside the workspace.
2. Discover the local convention:
   - Search nearby source and shared-component modules for established row and column wrappers.
   - Inspect their implementations, accepted props, defaults, import source, and existing call sites.
   - Identify the base container component and the exact style properties that the wrappers replace.
   - If both row and column mappings plus their import source are not unambiguous, show the candidates and ask the user. Do not edit while the mapping is unresolved.
3. Find conservative conversion candidates in the target file:
   - The element is the discovered base container.
   - Its styles set a constant flex display.
   - A constant column direction maps to the discovered column wrapper.
   - A constant row direction, or an omitted direction whose verified default is row, maps to the discovered row wrapper.
4. Exclude candidates with responsive or conditional display/direction values, conflicting wrapper semantics, unknown spread props, polymorphic rendering, or styling that the target wrapper cannot preserve.
5. Prepare a minimal edit:
   - Replace only the opening and closing component names.
   - Remove only the redundant display and direction properties.
   - Preserve children, keys, refs, accessibility attributes, event handlers, layout props, and every unrelated style.
   - Remove an empty style object only when it is statically empty after the change.
   - Add or merge the established wrapper import.
   - Remove the old base-component import only when no references remain.
6. With `--dry-run`, print the proposed conversions and import changes without writing. Otherwise apply the edit, format only the target file with the project's existing formatter when available, and inspect the final diff.
7. Run the narrowest project-provided type, lint, or component test command that covers the file when the user has authorized verification. Never invent a verification command.

## Output format

```text
## Flex-wrapper migration result
- file: <path>
- mode: <dry-run|applied>
- discovered_mapping:
  - row: <component> from <module>
  - column: <component> from <module>
  - base: <component> from <module>
- conversions: <N>
- skipped_ambiguous: <N>
- imports_updated: <yes|no>
- verification: <command and result|not run>
- next_steps:
  - <remaining ambiguity or visual verification recommendation>
```

## Constraints

- Preserve runtime and visual behavior; this is a conservative mechanical refactor.
- Do not add a new wrapper abstraction.
- Do not assume that a missing direction means row until the local base component and wrapper defaults prove it.
- Do not convert responsive, conditional, or dynamically composed layout styles.
- Do not edit generated or vendored files.
- Stop without writes when local conventions conflict or the conversion cannot be proven equivalent.
