
import { describe, expect, test } from "bun:test"
import {
  findCompactionMarker,
  compactionMarkerInstructions,
} from "../../src/util/compaction-marker"

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

    expect(compactionMarkerInstructions(part)).toBe(
      "Focus on authentication",
    )
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
})
