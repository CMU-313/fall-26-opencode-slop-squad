// Per-session guard for the Compact command (R4, R7).
// `pending` holds the sessions with a compact request in flight. `working` is
// whether the assistant is currently replying in that session.
export type CompactPending = ReadonlySet<string>

export const emptyCompactPending: CompactPending = new Set()

export function canCompact(pending: CompactPending, sessionID: string, working: boolean) {
  return !working && !pending.has(sessionID)
}

// Returns the new pending set if a request may be sent, or undefined if it is blocked.
export function beginCompact(pending: CompactPending, sessionID: string, working: boolean) {
  if (!canCompact(pending, sessionID, working)) return undefined
  return new Set(pending).add(sessionID) as CompactPending
}

export function finishCompact(pending: CompactPending, sessionID: string): CompactPending {
  if (!pending.has(sessionID)) return pending
  const next = new Set(pending)
  next.delete(sessionID)
  return next
}
