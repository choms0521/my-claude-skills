// Large tool_result truncation. Keeps the head and tail so the judge can still
// see "what was run" and "how it ended" while dropping the bulky middle.
//
// Truncation runs AFTER masking, so the preserved head/tail are already clean.
// The truncated byte count feeds the §4.2 shrink threshold (post-truncation
// size, not the original size).

const DEFAULT_LIMIT = 2048;
const DEFAULT_KEEP = 1024;

export function truncateText(text, limit = DEFAULT_LIMIT, keep = DEFAULT_KEEP) {
  if (typeof text !== 'string') {
    return text;
  }
  if (text.length <= limit) {
    return text;
  }

  // Clamp keep so head+tail never exceed the limit and never overlap. A keep
  // larger than limit/2 (or half the text) would expand the output beyond the
  // original and report a misleading "0 bytes truncated".
  const safeKeep = Math.min(Math.max(keep, 0), Math.floor(limit / 2), Math.floor(text.length / 2));
  const head = text.slice(0, safeKeep);
  const tail = text.slice(text.length - safeKeep);
  const removed = text.slice(safeKeep, text.length - safeKeep);
  const removedBytes = Buffer.byteLength(removed, 'utf8');

  return `${head}\n... (${removedBytes} bytes truncated)\n${tail}`;
}

// Walk a normalized message's content blocks and truncate tool_result text.
// Returns a new message (no mutation).
export function truncateToolResults(message, limit = DEFAULT_LIMIT) {
  if (!message || !Array.isArray(message.blocks)) {
    return message;
  }

  const blocks = message.blocks.map((block) => {
    if (block && block.kind === 'tool_result' && typeof block.text === 'string') {
      return { ...block, text: truncateText(block.text, limit) };
    }
    return block;
  });

  return { ...message, blocks };
}
