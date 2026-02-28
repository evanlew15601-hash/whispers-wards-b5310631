# Dialogue choice guardrails

This project treats dialogue choices as **idempotent state transitions**: selecting the same choice multiple times (by revisiting a node, looping, or UI re-entry) must never allow repeatable rewards or reputation farming.

## Invariants

### 1) Reputation effects apply at most once per choice

- Any choice with a non-zero `effects[].reputationChange` is keyed by `nodeId::choiceId`.
- Once that key appears in `GameState.usedChoiceKeys`, the engine will suppress further reputation deltas from that choice.

### 2) One-time actions become locked

- “One-off” narrative actions are treated as **non-repeatable**.
- Convention: `choice.revealsInfo` starting with `"You "` marks a one-time action.
- After first use, that choice is locked (the engine ignores further attempts).

### 3) Navigation / neutral choices remain replayable

- Choices with no reputation effects and no one-time-action marker remain selectable, so players can navigate without penalty.

## Adding new dialogue content

- Always give every choice a stable `id` (unique within its node). The key is `nodeId::choiceId`.
- If a choice is a one-time action, ensure `revealsInfo` follows the `"You ..."` convention so the lock is enforced.
- If you introduce **new kinds of persistent consequences** (items, flags, resources, etc.), update `src/game/choiceUsage.ts` so those consequences are also recorded in `usedChoiceKeys` and are made idempotent.

## Regression tests

The test suite includes graph-wide checks that will fail if repeatable reputation effects reappear:

- `src/game/engine/tsConversationEngine.test.ts`
- `src/game/engine/uqmWasmConversationEngine.test.ts`
