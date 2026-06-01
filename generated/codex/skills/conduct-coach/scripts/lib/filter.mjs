// Session file selection + JSONL parsing + message extraction.
//
// The pure functions here (encodeCwd, parseJsonl, extractMessages,
// filterFilesByMtime, withinDays) take plain data so they are trivially unit
// testable. The fs-touching listing (listSessionFiles) is kept separate and
// exercised against a sandbox HOME.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const DAY_MS = 24 * 60 * 60 * 1000;

// Claude Code encodes a project cwd into a folder name by replacing every
// non-alphanumeric character with a dash. Verified empirically:
//   "/Users/me/work/py-runner"            -> "-Users-me-work-py-runner"
//   ".../dist/Session Hub.app/Contents"   -> "...-dist-Session-Hub-app-Contents"
// Separators are NOT collapsed: "/.q" -> "--q".
export function encodeCwd(cwdPath) {
  return String(cwdPath).replace(/[^a-zA-Z0-9]/g, '-');
}

export function withinDays(timestampMs, days, nowMs) {
  if (!Number.isFinite(timestampMs)) {
    return false;
  }
  return nowMs - timestampMs <= days * DAY_MS;
}

// files: array of { path, mtimeMs }. Returns the subset modified within `days`.
export function filterFilesByMtime(files, days, nowMs) {
  return files.filter((file) => withinDays(file.mtimeMs, days, nowMs));
}

// Line-by-line JSON.parse. Malformed lines are skipped, not fatal.
export function parseJsonl(text) {
  const objects = [];
  for (const line of String(text).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      objects.push(JSON.parse(trimmed));
    } catch {
      // skip unparseable line
    }
  }
  return objects;
}

function normalizeContent(content) {
  if (typeof content === 'string') {
    return [{ kind: 'text', text: content }];
  }
  if (!Array.isArray(content)) {
    return [];
  }

  const blocks = [];
  for (const block of content) {
    const type = block?.type;
    if (type === 'text' && typeof block.text === 'string') {
      blocks.push({ kind: 'text', text: block.text });
    } else if (type === 'tool_use') {
      let input = '';
      try {
        input = block.input === undefined ? '' : JSON.stringify(block.input);
      } catch {
        input = '';
      }
      blocks.push({ kind: 'tool_use', name: block?.name ?? 'unknown', text: input });
    } else if (type === 'tool_result') {
      blocks.push({ kind: 'tool_result', text: stringifyToolResult(block?.content) });
    }
  }
  return blocks;
}

function stringifyToolResult(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n');
  }
  if (content === undefined || content === null) {
    return '';
  }
  try {
    return JSON.stringify(content);
  } catch {
    return '';
  }
}

// objs: parsed JSONL objects. sinceTsMs: lower bound (inclusive) in ms.
// Returns normalized messages: { session, ts, role, blocks }.
export function extractMessages(objs, sinceTsMs) {
  const messages = [];
  for (const obj of objs) {
    const type = obj?.type;
    if (type !== 'user' && type !== 'assistant') {
      continue;
    }
    const tsMs = Date.parse(obj?.timestamp ?? '');
    if (!Number.isFinite(tsMs) || tsMs < sinceTsMs) {
      continue;
    }
    const role = obj?.message?.role ?? type;
    const blocks = normalizeContent(obj?.message?.content);
    if (blocks.length === 0) {
      continue;
    }
    messages.push({
      session: obj?.sessionId ?? null,
      ts: obj?.timestamp ?? null,
      role,
      blocks,
    });
  }
  return messages;
}

// fs-touching: resolve the set of .jsonl session files to consider.
export async function listSessionFiles(scope, cwdPath, homeDir) {
  const projectsRoot = path.join(homeDir, '.claude', 'projects');
  let projectDirs;

  if (scope === 'current') {
    projectDirs = await resolveCurrentProjectDirs(projectsRoot, cwdPath);
  } else {
    projectDirs = await listAllProjectDirs(projectsRoot);
  }

  const files = [];
  for (const dir of projectDirs) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) {
        continue;
      }
      const filePath = path.join(dir, entry.name);
      try {
        const stat = await fs.stat(filePath);
        files.push({ path: filePath, mtimeMs: stat.mtimeMs });
      } catch {
        // ignore unreadable file
      }
    }
  }
  return files;
}

async function listAllProjectDirs(projectsRoot) {
  let entries;
  try {
    entries = await fs.readdir(projectsRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(projectsRoot, entry.name));
}

// For --scope current: prefer the encoded folder name, but fall back to
// scanning every project dir and matching the `cwd` field inside, so an
// encoding quirk never silently drops the current project.
async function resolveCurrentProjectDirs(projectsRoot, cwdPath) {
  const encoded = path.join(projectsRoot, encodeCwd(cwdPath));
  try {
    const stat = await fs.stat(encoded);
    if (stat.isDirectory()) {
      return [encoded];
    }
  } catch {
    // fall through to content-based match
  }

  const allDirs = await listAllProjectDirs(projectsRoot);
  const matched = [];
  for (const dir of allDirs) {
    if (await dirHasCwd(dir, cwdPath)) {
      matched.push(dir);
    }
  }
  return matched;
}

async function dirHasCwd(dir, cwdPath) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return false;
  }
  const jsonl = entries.find((name) => name.endsWith('.jsonl'));
  if (!jsonl) {
    return false;
  }
  try {
    const text = await fs.readFile(path.join(dir, jsonl), 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj?.cwd) {
          return obj.cwd === cwdPath;
        }
      } catch {
        // skip
      }
    }
  } catch {
    return false;
  }
  return false;
}
