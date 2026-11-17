
import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import {
  createCompactionRunner,
  type CompactionRequest,
} from "../../src/util/compaction"

fc.configureGlobal({ seed: 42 })

const requestArb = fc.record({
  sessionID: fc.string({ minLength: 1, maxLength: 40 }),
  modelID: fc.string({ minLength: 1, maxLength: 40 }),
  providerID: fc.string({ minLength: 1, maxLength: 40 }),
  instructions: fc.string({ maxLength: 300 }),
})

const failureArb = fc.constantFrom("error" as const, "throw" as const)

describe("TUI compaction retry", () => {
  test("failed compaction requests can be retried", async () => {
    await fc.assert(
      fc.asyncProperty(
        requestArb,
        fc.array(failureArb, { maxLength: 5 }),
        async (request, failures) => {
          const seen: CompactionRequest[] = []

          const runner = createCompactionRunner(async (input) => {
            seen.push(input)

            const failure = failures[seen.length - 1]
            if (!failure) return {}
            if (failure === "throw") throw new Error("network unavailable")

            return { error: { message: "provider unavailable" } }
          })

          for (const _ of failures) {
            expect(await runner.run(request)).toBe(false)
            expect(runner.isRunning()).toBe(false)
          }

          expect(await runner.run(request)).toBe(true)
          expect(runner.isRunning()).toBe(false)
          expect(seen).toEqual(
            Array.from({ length: failures.length + 1 }, () => request),
          )
        },
      ),
      { numRuns: 200 },
    )
  })
})

