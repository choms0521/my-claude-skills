import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, measure, shouldShrink, capRecent } from '../scripts/collect.mjs';

test('parseArgs applies defaults and clamps days to 7 or 3', () => {
  const a = parseArgs([]);
  assert.equal(a.days, 7);
  assert.equal(a.scope, 'global');
  assert.equal(parseArgs(['--days', '3']).days, 3);
  assert.equal(parseArgs(['--days', '99']).days, 7);
  assert.equal(parseArgs(['--scope', 'current']).scope, 'current');
  assert.equal(parseArgs(['--scope', 'bogus']).scope, 'global');
});

test('measure sums text length and counts messages', () => {
  const m = measure([{ text: 'abc' }, { text: 'de' }]);
  assert.deepEqual(m, { chars: 5, count: 2 });
});

test('shouldShrink triggers on either chars or message count', () => {
  assert.equal(shouldShrink({ chars: 300, count: 1 }, 250, 600), true);
  assert.equal(shouldShrink({ chars: 1, count: 700 }, 250, 600), true);
  assert.equal(shouldShrink({ chars: 1, count: 1 }, 250, 600), false);
});

test('capRecent keeps the most recent messages within both limits', () => {
  const msgs = [
    { ts: 1, text: 'a'.repeat(100) },
    { ts: 2, text: 'b'.repeat(100) },
    { ts: 3, text: 'c'.repeat(100) },
  ];
  const kept = capRecent(msgs, 250, 600);
  // 100 + 100 fits (200), adding a third would exceed 250 -> keep last two
  assert.equal(kept.length, 2);
  assert.equal(kept[0].ts, 2);
  assert.equal(kept[1].ts, 3);
});

test('capRecent enforces the message-count limit too', () => {
  const msgs = Array.from({ length: 10 }, (_, i) => ({ ts: i, text: 'x' }));
  const kept = capRecent(msgs, 1_000_000, 4);
  assert.equal(kept.length, 4);
  assert.deepEqual(kept.map((m) => m.ts), [6, 7, 8, 9]);
});

test('capRecent always keeps at least one message even if it exceeds maxChars', () => {
  const kept = capRecent([{ ts: 1, text: 'z'.repeat(5000) }], 100, 600);
  assert.equal(kept.length, 1);
});
