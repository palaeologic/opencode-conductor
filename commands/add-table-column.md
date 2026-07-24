---
description: Add a data-table column by following the nearest existing column, typing, formatting, accessibility, and test conventions
subtask: true
---

Add the table column described by `$ARGUMENTS`.

1. Locate the target table and read applicable project guidance.
2. Inspect adjacent columns and the underlying row/query type.
3. Resolve the field, label, formatter, sorting/filtering behavior, width, visibility, and responsive behavior. Ask only when these cannot be inferred safely.
4. Implement the column using the existing table abstraction. Do not introduce a new table library or wrapper.
5. Update query selections, generated types, translations, fixtures, and tests when required.
6. Verify keyboard/accessibility behavior for interactive cells.
7. Run the narrowest documented type, lint, and test commands.

Return changed paths, the behavior added, verification results, and any intentionally unsupported sorting/filtering behavior.
