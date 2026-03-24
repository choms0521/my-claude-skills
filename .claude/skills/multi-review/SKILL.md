---
name: multi-review
description: Parallel multi-LLM code review (Claude + Codex + Gemini) with per-provider files, synthesis, and auto-fix
triggers: ["multi-review", "multi review", "3-way review", "tri-review"]
argument-hint: "[file paths | --workspace | --staged | (no args = git branch diff)]"
---

# Multi-Review v2 - Parallel Multi-LLM Code Review

3개 LLM(Claude, Codex, Gemini)이 각각 독립 리뷰 파일을 생성하고, Claude가 종합하여 코드 수정/기각/사람 판단 대기를 수행하는 3-Stage 파이프라인.

## When to Use

- 브랜치 작업 완료 후 머지 전 코드리뷰
- 특정 파일에 대한 다각도 리뷰
- 보안/성능/로직 관점의 교차 검증이 필요할 때

## Do Not Use When

- 단순 typo 수정 등 trivial 변경
- 이미 리뷰 완료된 코드

## Requirements

- **oh-my-claudecode (OMC)**: `omc ask` 명령이 Codex/Gemini 디스패치에 사용됨
  - 설치: `/oh-my-claudecode:omc-setup` 또는 [oh-my-claudecode GitHub](https://github.com/nicekid1/oh-my-claudecode) 참고
  - OMC 미설치 시 → Claude 단독 리뷰로 fallback (graceful degradation)
- **Codex CLI** (선택): `npm install -g @openai/codex`
  - OMC 설치 + Codex CLI 설치 시 → `omc ask codex`로 리뷰 디스패치
  - 미설치 시 → Codex 리뷰 건너뜀
- **Gemini CLI** (선택): `npm install -g @google/gemini-cli`
  - OMC 설치 + Gemini CLI 설치 시 → `omc ask gemini`로 리뷰 디스패치
  - 미설치 시 → Gemini 리뷰 건너뜀
- **최소 동작 조건**: Claude Code만 있으면 단독 리뷰가 가능 (1-LLM mode)

## Output Files

```
프로젝트 루트/
├── claude-agent-llm-code-review.md   ← Stage 1: Claude 리뷰
├── codex-agent-llm-code-review.md    ← Stage 1: Codex 리뷰
├── gemini-agent-llm-code-review.md   ← Stage 1: Gemini 리뷰
└── agent_code_review.md              ← Stage 2: 종합 최종 리뷰 (Stage 3 후 AMBIGUOUS만 잔존)
```

## Execution Protocol

Claude MUST follow this 3-Stage workflow exactly when this skill is invoked.

---

### Pre-Stage: Scope Resolution

**Step 0 — Clean up previous review files:**

Before starting, delete any existing review files from prior runs:

```bash
rm -f claude-agent-llm-code-review.md codex-agent-llm-code-review.md gemini-agent-llm-code-review.md agent_code_review.md
```

This ensures a clean slate and prevents stale results from contaminating the new review.

---

Determine what code to review based on `{{ARGUMENTS}}`:

| Input | Action |
|-------|--------|
| No arguments | Branch diff: `git diff $(git merge-base HEAD $(git rev-parse --verify main 2>/dev/null \|\| echo master))...HEAD` |
| File paths (e.g., `src/a.ts src/b.ts`) | Read and review those specific files |
| `--workspace` | All tracked code files: `git ls-files` filtered to code extensions |
| `--staged` | Staged changes only: `git diff --cached` |

**Steps:**
1. Run the appropriate git command via Bash to get the diff or file contents.
2. **Size guard**: If total content exceeds ~50KB, split into file groups of max 10 files each.
3. Store the diff/content for prompt construction.
4. Detect base branch: `git rev-parse --verify main 2>/dev/null || echo master`

If no changes are found, report to the user and stop.

---

### Stage 1: 각 LLM 독립 리뷰 파일 생성

Each LLM produces its own review file using the structured `[REVIEW_ITEM]` format.

#### 1-1. Prompt Construction

Build prompts with provider-specific focus areas:

| Provider | Focus |
|----------|-------|
| Claude | Logic correctness, error handling, SOLID principles, spec compliance, anti-patterns |
| Codex | Security vulnerabilities, performance bottlenecks, algorithmic issues, injection risks |
| Gemini | Code clarity, alternative approaches, edge cases, documentation gaps, naming |

**Structured output format — embed in ALL provider prompts:**

```
You MUST write all review content in Korean (한국어).
You MUST format each finding using this exact format:

[REVIEW_ITEM]
file: <relative file path>
line: <line number or range>
severity: CRITICAL | HIGH | MEDIUM | LOW
category: security | logic | performance | style | error-handling | best-practice
title: <한국어로 짧은 제목>
description: <한국어로 상세한 이슈 설명>
suggestion: <한국어로 구체적인 수정 방법 — 코드 스니펫 포함>
[/REVIEW_ITEM]

If no issues found, output: [NO_ISSUES_FOUND]
```

> **언어 규칙:** file, line, severity, category 필드는 영어 키워드 유지. title, description, suggestion은 반드시 한국어로 작성.

#### 1-2. Check CLI availability

```bash
codex --version 2>/dev/null && echo "codex:available" || echo "codex:unavailable"
gemini --version 2>/dev/null && echo "gemini:available" || echo "gemini:unavailable"
```

#### 1-3. Dispatch ALL providers in parallel

**Codex** — use `omc ask codex` with the structured review prompt:

```bash
omc ask codex "You are an expert code reviewer specializing in security and performance.
Review the following code with focus on: Security vulnerabilities, performance bottlenecks, algorithmic issues, injection risks.

{STRUCTURED_OUTPUT_FORMAT from 1-1}

Here is the code:
{CODE_CONTENT}"
```

> Run in the background (`run_in_background: true`). If `omc ask codex` fails, skip Codex.

**Gemini** — use `omc ask gemini` with the structured review prompt:

```bash
omc ask gemini "You are a senior code reviewer specializing in code clarity.
Review the following code with focus on: Code clarity, alternative approaches, edge cases, documentation gaps, naming.

{STRUCTURED_OUTPUT_FORMAT from 1-1}

Here is the code:
{CODE_CONTENT}"
```

> Run in the background (`run_in_background: true`). If `omc ask gemini` fails, skip Gemini.

**Claude** — perform inline review directly (do NOT use `omc ask claude`):

While waiting for Codex/Gemini, Claude performs its own review:

1. Read the diff/files
2. Check logic correctness: loop bounds, null handling, type mismatches, control flow
3. Check error handling: are error cases handled? Do errors propagate correctly?
4. Scan for anti-patterns: God Object, magic numbers, copy-paste, feature envy
5. Check SOLID principles compliance
6. Run `lsp_diagnostics` on modified files if LSP is available

Write results to `claude-agent-llm-code-review.md` using the same `[REVIEW_ITEM]` format.


#### 1-4. Wait and normalize provider outputs

Collect results from background tasks. If a provider times out (>5 min), proceed without it and note in the summary.

**After each provider completes, Claude MUST normalize the output into the standard file format.**

For Codex and Gemini, the raw output comes from `omc ask` artifacts (`.omc/artifacts/ask/`). These artifacts contain metadata, prompts, and raw text mixed together. Claude must:

1. Find the latest artifact for each provider:
   ```bash
   ls -t .omc/artifacts/ask/codex-*.md 2>/dev/null | head -1
   ls -t .omc/artifacts/ask/gemini-*.md 2>/dev/null | head -1
   ```
2. Read the artifact and extract `[REVIEW_ITEM]...[/REVIEW_ITEM]` blocks from the `## Raw output` section
3. If the provider didn't follow the structured format, manually extract findings and convert them into `[REVIEW_ITEM]` blocks
4. **Write the normalized result to the standard file** (`codex-agent-llm-code-review.md` or `gemini-agent-llm-code-review.md`) using the exact same format as `claude-agent-llm-code-review.md`:

```markdown
# {Provider} 코드 리뷰

**날짜:** {YYYY-MM-DD}
**범위:** {리뷰 대상 설명}
**집중 영역:** {provider 집중 영역}

## 리뷰 항목

[REVIEW_ITEM]
...
[/REVIEW_ITEM]
```

> **핵심:** 3개 리뷰 파일은 반드시 동일한 포맷이어야 합니다. artifact의 메타데이터, 프롬프트 에코, MCP 로그 등은 모두 제거하고 순수 리뷰 항목만 포함합니다.

---

### Stage 2: Claude 종합 → 최종 리뷰 파일 생성

Read all available `*-agent-llm-code-review.md` files and synthesize into `agent_code_review.md`.

#### 2-1. Parse review items from each file

Extract `[REVIEW_ITEM]...[/REVIEW_ITEM]` blocks. If a provider did not follow the structured format, manually extract and normalize.

#### 2-2. Merge duplicates

**Matching rules for "same issue":**
- Same file AND line numbers within 5 lines of each other
- Same or related category (e.g., security + error-handling on same function)

When merging, combine provider perspectives into a single item and note which providers flagged it.

#### 2-3. Classify each item

| Condition | Action |
|-----------|--------|
| 2+ providers flag same issue, agree on fix direction | **FIX** |
| 3 providers all flag same issue as CRITICAL | **FIX** (immediate) |
| Finding is clearly a false positive | **DISMISS** |
| 1 provider flags, others silent | **AMBIGUOUS** |
| 2+ providers flag same area but disagree on fix | **AMBIGUOUS** |
| Fix direction is unclear or requires architectural decision | **AMBIGUOUS** |

#### 2-4. Re-evaluate severity

- If 2+ providers agree on severity → use that severity
- If providers disagree → use the higher severity
- If only 1 provider flagged → keep original severity but lower confidence

#### 2-5. Write `agent_code_review.md`

> **모든 리뷰 내용은 한국어로 작성.** 필드 키(File, Severity 등)와 태그([FIX], [DISMISS], [AMBIGUOUS])는 영어 유지. 제목, 설명, 사유, 분석은 반드시 한국어로 작성.

```markdown
# 멀티 LLM 코드 리뷰 (최종)

**날짜:** {YYYY-MM-DD}
**범위:** {리뷰 대상 설명, 예: "git diff main...HEAD (12개 파일)"}
**리뷰어:** {완료된 provider 목록}
**원본 파일:** claude-agent-llm-code-review.md, codex-agent-llm-code-review.md, gemini-agent-llm-code-review.md

---

## 요약

| 액션 | 건수 | CRITICAL | HIGH | MEDIUM | LOW |
|------|------|----------|------|--------|-----|
| 수정(FIX) | N | N | N | N | N |
| 기각(DISMISS) | N | N | N | N | N |
| 검토필요(AMBIGUOUS) | N | N | N | N | N |

---

## [FIX] #{number}: {한국어 제목}
- **File:** `{path}:{line}`
- **Severity:** {severity}
- **Flagged by:** {providers}
- **수정 내용:** {합의된 수정 방법 한국어 설명}

## [DISMISS] #{number}: {한국어 제목}
- **File:** `{path}:{line}`
- **Flagged by:** {provider}
- **기각 사유:** {한국어로 기각 이유}

## [AMBIGUOUS] #{number}: {한국어 제목}
- **File:** `{path}:{line}`
- **Severity:** {severity}
- **Flagged by:** {providers}
- **각 LLM 의견:**
  - {Provider A}: {한국어로 의견 + 제안}
  - {Provider B}: {한국어로 의견 + 제안}
- **애매한 이유:** {한국어로 사람의 판단이 필요한 이유}
- **장단점:** {각 선택지의 장단점 한국어 분석}
```

---

### Stage 3: 액션 수행

Read `agent_code_review.md` and process each item:

#### 3-1. FIX items → 코드 수정 후 항목 삭제

For each `[FIX]` item:
1. Read the target source file
2. Apply the suggested fix using the Edit tool
3. After ALL FIX edits are applied, run `lsp_diagnostics` on modified files
4. Run project test suite if available (`npm test`, `pytest`, `go test ./...`, `cargo test`)
5. If a fix breaks tests → revert that fix and reclassify as AMBIGUOUS with failure reason
6. **Delete the [FIX] item from `agent_code_review.md`** (successfully applied)

#### 3-2. DISMISS items → 항목 삭제

For each `[DISMISS]` item:
- **Delete the [DISMISS] item from `agent_code_review.md`** (no action needed)

#### 3-3. AMBIGUOUS items → 사유 추가 후 남김

For each `[AMBIGUOUS]` item:
- Add Claude's analysis below the item: pros/cons of each approach, potential impact, recommended action
- **Keep the item in `agent_code_review.md`** for human review

#### 3-4. Update summary table

After all actions, update the summary table to reflect final counts. The summary should now show:
- FIX: 0 (all applied and removed)
- DISMISS: 0 (all removed)
- AMBIGUOUS: N (remaining items for human decision)

#### 3-5. Report to user

Output a concise summary:
- Number of items auto-fixed and verified
- Number of items dismissed
- Number of AMBIGUOUS items remaining for human decision
- Direct the user to `agent_code_review.md` for the remaining items

---

## Error Handling

| Failure | Fallback |
|---------|----------|
| OMC unavailable | Skip Codex/Gemini dispatch, Claude-only review (1-LLM mode) |
| Codex CLI unavailable | Skip Codex, continue with Claude + Gemini |
| Gemini CLI unavailable | Skip Gemini, continue with Claude + Codex |
| `omc ask codex` fails | Skip Codex, note in summary |
| `omc ask gemini` fails | Skip Gemini, note in summary |
| OMC + Both CLIs unavailable | Claude-only review (degrades to code-reviewer agent behavior) |
| Provider returns unstructured output | Claude manually extracts items from prose |
| Diff too large (>50KB) | Batch into file groups, run multiple rounds, merge results |
| Provider timeout (>5 min) | Proceed with available results, note in summary |
| Auto-fix breaks tests | Revert fix, reclassify as AMBIGUOUS with failure details |
| Individual review file write fails | Skip that LLM, continue with others |

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
