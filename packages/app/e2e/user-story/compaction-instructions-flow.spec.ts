import { base64Encode } from "@opencode-ai/core/util/encode"
import { expect, test, type Page, type Request } from "@playwright/test"
import { mockOpenCodeServer } from "../utils/mock-server"
import { expectAppVisible, expectSessionTitle } from "../utils/waits"

const directory = "C:/OpenCode/CompactionInstructions"
const projectID = "proj_compaction_instructions_flow"
const sessionID = "ses_compaction_instructions_flow"
const title = "Compaction instructions flow"
const model = { providerID: "opencode", modelID: "claude-opus-4-6" }
const instructions = "Keep the API design decisions; drop the debugging detours"

type EventPayload = {
  directory: string
  payload: Record<string, unknown>
}

test("compacts a session with instructions and shows them on the compaction divider", async ({ page }) => {
  const events: EventPayload[] = []
  const messages: unknown[] = [
    {
      info: {
        id: "msg_0001_user",
        sessionID,
        role: "user",
        time: { created: 1_700_000_000_000 },
        agent: "build",
        model,
      },
      parts: [{ id: "prt_0001_text", sessionID, messageID: "msg_0001_user", type: "text", text: "Design the API." }],
    },
    {
      info: {
        id: "msg_0002_assistant",
        sessionID,
        role: "assistant",
        time: { created: 1_700_000_001_000, completed: 1_700_000_002_000 },
        parentID: "msg_0001_user",
        modelID: model.modelID,
        providerID: model.providerID,
        mode: "build",
        agent: "build",
        path: { cwd: directory, root: directory },
        cost: 0,
        tokens: { input: 10, output: 20, reasoning: 0, cache: { read: 0, write: 0 } },
      },
      parts: [
        { id: "prt_0002_text", sessionID, messageID: "msg_0002_assistant", type: "text", text: "Here is the API." },
      ],
    },
  ]
  const summarizeRequests: Request[] = []
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes(`/session/${sessionID}/summarize`))
      summarizeRequests.push(request)
  })

  await mockOpenCodeServer(page, {
    directory,
    project: {
      id: projectID,
      worktree: directory,
      vcs: "git",
      name: "compaction-instructions",
      time: { created: 1_700_000_000_000, updated: 1_700_000_000_000 },
      sandboxes: [],
    },
    provider: {
      all: [
        {
          id: "opencode",
          name: "OpenCode",
          models: {
            "claude-opus-4-6": { id: "claude-opus-4-6", name: "Claude Opus 4.6", limit: { context: 200_000 } },
          },
        },
      ],
      connected: ["opencode"],
      default: model,
    },
    sessions: [
      {
        id: sessionID,
        slug: "compaction-instructions-flow",
        projectID,
        directory,
        title,
        version: "dev",
        time: { created: 1_700_000_000_000, updated: 1_700_000_000_000 },
      },
    ],
    pageMessages: () => ({ items: messages }),
    events: () => events.splice(0, 1),
    eventRetry: 16,
  })
  await page.addInitScript(() => {
    localStorage.setItem("settings.v3", JSON.stringify({ general: { newLayoutDesigns: true } }))
  })

  await page.goto(`/${base64Encode(directory)}/session/${sessionID}`)
  await expectSessionTitle(page, title)
  const dialog = page.locator('[data-component="dialog-compact"]')

  await openCompactDialog(page)
  await page.locator('[data-action="compact-cancel"]').click()
  await expect(dialog).toHaveCount(0)
  expect(summarizeRequests).toHaveLength(0)

  await openCompactDialog(page)
  await page.locator('[data-input="compact-instructions"]').fill(instructions)
  const summarize = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes(`/session/${sessionID}/summarize`),
  )
  await page.locator('[data-action="compact-submit"]').click()
  expect((await summarize).postDataJSON()).toEqual({ ...model, instructions })
  await expect(dialog).toHaveCount(0)

  // Stand in for the server: it records the compaction as a new user message carrying the instructions.
  const compaction = {
    info: {
      id: "msg_0003_compaction",
      sessionID,
      role: "user",
      time: { created: 1_700_000_003_000 },
      agent: "build",
      model,
    },
    parts: [
      {
        id: "prt_0003_compaction",
        sessionID,
        messageID: "msg_0003_compaction",
        type: "compaction",
        auto: false,
        instructions,
      },
    ],
  }
  messages.push(compaction)
  events.push(
    { directory, payload: { type: "message.updated", properties: { info: compaction.info } } },
    { directory, payload: { type: "message.part.updated", properties: { part: compaction.parts[0] } } },
  )
  await expect(page.locator('[data-slot="compaction-part-instructions"]')).toContainText(instructions, {
    timeout: 10_000,
  })

  await openCompactDialog(page)
  await page.locator('[data-input="compact-instructions"]').fill("   ")
  const whitespaceSummarize = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes(`/session/${sessionID}/summarize`),
  )
  await page.locator('[data-action="compact-submit"]').click()
  expect((await whitespaceSummarize).postDataJSON()).toEqual(model)
  await expect(dialog).toHaveCount(0)

  await openCompactDialog(page)
  const emptySummarize = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes(`/session/${sessionID}/summarize`),
  )
  await page.locator('[data-action="compact-submit"]').click()
  expect((await emptySummarize).postDataJSON()).toEqual(model)
  await expect(dialog).toHaveCount(0)

  // The server records the empty-input compaction without instructions: the divider renders with no instructions line.
  const plainCompaction = {
    info: {
      id: "msg_0004_compaction",
      sessionID,
      role: "user",
      time: { created: 1_700_000_004_000 },
      agent: "build",
      model,
    },
    parts: [
      {
        id: "prt_0004_compaction",
        sessionID,
        messageID: "msg_0004_compaction",
        type: "compaction",
        auto: false,
      },
    ],
  }
  messages.push(plainCompaction)
  events.push(
    { directory, payload: { type: "message.updated", properties: { info: plainCompaction.info } } },
    { directory, payload: { type: "message.part.updated", properties: { part: plainCompaction.parts[0] } } },
  )
  const dividers = page.locator('[data-component="compaction-part"]')
  await expect(dividers).toHaveCount(2, { timeout: 10_000 })
  await expect(dividers.last().locator('[data-slot="compaction-part-label"]')).toBeVisible()
  await expect(dividers.last().locator('[data-slot="compaction-part-instructions"]')).toHaveCount(0)
  await expect(dividers.first().locator('[data-slot="compaction-part-instructions"]')).toContainText(instructions)

  // A failing summarize request is surfaced as an error toast instead of being swallowed.
  await page.route(new RegExp(`/session/${sessionID}/summarize(\\?|$)`), (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ name: "UnknownError", data: { message: "summarize exploded" } }),
    }),
  )
  await openCompactDialog(page)
  await page.locator('[data-action="compact-submit"]').click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator(".toast-v2--error", { hasText: "Failed to compact session" })).toBeVisible()
})

async function openCompactDialog(page: Page) {
  const composer = page.locator('[data-component="prompt-input-v2"]')
  await expectAppVisible(composer)
  await composer.getByRole("button", { name: "Add images and files" }).click()
  await page.getByRole("menuitem", { name: "Commands" }).click()
  await page.locator('[data-suggestion-id="session.compact"]').click()
  await expectAppVisible(page.locator('[data-component="dialog-compact"]'))
}
