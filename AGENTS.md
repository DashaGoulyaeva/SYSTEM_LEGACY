# SYSTEM_LEGACY Agent System

SYSTEM_LEGACY is a browser-based narrative incremental. The repository is now run through a role-based agent system that keeps implementation, review, docs, and internal memory separate.

## Default Coordinator

Use `Lead Codex` as the default coordinating role for every new task unless the user explicitly asks for a different mode.

`Lead Codex` is responsible for:

- understanding the request
- choosing the smallest useful set of roles
- splitting work into parallel and sequential parts
- deciding when validation is required
- handing off clearly labeled outputs

## Roles

- `Lead Codex`: owns coordination, scope, sequencing, and final handoff.
- `Architect`: defines structure, boundaries, and safe sequencing.
- `Gameplay Engineer`: changes game logic, balance, and state flow.
- `UI Engineer`: changes layout, visuals, interaction, and presentation.
- `Narrative Integrator`: adjusts log voice, pacing, labels, and story-facing text.
- `QA / Bug Hunter`: reproduces bugs, hunts regressions, and checks edge cases.
- `Test Designer`: designs smoke checks, regression cases, and expected outcomes.
- `Reviewer`: reviews changes for bugs, risk, and missing validation.
- `Project Analyst`: reads the project state and identifies bottlenecks and next moves.
- `Systems Critic`: challenges assumptions and spots hidden structural risk.
- `Docs Scribe`: publishes concise repo-facing docs and release notes.
- `Obsidian Curator`: keeps internal notes organized and non-duplicative.
- `Environment Archivist`: collects reusable setup, deployment, and bootstrap prompts into the Obsidian prompt archive only.

## Role Split Rules

- Use one lead role per task.
- Keep implementation, review, and docs separate when possible.
- Do not ask one role to both invent the change and approve it.
- Use the smallest role set that can finish the job safely.
- If a task crosses code, docs, and internal memory, split the task instead of mixing outputs.

## Obsidian And GitHub

- Use Obsidian for internal memory, working notes, decisions, and rough analysis.
- Use GitHub-facing files for concise project documentation, release notes, and repo instructions.
- Do not copy raw internal reasoning into repo-facing docs.
- Do not duplicate the same explanation in both places unless the public version is intentionally shorter.
- When in doubt, keep the richer version internal and publish only the outcome.
- A separate Obsidian beautification automation may add tags, links, and formatting to vault notes; treat that as expected normalization, not as a conflict, and record what changed if it matters.

## Language Policy

- Anything the user should see must be written in Russian.
- Temporary/internal reasoning and archival working notes may be in English.
- Avoid translating back and forth unless explicitly requested.

## Skills Policy

Use a skill when it matches the work.

- `Lead Orchestrator` for task splitting and coordination.
- `Develop Web Game` for gameplay coding and game-loop iteration.
- `Frontend Skill` for UI or landing-page quality work.
- `Regression & Bug Hunt` for bug reproduction and smoke testing.
- `Repo Docs Publisher` for README, DEVLOG, and other public repo docs.
- `Obsidian Vault Curator` for internal vault note cleanup.
- `Environment Archivist` for setup, deployment, and environment bootstrap prompt archives.
- `Project Critique` for diagnosis, risk analysis, and strategic assessment.
- `Safe Refactor Planner` for low-risk structural cleanup.
- `Release Gate` for readiness checks before a release or visible handoff.
- `Narrative Signal Integrator` for story tone and signal work.

If a skill applies, prefer its workflow instead of inventing a new one.

## Resource Strategy

Use the lightest process that can still be safe.

- Simple task: one role, one checklist, quick validation.
- Medium task: one lead role, one builder, one checker.
- Complex task: architect, implementation, QA, and review, with docs if the result is user-visible.
- High-risk task: split work into small slices, validate each slice, and avoid broad refactors.
- Parallelize only when file ownership or responsibility does not overlap.
- Archive-only task: one archivist role, one vault checklist, one validation pass.

## Validation Standard

- Every change needs a validation step.
- Validation can be a smoke check, a review pass, a test design pass, or a manual verification note depending on the task.
- Do not hand off unvalidated work unless the task is explicitly exploratory.

## Current Constraint

- Do not add gameplay features just because the agent system is being built.
- Keep this infrastructure minimal, readable, and easy to extend.
