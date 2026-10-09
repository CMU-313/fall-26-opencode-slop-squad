# OpenCode User Guide

## Core Compaction Summary Instructions

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

## TUI Compaction with Custom Instructions

### Overview

The OpenCode terminal user interface (TUI) allows users to summarize a conversation using session compaction. Users can optionally provide custom instructions specifying which details should be prioritized in the summary.

This feature preserves the default compaction behavior when no custom instructions are provided.

### How to Use

1. Open an existing OpenCode session in the TUI.
2. Ensure a model is selected and configured.
3. Start compaction using `/compact`, `/summarize`, or the configured compaction keyboard shortcut.
4. In the "Compaction instructions" dialog, enter optional instructions, such as "Preserve API changes and important technical decisions."
5. Submit the dialog to begin compaction.
6. After compaction, the conversation displays a compaction marker. If instructions were provided, they appear beneath the marker.

To use default compaction behavior, submit an empty input. To cancel, press Escape.

### Expected Behavior

- **Custom instructions:** Included in the compaction request and displayed beneath the compaction marker.
- **Empty input:** Compaction proceeds without custom instructions.
- **Whitespace-only input:** Whitespace is removed and instructions are omitted.
- **Cancellation:** No compaction request is created.
- **Missing model:** Compaction does not proceed without a selected model.
- **Duplicate requests:** Additional requests are blocked while compaction is running.
- **Failed requests:** Errors are handled without permanently preventing another attempt.

### Manual Testing

#### Test 1: Custom Instructions

1. Open a session with a configured model.
2. Run `/compact`.
3. Enter "Focus on API changes."
4. Submit the dialog.
5. Verify that compaction begins and the compaction marker displays the instructions.

#### Test 2: Empty Instructions

1. Open the compaction dialog.
2. Leave the input blank and submit.
3. Verify that compaction proceeds without custom instructions.

#### Test 3: Cancellation

1. Open the compaction dialog.
2. Press Escape.
3. Verify that no compaction request is submitted.

#### Test 4: Duplicate Requests

1. Begin a compaction request.
2. Attempt another request while the first is processing.
3. Verify that an additional request is not submitted.

#### Test 5: Error Recovery

1. Trigger a compaction request failure using a nonworking provider configuration.
2. Verify that the TUI handles the error.
3. Restore the provider configuration.
4. Verify that another compaction attempt can proceed.

### Automated Tests

The automated tests are located in:

- `packages/tui/test/util/compaction.test.ts`
- `packages/tui/test/util/compaction-marker.test.ts`

#### Request and Reliability Tests

These tests verify:

- Custom instructions are included in requests.
- Leading and trailing whitespace is removed.
- Empty and whitespace-only instructions are omitted.
- Cancellation prevents request creation.
- Multiline instructions and special characters are preserved.
- Required request fields remain unchanged without instructions.
- Requests are forwarded to the summarization function.
- Duplicate requests are blocked.
- API errors and rejected requests are handled.
- Requests can be retried after successful completion or failure.

#### Compaction Marker Tests

These tests verify:

- Compaction markers are identified correctly.
- Missing markers return undefined.
- Custom instructions are preserved.
- Missing or empty instructions are omitted.
- Markers are identified among multiple message parts.
- Multiline instructions are preserved.

### Running the Tests

From the repository root:

```sh
cd packages/tui
bun test ./test/util/compaction.test.ts ./test/util/compaction-marker.test.ts
bun test
bun run typecheck
```

## Desktop/Web Compaction with Custom Instructions

### Overview

In the desktop/web app, compacting a session opens a dialog with an optional instructions box. Instructions are sent with the compaction request and shown on the "Session compacted" divider afterwards. Leaving the box empty keeps the original behavior.

### How to Use

1. Open a session in the web app with a configured model.
2. Run `/compact`, or choose "Compact session" from the command palette.
3. In the dialog, optionally enter instructions, such as "Focus on API changes."
4. Submit to compact, or Cancel to close the dialog without doing anything.
5. If instructions were given, the "Session compacted" divider shows "Instructions: …" underneath.

### Manual Testing

1. **Cancel:** open the dialog and Cancel. Verify no compaction starts.
2. **With instructions:** enter "Focus on API changes." and submit. Verify the divider shows the instructions.
3. **Empty:** leave the box blank and submit. Verify compaction works as before and the divider shows no instructions.

### Automated Tests

- `packages/app/e2e/user-story/compaction-instructions-flow.spec.ts` covers cancel (no request sent), submitting instructions (request body and divider), and empty input (no `instructions` field sent).
- `src/pages/session/timeline/rows-current.test.ts` checks that the timeline divider row carries instructions only when they exist.

Run them from `packages/app`:

```sh
bunx playwright test e2e/user-story/compaction-instructions-flow.spec.ts
bun test --conditions=solid --preload ./happydom.ts ./src/pages/session/timeline/rows-current.test.ts
bun run typecheck
```
