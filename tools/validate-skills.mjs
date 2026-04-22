#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  GENERATED_DIR,
  SHARED_SKILLS_DIR,
  fileExists,
  readUtf8,
  renderSkillOutput,
  resolveSkillSelection,
} from './skill-lib.mjs';

async function main() {
  const requestedSkills = process.argv.slice(2);
  const skillDirs = await resolveSkillSelection(requestedSkills, SHARED_SKILLS_DIR);

  const errors = [];
  const rows = [];

  for (const skillName of skillDirs) {
    const skillDir = path.join(SHARED_SKILLS_DIR, skillName);
    const manifestPath = path.join(skillDir, 'skill.json');
    const commonPath = path.join(skillDir, 'common.md');
    const claudeAdapterPath = path.join(skillDir, 'adapters', 'claude.md');
    const codexAdapterPath = path.join(skillDir, 'adapters', 'codex.md');

    for (const requiredPath of [manifestPath, commonPath, claudeAdapterPath, codexAdapterPath]) {
      if (!await fileExists(requiredPath)) {
        errors.push(`Missing required file: ${path.relative(process.cwd(), requiredPath)}`);
      }
    }

    if (!await fileExists(manifestPath)) {
      continue;
    }

    const manifest = JSON.parse(await readUtf8(manifestPath));
    if (manifest.name !== skillName) {
      errors.push(`Manifest name mismatch for ${skillName}: expected "${skillName}", got "${manifest.name}"`);
    }

    for (const runtime of ['claude', 'codex']) {
      const outputPath = path.join(GENERATED_DIR, runtime, 'skills', skillName, 'SKILL.md');
      if (!await fileExists(outputPath)) {
        errors.push(`Missing generated ${runtime} file: ${path.relative(process.cwd(), outputPath)}`);
        continue;
      }

      const expected = await renderSkillOutput(skillName, runtime, SHARED_SKILLS_DIR);
      const actualContent = await readUtf8(outputPath);
      if (actualContent !== expected.content) {
        errors.push(`Outdated generated ${runtime} file: ${path.relative(process.cwd(), outputPath)}`);
      }

      for (const assetName of expected.assets) {
        const sourceAssetPath = path.join(expected.skillDir, assetName);
        const outputAssetPath = path.join(GENERATED_DIR, runtime, 'skills', skillName, assetName);
        if (!await fileExists(sourceAssetPath)) {
          errors.push(`Missing source asset for ${skillName}: ${path.relative(process.cwd(), sourceAssetPath)}`);
          continue;
        }
        if (!await fileExists(outputAssetPath)) {
          errors.push(`Missing generated ${runtime} asset for ${skillName}: ${path.relative(process.cwd(), outputAssetPath)}`);
          continue;
        }

        const assetDiffs = await compareAssetTrees(sourceAssetPath, outputAssetPath);
        for (const relativePath of assetDiffs.missingFromOutput) {
          errors.push(
            `Missing generated ${runtime} asset entry for ${skillName}: ${path.relative(process.cwd(), path.join(outputAssetPath, relativePath))}`
          );
        }
        for (const relativePath of assetDiffs.extraInOutput) {
          errors.push(
            `Unexpected generated ${runtime} asset entry for ${skillName}: ${path.relative(process.cwd(), path.join(outputAssetPath, relativePath))}`
          );
        }
        for (const relativePath of assetDiffs.contentMismatch) {
          errors.push(
            `Outdated generated ${runtime} asset for ${skillName}: ${path.relative(process.cwd(), path.join(outputAssetPath, relativePath))}`
          );
        }
      }
    }

    rows.push({
      skillName,
      claude: manifest.runtimeSupport?.claude ?? 'unknown',
      codex: manifest.runtimeSupport?.codex ?? 'unknown',
    });
  }

  for (const row of rows) {
    console.log(`${row.skillName}\tclaude=${row.claude}\tcodex=${row.codex}`);
  }

  if (errors.length > 0) {
    console.error('\nValidation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`\nValidation passed for ${rows.length} skill(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function compareAssetTrees(sourcePath, outputPath) {
  const sourceEntries = await listTreeEntries(sourcePath);
  const outputEntries = await listTreeEntries(outputPath);
  const sourceSet = new Set(sourceEntries);
  const outputSet = new Set(outputEntries);

  const missingFromOutput = sourceEntries.filter((relativePath) => !outputSet.has(relativePath));
  const extraInOutput = outputEntries.filter((relativePath) => !sourceSet.has(relativePath));
  const contentMismatch = [];

  for (const relativePath of sourceEntries) {
    if (!outputSet.has(relativePath)) {
      continue;
    }

    const sourceFile = path.join(sourcePath, relativePath);
    const outputFile = path.join(outputPath, relativePath);
    const [sourceContent, outputContent] = await Promise.all([
      fs.readFile(sourceFile),
      fs.readFile(outputFile),
    ]);

    if (!sourceContent.equals(outputContent)) {
      contentMismatch.push(relativePath);
    }
  }

  return {
    missingFromOutput,
    extraInOutput,
    contentMismatch,
  };
}

async function listTreeEntries(rootPath, relativePath = '') {
  const targetPath = relativePath ? path.join(rootPath, relativePath) : rootPath;
  const stats = await fs.stat(targetPath);

  if (!stats.isDirectory()) {
    return [relativePath];
  }

  const dirEntries = await fs.readdir(targetPath, { withFileTypes: true });
  const visibleEntries = dirEntries
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const nestedEntries = [];
  for (const entry of visibleEntries) {
    const childRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;
    const childEntries = await listTreeEntries(rootPath, childRelativePath);
    nestedEntries.push(...childEntries);
  }

  return nestedEntries;
}
