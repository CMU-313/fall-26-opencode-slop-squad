import { describe, expect, test } from "bun:test"
import { findCompactionMarker, compactionMarkerInstructions } from "../../src/util/compaction-marker"

describe("TUI compaction marker", () => {
  test("finds a compaction marker", () => {
    const parts = [
      { type: "text", text: "Hello" },
      {
        type: "compaction",
        instructions: "Focus on technical decisions",
      },
    ]

    expect(findCompactionMarker(parts)).toEqual({
      type: "compaction",
      instructions: "Focus on technical decisions",
    })
  })

  test("returns undefined when no marker exists", () => {
    const parts = [{ type: "text", text: "Hello" }]

    expect(findCompactionMarker(parts)).toBeUndefined()
  })

  test("preserves custom instructions", () => {
    const part = {
      type: "compaction",
      instructions: "Focus on authentication",
    }

    expect(compactionMarkerInstructions(part)).toBe("Focus on authentication")
  })

  test("omits instructions when none are provided", () => {
    const part = { type: "compaction" }

    expect(compactionMarkerInstructions(part)).toBeUndefined()
  })

  test("omits empty instructions", () => {
    const part = {
      type: "compaction",
      instructions: "",
    }

    expect(compactionMarkerInstructions(part)).toBeUndefined()
  })

  // Sprint 2: Additional marker verification

  test("finds compaction marker among multiple message parts", () => {
    const parts = [
      { type: "text", text: "Before compaction" },
      { type: "tool", name: "bash" },
      {
        type: "compaction",
        instructions: "Preserve implementation details",
      },
      { type: "text", text: "After compaction" },
    ]

    const marker = findCompactionMarker(parts)

    expect(marker?.type).toBe("compaction")
    expect(compactionMarkerInstructions(marker)).toBe("Preserve implementation details")
  })

  test("preserves multiline instructions in marker", () => {
    const instructions = "Keep decisions\nKeep file paths\nOmit debugging"

    expect(
      compactionMarkerInstructions({
        type: "compaction",
        instructions,
      }),
    ).toBe(instructions)
  })
})
