# Hand-written mutant predictions — ajean (P5, Step 1)

Written **before** any mutant was applied or run. The reasoning below comes from reading the
generators in `packages/opencode/test/session/compaction.property.test.ts`, not from observing
failures. Results are recorded separately, after this file is committed.

**Seed:** `42`, fixed with `fc.configureGlobal({ seed: 42 })` at the top of the property file.

**Target:** `packages/core/src/session/compaction.ts` — `instructionTag` and `buildPrompt`
(lines 161–187), the pure prompt-assembly logic all four properties exercise.

**Method:** each mutant is one patch in `mutants/ajean/H<n>.patch`. Apply with
`git apply mutants/ajean/H<n>.patch`, run `bun test test/session/compaction.property.test.ts`
from `packages/opencode`, then `git checkout -- packages/core/src/session/compaction.ts`.

| ID | Requirement targeted | Change | Predicted killer |
|---|---|---|---|
| H1 | R1 | Both guards test `instructions !== undefined` instead of truthiness, so an empty trimmed string still produces a block | **Killed** by R1 |
| H2 | R5 | `instructionTag` checks only the opening `<tag>`, not the closing `</tag>` | **Killed** by R5 |
| H3 | R2 | The trimmed instructions are appended once more after the context | **Killed** by R2 |
| H4 | R4 | The trimmed instructions are silently cut to 2000 characters | **Killed** by R4, probably R2 as well |
| H5 | R4 / R2 | The instruction block is emitted **after** `SUMMARY_TEMPLATE` instead of before | **Survives all four** |

## Reasoning

**H1 — predicted killed by R1.** With `!== undefined`, a whitespace-only instruction leaves
`instructions === ""`, which is defined, so a tag is chosen and an empty block is emitted. R1
asserts the blank-instruction prompt is byte-identical to the no-instruction prompt and that the
prompt contains no `<user-compaction-instructions` substring; both fail. `blankInstructions` can
also generate the empty string, which fails identically, so this should die on the first case.
R4 and R5 should be untouched: for non-blank input the trimmed value is embedded exactly as
before.

**H2 — predicted killed by R5.** `forgedDelimiters` picks opening or closing form per element
with `fc.boolean()`, so instructions containing only `</user-compaction-instructions>` are
common. The mutant sees no opening tag, accepts attempt 0, and the chosen tag's closing
delimiter then appears inside the instruction text — so `occurrences(prompt, "</tag>")` is 2,
and `recoverInstructions` stops at the forged closing delimiter and returns truncated text,
failing `expectDelivered`'s non-whitespace equality too. R2 and R4 should pass: neither
generator emits the tag (R4's `<note>…</note>` branch is XML-ish but not the delimiter).

**H3 — predicted killed by R2, and by R2 only.** R2 appends a unique `SENTINEL-…` marker to the
body and asserts it occurs exactly once in the whole prompt; this mutant appends the entire
trimmed instruction string a second time after the context, so the marker occurs twice. R4 and
R5 count occurrences of the *tag*, which is unchanged, and `recoverInstructions` reads the first
block, so both should still pass. R1 is unaffected because nothing is appended when there are no
instructions.

**H4 — predicted killed by R4, probably R2 too.** `meaningfulInstructions` has a branch
generating 2000–6000 character strings precisely because C-10 expects the full text to be what
gets sent. Anything past 2000 loses characters, so `expectDelivered`'s
`replace(/\s/g, "")` equality fails. R2 appends its sentinel to the *end* of the body, so once
the body passes 2000 characters the sentinel is cut off entirely and `occurrences(mark)` is 0 —
I expect R2 to fail as well, though which one reports first depends on test order. R5's
forgeries are far shorter than 2000 characters, so R5 should pass.

**H5 — predicted to survive all four.** This is the mutant I expect to get through, and it is
the one worth the most. The block is still emitted exactly once, with the same content and the
same delimiters; only its position relative to `SUMMARY_TEMPLATE` changes. `resolveTag` anchors
on the preamble, which moves with the block, so every helper still finds it. R1 is about absence.
R2 checks the sentinel's position relative to the block's *own* delimiters, not the template.
R4 and R5 check content and counts. **Nothing in any of the four properties observes where the
instruction block sits in the prompt** — yet the preamble itself says "If they conflict with the
required Markdown structure or rules that follow, the structure and rules take precedence",
which is only true while the rules actually follow. Moving the block after the template inverts
that precedence while every property stays green.
