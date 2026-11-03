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

## Compaction Instructions over the HTTP API

### Overview

The three sections above cover the places a person types compaction instructions (the TUI dialog, the desktop/web dialog) and what the summary prompt does with them. This section covers the layer underneath: the `instructions` field on the summarize API, which is how those instructions reach the compaction processor, and how any other client — the SDK, a script, an editor plugin — can supply them.

The field is optional and additive. `POST /session/{sessionID}/summarize` accepts an `instructions` string, stores it on the session's compaction part, and the prompt loop hands it to the compaction processor when the summary is built. A request that omits the field behaves exactly as it did before the field existed.

### How to Use

Start a headless server from a checkout:

```sh
bun run --cwd packages/opencode --conditions=browser src/index.ts serve --port 4096
```

The server prints the address it bound to. Every request below needs an `x-opencode-directory` header naming the project directory to operate on.

Send instructions along with the provider and model you want the summary generated with:

```sh
curl -X POST http://127.0.0.1:4096/session/$SESSION_ID/summarize \
  -H 'content-type: application/json' \
  -H "x-opencode-directory: $PROJECT_DIR" \
  -d '{
        "providerID": "anthropic",
        "modelID": "claude-sonnet-4-20250514",
        "instructions": "Keep the migration plan and the rollback steps"
      }'
```

From the TypeScript SDK the field sits on the same request body:

```ts
await client.session.summarize({
  path: { sessionID },
  body: {
    providerID: "anthropic",
    modelID: "claude-sonnet-4-20250514",
    instructions: "Keep the migration plan and the rollback steps",
  },
})
```

### Expected Behavior

| `instructions` in the request       | Result                                                                                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A string                            | Accepted. Stored verbatim on the compaction part — newlines and punctuation included — and passed to the compaction processor.                                         |
| Omitted                             | Accepted. The compaction part carries no `instructions` key, which is the behavior from before the field was added.                                                    |
| `null`                              | Accepted, and identical to omitting it. The decoded payload type is `string \| null \| undefined`, and a null is dropped rather than stored.                           |
| An empty string                     | Accepted and stored as an empty string. This layer does not normalize; the prompt builder ignores blank instructions, and the TUI and web dialogs trim before sending. |
| A number, boolean, array, or object | Rejected with `400` and a `BadRequest` body naming the `instructions` field. No compaction part is created.                                                            |

### Manual Testing

These steps need a configured model provider for compaction to finish. Steps 1–4 exercise this layer on its own and work without credentials, because the compaction part is written before the model is called.

1. Start the server as shown above and export `SESSION_ID` and `PROJECT_DIR` for the session you want to compact. To create a throwaway session:

   ```sh
   curl -s -X POST http://127.0.0.1:4096/session \
     -H 'content-type: application/json' \
     -H "x-opencode-directory: $PROJECT_DIR" \
     -d '{"title": "compaction instructions demo"}'
   ```

2. Post a summarize request carrying an `instructions` string, as in the `curl` above.
3. Read the session's messages back and find the compaction part:

   ```sh
   curl -s "http://127.0.0.1:4096/session/$SESSION_ID/message" \
     -H "x-opencode-directory: $PROJECT_DIR"
   ```

   The part of `"type": "compaction"` should carry your string under `"instructions"`.

4. Repeat step 2 with `"instructions": 42`. The response should be `400` with a `BadRequest` body pointing at `instructions`, and no new compaction part should appear.
5. Repeat step 2 with the field omitted. Compaction should run as it always has, and the new compaction part should have no `instructions` key at all.
6. With a provider configured, mention a recognizable file and constraint earlier in the session, then compact with instructions naming them, and confirm the generated summary preserves them. This crosses into the prompt behavior documented in the first section of this guide.

### Automated Tests

Nine tests cover this layer, split by the boundary they pin down.

The request contract, in [`packages/opencode/test/server/httpapi-session.test.ts`](packages/opencode/test/server/httpapi-session.test.ts):

- `rejects non-string summarize instructions` — a number, boolean, array, and object each return `400`.
- `accepts a string summarize instructions payload` — a valid string clears payload validation and reaches the handler.
- `treats omitted and null summarize instructions the same way` — both spellings produce the same result, which is what makes `null` safe rather than a crash.

The last two aim at a session ID that does not exist, so a `404` from the handler proves the payload was accepted without needing a model to run the compaction loop.

Storage and handoff, in [`packages/opencode/test/session/compaction.test.ts`](packages/opencode/test/session/compaction.test.ts):

- `persists instructions on the compaction part` — the value supplied to `create()` is readable off the session's messages.
- `omits instructions when none are supplied` — the key is absent, not present-and-undefined, so anything reading parts written before this field existed sees the shape it always did.
- `reads instructions back off the stored part rather than the in-memory write` — re-reads through `getPart`, which selects straight out of the part table, so it fails if the value only ever lived on the object handed to `updatePart`.
- `stores instructions verbatim, including newlines and punctuation` — guards the storage round-trip against mangling.
- `stores an empty instructions string without substituting a default` — pins this layer as pass-through.
- `surfaces stored instructions as the compaction task the prompt loop reads` — asserts the derived task carries the instructions, which is the hop `prompt.ts` relies on when it forwards `task.instructions` into `compaction.process`.

Run them from `packages/opencode`:

```sh
bun test --timeout 30000 test/session/compaction.test.ts test/server/httpapi-session.test.ts
bun run typecheck
```

Both files also run in CI, through the `opencode#test` and `typecheck` tasks.

#### Why this is sufficient

The change is a conduit with four hops — request payload, `compaction.create`, the stored part, and the task the prompt loop reads — and each hop has a test that fails if the field stops travelling across it. The tests assert on what came back out of the part table rather than on the object that was written, so a field that was accepted but never persisted would be caught.

Both halves of the contract are covered, not just the new one: the absent case is asserted directly on the stored shape rather than inferred from the rest of the suite still passing, which is what "unchanged when omitted" actually requires.

Two things are deliberately out of scope here and covered elsewhere in this guide: what the summary prompt does with the instructions, tested in `packages/core/test/session-compaction.test.ts`, and the TUI and web dialogs that collect them, tested in their own packages. The one hop not driven end-to-end is the prompt loop calling the compaction processor with a live model; `prompt.ts` passes `task.instructions` through verbatim, so the test on the derived task covers it without standing up a provider.
