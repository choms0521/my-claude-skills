#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  GENERATED_DIR,
  SHARED_SKILLS_DIR,
  adaptBodyForRuntime,
  ensureDir,
  resolveSkillSelection,
  readUtf8,
  renderFrontmatter,
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
  const skillDir = path.join(SHARED_SKILLS_DIR, skillName);
  const manifest = JSON.parse(await readUtf8(path.join(skillDir, 'skill.json')));
  const commonBody = await readUtf8(path.join(skillDir, 'common.md'));

  for (const runtime of ['claude', 'codex']) {
    const adapter = await readUtf8(path.join(skillDir, 'adapters', `${runtime}.md`));
    const body = adaptBodyForRuntime(commonBody, runtime, skillName);
    const content = [
      renderFrontmatter({
        name: manifest.name,
        description: manifest.description,
        triggers: manifest.triggers,
        'argument-hint': manifest.argumentHint,
        runtime,
        'support-level': manifest.runtimeSupport[runtime],
        'generated-from': `skills/${skillName}`,
      }),
      '<!-- Generated file. Edit skills/<name>/... and rebuild. -->',
      '',
      adapter.trimEnd(),
      '',
      body.trimStart(),
      '',
    ].join('\n');

    const outputDir = path.join(GENERATED_DIR, runtime, 'skills', skillName);
    await ensureDir(outputDir);
    await writeUtf8(path.join(outputDir, 'SKILL.md'), content);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
