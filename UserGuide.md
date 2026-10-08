# OpenCode User Guide

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
