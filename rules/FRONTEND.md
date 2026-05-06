# Frontend Rules

Apply these rules to frontend code unless a project-specific layer refines them.

## Imports and boundaries

- Respect project package and module boundaries.
- Within the same package or module, prefer relative imports unless the project says otherwise.
- Across packages or modules, prefer the project's canonical alias style.
- Do not import from absolute filesystem paths, `node_modules` internals, `index` barrels, `/src`, `/lib`, or similar unstable internal paths unless the project explicitly allows it.
- Normalize import paths instead of leaving redundant traversal segments.

## React imports

- Prefer named imports from `react` and `react-dom`.
- Avoid default `React` imports unless the project explicitly requires them.
- Prefer direct type imports over namespace-qualified React types when the project supports them.

## TypeScript typing

- Avoid unsafe type assertions and non-null assertions unless there is a justified local pattern.
- Prefer narrowing, validation, and clearer function signatures over asserting types.
- Prefer explicit type imports when they improve clarity and tooling behavior.

## Schema and model naming

- Use project conventions for schema and model naming.
- Keep exported schema names descriptive and consistently cased.

## Import hygiene

- Merge duplicate imports from the same module when safe.
- Preserve renamed imports and type-only semantics when reorganizing imports.
- Use inline `type` specifiers or `import type` when appropriate.

## File organization

- `.tsx` files MUST export only React components — this enables React Fast Refresh (HMR).
- Types and interfaces: export from `types.ts` (co-located with the feature).
- Zod schemas and validation: export from `schemas.ts`.
- Utility functions and helpers: export from `helpers.ts` or `helpers.tsx`.
- Hooks: export from `hooks.ts` or `hooks.tsx`. If a hook is large (>50 lines), place it in its own file under `hooks/` (e.g. `hooks/use_data_fetcher.ts`).
- Do NOT mix component exports with non-component exports in `.tsx` files.

## Implementation behavior

- Choose import forms that satisfy the current project's lint and architecture rules.
- If a change would introduce a boundary violation, rewrite the import or module placement immediately instead of leaving cleanup for later.
