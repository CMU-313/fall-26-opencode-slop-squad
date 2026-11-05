import { describe, test } from "bun:test"

// Property tests for compact instruction normalization (R2, R8).
// See traceability/afeies.md and docs/p4-properties.md.
describe("compact instructions properties", () => {
  test.todo("R2/P1: sent instructions are the trimmed input or undefined")
  test.todo("R8/P6: interior newlines are preserved in order")
})
