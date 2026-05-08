---
description: Generate end-user help-center docs from code with safety guards and vocabulary audit
agent: plan
subtask: true
---

Loads skill:

- `help-docs-author` for the five-phase authoring workflow.

Use this command when users want docs generated from code without copy-pasting long prompts.

## Arguments

`$ARGUMENTS` supports:

- positional `$1` — output root (required unless prompted)
- `--scope=<path-or-area>` (repeatable)
- `--audience=<label>` (default: end-users)
- `--brand=<from:to>` (repeatable replacement map)
- `--ban-term=<term>` (repeatable)
- `--no-frontmatter`
- `--no-mermaid`
- `--no-vocab-grep`
- `--allow-in-repo`

Unknown tokens should trigger clarification.

## Workflow

1. Parse arguments and confirm output root.
2. Enforce output containment:
   - resolve absolute path
   - refuse if outside approved root
   - refuse if inside repository unless `--allow-in-repo` is present
3. Load `help-docs-author`.
4. Run the five phases:
   - Discovery
   - Code-reading
   - Plan
   - Generation
   - Audit
5. Frontmatter policy:
   - include Docusaurus frontmatter unless `--no-frontmatter`
6. Mermaid policy:
   - include only where it helps user workflows unless `--no-mermaid`
7. Vocabulary audit:
   - run grep over generated files for ban terms unless `--no-vocab-grep`
   - fail with a remediation list on matches
8. Secret scan before final write/overwrite using kit regex patterns.
9. Return a structured summary with created/updated files and any audit findings.

## Output format

```markdown
## Help docs generation result
- output_root: <path>
- scopes: <list>
- files_written: <count>
- files: <paths>
- frontmatter: <enabled|disabled>
- mermaid: <enabled|disabled>
- vocab_grep: <enabled|disabled>
- findings: <none|summary>
- next_step: <publish/review instruction>
```

## Constraints

- No writes outside the approved output root.
- No in-repo writes unless user explicitly opts in.
- No secrets in generated output.
- Prefer user-facing language over implementation internals.
