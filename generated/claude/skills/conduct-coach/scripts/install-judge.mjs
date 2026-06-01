#!/usr/bin/env node
//
// install-judge.mjs — idempotently install the conduct-judge subagent into the
// user-level agents directory. A skill bundle cannot ship a discoverable
// subagent, so the bundled original is copied to ~/.claude/agents on first run.
//
// CLI:
//   node install-judge.mjs [--home <path>]
//
// Idempotence is tracked with a managed version marker appended to the installed
// copy. Re-running with the same source content does nothing (no rewrite). A
// file WITHOUT our marker is treated as user-authored and preserved untouched.

import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_AGENT = path.join(SCRIPT_DIR, '..', 'agents', 'conduct-judge.md');
const MARKER_RE = /<!--\s*conduct-coach:judge-version:\s*([a-f0-9]+)\s*-->/;

function parseArgs(argv) {
  const args = { home: os.homedir() };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--home') {
      args.home = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function hashContent(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

function buildInstalledContent(sourceText, hash) {
  return `${sourceText.trimEnd()}\n\n<!-- conduct-coach:judge-version: ${hash} -->\n`;
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export async function installJudge({ home }) {
  const sourceText = await fs.readFile(SOURCE_AGENT, 'utf8');
  const hash = hashContent(sourceText);
  const targetDir = path.join(home, '.claude', 'agents');
  const targetPath = path.join(targetDir, 'conduct-judge.md');

  const existing = await readIfExists(targetPath);

  if (existing === null) {
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(targetPath, buildInstalledContent(sourceText, hash), 'utf8');
    return { path: targetPath, action: 'created', hash };
  }

  const markerMatch = existing.match(MARKER_RE);
  if (!markerMatch) {
    // No managed marker: assume the user authored this file. Preserve it.
    return { path: targetPath, action: 'skipped-user-authored', hash };
  }

  if (markerMatch[1] === hash) {
    return { path: targetPath, action: 'unchanged', hash };
  }

  await fs.writeFile(targetPath, buildInstalledContent(sourceText, hash), 'utf8');
  return { path: targetPath, action: 'updated', hash };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await installJudge(args);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
