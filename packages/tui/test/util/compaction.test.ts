
import { describe, expect, test } from "bun:test"
import {
  createCompactionRequest,
  createCompactionRunner,
  type CompactionRequest,
} from "../../src/util/compaction"

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
    const result = createCompactionRequest("test-session", model, "")

    expect(result).toBeDefined()
    expect(result?.instructions).toBeUndefined()
  })

  test("omits whitespace-only instructions", () => {
    const result = createCompactionRequest("test-session", model, "   ")

    expect(result).toBeDefined()
    expect(result?.instructions).toBeUndefined()
  })

  test("returns no request when dialog is canceled", () => {
    const result = createCompactionRequest("test-session", model, null)

    expect(result).toBeUndefined()
  })
})

describe("TUI compaction reliability", () => {
  const request: CompactionRequest = {
    sessionID: "test-session",
    modelID: "test-model",
    providerID: "test-provider",
    instructions: "Focus on technical decisions",
  }

  test("forwards the request to the API", async () => {
    const calls: CompactionRequest[] = []

    const runner = createCompactionRunner(async (input) => {
      calls.push(input)
      return {}
    })

    expect(await runner.run(request)).toBe(true)
    expect(calls).toEqual([request])
  })

  test("prevents duplicate requests while one is running", async () => {
    let calls = 0
    let finish!: (value: { error?: unknown }) => void

    const runner = createCompactionRunner(async () => {
      calls++

      return new Promise<{ error?: unknown }>((resolve) => {
        finish = resolve
      })
    })

    const first = runner.run(request)

    expect(runner.isRunning()).toBe(true)
    expect(await runner.run(request)).toBe(false)
    expect(calls).toBe(1)

    finish({})

    expect(await first).toBe(true)
    expect(runner.isRunning()).toBe(false)
  })

  test("handles API error responses", async () => {
    const runner = createCompactionRunner(async () => ({
      error: { message: "Provider unavailable" },
    }))

    expect(await runner.run(request)).toBe(false)
    expect(runner.isRunning()).toBe(false)
  })

  test("handles rejected API requests", async () => {
    const runner = createCompactionRunner(async () => {
      throw new Error("Network failure")
    })

    expect(await runner.run(request)).toBe(false)
    expect(runner.isRunning()).toBe(false)
  })

  test("allows another request after the previous one finishes", async () => {
    let calls = 0

    const runner = createCompactionRunner(async () => {
      calls++
      return {}
    })

    expect(await runner.run(request)).toBe(true)
    expect(await runner.run(request)).toBe(true)
    expect(calls).toBe(2)
  })
})
