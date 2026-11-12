import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import { beginCompact, canCompact, emptyCompactPending, finishCompact, type CompactPending } from "./compact-guard"

fc.configureGlobal({ seed: 42 })

// Property tests for the per-session compact guard (R4, R7).
// See traceability/afeies.md and docs/p4-properties.md.

const sessions = ["a", "b", "c"] as const
type Session = (typeof sessions)[number]
type Kind = "submit" | "finished" | "working" | "idle"
type Event = { session: Session; kind: Kind }

// Generators: three sessions so events for different sessions interleave and
// the guard has to keep them independent. "submit" is weighted up so runs often
// contain back-to-back submits for the same session (a double-click, C-5, S-5)
// and submits that land while that session's assistant is working (S-1).
// "finished" and "idle" also arrive for sessions with nothing pending or
// already idle, so stray and duplicate events are covered.
const event: fc.Arbitrary<Event> = fc.record({
  session: fc.constantFrom(...sessions),
  kind: fc.oneof(
    { weight: 3, arbitrary: fc.constant<Kind>("submit") },
    { weight: 1, arbitrary: fc.constantFrom<Kind>("finished", "working", "idle") },
  ),
})
const events = fc.array(event, { maxLength: 40 })

// Oracle: two booleans per session and a send counter. A submit sends exactly
// when that session has no compaction pending and its assistant is not working.
type Model = Record<Session, { pending: boolean; working: boolean; sent: number }>
const initialModel = (): Model => ({
  a: { pending: false, working: false, sent: 0 },
  b: { pending: false, working: false, sent: 0 },
  c: { pending: false, working: false, sent: 0 },
})
const stepModel = (model: Model, e: Event) => {
  const s = model[e.session]
  if (e.kind === "submit" && !s.pending && !s.working) {
    s.pending = true
    s.sent++
  }
  if (e.kind === "finished") s.pending = false
  if (e.kind === "working") s.working = true
  if (e.kind === "idle") s.working = false
}

// System under test: the real guard functions, driven the same way
// use-session-commands.tsx drives them. `working` stands in for
// sync().data.session_working, which the app reads but does not own.
const stepReal = (
  real: { pending: CompactPending; working: Set<Session>; sent: Record<Session, number> },
  e: Event,
) => {
  if (e.kind === "submit") {
    const next = beginCompact(real.pending, e.session, real.working.has(e.session))
    if (next) {
      real.pending = next
      real.sent[e.session]++
    }
  }
  if (e.kind === "finished") real.pending = finishCompact(real.pending, e.session)
  if (e.kind === "working") real.working.add(e.session)
  if (e.kind === "idle") real.working.delete(e.session)
}

describe("compact guard properties", () => {
  // R4: Each compaction sends exactly one request, and the Compact command is
  // disabled for a session while a compaction for that session is in progress.
  // R7: While the assistant is working, Compact is disabled for that session,
  // so it never interrupts a reply. It is enabled again once the session is idle.
  // Kind: model / oracle
  // Generators: `events` = up to 40 events over three sessions, weighted
  // toward "submit" so double-clicks (C-5, S-5), submits while working (S-1),
  // and cross-session interleavings are common; stray "finished"/"idle" events
  // check that one session's events never unblock or block another. The oracle
  // is checked after every event, not just at the end.
  test("R4+R7/P7: sends and Compact enabled state match a per-session model", () => {
    fc.assert(
      fc.property(events, (trace) => {
        const model = initialModel()
        const real = { pending: emptyCompactPending, working: new Set<Session>(), sent: { a: 0, b: 0, c: 0 } }
        for (const e of trace) {
          stepModel(model, e)
          stepReal(real, e)
          for (const s of sessions) {
            expect(real.sent[s]).toBe(model[s].sent)
            expect(canCompact(real.pending, s, real.working.has(s))).toBe(!model[s].pending && !model[s].working)
          }
        }
      }),
    )
  })
})
