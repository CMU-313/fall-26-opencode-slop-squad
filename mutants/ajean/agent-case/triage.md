# Agent failure case — triage (ajean, P5 Step 7)

Which mutant does opencode's property let through? This records what was **measured**, not what
was guessed. Every row is a real run of
`bun test test/session/compaction.opencode.property.test.ts --timeout 30000` from
`packages/opencode`, with the mutant applied via `git apply` and reverted with
`git checkout -- packages/core/src/session/compaction.ts` afterwards.

## The expectation going in was wrong

The plan was that **H3** would survive, on the theory that an agent-written R2 property asserts
the instruction text *appears somewhere* in the prompt rather than *only inside the block*. That
is not what opencode wrote. Its oracle collects **every** occurrence of the trimmed instruction in
the whole prompt and requires each one to fall between the delimiters, which is exactly the check
H3 violates — H3 appends the instructions a second time after the context, and opencode's property
fails on it. The guess was wrong and the test was run before anything was written down.

## Measured results

| Mutant | What it changes | opencode's property | ajean's own four properties |
|---|---|---|---|
| H1 | guards use `instructions !== undefined` instead of truthiness | **Survives** (1 pass, 0 fail) | Killed by R1 |
| H2 | `instructionTag` checks only the opening tag | **Survives** (1 pass, 0 fail) | Killed by R5 |
| H3 | instructions appended again after the context | Killed (0 pass, 1 fail) | Killed by R2 |
| H4 | instructions silently cut to 2000 characters | **Survives** (1 pass, 0 fail) | Killed by R2 **and** R4 |
| H5 | instruction block emitted after `SUMMARY_TEMPLATE` | **Survives** (1 pass, 0 fail) | Survives all four (known gap, R6) |

## The one chosen, and why

**H4.** H1, H2, H4 and H5 all survive opencode's property, but H4 is the only one that is both a
real defect *and* a failure of the exact requirement opencode was asked about:

- **H5** is not a fair choice — it survives ajean's four properties too, so it says nothing about
  the agent. It is a requirements gap (R6), already recorded under "H5: a gap in the requirements".
- **H1** and **H2** fall outside what opencode was asked for: H1 is R1 (blank instructions) and H2
  is R5 (delimiter forgery). opencode was given R2 only, and its generator reasonably never emits
  blank instructions or forged delimiters.
- **H4 is squarely inside R2.** opencode's own oracle contains the assertion that catches it —
  `expect(body).toContain(trimmed)` — and ajean's R2 kills it. The property fails only because its
  generator never produces an input long enough for the assertion to bite.

## Cause: a generator that never reaches the bug

Not a weak oracle and not an always-passing assertion. opencode's oracle is sound: it finds the
real delimiter, tolerates the numeric suffix with a backreference, and bounds every occurrence of
the instruction text to the block interior. The defect is upstream of it. The `instruction`
arbitrary is at most eight words drawn from a twelve-word pool plus an 8–16 character nonce;
measured over 5000 samples it spans **18 to 165 characters**. H4 cuts at **2000**. The mutant is
unreachable by a factor of twelve, so the assertion that would have caught it is never handed an
input that reaches the cut.

ajean's `meaningfulInstructions` has a 2000–6000 character branch, placed there deliberately
because C-10 expects the full typed text to be what reaches the summarizer. That one generator
decision is the whole difference between the two properties.

## The fix

Widen the generator and keep the oracle. `longInstruction` pads past the cut and puts the nonce at
the very **end** of the instructions, where a truncation destroys it; the strengthened test draws
from `fc.oneof(instruction, longInstruction)` so it still covers the short regime opencode wrote
for. The oracle is opencode's, copied unchanged. opencode's own test is left exactly as committed
in `9765682`.
