import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import { SessionCompaction } from "@opencode-ai/core/session/compaction"

fc.configureGlobal({ seed: 42 })

// Property tests for the compaction prompt (R2).
// See traceability/afeies.md and docs/p4-properties.md.

// Whitespace that String.prototype.trim strips: ASCII spaces, tabs and line
// breaks, plus Unicode spaces (NBSP, em space, ideographic space, BOM) that
// users can paste from other apps. Interviewees required empty and
// spaces-only input to behave identically (C-9, O-6), so "blank" covers "",
// a single character, and long mixed runs.
const ws = fc.constantFrom(" ", "\t", "\n", "\r\n", " ", " ", "　", "﻿")
const blank = fc.array(ws, { maxLength: 8 }).map((parts) => parts.join(""))

// Text that contains an instruction delimiter (the base tag or a numbered
// fallback, opening or closing). buildPrompt picks a delimiter absent from
// the instructions, previous summary and context, recursing on collisions,
// so these strings force that recursion to run instead of only the base tag.
const tag = fc
  .tuple(fc.boolean(), fc.nat({ max: 3 }))
  .map(([close, attempt]) => `<${close ? "/" : ""}user-compaction-instructions${attempt === 0 ? "" : `-${attempt}`}>`)
const tagged = fc.tuple(fc.string(), tag, fc.string()).map((parts) => parts.join(""))
const text = fc.oneof(fc.string(), tagged)

// Conversation context and an optional previous summary, each sometimes
// containing delimiters. Up to 4 context entries matches what
// compactAfterOverflow passes (recent tail + selected head) with headroom.
const base = fc.record(
  {
    context: fc.array(text, { maxLength: 4 }),
    previousSummary: text,
  },
  { requiredKeys: ["context"] },
)

// Non-blank instructions with no whitespace at either end, sometimes
// containing delimiters, so the expected sent form is known without trim().
const instructions = fc
  .oneof(fc.string({ unit: "grapheme", minLength: 1 }), tagged)
  .map((value) => value.trim())
  .filter((value) => value.length > 0)

describe("compaction prompt properties", () => {
  // R2: The instructions are trimmed before sending. If nothing is left, the
  // request has no instructions and behaves exactly like a plain compaction.
  // Kind: metamorphic
  // Generators: blank mixes ASCII and Unicode whitespace (incl. ""), the
  // empty/spaces-only input interviewees asked about (C-9, O-6). Context and
  // previous summary vary and may contain instruction delimiters, so the
  // relation is checked against many prompts, not one fixed history.
  test("R2/P2: whitespace-only instructions give the same prompt as none", () => {
    fc.assert(
      fc.property(base, blank, (input, instructions) => {
        expect(SessionCompaction.buildPrompt({ ...input, instructions })).toBe(SessionCompaction.buildPrompt(input))
      }),
    )
  })

  // R2: The instructions are trimmed before sending. If nothing is left, the
  // request has no instructions and behaves exactly like a plain compaction.
  // Kind: metamorphic
  // Generators: padded instructions = blank + instructions + blank, where the
  // inner instructions have non-whitespace ends and sometimes contain
  // delimiters (forcing a numbered tag). Adding outer whitespace must not
  // change the prompt, because only the trimmed text is sent.
  test("R2/P2b: outer whitespace on instructions does not change the prompt", () => {
    fc.assert(
      fc.property(base, blank, instructions, blank, (input, before, text, after) => {
        expect(SessionCompaction.buildPrompt({ ...input, instructions: before + text + after })).toBe(
          SessionCompaction.buildPrompt({ ...input, instructions: text }),
        )
      }),
    )
  })

  // R2: The instructions are trimmed before sending. If nothing is left, the
  // request has no instructions and behaves exactly like a plain compaction.
  // Kind: invariant + metamorphic
  // Added in P5 after Stryker showed that P2 and P2b only compare two prompts
  // with each other, so a prompt with the instructions dropped (or no prompt
  // at all) passed both. This property checks the trimmed instructions are
  // actually sent:
  // - they appear exactly once, on their own lines between `<T>` and `</T>`,
  //   where T is the first of `user-compaction-instructions`,
  //   `user-compaction-instructions-1`, ... that no user-supplied text
  //   (instructions, previous summary, context) contains, so the model can
  //   always tell where they end;
  // - the instruction block is its own paragraph, and removing it gives back
  //   exactly the plain-compaction prompt (no instructions), so instructions
  //   add one paragraph and change nothing else.
  // Generators: the same padded instructions as P2b, and the same context and
  // previous summary, which often contain a delimiter so T is not always the
  // base tag.
  test("R2/P2c: the trimmed instructions are sent once, in a free delimiter, as one added paragraph", () => {
    const tagName = (n: number) => `user-compaction-instructions${n === 0 ? "" : `-${n}`}`
    fc.assert(
      fc.property(base, blank, instructions, blank, (input, before, text, after) => {
        const userText = [text, input.previousSummary ?? "", ...input.context]
        let n = 0
        while (userText.some((value) => value.includes(`<${tagName(n)}>`) || value.includes(`</${tagName(n)}>`))) n++
        const tag = tagName(n)

        const prompt = SessionCompaction.buildPrompt({ ...input, instructions: before + text + after })
        const plain = SessionCompaction.buildPrompt(input)
        expect(typeof prompt).toBe("string")

        const block = `<${tag}>\n${text}\n</${tag}>\n\n`
        expect(prompt.split(block)).toHaveLength(2)

        const open = prompt.indexOf(`<${tag}>\n`)
        const start = prompt.lastIndexOf("\n\n", open)
        const end = prompt.indexOf(block) + block.length
        expect(start).toBeGreaterThan(0)
        expect(prompt.slice(0, start) + "\n\n" + prompt.slice(end)).toBe(plain)
      }),
    )
  })
})
