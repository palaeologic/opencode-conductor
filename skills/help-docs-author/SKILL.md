---
name: help-docs-author
description: Generate end-user help-center docs from code using a five-phase workflow with safety, vocabulary, and frontmatter guards
---

## What I do

I generate user-facing documentation from repository source code with this deterministic sequence:

1. Discovery
2. Code-reading
3. Plan
4. Generation
5. Audit

The output targets non-developer users, avoids implementation jargon by default, and uses predictable formatting so teams can publish to docs sites.

## Inputs

Required:

- target code scope (paths, modules, or feature area)
- output root path

Optional:

- product/brand replacements
- vocabulary ban list
- frontmatter and mermaid toggles

## Phase workflow

### 1) Discovery

- Read feature entry points and linked flows.
- Collect user-visible capabilities, constraints, and prerequisites.
- Record source evidence paths for each claim.

### 2) Code-reading

- Read frontend flow + backend/API contracts relevant to the feature.
- Prefer stable entry points and orchestration files over low-level helpers.
- Capture configuration and environment assumptions users must know.

### 3) Plan

- Propose documentation outline before writing.
- Map each section to concrete source evidence.
- Resolve terminology normalization and banned wording.

### 4) Generation

- Write docs under the approved output root only.
- Include Docusaurus frontmatter by default (unless disabled).
- Include mermaid only when it clarifies user workflows.

### 5) Audit

- Run vocabulary ban checks.
- Ensure no secrets/tokens are emitted.
- Validate links and examples against discovered source behavior.

## Defaults

- Audience: end users and operators (not developers).
- Tone: clear, procedural, concise.
- Frontmatter: enabled by default.
- Mermaid: enabled by default for workflow-heavy pages.
- Ban-list grep: enabled by default.

## Safety and constraints

- Refuse writes outside output root.
- Refuse in-repo output by default unless explicitly allowed.
- Refuse on secret-pattern matches in generated content.
- Do not claim behavior unsupported by source evidence.

## Related

- Loaded by: `/project-help-docs`
- Security and containment policy: `documentation/PATH_CONTRACT.md`
