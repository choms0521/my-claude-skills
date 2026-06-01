import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskSecrets } from '../scripts/lib/mask.mjs';

test('redacts an OpenAI/Anthropic style key and leaves no sk- token', () => {
  const input = 'use key sk-ant-api03-ABCdef0123456789ABCdef0123456789 here';
  const out = maskSecrets(input);
  assert.match(out, /\[REDACTED:api-key\]/);
  assert.equal(/sk-[A-Za-z0-9_-]{20,}/.test(out), false);
});

test('redacts a GitHub token', () => {
  const out = maskSecrets('token ghp_ABCdefGHIjklMNOpqrSTUvwxYZ0123456789');
  assert.match(out, /\[REDACTED:github-token\]/);
  assert.equal(/ghp_[A-Za-z0-9]{30,}/.test(out), false);
});

test('redacts an AWS access key id', () => {
  const out = maskSecrets('AKIAIOSFODNN7EXAMPLE is the id');
  assert.match(out, /\[REDACTED:aws-key\]/);
  assert.equal(out.includes('AKIAIOSFODNN7EXAMPLE'), false);
});

test('redacts a Bearer header', () => {
  const out = maskSecrets('Authorization: Bearer abc.def-ghi_JKL123');
  assert.match(out, /\[REDACTED:bearer\]/);
});

test('redacts a JWT', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36';
  const out = maskSecrets(`token=${jwt}`);
  assert.match(out, /\[REDACTED:jwt\]/);
  assert.equal(out.includes(jwt), false);
});

test('redacts an email address', () => {
  const out = maskSecrets('contact me at someone@example.com please');
  assert.match(out, /\[REDACTED:email\]/);
  assert.equal(out.includes('someone@example.com'), false);
});

test('redacts a PEM private key block', () => {
  const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIabc123\nhidden\n-----END RSA PRIVATE KEY-----';
  const out = maskSecrets(`key:\n${pem}\nend`);
  assert.match(out, /\[REDACTED:private-key\]/);
  assert.equal(out.includes('MIIabc123'), false);
});

test('is a no-op for clean text and non-strings', () => {
  assert.equal(maskSecrets('just a normal sentence'), 'just a normal sentence');
  assert.equal(maskSecrets(''), '');
  assert.equal(maskSecrets(null), null);
});

test('masks multiple secrets in one string with no leak', () => {
  const input = 'sk-abcdefghijklmnopqrstuvwx and ghp_abcdefghijklmnopqrstuvwxyz012345 and a@b.com';
  const out = maskSecrets(input);
  assert.equal(/sk-[A-Za-z0-9_-]{20,}/.test(out), false);
  assert.equal(/ghp_[A-Za-z0-9]{30,}/.test(out), false);
  assert.equal(out.includes('a@b.com'), false);
});
