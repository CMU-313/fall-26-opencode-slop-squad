# User Guide

## Compaction instructions

Session compaction replaces older conversation history with a structured summary. When an OpenCode interface asks for optional compaction instructions, those instructions can identify details that the summary should preserve, such as a file path, design constraint, or pending task.

Leaving the instructions blank retains the original compaction behavior.

### Using and manually testing the feature

1. Start OpenCode with a configured model provider and create a session with enough conversation history to compact.
2. Mention a recognizable file and constraint in the conversation, for example `packages/core/src/session/compaction.ts` and “plugin prompts remain full overrides.”
3. Trigger session compaction from an interface that supports compaction instructions.
4. Enter an instruction such as: `Preserve packages/core/src/session/compaction.ts and the plugin override decision.`
5. Confirm that the generated summary contains the requested file and constraint.
6. Confirm that the summary still contains the required headings: `Objective`, `Important Details`, `Work State`, `Completed`, `Active`, `Blocked`, `Next Move`, and `Relevant Files`.
7. Repeat with the instructions field left blank and confirm that compaction still succeeds with the original structured-summary behavior.

User instructions guide summary content but cannot remove or reorder the required Markdown structure. They are treated as untrusted data and are separated from conversation history with a delimiter selected so that it does not occur in either input. A plugin-provided compaction prompt remains a full override and does not receive the user instructions automatically.

### Automated verification

The core automated tests are in [`packages/core/test/session-compaction.test.ts`](packages/core/test/session-compaction.test.ts). Run them from `packages/core`:

```sh
bun test test/session-compaction.test.ts
```

The tests verify that:

- omitting instructions, or submitting empty or whitespace-only instructions, preserves the original prompt;
- supplied instructions appear without removing any required summary heading;
- the prompt explicitly gives its fixed structure and rules precedence over conflicting instructions;
- the instructions delimiter cannot be closed by instruction text or confused with serialized conversation text; and
- media tool results are summarized without embedding base64 data.

These tests exercise the pure prompt-construction function directly, covering both the unchanged path and the new instruction path without depending on a model provider. The manual procedure above complements them by checking that a real model-generated summary follows the instructions.
