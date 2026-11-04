
import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import {
  createCompactionRequest,
  createCompactionRunner,
  type CompactionRequest,
} from "../../src/util/compaction"
import {
  compactionMarkerInstructions,
  findCompactionMarker,
} from "../../src/util/compaction-marker"

const model = {
  modelID: "test-model",
  providerID: "test-provider",
}

// Generators cover empty inputs, whitespace-only inputs,
// multiline instructions, punctuation, Unicode, and long strings.
// These are important boundaries for the compaction feature.

const instruction = fc.string({ maxLength: 300 })

const nonblankInstruction = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0)

const trimmedInstruction = nonblankInstruction.map(
  (s) => s.trim()
)

const multilineInstruction = fc
  .tuple(trimmedInstruction, trimmedInstruction)
  .map(([a, b]) => `${a}\n${b}`)

const requestArb = fc.record({
  sessionID: fc.string({ minLength: 1, maxLength: 40 }),
  modelID: fc.string({ minLength: 1, maxLength: 40 }),
  providerID: fc.string({ minLength: 1, maxLength: 40 }),
  instructions: instruction,
})

describe("Project 4: custom compaction properties", () => {

  // R1 (revised):
  // The TUI sends every nonblank instruction after trimming
  // leading and trailing whitespace. Internal content and
  // line order must be preserved.
  // Kind: model/oracle.

  test("R1: request preserves instruction content after boundary trimming", () => {
    fc.assert(
      fc.property(
        fc.oneof(instruction, multilineInstruction),
        (text) => {
          const result = createCompactionRequest(
            "session",
            model,
            text
          )

          expect(result).toEqual({
            sessionID: "session",
            modelID: model.modelID,
            providerID: model.providerID,
            instructions: text.trim() || undefined,
          })
        }
      ),
      { numRuns: 200 }
    )
  })

  // R2:
  // Canceling compaction must not initiate a request
  // or modify the conversation.
  // Kind: invariant.
  // Null represents cancellation.

  test("R2: cancellation never creates a compaction request", () => {
    fc.assert(
      fc.property(
        instruction,
        fc.string({ maxLength: 100 }),
        (draft, sessionID) => {
          expect(typeof draft).toBe("string")

          const result = createCompactionRequest(
            sessionID,
            model,
            null
          )

          expect(result).toBeUndefined()
        }
      ),
      { numRuns: 200 }
    )
  })

  // R4 (revised):
  // After an API failure, the request runner must reset
  // and allow retrying the same instructions.
  // Kind: invariant.
  // The generator tests both returned errors and thrown errors.

  test("R4: failed compaction can be retried with the same request", async () => {
    await fc.assert(
      fc.asyncProperty(
        requestArb,
        fc.boolean(),
        async (request, throws) => {
          const seen: CompactionRequest[] = []

          const runner = createCompactionRunner(
            async (input) => {
              seen.push(input)

              if (seen.length === 1) {
                if (throws) {
                  throw new Error("network unavailable")
                }

                return {
                  error: {
                    message: "provider unavailable",
                  },
                }
              }

              return {}
            }
          )

          expect(await runner.run(request)).toBe(false)
          expect(runner.isRunning()).toBe(false)

          expect(await runner.run(request)).toBe(true)

          expect(seen).toEqual([request, request])
          expect(runner.isRunning()).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  // R5 (revised):
  // Submitted custom instructions must remain available
  // in the compaction marker for review.
  // Kind: round-trip.
  // Store instructions in a marker, then retrieve them.

  test("R5: instructions round-trip through a compaction marker", () => {
    fc.assert(
      fc.property(
        nonblankInstruction,
        (text) => {
          const parts = [
            {
              type: "text",
              instructions: "unrelated",
            },
            {
              type: "compaction",
              instructions: text,
            },
            {
              type: "tool",
              instructions: "unrelated",
            },
          ]

          const marker = findCompactionMarker(parts)

          expect(
            compactionMarkerInstructions(marker)
          ).toBe(text)
        }
      ),
      { numRuns: 200 }
    )
  })

  // R7:
  // User-specified project context must be forwarded
  // in the compaction request.
  // Kind: metamorphic.
  // Adding a second instruction must preserve the first.

  test("R7: adding context preserves existing context in the request", () => {
    fc.assert(
      fc.property(
        trimmedInstruction,
        trimmedInstruction,
        (first, second) => {
          const original = createCompactionRequest(
            "session",
            model,
            first
          )

          const expanded = createCompactionRequest(
            "session",
            model,
            `${first}\n${second}`
          )

          expect(original?.instructions).toBe(
            first.trim()
          )

          expect(expanded?.instructions).toBe(
            `${first}\n${second}`.trim()
          )

          expect(
            expanded?.instructions?.includes(first)
          ).toBe(true)

          expect(
            expanded?.instructions?.includes(second)
          ).toBe(true)
        }
      ),
      { numRuns: 200 }
    )
  })
})
