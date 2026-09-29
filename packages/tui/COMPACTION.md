# TUI Session Compaction

## Overview

Session compaction allows users to summarize an existing
conversation while optionally providing custom instructions
that guide the summary.

## Usage

Users can initiate compaction using:

- `/compact`
- `/summarize`
- `Ctrl+X`, followed by `C` (default keyboard shortcut)

Opening the command displays a dialog titled
"Compaction instructions".

Users can enter instructions describing what the summary
should prioritize or leave the field empty to use the
default compaction behavior.

Pressing Escape cancels the dialog without submitting
a compaction request.

## Requirements

Compaction requires a connected model provider.

If no model is selected, the TUI displays a warning
rather than submitting a request.

## Reliability and Error Handling

The TUI prevents overlapping compaction requests while
an existing request is running.

Failed requests display an error notification without
exposing raw provider errors.

Once a request finishes, another compaction request
can be submitted.

## Compaction Marker

Compaction events appear in the conversation with
a visible "Compaction" marker.

When custom instructions are provided, they appear
beneath the marker.

When instructions are omitted, the marker appears
without an instructions line.

## Testing

Automated tests cover:

- Custom instructions and whitespace normalization
- Empty instructions and cancellation
- Request forwarding
- Duplicate-request prevention
- API error responses and rejected requests
- Compaction marker detection
- Marker instructions and missing instructions

Run the focused tests from packages/tui:

    bun test ./test/util/compaction.test.ts ./test/util/compaction-marker.test.ts

Run TypeScript validation:

    bun run typecheck

Manual testing should additionally verify the keyboard
shortcut, instructions dialog, marker appearance,
empty instructions, and cancellation.
