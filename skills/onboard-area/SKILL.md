---
name: onboard-area
description: Systematically ramp up on an unfamiliar code area using AGENTS.md hierarchy and key file scanning
---

## What I do

Provide a structured approach to understanding a new or unfamiliar area of the codebase. Reads the knowledge hierarchy, identifies key patterns, and builds a mental model before making changes.

## When to use me

- You need to work in an area you haven't touched before
- The user asks "how does X work?" about an unfamiliar module
- You're about to make changes but aren't confident about the area's conventions
- After a refresh reveals an area you have no context for

## Workflow

### 1. Load context hierarchy

Read the knowledge files in order (stop if a level doesn't exist):

1. **Project AGENTS.md** — `~/.config/opencode/projects/<key>/AGENTS.md`
2. **Area AGENTS.md** — `~/.config/opencode/projects/<key>/<area>/AGENTS.md`
3. **Package AGENTS.md** — deeper package-level files if they exist

Each level adds specificity. The project level gives architecture; the area level gives conventions; the package level gives implementation details.

### 2. Scan key files

In the target area's source directory:

1. **Entry points** — look for `index.ts`, `main.ts`, `app.ts`, `cli.ts`, or similar
2. **Config files** — `tsconfig.json`, `package.json`, `.eslintrc`, `Makefile`
3. **Type definitions** — `types.ts`, `*.d.ts`, interfaces that define the domain model
4. **Test files** — understand expected behavior from test descriptions
5. **README** — area-specific documentation

### 3. Identify patterns

Look for:
- How modules are structured (barrel exports? feature folders? flat?)
- Naming conventions (casing, prefixes, suffixes)
- State management approach
- Data flow patterns (API calls, transformations, rendering)
- Error handling conventions
- Testing patterns (unit vs integration, mocking style)

### 4. Build summary

Synthesize a brief mental model:
- What is this area responsible for?
- What are its inputs and outputs?
- What are the key abstractions?
- What conventions must new code follow?
- What are the common pitfalls?

### 5. Verify understanding

Before making changes:
- Can you trace a request/interaction from entry to output?
- Do you know where new code should live?
- Do you know what existing utilities/helpers are available?

If not, ask the user for clarification rather than guessing.

## Tips

- Don't try to understand everything — focus on the path relevant to your task
- If AGENTS.md files are missing or stale, note it and suggest `/project-knowledge-refresh`
- Time-box exploration to ~5 minutes of reading before starting work
