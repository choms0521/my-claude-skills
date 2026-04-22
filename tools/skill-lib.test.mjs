import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import { adaptBodyForRuntime, renderSkillOutput } from './skill-lib.mjs';

test('adaptBodyForRuntime renders codex blocks and rewrites invocation', () => {
  const body = [
    'Claude MUST follow this workflow.',
    '',
    '<!-- runtime:claude:start -->',
    'Claude-only detail',
    '<!-- runtime:end -->',
    '<!-- runtime:codex:start -->',
    'Codex-only detail',
    '<!-- runtime:end -->',
    'Run /demo to start.',
  ].join('\n');

  const rendered = adaptBodyForRuntime(body, 'codex', 'demo');

  assert.match(rendered, /Codex MUST follow this workflow\./);
  assert.match(rendered, /Codex-only detail/);
  assert.doesNotMatch(rendered, /Claude-only detail/);
  assert.match(rendered, /Run \$demo to start\./);
});

test('adaptBodyForRuntime rejects unsupported codex markers', () => {
  assert.throws(
    () => adaptBodyForRuntime('AskUserQuestion으로 사용자에게 물어봅니다.', 'codex', 'demo'),
    /unsupported runtime-specific guidance/
  );
});

test('renderSkillOutput builds a generated skill document from shared sources', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-lib-test-'));
  const baseDir = path.join(tempRoot, 'skills');
  const skillDir = path.join(baseDir, 'demo');

  await fs.mkdir(path.join(skillDir, 'adapters'), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, 'skill.json'),
    JSON.stringify(
      {
        name: 'demo',
        description: 'demo skill',
        triggers: ['demo'],
        argumentHint: '[args]',
        runtimeSupport: {
          claude: 'full',
          codex: 'full',
        },
      },
      null,
      2
    ),
    'utf8'
  );
  await fs.writeFile(path.join(skillDir, 'common.md'), 'Claude MUST run /demo.\n', 'utf8');
  await fs.writeFile(path.join(skillDir, 'adapters', 'codex.md'), '## Codex Adapter\n', 'utf8');
  await fs.writeFile(path.join(skillDir, 'adapters', 'claude.md'), '## Claude Adapter\n', 'utf8');

  try {
    const rendered = await renderSkillOutput('demo', 'codex', baseDir);

    assert.equal(rendered.manifest.name, 'demo');
    assert.deepEqual(rendered.assets, []);
    assert.match(rendered.content, /^---\nname: demo/m);
    assert.match(rendered.content, /runtime: codex/);
    assert.match(rendered.content, /## Codex Adapter/);
    assert.match(rendered.content, /Codex MUST run \$demo\./);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
