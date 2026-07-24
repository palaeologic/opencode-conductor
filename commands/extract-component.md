---
description: Extract a UI component while preserving behavior, ownership, accessibility, and tests
subtask: true
---

Extract the component described by `$ARGUMENTS`.

1. Read applicable rules and inspect the source component, neighboring components, styling conventions, and tests.
2. Define the extraction boundary: owned rendering, state, effects, callbacks, and data dependencies.
3. Keep state at the lowest level that owns it. Avoid turning local implementation details into a broad public prop API.
4. Create the component in the nearest conventional location and preserve semantics, accessibility, styling, and test selectors.
5. Move or add focused tests when the extracted behavior has a stable boundary.
6. Run documented formatting, lint, type, and focused test commands.

Do not mix unrelated visual redesign, state-management migration, or dependency changes into the extraction.
