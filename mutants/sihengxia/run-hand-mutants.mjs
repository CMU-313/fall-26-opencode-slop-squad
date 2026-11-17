import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

// Run from anywhere with Node 24. Only the two named production files are
// temporarily changed, and their exact original bytes are restored in finally.
const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, "../..")
const phase = process.argv[2] ?? "baseline"
if (!["generate", "baseline", "strengthened"].includes(phase)) throw new Error("Unknown phase")
const test = "packages/opencode/test/session/sihengxia-compaction.property.test.ts"
const sources = {
  tui: "packages/tui/src/util/compaction.ts",
  core: "packages/core/src/session/compaction.ts",
}
const mutants = [
  { id: "H1", file: sources.tui, before: "instructions.trim() || undefined", after: "instructions || undefined" },
  { id: "H2", file: sources.core, before: "return instructionTag(values, attempt + 1)", after: "return tag" },
  { id: "H3", file: sources.core, before: "## Next Move", after: "## Next Steps" },
  { id: "H4", file: sources.tui, before: "      running = false", after: "      running = true" },
  { id: "H5", file: sources.tui, before: "return !result.error", after: "return true" },
]
const invoke = (command, args) =>
  spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 120000, maxBuffer: 12 * 1024 * 1024 })
const clean = invoke("git", ["diff", "--exit-code", "--", ...Object.values(sources)])
if (clean.status !== 0) throw new Error("Refusing to run with pre-existing production-source edits")
const saved = Object.fromEntries(Object.values(sources).map((file) => [file, fs.readFileSync(path.join(root, file))]))
const testOriginal = fs.readFileSync(path.join(root, test))
const results = []
try {
  if (phase === "baseline")
    fs.writeFileSync(path.join(root, test), fs.readFileSync(path.join(directory, "p4-baseline.property.ts.txt")))
  for (const mutant of mutants) {
    const file = path.join(root, mutant.file)
    try {
      if (phase === "generate") {
        const original = saved[mutant.file].toString("utf8")
        if (original.split(mutant.before).length !== 2) throw new Error(`Mutation anchor is not unique: ${mutant.id}`)
        fs.writeFileSync(file, original.replace(mutant.before, mutant.after))
        const diff = invoke("git", ["diff", "--no-ext-diff", "--", mutant.file])
        if (diff.status !== 0 || !diff.stdout.startsWith("diff --git")) throw new Error(`Cannot generate ${mutant.id}`)
        fs.writeFileSync(path.join(directory, `${mutant.id}.patch`), diff.stdout.replaceAll("\r\n", "\n"))
        console.log(`Generated ${mutant.id}`)
        continue
      }
      const patch = `mutants/sihengxia/${mutant.id}.patch`
      const check = invoke("git", ["apply", "--check", patch])
      if (check.status !== 0) throw new Error(`${mutant.id} does not apply: ${check.stderr}`)
      const apply = invoke("git", ["apply", patch])
      if (apply.status !== 0) throw new Error(`Cannot apply ${mutant.id}: ${apply.stderr}`)
      const run = invoke("bun", [
        "--cwd",
        "packages/opencode",
        "test",
        "--timeout",
        "30000",
        "test/session/sihengxia-compaction.property.test.ts",
        "--only-failures",
      ])
      const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "")
      const status =
        run.status === 0 ? "Survived" : output.includes("Property failed after") ? "Killed" : "Infrastructure failure"
      const killedBy = [...output.matchAll(/\(fail\) (sihengxia[^\r\n]*)/g)].map((entry) => entry[1])
      const log = `${phase}-${mutant.id}.txt`
      fs.writeFileSync(path.join(directory, log), output)
      results.push({ id: mutant.id, phase, status, exitCode: run.status, killedBy, log })
      console.log(`${phase} ${mutant.id}: ${status}`)
      if (status === "Infrastructure failure") throw new Error(`Inspect ${log}; not counted as a killed mutant`)
    } finally {
      fs.writeFileSync(file, saved[mutant.file])
    }
  }
} finally {
  for (const [file, content] of Object.entries(saved)) fs.writeFileSync(path.join(root, file), content)
  fs.writeFileSync(path.join(root, test), testOriginal)
  if (phase !== "generate")
    fs.writeFileSync(path.join(directory, `hand-results-${phase}.json`), JSON.stringify(results, null, 2) + "\n")
}
