import { describe, expect, test } from "bun:test"
import fc from "fast-check"
import { compactInstructions } from "./dialog-compact-instructions"

// Property tests for compact instruction normalization (R2, R8).
// See traceability/afeies.md and docs/p4-properties.md.

// Whitespace that String.prototype.trim strips: ASCII spaces, tabs and line
// breaks, plus Unicode spaces (NBSP, em space, ideographic space, BOM) that
// users can paste from other apps. Interviewees required empty and
// spaces-only input to behave identically (C-9, O-6), so "blank" covers "",
// a single character, and long mixed runs.
const ws = fc.constantFrom(" ", "\t", "\n", "\r\n", " ", " ", "　", "﻿")
const blank = fc.array(ws, { maxLength: 8 }).map((parts) => parts.join(""))

// Arbitrary grapheme strings (emoji, combining marks, CJK) with no whitespace
// at either end, so the expected result is known without calling trim(). The
// inside may still contain whitespace and newlines, which must survive.
const core = fc
  .string({ unit: "grapheme", minLength: 1 })
  .map((text) => text.trim())
  .filter((text) => text.length > 0)

// One line of text with no line break inside it. Interior lines may be empty,
// whitespace-only or indented, since long multi-line instructions (S-6)
// often contain blank separator lines and indentation that must be kept.
const line = fc.string({ unit: "grapheme" }).filter((text) => !/[\r\n]/.test(text))
const innerLine = fc.oneof(
  line,
  fc.array(fc.constantFrom(" ", "\t", " "), { maxLength: 4 }).map((parts) => parts.join("")),
)
const edgeLine = line.map((text) => text.trim()).filter((text) => text.length > 0)

// At least two lines (first and last non-blank so outer trimming cannot touch
// them), joined by either "\n" or "\r\n" as produced by a textarea on
// different platforms.
const multiline = fc.record({
  lines: fc
    .tuple(edgeLine, fc.array(innerLine, { maxLength: 5 }), edgeLine)
    .map(([first, middle, last]) => [first, ...middle, last]),
  newline: fc.constantFrom("\n", "\r\n"),
  before: blank,
  after: blank,
})

describe("compact instructions properties", () => {
  // R2: The instructions are trimmed before sending. If nothing is left, the
  // request has no instructions and behaves exactly like a plain compaction.
  // Kind: invariant
  // Generators: padded = blank + core + blank, where blank mixes ASCII and
  // Unicode whitespace (incl. "") and core has non-whitespace ends, so the
  // expected output is exactly core. Blank-only input is the empty/spaces case
  // interviewees asked about (C-9, O-6).
  test("R2/P1: sent instructions are the trimmed input or undefined", () => {
    fc.assert(
      fc.property(blank, (input) => {
        expect(compactInstructions(input)).toBeUndefined()
      }),
    )
    fc.assert(
      fc.property(blank, core, blank, (before, text, after) => {
        expect(compactInstructions(before + text + after)).toBe(text)
      }),
    )
    // Any string at all: the result is undefined or a non-blank string with no
    // outer whitespace, and normalizing it again changes nothing.
    fc.assert(
      fc.property(fc.oneof(fc.string({ unit: "grapheme" }), blank), (input) => {
        const sent = compactInstructions(input)
        if (sent === undefined) return expect(input).toMatch(/^\s*$/)
        expect(sent).not.toMatch(/^\s|\s$/)
        expect(compactInstructions(sent)).toBe(sent)
      }),
    )
  })

  // R8: Enter in the instructions box adds a newline; only the Compact button
  // submits, and newlines are sent unchanged.
  // Kind: invariant
  // Generators: multi-line instructions (S-6) with 2+ lines, "\n" or "\r\n"
  // separators, blank and indented interior lines, and blank outer padding.
  // First/last lines have non-whitespace ends so only the outer padding may be
  // removed; everything between them must be byte-for-byte unchanged.
  test("R8/P6: interior newlines are preserved in order", () => {
    fc.assert(
      fc.property(multiline, (input) => {
        const sent = compactInstructions(input.before + input.lines.join(input.newline) + input.after)
        expect(sent).toBe(input.lines.join(input.newline))
        expect(sent?.split(input.newline)).toEqual(input.lines)
      }),
    )
  })
})
