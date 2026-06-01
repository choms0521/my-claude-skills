#!/usr/bin/env node
//
// history.mjs — persist each diagnosis and compare against the previous run.
//
// CLI:
//   node history.mjs save --input <diagnosis.json> [--home <path>] [--stamp <ISO>]
//   node history.mjs diff --input <diagnosis.json> [--home <path>]
//
// Storage: <home>/.claude/.conduct-coach/history/<ISO>.json
// `diff` loads the most recent saved diagnosis as the baseline and reports
// improved / worsened / new / resolved per dimension+item grade.

import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1 };

function parseArgs(argv) {
  const args = { command: argv[0], home: os.homedir(), input: null, stamp: null };
  for (let i = 1; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--home') {
      args.home = value;
      i += 1;
    } else if (key === '--input') {
      args.input = value;
      i += 1;
    } else if (key === '--stamp') {
      args.stamp = value;
      i += 1;
    }
  }
  return args;
}

function historyDir(home) {
  return path.join(home, '.claude', '.conduct-coach', 'history');
}

function safeStamp(iso) {
  return iso.replace(/[:.]/g, '-');
}

export async function saveHistory(diagnosis, home, stamp = new Date().toISOString()) {
  const dir = historyDir(home);
  await fs.mkdir(dir, { recursive: true });

  let filePath = path.join(dir, `${safeStamp(stamp)}.json`);
  let suffix = 1;
  // Guarantee a distinct file even if two saves land on the same stamp.
  while (await exists(filePath)) {
    filePath = path.join(dir, `${safeStamp(stamp)}-${suffix}.json`);
    suffix += 1;
  }

  await fs.writeFile(filePath, `${JSON.stringify(diagnosis, null, 2)}\n`, 'utf8');
  return filePath;
}

export async function loadLatest(home) {
  const dir = historyDir(home);
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  const jsonFiles = entries.filter((name) => name.endsWith('.json')).sort();
  if (jsonFiles.length === 0) {
    return null;
  }
  const latest = jsonFiles[jsonFiles.length - 1];
  try {
    return JSON.parse(await fs.readFile(path.join(dir, latest), 'utf8'));
  } catch {
    return null;
  }
}

// Flatten a diagnosis into a map of "dimension" + "dimension/signal" -> grade.
function gradeMap(diagnosis) {
  const map = {};
  const dimensions = diagnosis?.dimensions ?? {};
  for (const [dimName, dim] of Object.entries(dimensions)) {
    if (dim?.grade) {
      map[dimName] = dim.grade;
    }
    for (const item of dim?.items ?? []) {
      if (item?.signal && item?.grade) {
        map[`${dimName}/${item.signal}`] = item.grade;
      }
    }
  }
  return map;
}

export function diffDiagnoses(prev, curr) {
  const result = { improved: [], worsened: [], new: [], resolved: [] };
  const prevMap = gradeMap(prev ?? {});
  const currMap = gradeMap(curr ?? {});

  for (const [key, grade] of Object.entries(currMap)) {
    if (!(key in prevMap)) {
      result.new.push({ key, grade });
      continue;
    }
    const before = GRADE_RANK[prevMap[key]] ?? 0;
    const after = GRADE_RANK[grade] ?? 0;
    if (after > before) {
      result.improved.push({ key, from: prevMap[key], to: grade });
    } else if (after < before) {
      result.worsened.push({ key, from: prevMap[key], to: grade });
    }
  }

  for (const key of Object.keys(prevMap)) {
    if (!(key in currMap)) {
      result.resolved.push({ key, grade: prevMap[key] });
    }
  }

  return result;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    throw new Error('Missing --input <diagnosis.json>');
  }
  const diagnosis = await readJson(args.input);

  if (args.command === 'save') {
    const filePath = await saveHistory(diagnosis, args.home, args.stamp ?? new Date().toISOString());
    process.stdout.write(`${JSON.stringify({ saved: filePath })}\n`);
    return;
  }

  if (args.command === 'diff') {
    const prev = await loadLatest(args.home);
    const diff = diffDiagnoses(prev, diagnosis);
    process.stdout.write(`${JSON.stringify(diff)}\n`);
    return;
  }

  throw new Error(`Unknown command: ${args.command}. Use "save" or "diff".`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
