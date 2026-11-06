# Traceability: Adam Jean (ajean)

**Target feature:** Custom compaction pipeline — user-supplied instructions that steer the compaction summary. The pure prompt-assembly logic is `buildPrompt` / `instructionTag` in [`packages/core/src/session/compaction.ts`](../packages/core/src/session/compaction.ts); it is called from [`packages/opencode/src/session/compaction.ts`](../packages/opencode/src/session/compaction.ts) (line ~393). The instruction travels from the compact dialog (`packages/app/src/components/dialog-compact.tsx`) through `packages/app/src/pages/session/use-session-commands.tsx` and the v1 compatibility shim (`packages/app/src/utils/server-compat.ts`), and is rendered in the timeline by `packages/app/src/pages/session/timeline/rows.ts` and `packages/session-ui/src/components/message-part.tsx`.

**Property test file:** [`packages/opencode/test/session/compaction.property.test.ts`](../packages/opencode/test/session/compaction.property.test.ts)

## Requirements

| ID | Interview evidence | Requirement | Acceptance Criteria | Changed in P4? | Property (kind) | Test |
|---|---|---|---|---|---|---|
| R1 | C-12, S-5, O-12 | Whitespace-only instructions are treated exactly like no instructions. | For any instruction string consisting only of whitespace, `buildPrompt({ instructions: s, ... })` returns a prompt byte-identical to `buildPrompt({ ... })` with `instructions` omitted: no instruction block, no delimiter tag. | Evidence corrected (was mis-cited to C-9 / S-6 / O-7) | Blanking the instructions is an identity perturbation on the prompt (**metamorphic**) | `R1: whitespace-only instructions produce the same prompt as no instructions` |
| R2 | C-8, S-2, S-3, O-8 | User instructions appear only in the summarizer prompt, delimited, never in the agent's system prompt. | For any instruction string, the text appears in the summarizer prompt only inside the `<user-compaction-instructions...>` block. | Evidence corrected (was mis-cited to C-5 / O-3) | Instruction text never escapes its delimited block (**invariant**) | `R2: instruction text appears only inside its delimited block` |
| R3 | O-9, O-10, O-11 | A failed or cancelled compaction leaves the session unchanged. | After a compaction that fails or is cancelled, the session has the same messages and the same message count as before it started, and the next user message is accepted immediately — no half-summarized state. | Yes — acceptance criteria rewritten to be checkable (was a verbatim restatement of the requirement); evidence corrected (was mis-cited to O-4 / O-5 / O-6) | Not property-tested in P4 — see note below | — |
| R4 | C-10, C-9, S-4 | The instruction text the user typed is the exact text handed to the summarizer: it is carried verbatim, in full, and exactly once, even when the transcript displays it abbreviated. | For any instruction string with at least one non-whitespace character, `buildPrompt` emits exactly one `<tag>...</tag>` block, and the text recovered from between those delimiters equals the original string character for character — no trimming, truncation, escaping, or re-encoding. | New in P4 | Encode into the prompt, decode back out, recover the original (**round-trip**) | `R4: instructions survive the round trip into the prompt verbatim` |
| R5 | O-8, S-3 | The delimiter around the instructions cannot be forged by the instruction text itself or by anything else in the prompt. | For any instructions, previous summary, and context — including text that already contains `<user-compaction-instructions>`, its closing tag, or the numbered variants — `instructionTag` picks a tag that appears in none of those values, so the block has exactly one opening and one closing delimiter. | New in P4 | No input can collide with the chosen tag (**invariant**) | `R5: the chosen delimiter cannot be forged from any input` |

Four requirements (R1, R2, R4, R5) carry fast-check properties, using three kinds: metamorphic, invariant, and round-trip.

**Why R3 has no property.** R1, R2, R4 and R5 are all checks on `buildPrompt`, a pure function from `{ previousSummary, instructions, context }` to a string, so they can be driven with generated inputs directly. R3 is a statement about session state across a failed effect: checking it needs a session harness that can inject a compaction failure mid-flight and then compare message lists, which is a different kind of test rather than a different property. R3 is kept as a requirement and its acceptance criteria are now concrete enough to test; the property for it is deferred.

**Why the tests live in `packages/opencode` and not `packages/core`.** `buildPrompt` is defined in `packages/core`, but fast-check is declared as a dev dependency of `packages/opencode` only, and bun does not hoist it to the workspace root — a test file under `packages/core/test/` fails with `Cannot find package 'fast-check'`. `packages/opencode` already imports `buildPrompt` from `@opencode-ai/core/session/compaction` in its own source, so the test imports it the same way. This also keeps `package.json` and `bun.lock` untouched, avoiding a conflict with teammates' branches. `opencode#test` is declared in `turbo.json`, so these tests run in CI on the PR.

**Generator choices.** Documented in comments in the test file. In short: the blank-instruction generator emits every character `String.prototype.trim()` removes, including NBSP, the line/paragraph separators and the BOM, because the production code decides "blank" with `.trim()`; the meaningful-instruction generator deliberately includes strings *padded* with whitespace, since a stray `.trim()` on the way into the prompt is the most likely way to break R4 and an unpadded generator would never catch it; and the adversarial generator emits the numbered tag variants (`...-1`, `...-2`) directly, because the chance of fast-check producing the literal string `</user-compaction-instructions-1>` at random is nil, yet that is precisely the forgery O-8 described.

**Properties written or suggested by opencode or another AI tool:** R1, R2, R4 and R5 — the property implementations and all generators in `compaction.property.test.ts` were written by Claude (Claude Code), as were the requirement wording and property design for R4 and R5. R1, R2 and R3 are my own requirements, carried over from Project 3. I reviewed every property, and I am responsible for each one being correct and tied to a real requirement.

## Requirement changes

| ID | Original requirement (P3) | Revised requirement | Why it changed |
|---|---|---|---|
| R3 | A failed or cancelled compaction leaves the session unchanged. (Acceptance criteria restated the requirement word for word.) | Same requirement; acceptance criteria now state the concrete check: same messages and same message count as before, and the next user message is accepted immediately. | **Couldn't be checked.** The original acceptance criteria repeated the requirement instead of naming an observable outcome, so there was no way to tell whether the code met it. O-10's definition of an intact session supplies the concrete check. |

R1, R2, R4 and R5 are kept as written — each names a concrete, observable outcome of a pure function, so all four can be checked directly. R1's and R2's interview-evidence citations were corrected to the notes that actually support them; the requirements themselves did not change.

## Step 3: run, triage, and fix

All four properties passed on the first run against the current code (1,000 generated inputs, 6,172 assertions), so no code bug, wrong test, or requirement problem surfaced.

Because a property that cannot fail is worth nothing, each one was checked against a deliberate mutation of `packages/core/src/session/compaction.ts`, reverted immediately afterwards. Every mutation was caught by the property that targets it:

| Mutation | Property that failed | Shrunk counterexample |
|---|---|---|
| Embed the trimmed instructions instead of the original | R4 only | `"   !   "` |
| Never retry the tag on collision (`return tag` instead of recursing) | R5 only | `"<user-compaction-instructions>"` in both the instructions and the context |
| Drop the `.trim()` gate on `input.instructions` | R1 only | `" "` |
| Append the raw instructions again after the context | R2 (and R1) | instructions `" \n!"` with the sentinel escaping the block |
