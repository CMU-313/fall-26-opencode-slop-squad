```ts
import { expect, test } from "bun:test"
import fc from "fast-check"
import { SessionCompaction } from "@opencode-ai/core/session/compaction"

fc.configureGlobal({ numRuns: 200, seed: 42 })

const words = [
  "please",
  "focus",
  "on",
  "the",
  "compaction",
  "summary",
  "keep",
  "tests",
  "architecture",
  "details",
  "brief",
  "user-compaction-instructions",
] as const

const whitespace = fc
  .array(fc.constantFrom(" ", "\t", "\n"), { maxLength: 4 })
  .map((parts) => parts.join(""))

const text = fc
  .array(fc.constantFrom(...words), { minLength: 0, maxLength: 8 })
  .map((parts) => parts.join(" "))

const instruction = fc
  .tuple(
    whitespace,
    fc.array(fc.constantFrom(...words), { minLength: 1, maxLength: 8 }),
    fc.stringMatching(/^[a-z0-9]{8,16}$/),
    whitespace,
  )
  .map(([leading, body, nonce, trailing]) => `${leading}Please ${body.join(" ")} ${nonce}${trailing}`)

const previousSummary = fc.option(text, { nil: undefined })
const context = fc.array(text, { maxLength: 6 })

function findOccurrences(haystack: string, needle: string) {
  const positions: number[] = []
  let from = 0
  while (true) {
    const index = haystack.indexOf(needle, from)
    if (index === -1) return positions
    positions.push(index)
    from = index + 1
  }
}

test("R2: instructions only appear inside the delimited summarizer block", () => {
  fc.assert(
    fc.property(instruction, previousSummary, context, (instructions, previousSummary, context) => {
      const prompt = SessionCompaction.buildPrompt({ previousSummary, instructions, context })
      const trimmed = instructions.trim()
      const match = prompt.match(/<(user-compaction-instructions(?:\d+)?)>([\s\S]*?)<\/\1>/)

      expect(match).not.toBeNull()
      const block = match![0]!
      const body = match![2]!
      expect(body).toContain(trimmed)

      const blockStart = prompt.indexOf(block)
      const contentStart = blockStart + block.indexOf(">") + 1
      const contentEnd = blockStart + block.lastIndexOf("</")
      expect(contentStart).toBeLessThan(contentEnd)

      const positions = findOccurrences(prompt, trimmed)
      expect(positions.length).toBeGreaterThan(0)
      expect(positions.every((position) => contentStart <= position && position < contentEnd)).toBe(true)
    }),
  )
})
```

**Generator:** Instructions are built from real words plus a random alphanumeric nonce and random leading/trailing whitespace, so they are meaningful, non-empty after trimming, and unlikely to collide with the fixed template. The word pool includes `user-compaction-instructions` so the numeric-suffix branch can be exercised. `previousSummary` and `context` are generated too. All generated text excludes angle brackets, so the only tags in the prompt are the actual compaction delimiters.

**Oracle:** The test parses the actual opening tag, capturing any numeric suffix, and matches its corresponding closing tag via backreference. It asserts the trimmed instruction is in the block body, then finds every occurrence of the trimmed instruction in the full prompt and requires each occurrence to fall within the block body. This catches leakage into the preamble or Markdown template while tolerating trimming and dynamic delimiter names.