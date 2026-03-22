# Rules

## Separation

- Keep internal analysis in Obsidian-oriented notes.
- Keep repo-facing docs short and publishable.
- Keep implementation separate from approval.

## Language

- User-visible outputs must be in Russian.
- Нормализацию текста вести отдельным потоком, не смешивая с UX или геймплеем.
- Видимые русские тексты обязаны проходить проверку через `russian-proofreader`.
- Internal reasoning and archive-only notes may be in English.
- Do not translate unless it is explicitly needed.
- Obsidian notes may be auto-normalized by a separate beautification automation; do not treat added tags, links, or formatting as a conflict by default.
- Keep terminology consistent in player-facing text: do not mix `ошибка` and `сбой` for the same user-visible concept.

## Skill Use

- Use a matching skill instead of recreating its process.
- Do not force a skill onto unrelated work.
- Prefer official skill workflows for code, docs, critique, and validation.

## Scope Control

- Do not widen a task into feature work when the user asked for infrastructure.
- Keep the number of touched files small unless the task explicitly needs a broad sweep.
- Prefer small, reviewable steps.

## Validation

- Validate before handoff.
- If the task is risky, validate each slice instead of waiting for the end.
