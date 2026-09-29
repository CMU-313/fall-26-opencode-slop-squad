
export type CompactionModel = {
  modelID: string
  providerID: string
}

export type CompactionRequest = {
  sessionID: string
  modelID: string
  providerID: string
  instructions?: string
}

/**
 * Builds a compaction request using the user's instructions.
 *
 * Returns undefined if the user cancels the dialog.
 * Empty or whitespace-only instructions are optional.
 */
export function createCompactionRequest(
  sessionID: string,
  model: CompactionModel,
  instructions: string | null,
): CompactionRequest | undefined {
  if (instructions === null) return undefined

  return {
    sessionID,
    modelID: model.modelID,
    providerID: model.providerID,
    instructions: instructions.trim() || undefined,
  }
}
