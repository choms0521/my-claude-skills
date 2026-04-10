---
name: multi-review
description: Parallel multi-LLM code review (Claude + Codex + Gemini) with per-provider files, synthesis, and user-approved fix
triggers: ["multi-review", "multi review", "3-way review", "tri-review"]
argument-hint: "[file paths | --workspace | --staged | (no args = git branch diff)]"
---

# Multi-Review v3 - Parallel Multi-LLM Code Review

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
  - 설치 시 → `codex review`로 직접 리뷰 디스패치 (OMC 불필요)
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

> **CRITICAL: 재활용 금지 규칙** — Step 0 이후에는 이전 실행 결과를 절대 재활용하지 않습니다. 코드가 변경되지 않았더라도, 이전 리뷰 내용을 기억하더라도, 반드시 3개 리뷰 파일(`claude-agent-llm-code-review.md`, `codex-agent-llm-code-review.md`, `gemini-agent-llm-code-review.md`)을 모두 새로 생성해야 합니다. "이미 동일한 내용이다", "변경사항이 없다" 등의 이유로 파일 생성을 건너뛰는 것은 금지입니다.

---

Determine what code to review based on `{{ARGUMENTS}}`:

| Input | Action |
|-------|--------|
| No arguments | Branch diff: `git diff $(git merge-base HEAD $(git rev-parse --verify main 2>/dev/null \|\| echo master))...HEAD` |
| File paths (e.g., `src/a.ts src/b.ts`) | Read and review those specific files |
| `--workspace` | All tracked code files: `git ls-files` filtered to code extensions |
| `--staged` | Staged changes only: `git diff --cached` |

**제외 규칙 (모든 스코프 모드에 적용):**
- `.gitignore`에 포함된 untracked 파일은 제외 (`git ls-files`는 tracked 파일만 나열하므로 별도 필터 불필요, `git diff`는 tracked 파일 간 비교이므로 자동 제외)
- `.`으로 시작하는 디렉토리(`.claude/`, `.git/`, `.omc/`, `.omx/` 등)의 모든 하위 파일 제외
- 리뷰 결과 파일(`*-agent-llm-code-review.md`, `agent_code_review.md`) 제외

**필터 적용 방법:**
- `--workspace` 모드: `git ls-files | grep -vE '(^|/)\.' | grep -E '\.(ts|js|tsx|jsx|py|go|rs|java|kt|swift|rb|php|c|cpp|h)$'`
- Branch diff / `--staged` 모드: `--name-only`로 파일 목록을 먼저 구한 뒤 dot 디렉터리 경로를 제외하고, 남은 파일들에 대해서만 diff를 생성합니다. **pathspec(`-- ':!pattern'`)은 git 버전·셸 환경에 따라 실패할 수 있으므로 사용하지 않습니다.**
  ```bash
  # Branch diff (NUL-delimited로 공백 안전)
  # 참고: -r 플래그는 GNU xargs 전용이므로 사용하지 않음. 빈 입력 시 git diff는 안전하게 빈 결과 반환.
  git diff $(git merge-base HEAD main)...HEAD --name-only -z | grep -zvE '(^|/)\.' | xargs -0 git diff $(git merge-base HEAD main)...HEAD --

  # --staged
  git diff --cached --name-only -z | grep -zvE '(^|/)\.' | xargs -0 git diff --cached --
  ```
- File paths 모드: 사용자 지정 파일 중 `.`으로 시작하는 경로는 경고 후 제외

**Steps:**
1. Run the appropriate git command via Bash to get the diff or file contents, applying the exclusion rules above.
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
command -v omc >/dev/null 2>&1 && echo "omc:available" || echo "omc:unavailable"
codex --version 2>/dev/null && echo "codex:available" || echo "codex:unavailable"
gemini --version 2>/dev/null && echo "gemini:available" || echo "gemini:unavailable"
```

> `omc`가 unavailable이면 즉시 Claude 단독 리뷰(1-LLM mode)로 전환합니다.

#### 1-3. Dispatch ALL providers in parallel

**Codex** — use `codex review` subcommand directly (OMC 불필요):

```bash
# codex review는 코드 리뷰 전용 서브커맨드로, 코드를 실행하지 않고 분석만 수행합니다.
# 제약: --base/--uncommitted와 [PROMPT]는 상호 배타적이므로, 모든 모드에서 [PROMPT]만 사용합니다.
# diff/코드 내용을 프롬프트에 직접 포함하여 커스텀 리뷰 포맷을 보장합니다.
#
# 프롬프트 구성: Pre-Stage에서 수집한 diff 또는 파일 내용을 임시 파일로 저장 후 전달합니다.

# 프롬프트를 임시 파일로 저장하여 셸 이스케이프 문제를 방지
# 주의: $(cat)으로 인자 치환하므로 OS의 ARG_MAX 제한은 여전히 적용됨
# diff가 매우 클 경우 Pre-Stage의 Size guard(50KB)에서 분할 처리됨
CODEX_PROMPT=$(mktemp)
cat > "$CODEX_PROMPT" <<'CODEX_EOF'
Security vulnerabilities, performance bottlenecks, algorithmic issues, injection risks에 집중하여 리뷰.

{STRUCTURED_OUTPUT_FORMAT from 1-1}

아래 코드를 리뷰하세요:
CODEX_EOF
# Branch diff 모드: diff 내용 추가 (NUL-delimited로 공백 안전, -r로 빈 입력 시 실행 생략)
git diff $(git merge-base HEAD {base_branch})...HEAD --name-only -z | grep -zvE '(^|/)\.' | xargs -0 git diff $(git merge-base HEAD {base_branch})...HEAD -- >> "$CODEX_PROMPT"
# --staged 모드: git diff --cached --name-only -z | grep -zvE '(^|/)\.' | xargs -0 git diff --cached -- >> "$CODEX_PROMPT"
# 특정 파일 모드: cat {file_list} >> "$CODEX_PROMPT"

codex review "$(cat "$CODEX_PROMPT")"
rm -f "$CODEX_PROMPT"
```

> Run in the background (`run_in_background: true`). If `codex review` fails, skip Codex.
> `codex review`의 출력은 stdout으로 직접 반환되므로, 결과를 `codex-agent-llm-code-review.md`로 리다이렉트하거나 캡처합니다.

**Gemini** — use `omc ask gemini` with the structured review prompt:

```bash
# 프롬프트를 임시 파일로 저장하여 셸 이스케이프/길이 제한 문제를 방지
PROMPT_FILE=$(mktemp)
cat > "$PROMPT_FILE" <<'PROMPT_EOF'
You are a senior code reviewer specializing in code clarity.
Review the following code with focus on: Code clarity, alternative approaches, edge cases, documentation gaps, naming.

{STRUCTURED_OUTPUT_FORMAT from 1-1}
PROMPT_EOF
echo "" >> "$PROMPT_FILE"
echo "Here is the code:" >> "$PROMPT_FILE"
cat {CODE_FILES} >> "$PROMPT_FILE"
omc ask gemini "$(cat "$PROMPT_FILE")" < /dev/null
rm -f "$PROMPT_FILE"
```

> Run in the background (`run_in_background: true`). If `omc ask gemini` fails, skip Gemini.

**Claude** — OMC 가용 시 `oh-my-claudecode:code-reviewer` 에이전트에 위임, 미가용 시 인라인 리뷰:

While waiting for Codex/Gemini, Claude 리뷰를 수행합니다.

**OMC 가용 시 (권장):**

Agent 도구로 `oh-my-claudecode:code-reviewer` 에이전트를 spawning하여 리뷰를 위임합니다:

```
Agent(
  subagent_type: "oh-my-claudecode:code-reviewer",
  prompt: "다음 코드 변경사항을 리뷰해주세요. Logic correctness, error handling, SOLID principles, spec compliance, anti-patterns에 집중하세요.

{STRUCTURED_OUTPUT_FORMAT from 1-1}

{CODE_FILES}",
  run_in_background: true
)
```

> 에이전트 완료 후 결과를 `claude-agent-llm-code-review.md`에 `[REVIEW_ITEM]` 포맷으로 정규화하여 저장합니다. 에이전트가 구조화된 포맷을 따르지 않은 경우, Claude가 수동으로 추출하여 변환합니다.

**OMC 미가용 시 (fallback — 인라인 리뷰):**

Claude가 직접 리뷰를 수행합니다:

1. Read the diff/files
2. Check logic correctness: loop bounds, null handling, type mismatches, control flow
3. Check error handling: are error cases handled? Do errors propagate correctly?
4. Scan for anti-patterns: God Object, magic numbers, copy-paste, feature envy
5. Check SOLID principles compliance
6. (선택) `lsp_diagnostics`를 실행하여 추가 진단 — 권한 거부 또는 미가용 시 건너뜀

**MUST** write results to `claude-agent-llm-code-review.md` using the same `[REVIEW_ITEM]` format. 이전 실행 결과와 동일하더라도 반드시 파일을 새로 작성합니다. 파일이 존재하지 않으면 Stage 2에서 Claude 리뷰가 누락됩니다.


#### 1-4. Wait and normalize provider outputs

Collect results from background tasks. If a provider times out (>5 min), proceed without it and note in the summary.

**After each provider completes, Claude MUST normalize the output into the standard file format.**

**Codex:** `codex review`의 출력은 stdout으로 직접 반환됩니다. 백그라운드 실행 시 출력을 캡처하여 처리합니다.

**Gemini:** `omc ask gemini` 아티팩트(`.omc/artifacts/ask/`)에서 결과를 추출합니다.

Claude must:

1. **Codex 결과 수집**: `codex review`의 stdout 출력에서 리뷰 내용을 추출합니다.
2. **Gemini 결과 수집**: 최신 아티팩트를 찾습니다:
   ```bash
   ls -t .omc/artifacts/ask/gemini-*.md 2>/dev/null | head -1
   ```
   아티팩트에서 `[REVIEW_ITEM]...[/REVIEW_ITEM]` 블록을 `## Raw output` 섹션에서 추출합니다.
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
| Finding is clearly a false positive (evidence 필수) | **DISMISS** — 반드시 `evidence` 필드에 오탐 판단 근거를 명시 |
| 1 provider flags, severity CRITICAL or HIGH | **AMBIGUOUS** — 심각도가 높으므로 사람의 판단 필요 |
| 1 provider flags, severity MEDIUM or LOW | Claude 자체 판단 (**FIX** or **DISMISS**) — 반드시 `evidence` 필드에 판단 근거를 명시 |
| 2+ providers flag same area but disagree on fix | **AMBIGUOUS** |
| Fix direction is unclear or requires architectural decision (evidence 필수) | **AMBIGUOUS** — 반드시 `evidence` 필드에 왜 불명확한지 근거를 명시 |

> **Evidence 규칙:** DISMISS 또는 Claude 자체 판단(1-provider MEDIUM/LOW) 시, `evidence` 필드 없이 판정하는 것은 금지. evidence는 "코드에서 실제로 확인한 사실" 기반이어야 하며, "~로 보인다", "~일 것이다" 같은 추측은 근거로 인정하지 않음.

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
- **Evidence:** {1-provider 자체 판단인 경우 필수 — 코드에서 확인한 구체적 사실 기반 근거. 2+ provider 합의인 경우 생략 가능}

## [DISMISS] #{number}: {한국어 제목}
- **File:** `{path}:{line}`
- **Flagged by:** {provider}
- **기각 사유:** {한국어로 기각 이유}
- **Evidence:** {코드에서 확인한 구체적 사실 기반 근거}

## [AMBIGUOUS] #{number}: {한국어 제목}
- **File:** `{path}:{line}`
- **Severity:** {severity}
- **Flagged by:** {providers}
- **각 LLM 의견:**
  - {Provider A}: {한국어로 의견 + 제안}
  - {Provider B}: {한국어로 의견 + 제안}
- **애매한 이유:** {한국어로 사람의 판단이 필요한 이유}
- **Evidence:** {불명확하다고 판단한 구체적 근거 — 코드 사실 기반}
- **장단점:** {각 선택지의 장단점 한국어 분석}
```

---

### Stage 3: 사용자 승인 후 액션 수행

Stage 2에서 생성된 `agent_code_review.md`를 기반으로, **코드를 자동 수정하지 않고** 사용자에게 리뷰 결과를 제시하고 승인을 받은 후에만 수정합니다.

#### 3-1. 리뷰 결과 요약 제시

사용자에게 아래 형식으로 리뷰 결과를 출력합니다:

```
## 리뷰 결과 요약

### 🔧 수정 추천 (FIX) — N건
2+ LLM이 동의한 이슈로, 수정을 권장합니다.

| # | 파일 | Severity | 제목 | 리뷰어 |
|---|------|----------|------|--------|
| 1 | src/auth.ts:11 | CRITICAL | 평문 비밀번호 비교 | Claude, Codex, Gemini |
| 2 | src/api.ts:37 | HIGH | Cache race condition | Claude, Gemini |
...

### ❌ 수정 불필요 (DISMISS) — N건
오탐으로 판단되어 기각을 권장합니다.

| # | 파일 | 제목 | 기각 사유 |
|---|------|------|-----------|
...

### ❓ 판단 필요 (AMBIGUOUS) — N건
1개 LLM만 지적했거나 수정 방향이 불명확한 항목입니다.

| # | 파일 | Severity | 제목 | 리뷰어 |
|---|------|----------|------|--------|
...
```

> 각 항목의 상세 내용은 `agent_code_review.md`를 참조하도록 안내합니다.

#### 3-2. 사용자 입력 대기

사용자에게 다음과 같이 질문합니다:

```
수정할 항목 번호를 알려주세요.
- 전체 수정: "all" 또는 "전부"
- 선택 수정: "1, 2, 5" (쉼표로 구분)
- 수정 안 함: "none" 또는 "없음"
- 카테고리 수정: "fix만" (FIX 추천 항목만 전부 수정)
```

#### 3-3. 승인된 항목만 수정

사용자가 선택한 항목에 대해서만:
1. Read the target source file
2. Apply the suggested fix using the Edit tool
3. After ALL approved edits are applied, (선택) `lsp_diagnostics`를 실행하여 추가 진단 — 권한 거부 또는 미가용 시 건너뜀
4. Run project test suite if available (`npm test`, `pytest`, `go test ./...`, `cargo test`)
5. If a fix breaks tests → revert that fix and report to user with failure reason
6. **Delete successfully applied items from `agent_code_review.md`**

#### 3-4. Update summary table

After approved actions, update `agent_code_review.md`:
- 적용된 항목: 삭제
- 기각 확인된 항목: 삭제
- 미처리 항목: 유지 (향후 참조용)

#### 3-5. Report to user

Output a concise summary:
- Number of items fixed (user-approved)
- Number of items dismissed
- Number of items skipped (not selected by user)
- Number of remaining items in `agent_code_review.md`

---

## Error Handling

| Failure | Fallback |
|---------|----------|
| OMC unavailable | Skip Codex/Gemini dispatch, Claude-only review (1-LLM mode) |
| Codex CLI unavailable | Skip Codex, continue with Claude + Gemini |
| Gemini CLI unavailable | Skip Gemini, continue with Claude + Codex |
| `codex review` fails | Skip Codex, note in summary |
| `omc ask gemini` fails | Skip Gemini, note in summary |
| OMC + Both CLIs unavailable | Claude-only review (degrades to code-reviewer agent behavior) |
| Provider returns unstructured output | Claude manually extracts items from prose |
| Diff too large (>50KB) | Batch into file groups, run multiple rounds, merge results |
| Provider timeout (>5 min) | Proceed with available results, note in summary |
| Approved fix breaks tests | Revert fix, report failure reason to user |
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
