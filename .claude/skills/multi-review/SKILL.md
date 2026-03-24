---
name: multi-review
description: Parallel multi-LLM code review (Claude + Codex + Gemini) with synthesis and auto-fix
triggers: ["multi-review", "multi review", "3-way review", "tri-review"]
argument-hint: "[file paths | --workspace | --staged | (no args = git branch diff)]"
---

# Multi-Review - Parallel Multi-LLM Code Review

3개 LLM(Claude, Codex, Gemini)으로 병렬 코드리뷰를 수행하고, 결과를 교차 검증하여 자동 수정/기각/사람 판단 대기로 분류하는 워크플로우.

## When to Use

- 브랜치 작업 완료 후 머지 전 코드리뷰
- 특정 파일에 대한 다각도 리뷰
- 보안/성능/로직 관점의 교차 검증이 필요할 때

## Do Not Use When

- 단순 typo 수정 등 trivial 변경
- 이미 리뷰 완료된 코드

## Requirements

- **Codex CLI**: `npm install -g @openai/codex`
- **Gemini CLI**: `npm install -g @google/gemini-cli`
- `omc ask` command available
- CLI 일부 미설치 시 가용한 LLM만으로 계속 진행 (graceful degradation)

## Execution Protocol

Claude MUST follow this workflow exactly when this skill is invoked.

---

### Phase 0: Scope Resolution

Determine what code to review based on `{{ARGUMENTS}}`:

**Parse arguments:**

| Input | Action |
|-------|--------|
| No arguments | Branch diff: `git diff $(git merge-base HEAD $(git rev-parse --verify main 2>/dev/null \|\| echo master))...HEAD` |
| File paths (e.g., `src/a.ts src/b.ts`) | Read and review those specific files |
| `--workspace` | All tracked code files: `git ls-files` filtered to code extensions (exclude binaries, lockfiles, node_modules, dist) |
| `--staged` | Staged changes only: `git diff --cached` |

**Steps:**

1. Run the appropriate git command via Bash to get the diff or file contents.
2. **Size guard**: If total content exceeds ~50KB, split into file groups of max 10 files each. Process each batch through the full pipeline separately, then merge results.
3. Store the diff/content for prompt construction.

If no changes are found, report to the user and stop.

---

### Phase 1: Prompt Construction

Build review prompts for each LLM. Each prompt includes:

1. **The diff or file content** (identical across all providers)
2. **Provider-specific focus area**
3. **Mandatory structured output format**

**Provider focus areas:**

| Provider | Focus |
|----------|-------|
| Claude | Logic correctness, error handling, SOLID principles, spec compliance, anti-patterns |
| Codex | Security vulnerabilities, performance bottlenecks, algorithmic issues, injection risks |
| Gemini | Code clarity, alternative approaches, edge cases, documentation gaps, naming |

**Structured output format requirement — embed this in EVERY provider prompt:**

```
You MUST format each finding as a structured review item using this exact format:

[REVIEW_ITEM]
file: <relative file path>
line: <line number or range, e.g., 42 or 42-50>
severity: CRITICAL | HIGH | MEDIUM | LOW
category: security | logic | performance | style | error-handling | best-practice
title: <short descriptive title>
description: <detailed explanation of the issue>
suggestion: <concrete fix — include code snippet when possible>
[/REVIEW_ITEM]

Output ONLY review items in this format. If no issues found, output: [NO_ISSUES_FOUND]
```

**Prompt template for external providers (Codex/Gemini):**

```
You are an expert code reviewer. Review the following code changes with a focus on: {FOCUS_AREA}.

Project context: {working directory name and language/framework if detectable}

Code to review:
---
{DIFF_OR_FILE_CONTENT}
---

{STRUCTURED_OUTPUT_FORMAT_REQUIREMENT}
```

---

### Phase 2: Parallel Dispatch

> **Note:** Skill nesting is not supported in Claude Code. Always use the direct CLI path via Bash tool.

**Step 1: Check CLI availability**

```bash
codex --version 2>/dev/null && echo "codex:available" || echo "codex:unavailable"
gemini --version 2>/dev/null && echo "gemini:available" || echo "gemini:unavailable"
```

Record which providers are available. If both are unavailable, skip to Phase 2b.

**Step 2: Dispatch external providers in parallel**

For large prompts, write the prompt to a temporary file first, then pipe it:

```bash
# Write prompts to temp files to avoid shell argument limits
cat > /tmp/codex-review-prompt.txt << 'PROMPT_EOF'
{codex prompt content}
PROMPT_EOF

cat > /tmp/gemini-review-prompt.txt << 'PROMPT_EOF'
{gemini prompt content}
PROMPT_EOF

# Dispatch in parallel
omc ask codex "$(cat /tmp/codex-review-prompt.txt)" &
omc ask gemini "$(cat /tmp/gemini-review-prompt.txt)" &
wait

# Clean up
rm -f /tmp/codex-review-prompt.txt /tmp/gemini-review-prompt.txt
```

**Step 2b: Claude inline review**

Claude performs its own review pass directly in-context (do NOT use `omc ask claude`). Apply the code-reviewer agent's checklist:

1. Run `git diff` to see changes (if not already loaded)
2. Check logic correctness: loop bounds, null handling, type mismatches, control flow
3. Check error handling: are error cases handled? Do errors propagate correctly?
4. Scan for anti-patterns: God Object, magic numbers, copy-paste, feature envy
5. Check SOLID principles compliance
6. Run `lsp_diagnostics` on modified files if LSP is available

Format Claude's own findings using the same `[REVIEW_ITEM]` structure.

---

### Phase 3: Artifact Collection + Parsing

**Step 1: Collect external artifacts**

Use Glob to find the most recent artifacts:

```
.omc/artifacts/ask/codex-*.md  (most recent by timestamp)
.omc/artifacts/ask/gemini-*.md (most recent by timestamp)
```

Read each artifact file.

**Step 2: Parse review items**

Extract all `[REVIEW_ITEM]...[/REVIEW_ITEM]` blocks from each provider's output.

If a provider did not follow the structured format (common with external LLMs), Claude MUST manually extract review items from the prose output and normalize them into the standard structure.

**Step 3: Build unified item list**

Create an internal list of all review items tagged by provider:

```
{ provider: "claude", file: "src/auth.ts", line: 42, severity: "HIGH", category: "security", ... }
{ provider: "codex", file: "src/auth.ts", line: 42, severity: "CRITICAL", category: "security", ... }
{ provider: "gemini", file: "src/utils.ts", line: 15, severity: "LOW", category: "style", ... }
```

---

### Phase 4: Cross-Validation & Synthesis

Apply these rules to classify each item:

| Condition | Action | Confidence |
|-----------|--------|------------|
| 3 providers flag same file+area with same category | **APPLY** (auto-fix) | VERY HIGH |
| 2 providers flag same file+area with same category | **APPLY** (auto-fix) | HIGH |
| 2+ providers flag same area but disagree on the fix direction | **NEEDS-HUMAN** (include both suggestions + pros/cons) | MEDIUM |
| 1 provider flags, others silent on that area | **NEEDS-HUMAN** (present the finding for human review) | LOW |
| Finding is clearly a false positive (e.g., standard HTTP 200 flagged as magic number) | **DISMISS** (with rationale) | N/A |

> **Auto-fix policy**: Items with 2+ LLM agreement are auto-fixed without human confirmation.

**Matching rules for "same area":**
- Same file AND line numbers within 5 lines of each other
- Same or related category (e.g., security + error-handling on same function)

---

### Phase 5: Generate `agent_code_review.md`

Write the review document to the **project root** as `agent_code_review.md`.

**Document structure:**

```markdown
# Multi-LLM Code Review

**Date:** {YYYY-MM-DD}
**Scope:** {description of what was reviewed, e.g., "git diff main...HEAD (12 files)"}
**Reviewers:** {list of available providers, e.g., "Claude, Codex, Gemini"}

---

## Summary

| Severity | Total | Auto-Fixed | Dismissed | Needs Human |
|----------|-------|------------|-----------|-------------|
| CRITICAL | N     | N          | N         | N           |
| HIGH     | N     | N          | N         | N           |
| MEDIUM   | N     | N          | N         | N           |
| LOW      | N     | N          | N         | N           |

---

## Items Requiring Human Decision

### [NEEDS-HUMAN] #{number}: {title}
- **File:** `{path}:{line}`
- **Severity:** {severity}
- **Category:** {category}
- **Flagged by:** {provider list with their severity}

**{Provider A} says:**
> {description + suggestion from provider A}

**{Provider B} says:**
> {description + suggestion from provider B}

**Analysis:**
> {Claude's analysis of why this is ambiguous, pros/cons of each approach}

**Decision:** `[ ] Apply A` `[ ] Apply B` `[ ] Ignore` `[ ] Custom fix`

---

## Auto-Fixed Items

### [APPLIED] #{number}: {title}
- **File:** `{path}:{line}`
- **Severity:** {severity}
- **Agreement:** {N}/3 providers ({provider names})
- **Fix:** {brief description of what was changed}

---

## Dismissed Items

### [DISMISSED] #{number}: {title}
- **File:** `{path}:{line}`
- **Flagged by:** {provider}
- **Reason:** {why this is a false positive or incorrect}

---

## Per-Provider Raw Reviews

<details>
<summary>Claude Review ({N} items)</summary>

{full Claude review output}

</details>

<details>
<summary>Codex Review ({N} items)</summary>

{full Codex artifact content}

</details>

<details>
<summary>Gemini Review ({N} items)</summary>

{full Gemini artifact content}

</details>
```

---

### Phase 6: Apply Fixes & Verify

**Step 1: Apply auto-fixes**

For each item classified as **APPLY**:

1. Read the target file
2. Apply the suggested fix using the Edit tool
3. After ALL edits, run `lsp_diagnostics` on each modified file to verify no type errors were introduced

**Step 2: Run tests (if available)**

Detect and run the project test suite:
- `npm test`, `pnpm test`, or `yarn test` (Node.js)
- `pytest` (Python)
- `go test ./...` (Go)
- `cargo test` (Rust)

If tests fail after applying fixes, **revert the failing fix** and reclassify that item as NEEDS-HUMAN with the failure reason.

**Step 3: Update review document**

- Mark successfully applied items with verification status
- If any auto-fix was reverted, move it to NEEDS-HUMAN section with the test failure details

**Step 4: Report to user**

Output a concise summary:
- Number of items auto-fixed and verified
- Number of items dismissed
- Number of items requiring human decision
- Direct the user to `agent_code_review.md` for the NEEDS-HUMAN items

---

## Error Handling

| Failure | Fallback |
|---------|----------|
| Codex CLI unavailable | Continue with Claude + Gemini, note in summary |
| Gemini CLI unavailable | Continue with Claude + Codex, note in summary |
| Both CLIs unavailable | Claude-only review (degrades to code-reviewer agent behavior) |
| Provider returns unstructured output | Claude manually extracts items from prose |
| Diff too large (>50KB) | Batch into file groups, run multiple rounds, merge results |
| Provider timeout or error | Report which provider failed, proceed with available results |
| Auto-fix breaks tests | Revert fix, reclassify as NEEDS-HUMAN |

---

## Examples

```bash
# Review current branch changes (default)
/multi-review

# Review specific files
/multi-review src/auth.ts src/middleware/validate.ts

# Review all workspace files
/multi-review --workspace

# Review staged changes only
/multi-review --staged
```
