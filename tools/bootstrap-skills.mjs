#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  CLAUDE_SKILLS_DIR,
  SHARED_SKILLS_DIR,
  buildClaudeAdapter,
  buildCodexAdapter,
  copyPath,
  detectCodexSupport,
  ensureDir,
  fileExists,
  listVisibleAssetEntries,
  parseSkillMarkdown,
  readUtf8,
  writeJson,
  writeUtf8,
} from './skill-lib.mjs';

const force = process.argv.includes('--force');

async function main() {
  const dirEntries = await fs.readdir(CLAUDE_SKILLS_DIR, { withFileTypes: true });
  const skillDirs = dirEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const skillName of skillDirs) {
    await bootstrapSkill(skillName);
  }

  console.log(`Bootstrapped ${skillDirs.length} skills into ${path.relative(process.cwd(), SHARED_SKILLS_DIR)}`);
}

async function bootstrapSkill(skillName) {
  const sourceFile = path.join(CLAUDE_SKILLS_DIR, skillName, 'SKILL.md');
  const sourceDir = path.join(CLAUDE_SKILLS_DIR, skillName);
  const sourceMarkdown = await readUtf8(sourceFile);
  const { frontmatter, body } = parseSkillMarkdown(sourceMarkdown);
  const codexSupport = detectCodexSupport(body);
  const assets = await listVisibleAssetEntries(sourceDir);

  const skillDir = path.join(SHARED_SKILLS_DIR, skillName);
  const adaptersDir = path.join(skillDir, 'adapters');

  await ensureDir(adaptersDir);

  const manifestPath = path.join(skillDir, 'skill.json');
  const commonPath = path.join(skillDir, 'common.md');
  const claudeAdapterPath = path.join(adaptersDir, 'claude.md');
  const codexAdapterPath = path.join(adaptersDir, 'codex.md');

  const manifest = {
    name: frontmatter.name,
    description: frontmatter.description,
    triggers: frontmatter.triggers ?? [],
    argumentHint: frontmatter['argument-hint'] ?? '',
    source: {
      claude: path.relative(process.cwd(), sourceFile),
    },
    assets,
    runtimeSupport: {
      claude: 'full',
      codex: codexSupport.level,
    },
    codexFindings: codexSupport.findings,
  };

  await maybeWriteJson(manifestPath, manifest);
  await maybeWriteUtf8(commonPath, body.endsWith('\n') ? body : `${body}\n`);
  await maybeWriteUtf8(claudeAdapterPath, `${buildClaudeAdapter(skillName)}\n`);
  await maybeWriteUtf8(codexAdapterPath, `${buildCodexAdapter(skillName, codexSupport)}\n`);

  for (const assetName of assets) {
    await maybeCopyPath(path.join(sourceDir, assetName), path.join(skillDir, assetName));
  }
}

async function maybeWriteJson(filePath, value) {
  if (!force && await fileExists(filePath)) {
    return;
  }
  await writeJson(filePath, value);
}

async function maybeWriteUtf8(filePath, content) {
  if (!force && await fileExists(filePath)) {
    return;
  }
  await writeUtf8(filePath, content);
}

async function maybeCopyPath(sourcePath, targetPath) {
  if (!force && await fileExists(targetPath)) {
    return;
  }
  await copyPath(sourcePath, targetPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
