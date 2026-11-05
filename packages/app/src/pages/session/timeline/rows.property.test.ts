import { describe, test } from "bun:test"

// Property tests for compaction divider rows (R6).
// See traceability/afeies.md and docs/p4-properties.md.
describe("compaction timeline row properties", () => {
  test.todo("R6/P3: exactly one compaction divider, right after its user message")
  test.todo("R6/P4: instructions do not change row count, order, or position")
  test.todo("R6/P5: rows are identical after a JSON round-trip of the history")
})
