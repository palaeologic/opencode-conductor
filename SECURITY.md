# Security

## Reporting vulnerabilities

If you believe you have found a **security vulnerability in this repository** (for example unsafe defaults that could lead to data exposure across tenants), please report it responsibly:

- Open a **private** advisory or issue on the maintainer’s GitHub/GitLab security channel if one exists, **or**
- Contact the repository maintainers through your organization’s standard security intake.

This project is a **documentation-and-kit** repository (commands, rules, skills, optional Bun tools). Many “findings” are better handled as **process** issues (what gets committed to git, what lives in handoff markdown). Use the checklist below for day-to-day safe use.

## Operator checklist (handoff and git)

Use this as a **yes/no** gate before pushing branch handoff or project-local Conductor directories.

- [ ] **No secrets in handoff markdown:** No API keys, tokens, passwords, or private keys in `MERGE_REQUEST.md`, `REVIEW.md`, `LOG.md`, or pasted issue text. Prefer links to your secret store / CI variables / internal runbooks.
- [ ] **Internal URLs:** Treat review URLs, kube hostnames, and internal-only origins as **internal data**. Confirm repository visibility (public vs private) before **committing** project-local Conductor state.
- [ ] **Default gitignore for project-local:** Unless policy says otherwise, keep project-local Conductor dirs **gitignored** so internal narrative does not land in every clone and CI checkout.
- [ ] **Opt-out of gitignore reviewed:** If you commit handoff state, confirm no classified paths, customer identifiers, or trial-only language that should live only in your canonical MR / issue system.
- [ ] **Classification matches storage:** If `REVIEW.md` contains production schema names or PII-adjacent terms, the chosen storage location (global home dir vs private repo vs gitignored path) matches your org policy.
- [ ] **Git history:** Removing a file later does **not** erase past commits; prefer prevention (gitignore, paste discipline) over retroactive cleanup.
- [ ] **Source of truth:** If your team uses multiple systems (issue tracker, GitLab/GitHub MR, Conductor files), agree which layer is canonical for compliance-facing text; do not let Conductor scratch files silently replace it.
- [ ] **Kit source of truth:** Pull and run `bash bin/install-opencode-conductor.sh` from the **same** git clone your team treats as the install source so command text matches expectations.

For path behavior (where `descriptor.json` lives vs where branch data may point), see [`docs/PATH_CONTRACT.md`](docs/PATH_CONTRACT.md).
