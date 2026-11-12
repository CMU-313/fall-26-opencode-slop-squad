# Traceability: Siheng Xia (sihengxia)

**Target feature:** Optional custom instructions for session compaction (`/compact`), continuing the same feature and interview evidence from Project 3.

**Source of requirements:** Section 7 of `P3 Workbook – sihengxia updated.docx`. C, O, and S references below retain the workbook's classmate, outside developer, and staff interview line numbers; no new interview evidence is claimed.

**Main source files:**

- [`packages/tui/src/util/compaction.ts`](../packages/tui/src/util/compaction.ts): submission normalization, request creation, and request runner.
- [`packages/core/src/session/compaction.ts`](../packages/core/src/session/compaction.ts): default `buildPrompt` and collision-safe instruction delimiters.
- [`packages/opencode/src/session/compaction.ts`](../packages/opencode/src/session/compaction.ts): manual compaction processing calls the prompt builder.
- [`packages/schema/src/v1/session.ts`](../packages/schema/src/v1/session.ts): persisted compaction-part schema.
- [`packages/tui/src/util/compaction-marker.ts`](../packages/tui/src/util/compaction-marker.ts) and [`packages/tui/src/routes/session/index.tsx`](../packages/tui/src/routes/session/index.tsx): marker display and dialog integration.

## Requirements

All eight P3 requirements were reviewed. P4 selected R1, R2, R4, and R5. P5 strengthens R1 and adds request/runner-boundary properties for R3 and R7, plus the mutation-derived R9. R6 and R8 remain untested by this personal suite; R3 and R7 do not claim physical-key, UI-message, persistence, or cross-runner session-coordination coverage.

| ID  | Interview evidence                                                                    | Requirement                                                                                                                                                                                                                                                       | Acceptance Criteria                                                                                                                                                                                                                                                                                                                                                             | Changed in P4?                                                                                       | Property (kind)                                                                                                                                       | Test                                                                                                                                                                                                                                                                                        | Mutants it kills         |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| R1  | O-9, O-15, C-10                                                                       | After submission removes leading and trailing whitespace as specified by R2, a non-empty custom instruction reaches the default summarizer prompt unchanged, including paths, quotation marks, and internal line breaks. Literal delimiter text must remain data. | For any instruction with non-whitespace content, the request retains its normalized text and session/model identity. The prompt's instruction-block body equals that normalized text character for character. If input contains candidate delimiters, the actual delimiter is absent from the instruction, previous summary, and context, and no instruction text is truncated. | Yes: normalization and delimiter boundary clarified.                                                 | Invariant: normalized instruction delivery; invariant: collision-safe delivery.                                                                       | [`sihengxia-compaction.property.test.ts`](../packages/opencode/test/session/sihengxia-compaction.property.test.ts), tests `sihengxia R1 invariant: normalized instructions reach the prompt unchanged` and `sihengxia R1 invariant: literal delimiter text does not truncate instructions`. | H1, H2, A1 (also S14)    |
| R2  | C-13, C-14                                                                            | Leading and trailing whitespace do not change the request.                                                                                                                                                                                                        | Submitting a non-empty instruction with or without outer whitespace stores the same normalized instruction, creates equal requests, and produces the same default prompt for the same history. This generalizes the P3 example with `Preserve file paths`.                                                                                                                      | No.                                                                                                  | Metamorphic: add/remove outer whitespace without changing the request or prompt.                                                                      | [`sihengxia-compaction.property.test.ts`](../packages/opencode/test/session/sihengxia-compaction.property.test.ts), test `sihengxia R2 metamorphic: outer whitespace leaves request and prompt unchanged`.                                                                                  | H1                       |
| R3  | C-20, C-21                                                                            | Escape cancels without starting compaction. An empty field or a whitespace-only field starts ordinary compaction with no custom instruction.                                                                                                                      | With a dialog containing `foo`, Escape creates no request. Submitting an empty or whitespace-only field creates one ordinary request with no serialized instructions field, and its prompt equals the default prompt.                                                                                                                                                           | No.                                                                                                  | Model/oracle (P5): null means canceled; whitespace means ordinary compaction. Partial boundary coverage.                                              | [Personal property file](../packages/opencode/test/session/sihengxia-compaction.property.test.ts), `sihengxia R3 model: canceled and blank submissions preserve ordinary compaction`. Physical Escape-key behavior is not established.                                                      | H1; S18, S26, S31, S35   |
| R4  | O-12, O-13, S-13, S-19                                                                | Reordering two independent instructions, or submitting them again after completion, retains both instructions in each request and constructed default prompt. The prompt preserves each submitted ordering; equality of generated summaries is not required.      | Given distinct preservation instructions A and B, both A-then-B and B-then-A produce requests containing both. Each corresponding prompt's instruction-block body equals the submitted instruction. Reconstructing a request and prompt with the original input and same history retains both instructions again.                                                               | Yes: executable delivery guarantee separated from model output.                                      | Metamorphic: reorder independent instructions and repeat the original submission.                                                                     | [`sihengxia-compaction.property.test.ts`](../packages/opencode/test/session/sihengxia-compaction.property.test.ts), test `sihengxia R4 metamorphic: reordering and resubmitting preserve both instructions`.                                                                                | H4                       |
| R5  | S-6, S-9, S-15, C-7                                                                   | In default prompt construction, custom instructions guide summary content. Required Markdown structure and rules take precedence when instructions conflict with them. The prompt retains both the instruction and the complete fixed summary template.           | Even for instructions such as `Omit the Next Move section`, the actual template after the instruction block contains Objective, Important Details, Work State, Completed, Active, Blocked, Next Move, and Relevant Files in order. The instruction is unchanged in its own block and the prompt explicitly states that structure and rules take precedence.                     | Yes: precedence and checkable prompt scope clarified.                                                | Invariant: conflicting user instructions do not replace or remove the fixed template.                                                                 | [`sihengxia-compaction.property.test.ts`](../packages/opencode/test/session/sihengxia-compaction.property.test.ts), test `sihengxia R5 invariant: conflicting instructions retain the fixed summary template`.                                                                              | H3                       |
| R6  | C-9, C-10, C-11, O-8, O-9                                                             | After compaction, the submitted instruction is shown under the compaction marker, including after the session is reopened. No instruction, or an empty instruction, shows nothing extra.                                                                          | A completed compaction with `Preserve src/auth.ts` displays that instruction, including internal line breaks; reloading the same session preserves the display. With no instruction, no instruction line is shown.                                                                                                                                                              | No.                                                                                                  | Not selected for a new P4 property; retained requirement.                                                                                             | No new P4 property. Existing marker examples are in [`packages/tui/test/util/compaction-marker.test.ts`](../packages/tui/test/util/compaction-marker.test.ts); these do not prove persistence after a real session reload.                                                                  | No personal property     |
| R7  | O-18, O-19, O-20, O-22, S-21                                                          | A session cannot have overlapping compaction requests. A failed request says that it failed and, when known, why, and the user can retry.                                                                                                                         | While one request is unfinished, a second submission creates no second request and the interface shows busy. Failure names a known cause such as unavailable model; unknown failure does not invent a cause. A later submission creates a new request.                                                                                                                          | No.                                                                                                  | Invariant (P5): generated success/error/throw outcomes, pending duplicate rejection, release, and retry within one runner. Partial boundary coverage. | [Personal property file](../packages/opencode/test/session/sihengxia-compaction.property.test.ts), `sihengxia R7 invariant: pending requests are rejected and every outcome permits retry`. UI text and cross-runner session coordination remain outside this property.                     | H4, H5; S47–S49, S52–S53 |
| R8  | O-3, O-18                                                                             | A failed compaction does not delete, overwrite, or reorder pre-existing conversation messages. Additional failure/attempt metadata may be recorded.                                                                                                               | If the summarizer fails, all pre-existing messages retain their IDs, order, and content; no replacement summary is committed. Failure/attempt records may be added without modifying those messages.                                                                                                                                                                            | Yes: acceptance criterion permits diagnostic records while protecting existing conversation content. | Not selected for a new P4 property; retained revised requirement.                                                                                     | No new P4 property; an integration test of persisted history is needed to establish this guarantee.                                                                                                                                                                                         | No personal property     |
| R9  | P5 engineering requirement derived from Stryker S24/S25/S32; no new interview claimed | The default compaction prompt retains the supplied previous summary and ordered conversation paragraphs, distinguishes create/update guidance, and does not lose the custom instruction when context is added.                                                    | Adding generated conversation paragraphs leaves the instruction block unchanged, preserves each paragraph in order with boundaries, retains any previous summary in its block, and keeps explicit create/update guidance. Ordinary compaction has no extra custom-instruction section.                                                                                          | Added in P5                                                                                          | Metamorphic: append independent context without changing instruction delivery or losing existing history.                                             | [Personal property file](../packages/opencode/test/session/sihengxia-compaction.property.test.ts), `sihengxia R9 metamorphic: adding context preserves instructions and prior conversation`.                                                                                                | S24, S25, S31, S32       |

Properties written or suggested by opencode or another AI tool: **R1, R2, R4, R5 (Codex, P4); strengthened R1 and new R3, R7, R9 (Codex, P5)**. A separate **R1 property was actually generated by OpenCode** in P5 and evaluated for the agent failure case below. The initial OpenCode property is retained as evidence, not added as an extra always-passing CI suite. No additional interview evidence is claimed.

## Requirement changes

| ID  | Original requirement (P3)                                                                                                                                                                                                                                                                                                                              | Revised requirement                                                                                                                                                                                                          | Why it changed                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | A non-empty custom instruction reaches the summarizer prompt unchanged, including paths, quotation marks, and line breaks. P3's example places the text inside the `<user-compaction-instructions>` block.                                                                                                                                             | After R2's outer-whitespace normalization, preserve every remaining character inside a collision-safe instruction block in the default prompt.                                                                               | An unconditional unchanged-input guarantee conflicts with R2's deliberate trimming. The original fixed delimiter also cannot safely delimit instructions containing that literal marker. The revision retains O-9/O-15/C-10's delivery need and covers internal whitespace, paths, quotes, Unicode, and delimiter-like content.                                                    |
| R4  | Reordering two instructions, or running compaction again, still delivers what the user asked to preserve. Order and wording may change. The underlying content stays (S-13, S-19).                                                                                                                                                                     | Both independent instructions are delivered in every request and prompt when reordered or resubmitted. The submitted order is preserved inside the prompt; generated summary wording/content is a separate model evaluation. | A deterministic property of prompt construction cannot prove an LLM always retains facts or task status. O-12/O-13 ask that neither request disappear, while O-15/O-16 explicitly separate delivery from generated-summary correctness. This revision makes the acceptance criterion executable without claiming a model-quality guarantee.                                        |
| R5  | The feature follows the instruction the user gave, and the custom instruction overrides the original guidance (S-6, S-9). Named files and task facts stay, including whether a task is finished (S-15, C-7). She did not say a required heading can be removed (S-10), so the prompt still contains every required heading and the custom instruction. | Custom instructions guide content in the default prompt, but the required Markdown structure and rules take precedence on conflict. Preserve the complete template and instruction text.                                     | Unqualified override conflicts with the requirement to preserve mandatory headings. The workbook notes that removing headings was not established by the interview. The revision makes that boundary explicit, retains the original prompt-level acceptance criterion, and leaves factual summary fidelity to a separate evaluation rather than treating prompt presence as proof. |
| R8  | A failed compaction does not replace or delete the original conversation. P3 acceptance: after a summarizer throws, the message list is the same, message by message, as before the attempt.                                                                                                                                                           | Pre-existing conversation messages retain their IDs, order, and content, and no replacement summary is committed. Additional diagnostic/attempt metadata may be recorded.                                                    | Requiring equality of the entire message list can reject legitimate failure reporting required by R7. O-3's actual need is not losing the original conversation. The revised criterion protects that content while allowing an observable failure record. It is not claimed as tested in this submission.                                                                          |

R2, R3, R6, and R7 are kept because their input conditions and expected behavior are feasible and observable. Remaining implementation or integration-test work does not, by itself, justify weakening those requirements. R6 and R7's full UI/persistence claims are deliberately not inferred from the helper tests.

## Properties and generators

The P4 baseline had five properties for four IDs. The P5 file contains **eight fast-check properties for seven requirement IDs**, using **invariant, metamorphic, and model/oracle** kinds. Each runs 250 generated cases with **seed 3132026**. Each comment names its requirement, kind, generator boundaries, and coverage limits. The unchanged P4 assertions with only reproducibility/import adjustments are preserved in [the baseline snapshot](../mutants/sihengxia/p4-baseline.property.ts.txt).

- R1 generates Unix and Windows paths, quotes, Unicode and combining marks, internal newlines, optional previous summaries, and variable-length context. P5 delimiter cases include paired, opening-only, closing-only, and split-field collisions, plus literal suffix zero, across instruction, previous-summary, and history text. The test parses the chosen delimiter rather than copying the production delimiter-selection algorithm.
- R2 adds generated padding made from spaces, tabs, CRLF, nonbreaking spaces, BOM, and Unicode line separators to meaningful non-empty instructions. It tests the real request-normalization boundary before constructing the prompt; it does not incorrectly require the lower-level builder to normalize arbitrary direct callers.
- R4 generates independent path/decision and unfinished-task preservation instructions, tests both orderings, and rebuilds the original submission. It checks instruction-block contents, not equality between model-generated summaries, and does not exercise concurrent submissions.
- R5 generates conflicts targeting each required heading, all headings, JSON-only output, and literal template-closing text. It inspects the real template after the instruction block, so headings merely quoted by an instruction cannot satisfy the property.

These tests exercise the production TUI request helper and core prompt builder from an opencode integration test. They do not call a live LLM, simulate a physical key press, verify persistence, or claim to establish all requirements merely because a helper passed. The default-prompt scope excludes the existing plugin full-prompt override.

## Running and CI

From `packages/opencode`:

```sh
bun test --timeout 30000 test/session/sihengxia-compaction.property.test.ts
bun typecheck
```

The branch starts from team `main` commit `2dfb2830f1cbf98c1db7f906bec37fcb70bee071`, which already includes the shared fast-check dependency PR #15. The new suite uses that existing `packages/opencode` dev dependency. No dependency manifests, lockfile, teammate tests, production code, or Turbo package registrations need to change.

The existing `test` workflow runs `bun turbo test --concurrency=4`, and `turbo.json` already registers `opencode#test`. Bun automatically discovers this `.property.test.ts` file. Each property emits a requirement-specific success line only after `fc.assert` returns, so the CI log shows the properties ran even with the package's `--only-failures` option. A failing assertion retains fast-check's seed, shrinking path, and counterexample for triage; success logs are never emitted for a failed assertion.

## P4 run and triage record

Local validation on November 5, 2026, with Bun 1.3.14 and the shared locked fast-check 4.10.2 dependency:

- `bun test --timeout 30000 test/session/sihengxia-compaction.property.test.ts --only-failures`: **5 pass, 0 fail**, 1,250 generated cases in total. All five requirement-specific success lines were visible with the same output-suppression option used by the existing CI package script.
- `bun typecheck` from `packages/opencode`: **passed**.
- Prettier check of the two new files: **passed**.
- Existing related baseline: the core compaction suite and TUI compaction/marker suites had **27 passing example tests** before this change. These existing tests were not edited.

Triage: the first property run passed all five property assertions but the existing shared preload's cleanup hook exceeded the default local timeout on a cold Windows run. Re-running with the package's existing 30-second timeout passed, including cleanup; the preload was not changed. Type checking also caught an optional request-instruction value passed to a string matcher in the initial test draft. The test was corrected to establish the non-empty instruction precondition explicitly. No production-code failure or shrunk property counterexample was found, so no production code or acceptance criterion was changed to make a failing implementation pass.

R4 also exercises the production compaction runner: three sequential accepted submissions (original ordering, reversed ordering, original ordering) reach an injected API callback, each finishes, and each receives the exact submitted instruction. The callback constructs the real prompt without contacting an LLM. This is a deterministic delivery check, not an assertion that repeated summaries are identical.

A passing property checks only the generated inputs and the stated implementation boundary; it is not a proof about all inputs or actual LLM summaries. The GitHub PR's `test` run is the separate CI evidence; this local record does not claim teammate review or CI completion.

## P5 execution scope

The P4 branch was merged with team main before mutation work, including the shared Stryker dependency from PR #20 and the already-merged teammate work. Those files were not authored or edited by this submission. Personal mutation runs temporarily alter only the named core/TUI sources, then restore their exact original bytes; no faulty production change is committed. The package already ignores `reports/` and `.stryker-tmp/`, so no shared ignore/dependency edits are needed.

Run Stryker from the repository root because the selected code spans core and TUI, while the command runner starts Bun in opencode:

```sh
node node_modules/@stryker-mutator/core/bin/stryker.js run packages/opencode/stryker.sihengxia.config.json
```

The personal configuration mutates only the summary template, delimiter/prompt builder, and request/runner functions, and runs only `sihengxia-compaction.property.test.ts`. Relative source imports ensure these are the mutated sandbox copies, rather than unmutated workspace-package symlinks. The same configuration, 56 generated mutants, 250 runs, and seed 3132026 are used before and after strengthening.

## Hand-written mutants

The [predictions](../mutants/sihengxia/predictions.md) and [P4 baseline snapshot](../mutants/sihengxia/p4-baseline.property.ts.txt) were committed in `d028fcf` before any mutant was applied. The five patches apply independently to the synchronized production baseline; every run restores original source bytes. `Killed` below means an actual fast-check property failure, not a setup/cleanup failure.

| ID                                  | Requirement targeted | Change                               | Predicted killer (before execution)  | Actual baseline result                           | Result after strengthening                                                |
| ----------------------------------- | -------------------- | ------------------------------------ | ------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------- |
| [H1](../mutants/sihengxia/H1.patch) | R2 (also R1)         | Store untrimmed input                | R2/R1: padding must be removed       | [Killed](../mutants/sihengxia/baseline-H1.txt)   | [Killed](../mutants/sihengxia/strengthened-H1.txt)                        |
| [H2](../mutants/sihengxia/H2.patch) | R1                   | Return a colliding delimiter         | R1 delimiter invariant               | [Killed](../mutants/sihengxia/baseline-H2.txt)   | [Killed](../mutants/sihengxia/strengthened-H2.txt)                        |
| [H3](../mutants/sihengxia/H3.patch) | R5                   | Rename Next Move to Next Steps       | R5 required-heading invariant        | [Killed](../mutants/sihengxia/baseline-H3.txt)   | [Killed](../mutants/sihengxia/strengthened-H3.txt)                        |
| [H4](../mutants/sihengxia/H4.patch) | R4                   | Leave runner busy after completion   | R4 sequential admissions             | [Killed](../mutants/sihengxia/baseline-H4.txt)   | [Killed](../mutants/sihengxia/strengthened-H4.txt)                        |
| [H5](../mutants/sihengxia/H5.patch) | R7                   | Return success for an error response | Survive: P4 callbacks only succeeded | [Survived](../mutants/sihengxia/baseline-H5.txt) | [Killed](../mutants/sihengxia/strengthened-H5.txt) by the new R7 property |

Baseline: **4/5 killed, H5 survived**. After strengthening: **5/5 killed**. The scripts and [before](../mutants/sihengxia/hand-results-baseline.json)/[after](../mutants/sihengxia/hand-results-strengthened.json) JSON results make the experiment repeatable:

```sh
node mutants/sihengxia/run-hand-mutants.mjs baseline
node mutants/sihengxia/run-hand-mutants.mjs strengthened
```

## Stryker comparison

Configuration: [`packages/opencode/stryker.sihengxia.config.json`](../packages/opencode/stryker.sihengxia.config.json). Fixed fast-check **seed 3132026**, **250 cases per property**, Bun **1.3.14**, Node **24.22.1**, Stryker **10.1.1**. Both runs instrumented the same **56 mutants** in two files; only the personal property suite ran. The [before report](../mutants/sihengxia/mutation-before.html), [final HTML report](../mutants/sihengxia/mutation.html), [before JSON](../mutants/sihengxia/mutation-before.json), [final JSON](../mutants/sihengxia/mutation-final.json), and [run log](../mutants/sihengxia/stryker-final.log) are committed copies, not shared scratch reports.

| Run                         | Killed | Timeout | Survived | No coverage / errors | Stryker raw score |
| --------------------------- | ------ | ------- | -------- | -------------------- | ----------------- |
| P4 baseline with fixed seed | 33     | 6       | 17       | 0 / 0                | 69.64% = 39/56    |
| Strengthened P5 suite       | 46     | 7       | 3        | 0 / 0                | 94.64% = 53/56    |

Stryker includes timeouts in detected mutants. All seven final timeouts occur in the recursive delimiter search, where changes force continued recursion or prevent candidate progress. They are reported as timeouts, not relabeled as assertion failures.

### Hand-written versus automatic faults

- H1's removed trim and H4's stuck busy flag have automatic counterparts: method/Boolean mutations can remove normalization or change the flag. H2 has automatic counterparts that skip collision checking, although its exact edit is a different patch.
- Stryker did not generate H3's semantic heading rename: it can delete the whole template string, but does not invent the plausible replacement name `Next Steps`. It also did not generate H5's unconditional success for an API error; removing the existing negation is a different change that the all-success baseline already detects.
- The unexpected automatic survivors included S14's OR-to-AND collision check, S24's removed previous summary, and S47–S49/S52–S53's pending/error paths. S14 is a plausible developer mistake because complete tag pairs make OR and AND look interchangeable; S24 exposed a missing requirement about context delivery.
- Hand-written faults express specific misunderstandings of requirements; automatic faults systematically exercise operators, branches, literal values, and blank paths that were easy to overlook. Neither score establishes LLM summary quality, UI behavior, or untested persistence guarantees.

### Strengthening and remaining survivors

All strengthening uses generated properties, not added example-based tests. R1 now generates opening-only, closing-only, split-field, paired, and zero-suffix tag text; it kills S14 and detects S5's loss of delimiter-search progress. R3 adds null/blank input classes and direct-builder blank handling. R7 adds a deferred pending request and generated success/error/throw outcomes, killing H5 and all five baseline runner survivors. R9 adds a newly stated prompt-context requirement and checks previous-summary retention, create/update guidance, and ordered paragraph boundaries; it kills S24/S25/S31/S32.

Two final survivors are **strictly equivalent for valid typed inputs**:

1. **S22** changes the absent-previous-summary fallback, used only for collision detection, from an empty string to `Stryker was here!`. Neither string contains an opening or closing candidate delimiter, so it cannot change which candidate is selected for any other inputs. The fallback is not rendered into the prompt, so the returned string is identical.
2. **S28** changes the inclusion guard from `instructions && tag` to `instructions || tag`. The preceding assignment creates a non-empty tag if and only if normalized instructions are non-empty; otherwise both conditions are false in the ternary. Thus both guards select the same array branch and produce the same returned prompt for all valid inputs.

With only S22 and S28 excluded, the adjusted final score is **98.15% = 53/(56 - 2)**. The remaining **S4** always uses numbered delimiter candidates, including suffix zero, instead of first trying the unnumbered spelling. It changes an observable prompt string and therefore is **not excluded as strictly equivalent**; the payload, fresh-delimiter safety, and required template still satisfy R1/R5. The current requirements do not demand the smallest suffix, so this survivor remains honestly in the score rather than adding an arbitrary naming rule solely to reach 100%.

## Agent failure case

This is a real OpenCode CLI interaction, separate from Codex assistance on the project. Model: `openai/gpt-6.1-sol`; session: `ses_e2e2de447ffegC29kULuatci3r`; recorded at `2026-11-12T22:13:17.023Z`. The [original prompt](../mutants/sihengxia/agent-case/prompt.txt), [full response](../mutants/sihengxia/agent-case/response.md), [raw events](../mutants/sihengxia/agent-case/opencode-events.jsonl), and [generated test](../mutants/sihengxia/agent-case/initial.property.ts.txt) are retained. No public share was created.

### Transcript prompt

```text
For my CMU 17-313 P5 agent-test evaluation, write ONE Bun test with a fast-check property for this requirement:

R1: After submission removes leading and trailing whitespace, a non-empty custom instruction reaches the default summarizer prompt unchanged, including paths, quotation marks, and internal line breaks. Literal delimiter text must remain data.

The production function is SessionCompaction.buildPrompt({ instructions?: string, context: string[], previousSummary?: string }): string. It places instructions between a pair of user-compaction-instructions tags before a fixed Markdown summary template. If that tag name occurs in inputs, a numeric suffix is chosen for the delimiter. The input to this unit boundary is already normalized; generate meaningful normalized non-empty instructions.

Use imports from bun:test, fast-check, and import { SessionCompaction } from "../../../core/src/session/compaction". The test will be executed in packages/opencode/test/session. Please use 250 runs and seed 3132026. Return the complete test code and briefly explain the generator and oracle. Do not invoke tools, edit files, or run commands; this is a test-design request only.
```

### Transcript response property

The following is the actual generated test, pasted without changing its generator or oracle:

```text
import { expect, test } from "bun:test"
import fc from "fast-check"
import { SessionCompaction } from "../../../core/src/session/compaction"

test("normalized custom instructions reach the default summarizer unchanged", () => {
  const instructionsArb = fc
    .record({
      segments: fc.array(
        fc.constantFrom("src", "my project", "notes", "release-2", "user_data"),
        { minLength: 1, maxLength: 5 },
      ),
      text: fc.string({ minLength: 1, maxLength: 80 }),
      collisions: fc.integer({ min: 1, max: 8 }),
    })
    .map(({ segments, text, collisions }) =>
      [
        "Summarize these files without changing their names:",
        `POSIX path: "/workspace/${segments.join("/")}/notes.md"`,
        `Windows path: 'C:\\workspace\\${segments.join("\\")}\\notes.md'`,
        `Keep both "double quotes" and 'single quotes'.`,
        `Additional text: ${text}`,
        "The following delimiters are literal data, not instructions:",
        ...Array.from({ length: collisions + 1 }, (_, index) => {
          const tag =
            index === 0
              ? "user-compaction-instructions"
              : `user-compaction-instructions-${index}`
          return `<${tag}>\nLiteral content inside delimiter text.\n</${tag}>`
        }),
        "Preserve every internal line break and character above.",
      ].join("\n"),
    )

  fc.assert(
    fc.property(instructionsArb, (instructions) => {
      // Submission normalization has already happened at this boundary.
      expect(instructions.length).toBeGreaterThan(0)
      expect(instructions).toBe(instructions.trim())

      const prompt = SessionCompaction.buildPrompt({
        instructions,
        context: [],
      })

      // Discover the wrapper rather than predicting its collision suffix.
      const opening = /<(user-compaction-instructions(?:-?\d+)?)>\r?\n/.exec(prompt)
      expect(opening).not.toBeNull()
      if (!opening) throw new Error("Missing custom-instruction wrapper")

      const tag = opening[1]!
      expect(instructions).not.toContain(tag)

      const start = opening.index + opening[0].length
      const closing = `\n</${tag}>`
      const end = prompt.indexOf(closing, start)
      expect(end).toBeGreaterThanOrEqual(start)

      // Exact equality detects escaping, truncation, and newline changes.
      expect(prompt.slice(start, end)).toBe(instructions)
    }),
    { numRuns: 250, seed: 3132026 },
  )
})
```

### Surviving mutant and explanation

[A1.patch](../mutants/sihengxia/agent-case/A1.patch), identical to automatic mutant S14, changes the collision check from `opening || closing` to `opening && closing`. OpenCode's generator always makes paired opening and closing tags and gives the builder empty context, so both tests inside that condition are true together. It never asks about a lone closing/opening tag or tags split across fields, which allows the faulty AND condition to make the same choice as the correct OR condition on every generated case.

The generated property passes 250 cases on [the original program](../mutants/sihengxia/agent-case/agent-original.txt) and also passes 250 cases [with A1 applied](../mutants/sihengxia/agent-case/agent-A1.txt). The strengthened property fails A1 after the first generated case and shrinks to a closing-only collision; the [failure log](../mutants/sihengxia/agent-case/strengthened-A1.txt) records seed `3132026` and path `0:0:0:0:0:0:0:0:0:1`. This is a generator-coverage failure, not an always-true assertion: the original oracle checks exact extracted payload equality, but the inputs omit the shape that distinguishes OR from AND.

### Strengthened version

The R1 delimiter property in [the final personal test file](../packages/opencode/test/session/sihengxia-compaction.property.test.ts) now selects `paired`, `opening`, `closing`, or `split`, and independently checks the chosen tag against every input field. Its generator construction includes:

```ts
const tags = Array.from(
  { length: count },
  (_, index) => `user-compaction-instructions${index === 0 ? "" : `-${index}`}`,
)
// Zero is a legitimate literal suffix too, even though the normal
// search starts with the unnumbered tag. Include it as arbitrary data.
const candidates = [...tags, "user-compaction-instructions-0"]
const opens = candidates.map((tag) => `<${tag}>`).join("\n")
const closes = candidates.map((tag) => `</${tag}>`).join("\n")
const paired = candidates.map((tag) => `<${tag}>literal text</${tag}>`).join("\n")
const markers = shape === "paired" ? paired : shape === "closing" ? closes : opens
const historyMarkers = shape === "split" ? closes : markers
const input = {
  instructions: `${value}\nLiteral markers: ${markers}\nKeep every character.`,
  previousSummary: `${history.previousSummary ?? ""}\n${historyMarkers}`,
  context: [...history.context, historyMarkers],
}
```

The same mutant is detected by that property and the original code passes all eight final properties. Reproduce both sides with `node mutants/sihengxia/agent-case/evaluate.mjs`; the [result JSON](../mutants/sihengxia/agent-case/results.json) records exit codes 0, 0, and 1 for original/agent, mutant/agent, and mutant/strengthened respectively.

## P5 validation and submission state

The unmodified production code passes **8 properties, 0 failures, 2,000 generated cases**, and `bun typecheck` passes in `packages/opencode`. All five hand-written mutants are killed after strengthening, and A1 is killed by the strengthened R1 generator. Production sources, teammate property files, shared manifests/lockfile, and workflows have no personal changes.

The original P4 PR is reused. P5 must be submitted using merged-code permalinks and the merge SHA after approval and merge; local validation here is not a claim of a later GitHub review or merge. Retrospective answers are submitted in the separate Gradescope assignment, not in this traceability file.
