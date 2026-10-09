
export type CompactionMarkerPart = {
  type: string
  instructions?: string
}

/**
 * Finds the compaction part associated with a message.
 * Returns undefined when the message has no compaction marker.
 */
export function findCompactionMarker<T extends CompactionMarkerPart>(
  parts: readonly T[],
): T | undefined {
  return parts.find((part) => part.type === "compaction")
}

/**
 * Returns the optional instructions displayed beneath the marker.
 */
export function compactionMarkerInstructions(
  part: CompactionMarkerPart | undefined,
): string | undefined {
  return part?.instructions || undefined
}
