
# Project 5: OpenCode Agent-Failure Case

## Agent and Prompt

Agent: OpenCode (Big Pickle, OpenCode Zen)

Prompt:
Generate a fast-check property-based test for createCompactionRunner
in packages/tui/src/util/compaction.ts that verifies failed
compaction requests can be retried.

Do not modify any files. Show the complete suggested test
and explain what behavior it checks.

## Agent-Generated Property

OpenCode generated a fast-check property that tests sequences of up
to five failed requests, including returned errors and exceptions,
followed by a successful retry.

The original generated test is saved in:
packages/tui/test/util/compaction.agent.test.ts

## Mutant the Agent Missed

File: packages/tui/src/util/compaction.ts

Original:
    if (running) return false

Mutant:
    if (false) return false

This mutant disables the concurrency guard, allowing overlapping
compaction requests.

## Experimental Results

With the mutant active:

Agent-generated test:
- 1 passed, 0 failed
- 1,552 assertions
- Mutant survived.

Strengthened property suite:
- 6 passed, 1 failed
- The R4 concurrency test timed out after 5,000 ms.
- Mutant detected.

After restoring the original implementation:
- Property suite: 7 passed, 0 failed.
- Agent-generated test: 1 passed, 0 failed.

## Why the Agent Missed the Mutant

OpenCode focused on sequential retry behavior. Its property awaited
each request before starting another one, so it never checked what
happens when two compaction requests overlap.

The mutated concurrency guard therefore did not affect any behavior
observed by the generated property.

## How the Property Was Strengthened

The strengthened R4 property:
1. Starts a compaction request and keeps it pending.
2. Verifies that the runner reports an active request.
3. Attempts a second request before the first finishes.
4. Requires the second request to be rejected immediately.
5. Verifies that the summarize function is called only once.
6. Completes the first request and verifies that the runner resets.

This detects the concurrency mutant that the agent-generated
property missed.

## Conclusion

OpenCode generated a valid property for sequential retry behavior,
but it did not test concurrency. Mutation testing revealed this
coverage gap and showed why agent-generated tests require
independent verification.

