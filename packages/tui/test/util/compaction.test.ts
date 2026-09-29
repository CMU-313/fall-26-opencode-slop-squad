
import { describe, expect, test } from "bun:test"
import { createCompactionRequest } from "../../src/util/compaction"

describe("TUI compaction instructions", () => {
  const model = {
    modelID: "test-model",
    providerID: "test-provider",
  }

  test("includes custom instructions in the request", () => {
    const result = createCompactionRequest(
      "test-session",
      model,
      "Focus on technical decisions",
    )

    expect(result).toEqual({
      sessionID: "test-session",
      modelID: "test-model",
      providerID: "test-provider",
      instructions: "Focus on technical decisions",
    })
  })

  test("trims whitespace from instructions", () => {
    const result = createCompactionRequest(
      "test-session",
      model,
      "  Focus on authentication  ",
    )

    expect(result?.instructions).toBe("Focus on authentication")
  })

  test("omits instructions when input is empty", () => {
    const result = createCompactionRequest(
      "test-session",
      model,
      "",
    )

    expect(result).toBeDefined()
    expect(result?.instructions).toBeUndefined()
  })

  test("omits whitespace-only instructions", () => {
    const result = createCompactionRequest(
      "test-session",
      model,
      "   ",
    )

    expect(result).toBeDefined()
    expect(result?.instructions).toBeUndefined()
  })

  test("returns no request when dialog is canceled", () => {
    const result = createCompactionRequest(
      "test-session",
      model,
      null,
    )

    expect(result).toBeUndefined()
  })
})
