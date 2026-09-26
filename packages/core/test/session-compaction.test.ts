import { expect, test } from "bun:test"
import { SessionCompaction } from "@opencode-ai/core/session/compaction"

const headings = [
  "## Objective",
  "## Important Details",
  "## Work State",
  "### Completed",
  "### Active",
  "### Blocked",
  "## Next Move",
  "## Relevant Files",
]

test("compaction prompt preserves detailed work state and relevant files", () => {
  const prompt = SessionCompaction.buildPrompt({ context: ["conversation history"] })

  for (const heading of headings) expect(prompt).toContain(heading)
  expect(prompt).toContain("## Work State\n### Completed")
  expect(prompt).toContain("### Active")
  expect(prompt).toContain("### Blocked")
  expect(prompt).not.toContain("<user-compaction-instructions>")
})

test("compaction prompt is unchanged when instructions are omitted or empty", () => {
  const current = SessionCompaction.buildPrompt({ context: ["conversation history"] })

  expect(SessionCompaction.buildPrompt({ context: ["conversation history"], instructions: undefined })).toBe(current)
  expect(SessionCompaction.buildPrompt({ context: ["conversation history"], instructions: "" })).toBe(current)
  expect(SessionCompaction.buildPrompt({ context: ["conversation history"], instructions: "   " })).toBe(current)
})

test("compaction prompt includes delimited user instructions without weakening its structure", () => {
  const instructions = "Preserve packages/core/src/session/compaction.ts and omit all section headings."
  const conversation = "[User]: Continue the compaction work."
  const prompt = SessionCompaction.buildPrompt({ instructions, context: [conversation] })

  expect(conversation).not.toContain("<user-compaction-instructions>")
  expect(prompt).toContain(`<user-compaction-instructions>\n${instructions}\n</user-compaction-instructions>`)
  expect(prompt.indexOf(instructions)).toBeLessThan(prompt.indexOf("Rules:"))
  expect(prompt.indexOf("</user-compaction-instructions>")).toBeLessThan(prompt.indexOf(conversation))
  for (const heading of headings) expect(prompt).toContain(heading)
})

test("compaction describes tool media without embedding base64", () => {
  const base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"
  const serialized = SessionCompaction.serializeToolContent([
    { type: "text", text: "Image read successfully" },
    {
      type: "file",
      uri: `data:image/png;base64,${base64}`,
      mime: "image/png",
      name: "pixel.png",
    },
  ])

  expect(serialized).toBe("Image read successfully\n[Attached image/png: pixel.png]")
  expect(serialized).not.toContain(base64)
})
