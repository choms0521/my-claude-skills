#!/usr/bin/env node

import path from 'node:path';
import {
  GENERATED_DIR,
  ROOT_DIR,
  copyPath,
  ensureDir,
  pathExists,
  resolveSkillSelection,
} from './skill-lib.mjs';

const PROJECT_CODEX_SKILLS_DIR = path.join(ROOT_DIR, '.codex', 'skills');

async function main() {
  const requestedSkills = process.argv.slice(2);
  const skillDirs = await resolveSkillSelection(requestedSkills);

  await ensureDir(PROJECT_CODEX_SKILLS_DIR);

  for (const skillName of skillDirs) {
    const sourceDir = path.join(GENERATED_DIR, 'codex', 'skills', skillName);
    const targetDir = path.join(PROJECT_CODEX_SKILLS_DIR, skillName);

    if (!await pathExists(sourceDir)) {
      throw new Error(`Missing generated Codex skill for "${skillName}" at ${sourceDir}`);
    }

    await copyPath(sourceDir, targetDir);
  }

  console.log(`Synced project-local Codex skills for ${skillDirs.length} skill(s): ${skillDirs.join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
