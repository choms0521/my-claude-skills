#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  GENERATED_DIR,
  copyPath,
  ensureDir,
  pathExists,
  renderSkillOutput,
  SHARED_SKILLS_DIR,
  resolveSkillSelection,
  writeUtf8,
} from './skill-lib.mjs';

async function main() {
  const requestedSkills = process.argv.slice(2);
  const skillDirs = await resolveSkillSelection(requestedSkills, SHARED_SKILLS_DIR);

  for (const skillName of skillDirs) {
    await buildSkill(skillName);
  }

  console.log(`Generated runtime skill files for ${skillDirs.length} skill(s): ${skillDirs.join(', ')}`);
}

async function buildSkill(skillName) {
  for (const runtime of ['claude', 'codex']) {
    const { assets, content, skillDir } = await renderSkillOutput(skillName, runtime, SHARED_SKILLS_DIR);
    const outputDir = path.join(GENERATED_DIR, runtime, 'skills', skillName);
    await ensureDir(outputDir);
    await writeUtf8(path.join(outputDir, 'SKILL.md'), content);

    for (const assetName of assets) {
      const sourcePath = path.join(skillDir, assetName);
      const targetPath = path.join(outputDir, assetName);
      if (!await pathExists(sourcePath)) {
        throw new Error(`Missing asset "${assetName}" for skill "${skillName}" at ${sourcePath}`);
      }
      await copyPath(sourcePath, targetPath);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
