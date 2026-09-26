import { Button } from "@opencode-ai/ui/button"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { TextField } from "@opencode-ai/ui/text-field"
import { createSignal } from "solid-js"
import { useLanguage } from "@/context/language"

export function DialogCompact(props: { onSubmit: (instructions: string | undefined) => void }) {
  const dialog = useDialog()
  const language = useLanguage()
  const [instructions, setInstructions] = createSignal("")

  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    dialog.close()
    // Blank input compacts exactly as before instructions existed.
    props.onSubmit(instructions().trim() || undefined)
  }

  return (
    <Dialog title={language.t("dialog.compact.title")} class="w-full max-w-[480px] mx-auto">
      <form data-component="dialog-compact" onSubmit={submit} class="flex flex-col gap-6 p-6 pt-0">
        <TextField
          autofocus
          multiline
          label={language.t("dialog.compact.instructions")}
          placeholder={language.t("dialog.compact.instructions.placeholder")}
          value={instructions()}
          onChange={setInstructions}
          data-input="compact-instructions"
          class="max-h-40 w-full overflow-y-auto"
        />

        <div class="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="large"
            data-action="compact-cancel"
            onClick={() => dialog.close()}
          >
            {language.t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary" size="large" data-action="compact-submit">
            {language.t("dialog.compact.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
