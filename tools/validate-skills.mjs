#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { GENERATED_DIR, SHARED_SKILLS_DIR, fileExists, readUtf8, resolveSkillSelection } from './skill-lib.mjs';

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
