#!/usr/bin/env node
//
// merge-rules.mjs — scan existing rules for topic overlap, then idempotently
// merge the composed discipline rules into agent-discipline.md.
//
// CLI:
//   node merge-rules.mjs scan  --home <path> [--cwd <path>]
//   node merge-rules.mjs merge --home <path> [--cwd <path>] --input <rules.json>
//
// rules.json: { "markdown": "<body between markers>", "topics": ["말투", ...] }
//
// The managed region is delimited by <!-- conduct-coach:start --> /
// <!-- conduct-coach:end -->. Only that region is replaced; anything outside the
// markers (manual edits) is preserved. Re-running with the same input is a no-op.

import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const START_MARKER = '<!-- conduct-coach:start -->';
const END_MARKER = '<!-- conduct-coach:end -->';
const TARGET_NAME = 'agent-discipline.md';

// Topic words that mean the same thing across existing rule files. Used so a
// new "말투" rule links to an existing communication-style.md instead of
// creating a duplicate.
const SYNONYM_GROUPS = [
  ['말투', '어투', '호칭', '존댓말', 'tone', 'communication', 'style', 'honorific', 'persona', '페르소나'],
  ['커밋', 'commit', 'git', 'pr', 'pull'],
  ['보안', 'security', 'secret', '비밀'],
  ['테스트', 'test', 'testing', 'tdd', '검증', 'verify', 'verification'],
  ['성능', 'performance', 'perf'],
  ['에이전트', 'agent', 'delegation', '위임', 'orchestration'],
  ['규율', 'discipline', 'scope', 'obedience', '명령', 'honesty', '정직'],
];

function parseArgs(argv) {
  const args = { command: argv[0], home: os.homedir(), cwd: process.cwd(), input: null };
  for (let i = 1; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--home') {
      args.home = value;
      i += 1;
    } else if (key === '--cwd') {
      args.cwd = value;
      i += 1;
    } else if (key === '--input') {
      args.input = value;
      i += 1;
    }
  }
  return args;
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .filter(Boolean);
}

function extractTopics(markdown, fileName) {
  const tokens = new Set();
  for (const token of tokenize(fileName.replace(/\.md$/, ''))) {
    tokens.add(token);
  }
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      for (const token of tokenize(heading[1])) {
        tokens.add(token);
      }
    }
  }
  return [...tokens];
}

function synonymKey(token) {
  for (let i = 0; i < SYNONYM_GROUPS.length; i += 1) {
    if (SYNONYM_GROUPS[i].includes(token)) {
      return `group:${i}`;
    }
  }
  return null;
}

function topicsRelated(a, b) {
  if (a === b) {
    return true;
  }
  const ka = synonymKey(a);
  const kb = synonymKey(b);
  return ka !== null && ka === kb;
}

async function readRuleDir(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const files = [];
  for (const name of entries) {
    if (!name.endsWith('.md') || name === TARGET_NAME) {
      continue;
    }
    const filePath = path.join(dir, name);
    try {
      const text = await fs.readFile(filePath, 'utf8');
      files.push({ path: filePath, topics: extractTopics(text, name) });
    } catch {
      // ignore unreadable file
    }
  }
  return files;
}

export async function scanExistingRules(home, cwd) {
  const userRules = await readRuleDir(path.join(home, '.claude', 'rules'));
  const projectRules = cwd ? await readRuleDir(path.join(cwd, '.claude', 'rules')) : [];
  return { files: [...userRules, ...projectRules] };
}

// newTopics: topics for the rules we are about to write.
// Returns duplicates (same subject already covered elsewhere). Conflicts are
// left for the orchestrator/user to confirm; we never auto-overwrite.
export function detectOverlap(newTopics, scan) {
  const duplicates = [];
  const seen = new Set();
  // Normalize to lowercase strings so overlap matches the already
  // tokenized/lowercased topics from existing rule files: a caller-supplied
  // "Tone"/"Communication" must still hit the synonym groups.
  const normalizedNewTopics = (newTopics ?? []).map((topic) => String(topic).toLowerCase());
  for (const file of scan.files) {
    for (const newTopic of normalizedNewTopics) {
      const hit = file.topics.find((existing) => topicsRelated(newTopic, existing));
      if (hit) {
        const dedupeKey = `${file.path}::${newTopic}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          duplicates.push({ topic: newTopic, existingFile: file.path, matchedTopic: hit });
        }
      }
    }
  }
  return { duplicates, conflicts: [] };
}

function buildBlock(markdown) {
  return `${START_MARKER}\n${markdown.trim()}\n${END_MARKER}\n`;
}

export async function mergeIntoDiscipline(home, markdown) {
  const dir = path.join(home, '.claude', 'rules');
  const targetPath = path.join(dir, TARGET_NAME);
  await fs.mkdir(dir, { recursive: true });

  let existing = '';
  try {
    existing = await fs.readFile(targetPath, 'utf8');
  } catch {
    existing = '';
  }

  const block = buildBlock(markdown);
  const region = new RegExp(`${escapeRegExp(START_MARKER)}[\\s\\S]*${escapeRegExp(END_MARKER)}\\n?`);

  let next;
  let action;
  if (region.test(existing)) {
    // Replace the managed region (collapses any accidental duplicates to one).
    next = existing.replace(region, block);
    action = 'replaced';
  } else if (existing.trim() === '') {
    next = `# Agent Discipline\n\n${block}`;
    action = 'created';
  } else {
    const separator = existing.endsWith('\n') ? '\n' : '\n\n';
    next = `${existing}${separator}${block}`;
    action = 'appended';
  }

  if (next === existing) {
    return { path: targetPath, action: 'unchanged' };
  }

  await fs.writeFile(targetPath, next, 'utf8');
  return { path: targetPath, action };
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'scan') {
    const scan = await scanExistingRules(args.home, args.cwd);
    process.stdout.write(`${JSON.stringify(scan)}\n`);
    return;
  }

  if (args.command === 'merge') {
    if (!args.input) {
      throw new Error('Missing --input <rules.json>');
    }
    const payload = JSON.parse(await fs.readFile(args.input, 'utf8'));
    const markdown = payload.markdown ?? '';
    const newTopics = payload.topics ?? [];
    const scan = await scanExistingRules(args.home, args.cwd);
    const overlap = detectOverlap(newTopics, scan);
    const result = await mergeIntoDiscipline(args.home, markdown);
    process.stdout.write(`${JSON.stringify({ ...result, overlap })}\n`);
    return;
  }

  throw new Error(`Unknown command: ${args.command}. Use "scan" or "merge".`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
