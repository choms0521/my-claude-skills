import { test } from 'node:test';
import assert from 'node:assert/strict';
import { truncateText, truncateToolResults } from '../scripts/lib/truncate.mjs';

test('short text is returned unchanged', () => {
  const text = 'a'.repeat(100);
  assert.equal(truncateText(text, 2048), text);
});

test('long text is truncated with a byte-count marker, head and tail preserved', () => {
  const head = 'H'.repeat(1024);
  const mid = 'M'.repeat(3000);
  const tail = 'T'.repeat(1024);
  const text = head + mid + tail;
  const out = truncateText(text, 2048, 1024);

  assert.ok(out.length < text.length);
  assert.match(out, /bytes truncated/);
  assert.ok(out.startsWith('H'.repeat(1024)));
  assert.ok(out.endsWith('T'.repeat(1024)));
  assert.equal(out.includes('M'.repeat(3000)), false);
});

test('truncateToolResults only truncates large tool_result blocks (no mutation)', () => {
  const message = {
    role: 'assistant',
    blocks: [
      { kind: 'text', text: 'x'.repeat(5000) },
      { kind: 'tool_result', text: 'y'.repeat(5000) },
    ],
  };
  const out = truncateToolResults(message, 2048);

  // text block is left alone
  assert.equal(out.blocks[0].text.length, 5000);
  // tool_result is truncated
  assert.match(out.blocks[1].text, /bytes truncated/);
  // original message object is not mutated
  assert.equal(message.blocks[1].text.length, 5000);
});

test('non-string and malformed inputs are safe', () => {
  assert.equal(truncateText(undefined), undefined);
  assert.deepEqual(truncateToolResults(null), null);
  assert.deepEqual(truncateToolResults({ role: 'user' }), { role: 'user' });
});
