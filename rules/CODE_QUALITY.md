# Code Quality Standards

Universal quality rules harvested from industry best practices. Apply to all source files.

## Control flow

- Prefer early returns over deep nesting — exit error/edge cases first.
- Avoid `else` after a `return`; use flat sequential guards.
- Keep function bodies under ~40 lines; extract helpers for complex logic.
- Use exhaustive `switch` with `never` default for discriminated unions.

## TypeScript

- Prefer `const` assertions and discriminated unions over `enum`.
- Use `satisfies` over `as` for type narrowing — preserves inference while asserting shape.
- Use `import type` for type-only imports.
- Avoid `any` — use `unknown` and narrow with type guards when the type is truly dynamic.
- Prefer `readonly` arrays and properties for data that should not be mutated after creation.
- Keep generics simple (max 2-3 type params); extract type aliases for complex ones.

## Naming

- Booleans: prefix with `is`, `has`, `should`, `can`, `will` (e.g. `isLoading`, `hasPermission`).
- Event handlers: prefix with `handle` (component) or `on` (prop callback).
- Custom hooks: prefix with `use`.
- Constants: `UPPER_SNAKE_CASE` for true compile-time constants; `camelCase` for runtime values.
- Types/interfaces: `PascalCase` — no `I` prefix.

## Functions

- Limit parameters to 3; use an options object beyond that.
- Prefer named exports over default exports (improves refactoring and tree-shaking).
- Extract magic numbers and strings into named constants at file/module scope.
- Pure functions should be side-effect free — move side effects to callers or dedicated effect handlers.

## React patterns

- Prefer composition over inheritance — use render props or compound components.
- Memoize expensive computations with `useMemo`; memoize callbacks with `useCallback` only when passed to child components that re-render.
- Avoid inline object/array literals in JSX props (causes unnecessary re-renders).
- Keep components focused — one responsibility per component.
- Extract business logic into custom hooks; keep components as thin UI shells.
- Prefer controlled components over uncontrolled for form state.

## Error handling

- Wrap external/IO calls in try/catch with typed error handling.
- Provide context in error messages: what failed, why, and what the user can do.
- Never swallow errors silently — at minimum, log them.
- Use `Result` / discriminated union patterns for expected failure cases instead of throwing.

## Imports and modules

- Group imports: external libs → internal aliases → relative.
- Remove unused imports — enforce via eslint `no-unused-imports`.
- One module = one responsibility; avoid "utils" grab-bag files exceeding 200 lines.

## Testing

- Test behavior, not implementation — mock boundaries (network, filesystem), not internals.
- Name tests with the pattern: `<unit> <scenario> <expected result>`.
- Prefer `describe`/`it` blocks with descriptive strings.
- Keep tests independent — no shared mutable state between test cases.
- One assertion per concept (multiple `expect` calls are fine if testing one logical outcome).

## Clean up after yourself

- MUST remove unused imports and variables after every change — never leave dead code behind.
- MUST remove unused function parameters unless required by an interface contract.
- If you add code, verify nothing became unused as a result. If you remove code, clean up orphaned imports.

## Git and commits

- Atomic commits — one logical change per commit.
- Commit messages: imperative mood, under 72 chars, reference ticket/issue if available.
- Never commit secrets, `.env` files, or build artifacts.
