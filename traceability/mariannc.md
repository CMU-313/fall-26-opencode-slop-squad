
# Traceability: Marianne Chang (mariannc)

Target feature: Custom Compaction Instructions in the OpenCode TUI.

Main source files:
- `packages/tui/src/util/compaction.ts`
- `packages/tui/src/util/compaction-marker.ts`
- `packages/tui/src/routes/session/index.tsx`

## Requirements

| ID | Interview evidence | Requirement | Acceptance Criteria | Changed in P4? | Property (kind) | Test | Mutants it kills |
|---|---|---|---|---|---|---|---|
| R1 | O-5 wanted no instructions omitted; S-5 wanted strict requirements preserved. | Submit nonblank instructions after trimming leading/trailing whitespace, preserving internal content and line order. | For generated single-line or multiline text, the request's instructions equal `text.trim()` or are absent if blank. | Yes | Request agrees with independent expected request (model/oracle) | `packages/tui/test/util/compaction.property.test.ts` | H1, H5 |
| R2 | C-7, S-6, O-6 expected cancellation to leave the conversation unchanged. | Canceling the compaction dialog must not initiate a request or modify the conversation. | For generated draft text, passing the cancellation sentinel `null` produces no request. The TUI must return before calling the runner. | No | Cancellation produces no request (invariant) | `packages/tui/test/util/compaction.property.test.ts` | H2 |
| R3 | S-7, O-7 wanted canceled drafts retained; C-8 preferred clearing. | Preserve draft instructions when canceling and reopening within the same session. | Cancel and reopen should restore the draft in the same session. | No | Not selected; requires dialog-level state testing and resolution of conflicting preferences. | Not selected | None |
| R4 | O-9 wanted failure feedback and retry without retyping. | When a request fails, the TUI must show an error and allow retry; the request runner must reset after failure so the same instructions can be retried. | For arbitrary requests and simulated returned/throwing errors, first attempt fails, runner resets, and second attempt sends the same request successfully. The error toast is checked separately in TUI integration tests. | Yes | Failure does not block retry (invariant) | `packages/tui/test/util/compaction.property.test.ts` | H3; Stryker S2, S3, S4 |
| R5 | C-6, C-10, S-9, O-10 wanted to inspect submitted instructions and the summary. | Following compaction, submitted custom instructions remain available in the compaction marker for review; the resulting summary remains accessible through the conversation UI. | For arbitrary nonblank instructions in a compaction marker, retrieving the marker returns the same instructions. | Yes | Store/retrieve marker instructions (round-trip), safe missing-marker handling (invariant) | `packages/tui/test/util/compaction.property.test.ts` | H4; Stryker S1 |
| R6 | S-4 wanted compaction never to modify source code. | Running compaction must not directly modify, create, or delete project source files. | Source-file contents and checksums remain unchanged by compaction. | No | Not selected; would need integration testing of project files. | Not selected | None |
| R7 | C-4, S-2, S-3, O-3, O-4 wanted files, decisions, and unresolved bugs retained. | Include user-specified project context in the summarization request. | For generated first and second instructions, adding the second preserves the first and forwards both in order in the request. | No | Adding context retains previous context (metamorphic) | `packages/tui/test/util/compaction.property.test.ts` | H5 |

Properties written or suggested by opencode or another AI tool: R1, R2, R4, R5, R7. ChatGPT generated the initial implementations and suggested the two Project 5 strengthening properties. The student reviewed and tested the properties.

OpenCode separately generated the retry property documented in the Project 5 agent-failure case.

## Requirement changes

| ID | Original requirement (P3) | Revised requirement | Why it changed |
|---|---|---|---|
| R1 | The TUI must submit all user-entered compaction instructions to the backend without omitting or changing their content. | The TUI submits nonblank instructions after trimming leading/trailing whitespace while preserving internal content and line order. | The existing `createCompactionRequest` intentionally trims boundary whitespace and omits blank instructions. This retains the user's substantive instructions without requiring byte-for-byte preservation of insignificant boundary spaces. |
| R4 | If a compaction request fails, the TUI must display an error message and allow the user to retry. | If a request fails, the TUI displays an error, and the request runner resets so the same request can be retried. | The runner is independently testable; the actual toast is a UI concern. This makes the retry behavior checkable with a property while preserving the original usability goal. It does not by itself prove the dialog retains typed text. |
| R5 | After compaction, the interface must display the resulting summary and allow users to view the custom instructions. | The interface makes submitted custom instructions available through the compaction marker and makes the resulting summary accessible through the conversation UI. | The compaction marker helper provides a deterministic way to test instruction visibility. Exact summary text is generated by the AI and is not a stable oracle. This property covers marker preservation, not full UI summary rendering. |

## Validation status

Final property test run on November 12, 2026:

- Command: `bun test test/util/compaction.property.test.ts`
- Working directory: `packages/tui`
- Property tests passed: 7
- Property tests failed: 0
- Assertions executed: 3,000
- Fast-check seed: 42

The original five properties passed before mutation testing. Two additional properties were added after examining the surviving Stryker mutants. All seven passed in the final baseline run.

The five hand-written mutants were applied individually, tested, and reversed. All five were killed.

The final Stryker run killed all 35 generated mutants.

The OpenCode-generated property also passed after the original implementation was restored:

- Tests passed: 1
- Tests failed: 0
- Assertions executed: 1,552

GitHub Actions CI status must still be checked before final submission.

## Project 5: Hand-written mutants

Predictions were recorded in commit `d50afb0` before applying or running the mutants.

All five mutants were applied individually, tested, and reversed.

| ID | Requirement targeted | Change | Predicted killer | Actual result |
|---|---|---|---|---|
| H1 | R1 | Remove boundary whitespace trimming from `createCompactionRequest`. | R1, because the property expects trimmed instructions. | Killed by R1. Failed after 123 generated cases. Minimal counterexample: `" "`. |
| H2 | R2 | Allow a canceled dialog to create a compaction request. | R2, because cancellation must return `undefined`. | Killed by R2. Failed after 1 generated case. Counterexample: `["", ""]`. |
| H3 | R4 | Leave the runner marked as running after an API failure. | R4, because the property checks that retrying is possible. | Killed by R4. Failed after 1 generated case because `runner.isRunning()` returned `true` instead of `false`. |
| H4 | R5 | Search for a summary marker instead of a compaction marker. | R5, because the property expects the original compaction instructions. | Killed by R5. Failed after 1 generated case. Minimal counterexample: `"!"`. |
| H5 | R7 | Forward only the first line of the user's instructions. | R7 and potentially R1, because both require preservation of additional context. | Killed by R1 and R7. Both properties failed after 1 generated case. Counterexamples included `"!\n!"` and `["!", "!"]`. |

### Hand-written mutation results

- Total hand-written mutants: 5
- Killed mutants: 5
- Surviving mutants: 0
- Hand-written mutation score: 100%

Each mutant was tested using:

`bun test test/util/compaction.property.test.ts`

Patch files:

- `mutants/mariannc/H1.patch`
- `mutants/mariannc/H2.patch`
- `mutants/mariannc/H3.patch`
- `mutants/mariannc/H4.patch`
- `mutants/mariannc/H5.patch`

The hand-written mutation score is separate from the automated Stryker score.

## Project 5: Automated mutation testing with Stryker

Configuration file:

`packages/tui/stryker.mariannc.config.json`

Property test file:

`packages/tui/test/util/compaction.property.test.ts`

Mutation targets:

- `packages/tui/src/util/compaction.ts`
- `packages/tui/src/util/compaction-marker.ts`

Test runner: Bun through Stryker's command runner.

Coverage analysis: Off.

Fast-check seed: 42.

Stryker version: 10.1.1.

### Initial Stryker results

The initial Stryker run completed successfully with the original five properties.

- Total mutants: 35
- Killed mutants: 31
- Surviving mutants: 4
- Timed-out mutants: 0
- Initial mutation score: 88.57%

Results by file:

| File | Killed | Survived | Mutation score |
|---|---|---|---|
| `compaction.ts` | 21 | 3 | 87.50% |
| `compaction-marker.ts` | 10 | 1 | 90.91% |
| Total | 31 | 4 | 88.57% |

### Initial surviving mutants

| ID | File | Stryker mutation | Reason it survived |
|---|---|---|---|
| S1 | `compaction-marker.ts` | Replace `part?.instructions` with `part.instructions`. | R5 always supplied a valid compaction marker, so the original property did not exercise the missing-marker case. |
| S2 | `compaction.ts` | Replace `if (running)` with `if (false)`. | R4 tested sequential requests but not overlapping compaction requests. |
| S3 | `compaction.ts` | Replace `if (running) return false` with `if (running) return true`. | The original suite did not check the result of a second request while the runner was busy. |
| S4 | `compaction.ts` | Replace `running = true` with `running = false`. | The original suite did not check the runner's active state while summarization was pending. |

All four represented observable behavioral changes rather than equivalent mutants.

### Comparison with hand-written mutants

The five hand-written mutants targeted plausible requirement-level mistakes:

- H1 removed boundary whitespace trimming.
- H2 created a request despite cancellation.
- H3 failed to reset the runner after an error.
- H4 selected the wrong type of marker.
- H5 dropped additional instruction lines.

The automated Stryker run generated 35 mutants by modifying expressions and statements in the two source files. It revealed four gaps that the hand-written mutants had not exposed: handling missing markers, rejecting overlapping requests, returning the correct result for rejected requests, and reporting the active runner state.

Some hand-written faults, such as forwarding only the first line of instructions, require more specific behavioral changes than Stryker's standard expression-level operators typically produce. A definitive comparison of which exact hand-written patches were not generated would require inspecting every mutant in the HTML report.

The two approaches complemented each other. Hand-written mutants represented realistic mistakes derived from interview requirements, while Stryker systematically explored code-level changes and revealed previously untested behavior.

### Strengthening the property suite

I added two new properties to address the four surviving mutants.

**Strengthened R5: missing compaction markers**

The new property generates arrays containing text, tool, and summary parts but no compaction marker.

It checks that `findCompactionMarker` returns `undefined` and that `compactionMarkerInstructions` safely returns `undefined` for the absent marker.

This property killed S1, which removed optional chaining.

**Strengthened R4: overlapping requests and runner state**

The new property generates arbitrary compaction requests and uses a pending promise to keep the first request active.

It verifies that:

- The runner reports itself as running while the first request is pending.
- A second overlapping request returns `false`.
- The summarization function is called only once.
- The runner resets after the first request finishes.

This property killed S2, S3, and S4.

### Final Stryker results

After strengthening the suite, I reran Stryker against the same two source files.

- Total mutants: 35
- Killed mutants: 35
- Surviving mutants: 0
- Timed-out mutants: 0
- Final raw mutation score: 100%
- Final equivalence-adjusted mutation score: 100%

Final results by file:

| File | Killed | Survived | Mutation score |
|---|---|---|---|
| `compaction.ts` | 24 | 0 | 100% |
| `compaction-marker.ts` | 11 | 0 | 100% |
| Total | 35 | 0 | 100% |

The mutation score improved from 88.57% to 100%, an increase of 11.43 percentage points.

The final property suite passed all 7 tests with 3,000 assertions.

### Equivalent mutants

No mutants survived the final Stryker run. Therefore, no equivalent mutants needed to be excluded from the final score.

The raw and equivalence-adjusted mutation scores are both 100%.

### Mutation report

The final HTML report was generated at:

`packages/tui/reports/mutation/mutation.html`

A copy was saved to:

`mutants/mariannc/mutation.html`

## Project 5: Agent failure case

I used OpenCode (Big Pickle, OpenCode Zen) to generate a fast-check property for `createCompactionRunner`. The goal was to test whether failed compaction requests could be retried.

The agent generated a useful property for sequential retries, but it did not test overlapping requests. I demonstrated this weakness by applying a concurrency mutant and comparing the agent-generated property with my strengthened R4 property.

### Agent transcript

Agent: OpenCode (Big Pickle, OpenCode Zen)

Prompt:

"Generate a fast-check property-based test for createCompactionRunner in packages/tui/src/util/compaction.ts that verifies failed compaction requests can be retried.

Do not modify any files. Show the complete suggested test and explain what behavior it checks."

Agent response:

OpenCode generated a property that creates arbitrary compaction requests and sequences of up to five failures.

The failure generator includes:
- Returned API errors.
- Thrown exceptions.

The property verifies that:
- Every failed attempt returns `false`.
- `isRunning()` becomes `false` after each failure.
- A subsequent attempt succeeds.
- The same request is forwarded for every attempt.

The original agent-generated property is preserved in:

`packages/tui/test/util/compaction.agent.test.ts`

The experiment is documented in:

`mutants/mariannc/agent-case/README.md`

The initial five properties were generated with ChatGPT, not OpenCode. This separate OpenCode interaction is the genuine agent-generated property used for the Project 5 failure case.

### Surviving mutant

Mutant ID: S2 (initial Stryker run).

Requirement targeted: R4, compaction reliability and prevention of overlapping requests.

Source file:

`packages/tui/src/util/compaction.ts`

Original code:

    if (running) return false

Mutated code:

    if (false) return false

This mutation disables the concurrency guard. Instead of rejecting a second request while another request is running, the runner attempts to process both.

I temporarily applied this mutation and ran the agent-generated property by itself.

Observed result:

- Tests passed: 1
- Tests failed: 0
- Assertions executed: 1,552

The mutant survived the OpenCode-generated property.

### Why the agent-generated property was weak

The agent focused on sequential retry behavior.

Its property awaited every compaction attempt before starting another one. This meant that the runner was never tested while a request was still active.

Consequently, disabling the concurrency guard did not change any behavior observed by the agent-generated property.

The property was valid for its intended retry behavior, but it did not exercise the overlapping-request invariant.

This illustrates how AI-generated tests can cover the obvious success and failure paths while missing important state-dependent behavior.

### Strengthened property

I used the strengthened R4 property in:

`packages/tui/test/util/compaction.property.test.ts`

The property deliberately keeps the first request pending before attempting another request.

It checks that:

1. The runner reports `isRunning()` as `true`.
2. A second request is rejected while the first is active.
3. The summarize function is called only once.
4. The original request completes successfully.
5. The runner resets to its idle state afterward.

This tests the concurrency behavior missing from the agent-generated property.

### Evidence of improvement

I tested both properties against the same concurrency mutant.

**Agent-generated property with mutant active:**

- 1 test passed.
- 0 tests failed.
- 1,552 assertions executed.
- Mutant survived.

**Strengthened property suite with mutant active:**

- 6 tests passed.
- 1 test failed.
- The R4 overlapping-request property timed out after 5,000 milliseconds.
- Mutant detected.

The timeout occurred because the second request was allowed to proceed instead of being rejected immediately. The test awaited that second request while its underlying promise remained pending.

After restoring the original source implementation:

**Custom property suite:**
- 7 tests passed.
- 0 tests failed.
- 3,000 assertions executed.

**OpenCode-generated property:**
- 1 test passed.
- 0 tests failed.
- 1,552 assertions executed.

The final Stryker run also killed all 35 mutants, achieving a 100% mutation score.

### Conclusion

OpenCode generated a valid property for sequential retry behavior, but it missed the concurrency guard because its test never overlapped two requests.

By testing the agent-generated property against a mutant and comparing it with a strengthened property, I demonstrated a concrete limitation of AI-generated testing.

Mutation testing helped identify the missing behavior and verify that the strengthened property detected the defect.

## Project 5: Red team

Optional extra credit.

No results recorded.
