import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeCwd,
  withinDays,
  filterFilesByMtime,
  parseJsonl,
  extractMessages,
} from '../scripts/lib/filter.mjs';

test('encodeCwd replaces every non-alphanumeric char with a dash', () => {
  assert.equal(encodeCwd('/Users/me/work/py-runner'), '-Users-me-work-py-runner');
  assert.equal(encodeCwd('/'), '-');
  // spaces and dots both become dashes; separators are not collapsed
  assert.equal(encodeCwd('/a/Session Hub.app/b'), '-a-Session-Hub-app-b');
  assert.equal(encodeCwd('/x/.q'), '-x--q');
});

test('withinDays respects the window boundary', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');
  const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
  const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;
  assert.equal(withinDays(twoDaysAgo, 7, now), true);
  assert.equal(withinDays(tenDaysAgo, 7, now), false);
  assert.equal(withinDays(NaN, 7, now), false);
});

test('filterFilesByMtime keeps only recent files', () => {
  const now = Date.parse('2026-06-01T00:00:00Z');
  const files = [
    { path: 'recent.jsonl', mtimeMs: now - 1 * 24 * 60 * 60 * 1000 },
    { path: 'old.jsonl', mtimeMs: now - 30 * 24 * 60 * 60 * 1000 },
  ];
  const kept = filterFilesByMtime(files, 7, now);
  assert.deepEqual(kept.map((f) => f.path), ['recent.jsonl']);
});

test('parseJsonl skips malformed lines', () => {
  const text = '{"a":1}\nnot json\n\n{"b":2}';
  const objs = parseJsonl(text);
  assert.deepEqual(objs, [{ a: 1 }, { b: 2 }]);
});

test('extractMessages filters by type and timestamp, normalizes content', () => {
  const since = Date.parse('2026-05-30T00:00:00Z');
  const objs = [
    { type: 'summary', timestamp: '2026-05-31T00:00:00Z' }, // ignored: meta type
    {
      type: 'user',
      timestamp: '2026-05-29T00:00:00Z', // ignored: before window
      sessionId: 's1',
      message: { role: 'user', content: 'too old' },
    },
    {
      type: 'user',
      timestamp: '2026-05-31T10:00:00Z',
      sessionId: 's2',
      message: { role: 'user', content: 'hello' },
    },
    {
      type: 'assistant',
      timestamp: '2026-05-31T10:01:00Z',
      sessionId: 's2',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'done' },
          { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
          { type: 'tool_result', content: [{ type: 'text', text: 'output here' }] },
        ],
      },
    },
  ];
  const messages = extractMessages(objs, since);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, 'user');
  assert.equal(messages[0].blocks[0].text, 'hello');

  const asst = messages[1];
  assert.equal(asst.role, 'assistant');
  const kinds = asst.blocks.map((b) => b.kind);
  assert.deepEqual(kinds, ['text', 'tool_use', 'tool_result']);
  assert.equal(asst.blocks[1].name, 'Bash');
  assert.equal(asst.blocks[2].text, 'output here');
});

test('extractMessages drops messages with no parseable timestamp', () => {
  const objs = [{ type: 'user', sessionId: 's', message: { role: 'user', content: 'x' } }];
  assert.equal(extractMessages(objs, 0).length, 0);
});
