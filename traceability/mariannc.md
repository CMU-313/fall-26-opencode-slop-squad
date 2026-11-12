
# Traceability: Marianne Chang (mariannc)

Target feature: Custom Compaction Instructions in the OpenCode TUI.

Main source files:
- `packages/tui/src/util/compaction.ts`
- `packages/tui/src/util/compaction-marker.ts`
- `packages/tui/src/routes/session/index.tsx`

## Requirements

| ID | Interview evidence | Requirement | Acceptance Criteria | Changed in P4? | Property (kind) | Test |
|---|---|---|---|---|---|---|
| R1 | O-5 wanted no instructions omitted; S-5 wanted strict requirements preserved. | Submit nonblank instructions after trimming leading/trailing whitespace, preserving internal content and line order. | For generated single-line or multiline text, the request's instructions equal `text.trim()` or are absent if blank. | Yes | Request agrees with independent expected request (model/oracle) | `packages/tui/test/util/compaction.property.test.ts` |
| R2 | C-7, S-6, O-6 expected cancellation to leave the conversation unchanged. | Canceling the compaction dialog must not initiate a request or modify the conversation. | For generated draft text, passing the cancellation sentinel `null` produces no request. The TUI must return before calling the runner. | No | Cancellation produces no request (invariant) | `packages/tui/test/util/compaction.property.test.ts` |
| R3 | S-7, O-7 wanted canceled drafts retained; C-8 preferred clearing. | Preserve draft instructions when canceling and reopening within the same session. | Cancel and reopen should restore the draft in the same session. | No | Not selected; requires dialog-level state testing and resolution of conflicting preferences. | Not selected |
| R4 | O-9 wanted failure feedback and retry without retyping. | When a request fails, the TUI must show an error and allow retry; the request runner must reset after failure so the same instructions can be retried. | For arbitrary requests and simulated returned/throwing errors, first attempt fails, runner resets, and second attempt sends the same request successfully. The error toast is checked separately in TUI integration tests. | Yes | Failure does not block retry (invariant) | `packages/tui/test/util/compaction.property.test.ts` |
| R5 | C-6, C-10, S-9, O-10 wanted to inspect submitted instructions and the summary. | Following compaction, submitted custom instructions remain available in the compaction marker for review; the resulting summary remains accessible through the conversation UI. | For arbitrary nonblank instructions in a compaction marker, retrieving the marker returns the same instructions. | Yes | Store/retrieve marker instructions (round-trip) | `packages/tui/test/util/compaction.property.test.ts` |
| R6 | S-4 wanted compaction never to modify source code. | Running compaction must not directly modify, create, or delete project source files. | Source-file contents and checksums remain unchanged by compaction. | No | Not selected; would need integration testing of project files. | Not selected |
| R7 | C-4, S-2, S-3, O-3, O-4 wanted files, decisions, and unresolved bugs retained. | Include user-specified project context in the summarization request. | For generated first and second instructions, adding the second preserves the first and forwards both in order in the request. | No | Adding context retains previous context (metamorphic) | `packages/tui/test/util/compaction.property.test.ts` |

Properties written or suggested by opencode or another AI tool: R1, R2, R4, R5, R7 (ChatGPT generated initial implementations; student must review, run, and validate them).

## Requirement changes

| ID | Original requirement (P3) | Revised requirement | Why it changed |
|---|---|---|---|
| R1 | The TUI must submit all user-entered compaction instructions to the backend without omitting or changing their content. | The TUI submits nonblank instructions after trimming leading/trailing whitespace while preserving internal content and line order. | The existing `createCompactionRequest` intentionally trims boundary whitespace and omits blank instructions. This retains the user's substantive instructions without requiring byte-for-byte preservation of insignificant boundary spaces. |
| R4 | If a compaction request fails, the TUI must display an error message and allow the user to retry. | If a request fails, the TUI displays an error, and the request runner resets so the same request can be retried. | The runner is independently testable; the actual toast is a UI concern. This makes the retry behavior checkable with a property while preserving the original usability goal. It does not by itself prove the dialog retains typed text. |
| R5 | After compaction, the interface must display the resulting summary and allow users to view the custom instructions. | The interface makes submitted custom instructions available through the compaction marker and makes the resulting summary accessible through the conversation UI. | The compaction marker helper provides a deterministic way to test instruction visibility. Exact summary text is generated by the AI and is not a stable oracle. This property covers marker preservation, not full UI summary rendering. |

## Validation status

These are prepared properties, not verified test results. Run them with `bun test test/util/compaction.property.test.ts` from `packages/tui`.

Ensure `fast-check` is available to the TUI package and the lockfile is updated.

Confirm that the PR's GitHub Actions `test` workflow runs `packages/tui` tests. Record and fix any failures before submission.

## Project 5: Hand-written mutants

Predictions recorded before applying or running the mutants.

| ID | Requirement targeted | Change | Predicted killer | Actual result |
|---|---|---|---|---|
| H1 | R1 | Remove boundary whitespace trimming from `createCompactionRequest`. | R1, because the property expects trimmed instructions. | Pending |
| H2 | R2 | Allow a canceled dialog to create a compaction request. | R2, because cancellation must return `undefined`. | Pending |
| H3 | R4 | Leave the runner marked as running after an API failure. | R4, because the property checks that retrying is possible. | Pending |
| H4 | R5 | Search for a summary marker instead of a compaction marker. | R5, because the property expects the original compaction instructions. | Pending |
| H5 | R7 | Forward only the first line of the user's instructions. | R7 and potentially R1, because both require preservation of additional context. | Pending |
