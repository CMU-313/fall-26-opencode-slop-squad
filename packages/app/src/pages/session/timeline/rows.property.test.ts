import { describe, expect, mock, test } from "bun:test"
import fc from "fast-check"
import type { SessionMessageInfo } from "@opencode-ai/client/promise"
import type { AssistantMessage, Part, SessionStatus, UserMessage } from "@opencode-ai/sdk/v2"
import type { TimelineRow as Row } from "./timeline-row"

// Same stub as rows-current.test.ts: every part is renderable and becomes its
// own group, so row structure depends only on rows.ts, not on the UI package.
mock.module("@opencode-ai/session-ui/message-part", () => ({
  renderable: () => true,
  groupParts: (refs: Array<{ messageID: string; part: { id: string } }>) =>
    refs.map((ref) => ({
      type: "part" as const,
      key: ref.part.id,
      ref: { messageID: ref.messageID, partID: ref.part.id },
    })),
}))

const { Timeline, TimelineRow } = await import("./rows")

// Property tests for compaction divider rows (R6).
// See traceability/afeies.md and docs/p4-properties.md.

const sessionID = "ses_prop"

// Instructions as they reach the compaction part: missing, blank (the
// "compact with blank instructions" case from the R6 test case), or any
// string including multi-line and Unicode text (S-6).
const ws = fc.constantFrom(" ", "\t", "\n", "\r\n", " ", "　")
const blank = fc.array(ws, { maxLength: 6 }).map((parts) => parts.join(""))
const instructions = fc.option(fc.oneof(blank, fc.string({ unit: "grapheme" })), { nil: undefined })

// Assistant output is text or reasoning. Reasoning matters because the
// Thinking row and its heading depend on reasoning parts and showReasoning.
const partSpec = fc.record({
  kind: fc.constantFrom("text", "reasoning"),
  text: fc.oneof(fc.string(), fc.constant("## Heading\nbody")),
})

// Each assistant may finish cleanly, be aborted, or fail. Aborted is the key
// boundary: constructMessageRows adds an "interrupted" divider only when the
// turn has no compaction (`interrupted && !compaction`), so an aborted reply
// in or next to the compaction turn is where a divider is most likely to be
// duplicated or misplaced. Other errors add an Error row at the end of a turn.
const assistantSpec = fc.record({
  parts: fc.array(partSpec, { maxLength: 3 }),
  error: fc.constantFrom(undefined, undefined, "aborted", "unknown"),
})

// A session history: 1–8 turns, each a user message with 0–3 assistant
// replies. Short histories keep shrinking fast; 8 turns is enough for the
// compaction to land at the start, middle, or end, and for TurnGap rows to
// appear before it. Status, showReasoning and inlineComments are varied
// because they add or remove Thinking/Retry/DiffSummary/CommentStrip rows
// around the divider.
const history = fc
  .array(fc.record({ assistants: fc.array(assistantSpec, { maxLength: 3 }) }), { minLength: 1, maxLength: 8 })
  .chain((turns) =>
    fc.record({
      turns: fc.constant(turns),
      compactAt: fc.nat({ max: turns.length - 1 }),
      auto: fc.boolean(),
      instructions,
      status: fc.constantFrom<SessionStatus["type"]>("idle", "busy", "retry"),
      showReasoning: fc.boolean(),
      inlineComments: fc.boolean(),
      diffs: fc.boolean(),
    }),
  )

type History = typeof history extends fc.Arbitrary<infer T> ? T : never

// Turn a generated history into the inputs constructSessionMessageRows takes:
// the chronological message list, message/part lookups, and the projected
// user messages. The compaction turn's user message carries a CompactionPart,
// which is how a compaction is stored in the v2 message model.
function build(h: History, override?: { instructions: string | undefined }) {
  const compactionInstructions = override ? override.instructions : h.instructions
  const source: SessionMessageInfo[] = []
  const messages: Array<UserMessage | AssistantMessage> = []
  const parts: Array<[string, Part[]]> = []
  let clock = 1

  h.turns.forEach((turn, i) => {
    const userID = `msg_${String(i).padStart(2, "0")}_u`
    const created = clock++
    source.push({ id: userID, type: "user", text: `turn ${i}`, time: { created } })
    messages.push({
      id: userID,
      sessionID,
      role: "user",
      time: { created },
      agent: "build",
      model: { providerID: "provider", modelID: "model" },
      summary: h.diffs ? { diffs: [{ file: `f${i}.ts`, additions: 1, deletions: 0 }] } : undefined,
    })
    const userParts: Part[] = [{ id: `${userID}:text`, sessionID, messageID: userID, type: "text", text: `turn ${i}` }]
    if (i === h.compactAt)
      userParts.push({
        id: `${userID}:compaction`,
        sessionID,
        messageID: userID,
        type: "compaction",
        auto: h.auto,
        instructions: compactionInstructions,
      })
    parts.push([userID, userParts])

    turn.assistants.forEach((assistant, j) => {
      const id = `${userID}_a${j}`
      const time = { created: clock++, completed: clock++ }
      source.push({
        id,
        type: "assistant",
        agent: "build",
        model: { id: "model", providerID: "provider" },
        content: [],
        time,
      })
      messages.push({
        id,
        sessionID,
        role: "assistant",
        time,
        parentID: userID,
        modelID: "model",
        providerID: "provider",
        mode: "build",
        agent: "build",
        path: { cwd: "/", root: "/" },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        error:
          assistant.error === "aborted"
            ? { name: "MessageAbortedError", data: { message: "aborted" } }
            : assistant.error === "unknown"
              ? { name: "UnknownError", data: { message: "boom" } }
              : undefined,
      })
      parts.push([
        id,
        assistant.parts.map((part, k): Part => {
          const partID = `${id}:${part.kind}:${k}`
          if (part.kind === "text") return { id: partID, sessionID, messageID: id, type: "text", text: part.text }
          return { id: partID, sessionID, messageID: id, type: "reasoning", text: part.text, time: { start: time.created } }
        }),
      ])
    })
  })

  return { source, messages, parts }
}

function rowsFor(h: History, data: ReturnType<typeof build>) {
  const byID = new Map(data.messages.map((message) => [message.id, message]))
  const partsByID = new Map(data.parts)
  return Timeline.constructSessionMessageRows(
    data.source,
    (messageID) => byID.get(messageID),
    (messageID) => partsByID.get(messageID) ?? [],
    h.showReasoning,
    h.status,
    h.inlineComments,
    data.messages.filter((message): message is UserMessage => message.role === "user"),
  ).rows
}

const compactionUserID = (h: History) => `msg_${String(h.compactAt).padStart(2, "0")}_u`
const isCompactionDivider = (row: Row.TimelineRow): row is Row.TurnDivider =>
  row._tag === "TurnDivider" && row.label === "compaction"

describe("compaction timeline row properties", () => {
  // R6: A successful compaction adds exactly one divider, placed right after
  // the last pre-compaction message. Its count and position are the same with
  // or without instructions (non-blank instructions may be shown in it), and
  // the rows are identical after reload.
  // Kind: invariant
  // Generators: `history` (1–8 turns, compaction on any turn, aborted/failed
  // replies, idle/busy/retry, reasoning on/off) — see the comments above.
  test("R6/P3: exactly one compaction divider, right after its user message", () => {
    fc.assert(
      fc.property(history, (h) => {
        const rows = rowsFor(h, build(h))
        const dividers = rows.flatMap((row, index) => (isCompactionDivider(row) ? [index] : []))
        expect(dividers).toHaveLength(1)
        const user = rows.findIndex((row) => row._tag === "UserMessage" && row.userMessageID === compactionUserID(h))
        expect(user).toBeGreaterThanOrEqual(0)
        expect(dividers[0]).toBe(user + 1)
        expect(rows[dividers[0]!]!.userMessageID).toBe(compactionUserID(h))
        // Every row of earlier turns comes before the divider, so nothing
        // from before the compaction is rendered after it.
        const firstLater = rows.findIndex((row) => row.userMessageID > compactionUserID(h))
        if (firstLater >= 0) expect(firstLater).toBeGreaterThan(dividers[0]!)
        rows.slice(0, user).forEach((row) => expect(row.userMessageID <= compactionUserID(h)).toBe(true))
      }),
    )
  })

  // R6: A successful compaction adds exactly one divider, placed right after
  // the last pre-compaction message. Its count and position are the same with
  // or without instructions (non-blank instructions may be shown in it), and
  // the rows are identical after reload.
  // Kind: metamorphic
  // Generators: the same `history`, rebuilt with a second, independently drawn
  // `instructions` value (missing, blank, or arbitrary text), so every pair of
  // with/without/blank/changed instructions is compared.
  test("R6/P4: instructions do not change row count, order, or position", () => {
    fc.assert(
      fc.property(history, instructions, (h, other) => {
        const before = rowsFor(h, build(h))
        const after = rowsFor(h, build(h, { instructions: other }))
        // Same rows in the same order (keys encode kind, turn, label and part).
        expect(after.map(TimelineRow.key)).toEqual(before.map(TimelineRow.key))
        // Every row other than the compaction divider is unchanged, and the
        // divider differs only in the instructions it carries.
        const withoutInstructions = (row: Row.TimelineRow): object =>
          isCompactionDivider(row) ? { ...row, instructions: undefined } : row
        expect(after.map(withoutInstructions)).toEqual(before.map(withoutInstructions))
        expect(after.find(isCompactionDivider)?.instructions).toBe(other)
      }),
    )
  })

  // R6: A successful compaction adds exactly one divider, placed right after
  // the last pre-compaction message. Its count and position are the same with
  // or without instructions (non-blank instructions may be shown in it), and
  // the rows are identical after reload.
  // Kind: round-trip
  // Generators: the same `history`. Reload is modelled as JSON serialize/parse
  // of the messages and parts (what the client receives from the server), which
  // drops `undefined` fields such as missing instructions and errors and
  // breaks object identity, the two things a reload changes.
  test("R6/P5: rows are identical after a JSON round-trip of the history", () => {
    fc.assert(
      fc.property(history, (h) => {
        const data = build(h)
        const reloaded = JSON.parse(JSON.stringify(data)) as typeof data
        expect(rowsFor(h, reloaded)).toEqual(rowsFor(h, data))
      }),
    )
  })
})
