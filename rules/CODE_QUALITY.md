# Code Quality Standards

General quality defaults. Project guidance, established conventions, and configured linters/type-checkers take precedence.

## Control flow

- Prefer early returns over deep nesting — exit error/edge cases first.
- Avoid `else` after a `return`; use flat sequential guards.
- Prefer short, focused function bodies; extract helpers when a function becomes hard to scan or test.
- Use exhaustive `switch` with `never` default for discriminated unions.

## JavaScript and TypeScript

- Apply these rules to both browser and Node code.

- Prefer `const` assertions and discriminated unions over `enum`.
- Use `satisfies` over `as` for type narrowing — preserves inference while asserting shape.
- Use `import type` for type-only imports.
- Avoid `any` — use `unknown` and narrow with type guards when the type is truly dynamic.
- Avoid unsafe type assertions and non-null assertions. If unavoidable, prefer narrow exceptions such as `as const` and `as unknown`, and keep usage local and justified.
- Prefer `readonly` arrays and properties for data that should not be mutated after creation.
- Keep generics simple (max 2-3 type params); extract type aliases for complex ones.

## Naming

- Booleans: prefix with `is`, `has`, `should`, `can`, `will` (e.g. `isLoading`, `hasPermission`).
- Event handlers: prefix with `handle` (component) or `on` (prop callback).
- Constants: `UPPER_SNAKE_CASE` for true compile-time constants; `camelCase` for runtime values.
- Types/interfaces: `PascalCase` — no `I` prefix.

## Functions

- Prefer small parameter lists; use an options object when a call needs several related values.
- Prefer named exports for reusable modules when project conventions allow; follow existing default-export patterns where they are already established.
- Extract magic numbers and strings into named constants at file/module scope.
- Pure functions should be side-effect free — move side effects to callers or dedicated effect handlers.

## Error handling

- Wrap external/IO calls in try/catch with typed error handling.
- Provide context in error messages: what failed, why, and what the user can do.
- Never swallow errors silently — at minimum, log them.
- Use `Result` / discriminated union patterns for expected failure cases instead of throwing.

## Imports and modules

- Group imports: external libs → internal aliases → relative.
- Remove unused imports using the project's configured lint or compiler rules.
- Merge duplicate imports from the same module when safe.
- Keep modules focused; split a generic utilities collection when its responsibilities or ownership become unclear.
- Respect project package and module boundaries; do not cross package boundaries with relative imports.
- Do not import from `node_modules` internals, absolute filesystem paths, `index` barrels, `/src`, `/lib`, or similar unstable internal paths unless explicitly allowed.
- Normalize import paths instead of leaving redundant traversal segments.
- For OpenCode artifact skills, use the central runtime under `$OPENCODE_HOME` (default `~/.config/opencode`): `opencode-python`, `opencode-pip`, `opencode-node`, and `opencode-npm`.
- Do not run `pip install`, `pip install --break-system-packages`, or plain `npm install` from a project repo to satisfy OpenCode skill dependencies. Rerun `bash bin/install-opencode-conductor.sh --with-runtime-deps` from the conductor repo, or use the central runtime wrappers.

## Testing

- Test behavior, not implementation — mock boundaries (network, filesystem), not internals.
- Name tests with the pattern: `<unit> <scenario> <expected result>`.
- Prefer `describe`/`it` blocks with descriptive strings.
- Keep tests independent — no shared mutable state between test cases.
- One assertion per concept (multiple `expect` calls are fine if testing one logical outcome).

## Clean up after yourself

- Remove unused imports and variables after every change — never leave dead code behind.
- Remove unused function parameters unless required by an interface contract.
- If you add code, verify nothing became unused as a result. If you remove code, clean up orphaned imports.

## Commits

- Follow project commit conventions when defined (see project `AGENTS.md`).
- Atomic commits — one logical change per commit.
- Never commit secrets, `.env` files, or build artifacts.
- See `CORE.md` § "Git operations require explicit consent" for consent rules.
