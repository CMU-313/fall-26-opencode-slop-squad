import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, "../../..")
const source = "packages/core/src/session/compaction.ts"
const target = path.join(root, source)
const temporary = path.join(root, "packages/opencode/test/session/sihengxia-agent-evaluation.property.test.ts")
if (fs.existsSync(temporary)) throw new Error("Refusing to overwrite an existing test")
const original = fs.readFileSync(target)
const before = "value.includes(`<${tag}>`) || value.includes(`</${tag}>`)"
const after = "value.includes(`<${tag}>`) && value.includes(`</${tag}>`)"
if (original.toString().split(before).length !== 2) throw new Error("Mutation anchor is not unique")
const run = (file, log) => {
  const result = spawnSync(
    "bun",
    ["--cwd", "packages/opencode", "test", "--timeout", "30000", file, "--only-failures"],
    { cwd: root, encoding: "utf8", timeout: 120000, maxBuffer: 12 * 1024 * 1024 },
  )
  fs.writeFileSync(path.join(directory, log), `${result.stdout ?? ""}\n${result.stderr ?? ""}`)
  return result.status
}
const results = {}
try {
  fs.copyFileSync(path.join(directory, "initial.property.ts.txt"), temporary)
  results.originalWithAgentProperty = run(
    "test/session/sihengxia-agent-evaluation.property.test.ts",
    "agent-original.txt",
  )
  if (results.originalWithAgentProperty !== 0) throw new Error("Generated property does not pass the original program")
  fs.writeFileSync(target, original.toString().replace(before, after))
  const diff = spawnSync("git", ["diff", "--no-ext-diff", "--", source], { cwd: root, encoding: "utf8" })
  if (diff.status !== 0) throw new Error("Cannot generate A1 patch")
  fs.writeFileSync(path.join(directory, "A1.patch"), diff.stdout.replaceAll("\r\n", "\n"))
  results.mutantWithAgentProperty = run("test/session/sihengxia-agent-evaluation.property.test.ts", "agent-A1.txt")
  results.mutantWithStrengthenedProperties = run(
    "test/session/sihengxia-compaction.property.test.ts",
    "strengthened-A1.txt",
  )
  console.log(results)
  if (results.mutantWithAgentProperty !== 0) throw new Error("A1 did not survive the generated property")
  if (results.mutantWithStrengthenedProperties === 0) throw new Error("Strengthened properties did not kill A1")
} finally {
  fs.writeFileSync(target, original)
  fs.rmSync(temporary, { force: true })
  fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify(results, null, 2) + "\n")
}
