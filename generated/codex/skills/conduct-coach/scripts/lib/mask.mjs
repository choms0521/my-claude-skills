// Deterministic secret masking. Runs in collect.mjs BEFORE the transcript is
// handed to the judge subagent, so no LLM judgement is involved.
//
// Each match is replaced with `[REDACTED:<type>]`. Patterns are applied in a
// fixed order from most specific to least specific. The replacement token
// contains no characters that any later pattern would match, so sequential
// application never double-masks or leaks.

const MASK_RULES = [
  // Multi-line PEM private key blocks.
  {
    type: 'private-key',
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  // JSON Web Tokens (header.payload.signature).
  {
    type: 'jwt',
    re: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  },
  // GitHub tokens: ghp_, gho_, ghu_, ghs_, ghr_.
  {
    type: 'github-token',
    re: /gh[pousr]_[A-Za-z0-9]{30,}/g,
  },
  // AWS access key IDs.
  {
    type: 'aws-key',
    re: /AKIA[0-9A-Z]{16}/g,
  },
  // OpenAI / Anthropic style secret keys (sk-..., sk-ant-...).
  {
    type: 'api-key',
    re: /sk-[A-Za-z0-9_-]{20,}/g,
  },
  // Bearer authorization headers.
  {
    type: 'bearer',
    re: /Bearer\s+[A-Za-z0-9._\-]+/g,
  },
  // Email addresses.
  {
    type: 'email',
    re: /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  },
];

export function maskSecrets(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return text;
  }

  return MASK_RULES.reduce(
    (acc, { type, re }) => acc.replace(re, `[REDACTED:${type}]`),
    text
  );
}

export const MASK_TYPES = MASK_RULES.map((rule) => rule.type);
