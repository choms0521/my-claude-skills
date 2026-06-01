#!/usr/bin/env node
//
// collect.mjs — gather recent Claude Code session messages, mask secrets,
// truncate large tool_results, and auto-shrink the window if it is too large.
//
// CLI:
//   node collect.mjs [--days 7] [--scope global|current] [--cwd <path>]
//                    [--home <path>] [--max-chars 250000] [--max-messages 600]
// stdout: JSON { meta:{scope,windowDays,chars,count,shrunk}, messages:[...] }
//
// All output text is already masked + truncated before it leaves this script,
// so nothing downstream (the judge subagent) ever sees a raw secret.

import os from 'node:os';
import { promises as fs } from 'node:fs';
import {
  extractMessages,
  filterFilesByMtime,
  listSessionFiles,
  parseJsonl,
} from './lib/filter.mjs';
import { maskSecrets } from './lib/mask.mjs';
import { truncateToolResults } from './lib/truncate.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_CHARS = 250_000;
const DEFAULT_MAX_MESSAGES = 600;

export function parseArgs(argv) {
  const args = {
    days: 7,
    scope: 'global',
    cwd: process.cwd(),
    home: os.homedir(),
    maxChars: DEFAULT_MAX_CHARS,
    maxMessages: DEFAULT_MAX_MESSAGES,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    switch (key) {
      case '--days':
        args.days = Number(value) === 3 ? 3 : 7;
        i += 1;
        break;
      case '--scope':
        args.scope = value === 'current' ? 'current' : 'global';
        i += 1;
        break;
      case '--cwd':
        args.cwd = value;
        i += 1;
        break;
      case '--home':
        args.home = value;
        i += 1;
        break;
      case '--max-chars':
        args.maxChars = Number(value) || DEFAULT_MAX_CHARS;
        i += 1;
        break;
      case '--max-messages':
        args.maxMessages = Number(value) || DEFAULT_MAX_MESSAGES;
        i += 1;
        break;
      default:
        break;
    }
  }
  return args;
}

function renderBlocks(blocks) {
  return blocks
    .map((block) => {
      if (block.kind === 'tool_use') {
        return `[tool_use:${block.name}] ${block.text}`.trim();
      }
      if (block.kind === 'tool_result') {
        return `[tool_result] ${block.text}`.trim();
      }
      return block.text;
    })
    .filter((part) => part && part.length > 0)
    .join('\n');
}

// mask every block, then truncate tool_results (mask-before-truncate), then
// render to a single flat string. Returns { session, ts, tsMs, role, text }.
function refineMessage(message) {
  const maskedBlocks = message.blocks.map((block) => ({
    ...block,
    text: maskSecrets(block.text),
  }));
  const truncated = truncateToolResults({ ...message, blocks: maskedBlocks });
  return {
    session: message.session,
    ts: message.ts,
    tsMs: Date.parse(message.ts ?? ''),
    role: message.role,
    text: renderBlocks(truncated.blocks),
  };
}

export function measure(messages) {
  const chars = messages.reduce((sum, msg) => sum + (msg.text?.length ?? 0), 0);
  return { chars, count: messages.length };
}

export function shouldShrink({ chars, count }, maxChars, maxMessages) {
  return chars > maxChars || count > maxMessages;
}

// Hard cap applied AFTER the 7->3 day shrink. A heavy user can still exceed the
// threshold within 3 days, so keep the most recent messages that fit under both
// maxChars and maxMessages. Messages are assumed sorted oldest -> newest.
export function capRecent(messages, maxChars, maxMessages) {
  const kept = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const len = messages[i].text?.length ?? 0;
    if (kept.length > 0 && (total + len > maxChars || kept.length >= maxMessages)) {
      break;
    }
    kept.push(messages[i]);
    total += len;
  }
  kept.reverse();
  return kept;
}

// Read + refine every message inside the widest (7-day) mtime window once.
async function gatherRefinedMessages({ scope, cwd, home }, sinceTsMs, nowMs) {
  const files = await listSessionFiles(scope, cwd, home);
  const recentFiles = filterFilesByMtime(files, 7, nowMs);

  const refined = [];
  for (const file of recentFiles) {
    let text;
    try {
      text = await fs.readFile(file.path, 'utf8');
    } catch {
      continue;
    }
    const objs = parseJsonl(text);
    const messages = extractMessages(objs, sinceTsMs);
    for (const message of messages) {
      refined.push(refineMessage(message));
    }
  }

  refined.sort((a, b) => (a.tsMs || 0) - (b.tsMs || 0));
  return refined;
}

export async function collect(rawArgs, nowMs = Date.now()) {
  const args = { ...rawArgs };
  const since7 = nowMs - 7 * DAY_MS;
  const since3 = nowMs - 3 * DAY_MS;

  // Always gather the widest requested window first.
  const widest = await gatherRefinedMessages(args, args.days === 3 ? since3 : since7, nowMs);

  let windowDays = args.days;
  let messages = widest;
  let shrunk = false;

  if (args.days === 7) {
    const measured = measure(widest);
    if (shouldShrink(measured, args.maxChars, args.maxMessages)) {
      windowDays = 3;
      shrunk = true;
      messages = widest.filter((msg) => Number.isFinite(msg.tsMs) && msg.tsMs >= since3);
    }
  }

  // Hard cap: even after shrinking to 3 days a heavy user can blow past the
  // threshold. Keep the most recent messages that fit so the judge gets a
  // bounded, representative window instead of a multi-hundred-K-token dump.
  let capped = false;
  if (shouldShrink(measure(messages), args.maxChars, args.maxMessages)) {
    messages = capRecent(messages, args.maxChars, args.maxMessages);
    capped = true;
  }

  const { chars, count } = measure(messages);
  const outMessages = messages.map(({ session, ts, role, text }) => ({ session, ts, role, text }));

  return {
    meta: { scope: args.scope, windowDays, chars, count, shrunk, capped },
    messages: outMessages,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await collect(args);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

// Run only when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
