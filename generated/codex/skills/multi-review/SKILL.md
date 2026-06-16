---
name: multi-review
description: "Parallel multi-LLM code review (Claude + Codex + Gemini) with per-provider files, synthesis, and user-approved fix"
triggers: ["multi-review","multi review"]
argument-hint: "[file paths | --workspace | --staged | (no args = git branch diff)]"
runtime: codex
support-level: full
generated-from: skills/multi-review
---

<!-- Generated file. Edit skills/<name>/... and rebuild. -->

## Runtime Adapter

- Runtime: Codex
- Invocation: `$multi-review`
- Install target: `$CODEX_HOME/skills/multi-review` (기본값: `~/.codex/skills/multi-review`)
- Support level: full
- Canonical source: `skills/<name>/...`에서 생성된 Codex용 스킬입니다.
- Runtime notes: 공통 본문은 런타임 마커를 사용해 Codex에서 필요한 지시만 남기도록 생성됩니다.

# Multi-Review v4 - Parallel Multi-LLM Code Review

3개 관점(Claude, Codex, Gemini)을 서로 독립된 리뷰 패스로 실행하고, 현재 세션의 리더 에이전트가 결과를 종합해 수정/기각/판단대기까지 정리하는 3-Stage 파이프라인입니다.

## When to Use

- 브랜치 작업 완료 후 머지 전 코드리뷰
- 특정 파일에 대한 다각도 리뷰
- 보안, 성능, 로직, 가독성을 분리해서 보고 싶을 때

## Do Not Use When

- 단순 typo 수정 등 trivial 변경
- 이미 충분히 검증된 작은 변경

## Requirements

- 필수 외부 런타임은 없습니다. 현재 세션만으로도 3개 리뷰 파일을 생성할 수 있어야 합니다.
- `codex` CLI가 있으면 Codex 관점 리뷰를 외부 프로세스로 위임할 수 있습니다.
- `agy`(Antigravity CLI)가 있으면 Gemini 관점 리뷰를 외부 프로세스로 위임할 수 있습니다. 구 `gemini` CLI는 2026-06-18 서비스 종료되어 `agy`로 대체되었으며, 본 스킬의 Gemini 관점 외부 위임 경로는 `agy`만 사용합니다(`gemini` fallback 경로는 없음).
- 외부 CLI나 네이티브 하위 에이전트가 없어도, 현재 세션에서 **서로 다른 관점으로 3번 독립 리뷰**를 수행해 동일한 출력 파일을 만들어야 합니다.


- Codex 런타임에서는 Codex 네이티브 도구와 셸 명령만 전제로 둡니다.
- Claude 전용 orchestration 표면이나 artifact 규약에 의존하지 않습니다.

> **핵심 원칙:** provider가 실제 외부 모델이든, 현재 세션이 수행한 stand-in pass든 상관없이 `claude-agent-llm-code-review.md`, `codex-agent-llm-code-review.md`, `gemini-agent-llm-code-review.md` 세 파일은 항상 새로 생성해야 합니다.

## Output Files

```text
프로젝트 루트/
├── claude-agent-llm-code-review.md
├── codex-agent-llm-code-review.md
├── gemini-agent-llm-code-review.md
└── agent_code_review.md
```

## Execution Protocol

Codex MUST follow this 3-Stage workflow exactly when this skill is invoked.

### Pre-Stage: Scope Resolution

**Step 0 — Clean up previous review files**

```bash
rm -f claude-agent-llm-code-review.md codex-agent-llm-code-review.md gemini-agent-llm-code-review.md agent_code_review.md
```

이전 결과를 재활용하지 않습니다. 변경이 없더라도 이번 실행의 3개 리뷰 파일을 다시 만듭니다.

**Step 1 — Determine review scope from `{{ARGUMENTS}}`**

| Input | Action |
|-------|--------|
| No arguments | `git diff $(git merge-base HEAD $(git rev-parse --verify main 2>/dev/null \|\| echo master))...HEAD` |
| File paths | 지정 파일만 읽고 리뷰 |
| `--workspace` | `git ls-files` 기반 전체 tracked 코드 파일 |
| `--staged` | `git diff --cached` |

**Exclude rules**

- `.`으로 시작하는 디렉토리 하위 파일 제외
- 리뷰 결과 파일 제외
- untracked ignored file 제외

**Filtering guidance**

```bash
# Workspace
git ls-files | grep -vE '(^|/)\\.' | grep -E '\\.(ts|js|tsx|jsx|py|go|rs|java|kt|swift|rb|php|c|cpp|h)$'

# Branch diff
FILES=$(git diff $(git merge-base HEAD main)...HEAD --name-only | grep -vE '(^|/)\\.')
[ -n "$FILES" ] && echo "$FILES" | xargs git diff $(git merge-base HEAD main)...HEAD --

# Staged
FILES=$(git diff --cached --name-only | grep -vE '(^|/)\\.')
[ -n "$FILES" ] && echo "$FILES" | xargs git diff --cached --
```

**Step 2 — Size guard**

- 총 입력이 약 50KB를 넘으면 파일 그룹을 10개 이하 단위로 나눕니다.
- 그룹별 리뷰 결과를 나중에 병합합니다.

**Step 3 — Stop if empty**

리뷰 대상이 없으면 사용자에게 알리고 종료합니다.

### Stage 1: 3개 독립 리뷰 파일 생성

각 provider는 아래 구조화 포맷만 사용합니다.

```text
You MUST write all review content in Korean (한국어).
You MUST format each finding using this exact format:

[REVIEW_ITEM]
file: <relative file path>
line: <line number or range>
severity: CRITICAL | HIGH | MEDIUM | LOW
category: security | logic | performance | style | error-handling | best-practice
title: <한국어로 짧은 제목>
description: <한국어로 상세한 이슈 설명>
suggestion: <한국어로 구체적인 수정 방법 - 코드 스니펫 포함>
[/REVIEW_ITEM]

If no issues found, output: [NO_ISSUES_FOUND]
```

`file`, `line`, `severity`, `category` 값은 영어 키워드를 유지하고, `title`, `description`, `suggestion`은 한국어로 씁니다.

#### 1-1. Capability check

```bash
codex --version 2>/dev/null && echo "codex:available" || echo "codex:unavailable"
agy --version 2>/dev/null && echo "agy:available" || echo "agy:unavailable"   # Antigravity CLI (구 gemini CLI 대체)
```


#### 1-2. Provider routing

| Provider | Default path | Optional accelerator |
|----------|--------------|----------------------|
| Claude perspective | 현재 세션에서 logic/error-handling 관점 stand-in pass | 런타임이 안전한 reviewer lane이 있으면 선택 사용 |
| Codex perspective | 현재 세션에서 security/performance 관점 stand-in pass | `codex review` |
| Gemini perspective | 현재 세션에서 clarity/edge-case 관점 stand-in pass | `agy` headless run (구 `gemini` 대체) |

기본값은 항상 **현재 세션 stand-in pass** 입니다. 외부 CLI나 별도 reviewer lane은 성공이 보장될 때만 선택적으로 사용합니다.
stand-in pass도 반드시 해당 provider 전용 관점만 다뤄야 합니다.

#### 1-3. Run review passes

- 런타임이 안전한 독립 lane을 제공하면 병렬 실행합니다.
- 그렇지 않으면 순차 실행해도 됩니다.
- 중요한 것은 **독립성**입니다. 앞선 리뷰 결과를 다음 pass에 흘려보내지 말고, 각 pass를 별도 메모/파일로 관리합니다.
- 각 pass가 끝나면 결과를 메모에만 남기지 말고, 즉시 해당 output file을 새로 기록합니다.
- 외부 CLI 시도가 실패하면 재시도보다 먼저 stand-in pass로 전환해 세 파일 생성을 완료합니다.
- 외부 CLI 명령은 반드시 10분 상한으로 실행합니다. 런타임이 명시적 tool timeout을 지원하면 `timeout=600000`을 지정하고, 지원하지 않으면 셸 `timeout`/`gtimeout` 또는 동등한 watchdog로 같은 상한을 강제합니다.

**Claude perspective**

- Focus: logic correctness, error handling, SOLID principles, spec compliance, anti-patterns
- Output file: `claude-agent-llm-code-review.md`
- Executor label:
  - 실제 Claude 계열 외부/내부 reviewer면 `Claude`
  - 현재 세션 stand-in이면 `Current runtime (Claude perspective)`

**Codex perspective**

- Focus: security vulnerabilities, performance bottlenecks, algorithmic issues, injection risks
- Output file: `codex-agent-llm-code-review.md`
- Executor label:
  - `Codex CLI`
  - 또는 `Current runtime (Codex perspective)`

외부 Codex CLI는 선택 사항입니다. 사용할 때는 다음 원칙을 지킵니다:

- 기본 경로는 여전히 현재 세션 stand-in pass입니다. 외부 Codex CLI는 속도/분리도가 필요할 때만 사용합니다.
- 긴 프롬프트를 argv에 직접 넣지 말고 stdin 또는 임시 파일을 사용합니다.
- `codex review`는 기본적으로 `-c model_reasoning_effort="medium"`을 붙여 지연을 줄입니다.
- 임시 HOME은 `/tmp` 대신 기존 HOME 아래 별도 디렉터리에 만들어 helper/session 경고를 줄입니다.
- 현재 세션의 sandbox, approval policy, 인증 상태를 우회하려고 하지 않습니다.
- `codex review` 호출이 실패하거나 출력이 불완전하면 즉시 stand-in pass로 전환합니다.

```bash
CODEX_RUN_PARENT="$HOME/.codex-run-tmp"
mkdir -p "$CODEX_RUN_PARENT"
CODEX_PROMPT="$(mktemp "$CODEX_RUN_PARENT/prompt-XXXXXX.txt")"
CODEX_RUN_HOME="$(mktemp -d "$CODEX_RUN_PARENT/home-XXXXXX")"
cleanup() {
  rm -rf "$CODEX_RUN_HOME" "$CODEX_PROMPT"
}
trap cleanup EXIT INT TERM

cat > "$CODEX_PROMPT" <<'EOF'
Security vulnerabilities, performance bottlenecks, algorithmic issues, injection risks에 집중하여 리뷰.

{STRUCTURED_OUTPUT_FORMAT}

아래 코드를 리뷰하세요:
EOF

# diff 또는 파일 내용을 뒤에 append
mkdir -p "$CODEX_RUN_HOME/.codex"
[ -f "$HOME/.codex/auth.json" ] && cp "$HOME/.codex/auth.json" "$CODEX_RUN_HOME/.codex/auth.json"
[ -f "$HOME/.codex/config.toml" ] && cp "$HOME/.codex/config.toml" "$CODEX_RUN_HOME/.codex/config.toml"

# 이 명령은 반드시 timeout=600000(10분)으로 실행
HOME="$CODEX_RUN_HOME" \
codex -c model_reasoning_effort="medium" review - < "$CODEX_PROMPT"
```

위 경로가 로그인/권한/환경 제약으로 실패하면, 그 즉시 Codex 관점 stand-in pass로 전환합니다. 실패한 외부 Codex 결과는 재활용하지 않습니다.

**Gemini perspective**

- Focus: code clarity, alternative approaches, edge cases, documentation gaps, naming
- Output file: `gemini-agent-llm-code-review.md`
- Executor label:
  - `Antigravity CLI (agy)`
  - 또는 `Current runtime (Gemini perspective)`

외부 `agy`(Antigravity CLI)도 선택 사항입니다. 기본 경로는 현재 세션 stand-in pass이며, `agy`는 별도 관점 분리가 필요할 때만 사용합니다.

> **중요 — `agy`는 옛 `gemini`와 동작이 다릅니다.** `agy`는 본디 파일을 직접 수정하는 에이전트형 CLI이며, `gemini --approval-mode plan`에 해당하는 읽기 전용 플래그가 없습니다. `--sandbox`, `--dangerously-skip-permissions`로도 편집을 막지 못합니다. 또한 `--print-timeout`이 지켜지지 않고 수십 분간 행(hang)에 걸릴 수 있으며, 보안 스캔 표현이 들어간 프롬프트는 안전 가드에 의해 거부됩니다. 그러므로 리뷰 전용으로 쓰려면 아래 안전장치를 반드시 갖춥니다. 핵심은 **저장소 바깥 격리 실행**입니다.

1. **저장소 바깥 격리 실행 (핵심)** — `agy`를 본 저장소가 아닌 빈 임시 디렉터리(`mktemp -d`)에서 실행합니다. 리뷰 대상 코드/diff는 프롬프트에 **인라인**으로 넣고, `agy`에게 "파일시스템을 뒤지지 말고 인라인 내용만 보라"고 지시합니다. 이러면 리뷰 대상 diff에 숨은 프롬프트 인젝션("이 파일을 고쳐라")이 성공하더라도 건드릴 저장소 파일이 없습니다(상대경로 편집 무력화). 임시 디렉터리는 저장소의 상위 경로가 아니어야 합니다.
2. **읽기 전용 프롬프트** — 프롬프트 첫머리에 "STRICT READ-ONLY: 절대 파일 수정 금지, 리뷰만 출력"을 명시합니다(절대경로 인젝션 방어).
3. **외부 하드 워치독** — `agy --print-timeout`을 신뢰하지 말고, 셸 타이머로 강제 종료해 행(hang)을 방지합니다(10분 상한).
4. **비파괴적 백스톱** — 실행 전후 본 저장소 `git status`를 비교합니다. 변경이 감지되면 **절대 되돌리지 않고**(사용자의 미커밋 작업물 보호), 경고를 남긴 뒤 `agy` 결과를 폐기하고 stand-in pass로 전환합니다. `git checkout`/`git clean` 류의 파괴적 복구는 금지입니다 — 멀티리뷰는 흔히 미커밋 변경을 리뷰하므로 자동 되돌림은 리뷰 대상 자체를 파괴합니다.
5. **보안 프레이밍 회피** — Gemini 관점은 보안이 아니라 가독성/엣지케이스이므로 "vulnerability/security scan" 같은 표현을 쓰지 않습니다(그런 표현은 `agy`가 거부함).

```bash
# 1) 격리 실행 디렉터리 (저장소 바깥, 저장소의 상위 경로 아님) + 본 저장소 비파괴 스냅샷
AGY_CWD=$(mktemp -d "${TMPDIR:-/tmp}/agy-review.XXXXXX")
REPO_BEFORE=$(git status --porcelain | sort)   # 외부 해시(shasum) 의존 없이 문자열 직접 비교 (이식성)

# 2) 읽기 전용 + 인라인 전용 프롬프트를 임시 파일에 기록 후 stdin 으로 전달
#    (긴 리뷰 대상은 argv 길이 한계(ARG_MAX)에 걸리므로 -p argv 대신 stdin 사용)
PROMPT='STRICT READ-ONLY REVIEW MODE. Do NOT edit, write, or create any file. The code to review is provided INLINE below. Review ONLY the inline content; do NOT search the filesystem or open any files.

Code clarity, alternative approaches, edge cases, documentation gaps, naming에 집중하여 리뷰.

{STRUCTURED_OUTPUT_FORMAT}

아래 코드를 리뷰하세요:
'
PROMPT_FILE="$AGY_CWD/prompt.txt"
{ printf '%s' "$PROMPT"; cat <diff_or_files>; } > "$PROMPT_FILE"   # diff/파일 내용을 뒤에 인라인 첨부

# 3) 빈 격리 cwd 에서 외부 하드 워치독으로 실행 (agy --print-timeout 은 신뢰하지 않음)
#    exec 로 subshell 을 agy 로 치환 → $! 가 실제 agy PID 가 되어 watchdog 가 확실히 종료
( cd "$AGY_CWD" && exec agy --print-timeout 540s -p "" ) < "$PROMPT_FILE" > "$AGY_CWD/raw.out" 2>&1 &
AGY_PID=$!
( sleep 600; kill -9 "$AGY_PID" 2>/dev/null ) &   # 10분 하드 상한
WATCHDOG=$!
wait "$AGY_PID" 2>/dev/null
kill "$WATCHDOG" 2>/dev/null

# 4) 비파괴적 백스톱: 본 저장소가 바뀌었으면 되돌리지 말고 경고 + agy 결과 폐기 → stand-in
REPO_AFTER=$(git status --porcelain | sort)
if [ "$REPO_BEFORE" != "$REPO_AFTER" ]; then
  echo "WARN: agy 가 작업트리를 변경함. agy 패스 폐기, stand-in 으로 전환 (git checkout 금지)." >&2
else
  cat "$AGY_CWD/raw.out"   # 1-4 절차로 gemini-agent-llm-code-review.md 로 정규화
fi
rm -rf "$AGY_CWD"
```

`agy` 호출이 인증 실패·행·보안 가드 거부로 불완전하면, 워치독으로 종료한 뒤 즉시 Gemini 관점 stand-in pass로 전환합니다. 실패한 `agy` 출력은 재활용하지 않습니다.

#### 1-4. Normalize provider outputs

각 pass가 끝나면 결과를 표준 파일 포맷으로 정규화합니다.

```markdown
# {Provider} 코드 리뷰

**날짜:** {YYYY-MM-DD}
**범위:** {리뷰 대상 설명}
**집중 영역:** {provider focus}
**실행자:** {executor label}

## 리뷰 항목

[REVIEW_ITEM]
...
[/REVIEW_ITEM]
```

- 외부 CLI가 구조화 포맷을 어기면, 리더 에이전트가 prose를 읽고 `[REVIEW_ITEM]` 블록으로 변환합니다.
- 메타데이터, 로그, 프롬프트 에코는 제거합니다.
- `[NO_ISSUES_FOUND]` 도 그대로 보존합니다.

### Stage 2: 종합 리뷰 생성

세 개의 `*-agent-llm-code-review.md` 파일을 읽어 `agent_code_review.md`를 생성합니다.

#### 2-1. Parse items

`[REVIEW_ITEM]...[/REVIEW_ITEM]` 블록을 추출합니다.

#### 2-2. Merge duplicates

같은 이슈 판정 기준:

- 같은 파일
- line 차이가 5줄 이내
- category가 같거나 인접 영역

#### 2-3. Classify

| Condition | Action |
|-----------|--------|
| 2개 이상 provider가 같은 문제와 같은 해결 방향에 동의 | FIX |
| 3개 provider가 모두 같은 CRITICAL 문제를 지적 | FIX |
| 명백한 false positive | DISMISS |
| 1개 provider만 지적했고 severity가 CRITICAL 또는 HIGH | AMBIGUOUS |
| 1개 provider만 지적했고 severity가 MEDIUM 또는 LOW | 리더 에이전트가 FIX 또는 DISMISS 판단 |
| 2개 이상 provider가 같은 영역을 봤지만 해결 방향 불일치 | AMBIGUOUS |

DISMISS 또는 1-provider 자체 판정에는 반드시 `Evidence`가 필요합니다.

#### 2-4. Severity re-evaluation

- 2개 이상이 severity에 동의하면 그 값을 사용
- 다르면 더 높은 severity 사용
- 1개만 지적하면 원 severity 유지, confidence는 낮게 해석

#### 2-5. Write `agent_code_review.md`

모든 리뷰 내용은 한국어로 씁니다. 태그와 필드 키만 영어를 유지합니다.

```markdown
# 멀티 LLM 코드 리뷰 (최종)

**날짜:** {YYYY-MM-DD}
**범위:** {리뷰 대상 설명}
**리뷰어:** {완료된 provider 목록}
**원본 파일:** claude-agent-llm-code-review.md, codex-agent-llm-code-review.md, gemini-agent-llm-code-review.md

## 요약

| 액션 | 건수 | CRITICAL | HIGH | MEDIUM | LOW |
|------|------|----------|------|--------|-----|
| 수정(FIX) | N | N | N | N | N |
| 기각(DISMISS) | N | N | N | N | N |
| 검토필요(AMBIGUOUS) | N | N | N | N | N |

## [FIX] #{number}: {한국어 제목}
- **File:** `{path}:{line}`
- **Severity:** {severity}
- **Flagged by:** {providers}
- **수정 내용:** {한국어 설명}
- **Evidence:** {필요한 경우만}

## [DISMISS] #{number}: {한국어 제목}
- **File:** `{path}:{line}`
- **Flagged by:** {provider}
- **기각 사유:** {한국어 설명}
- **Evidence:** {코드 사실 기반 근거}

## [AMBIGUOUS] #{number}: {한국어 제목}
- **File:** `{path}:{line}`
- **Severity:** {severity}
- **Flagged by:** {providers}
- **각 LLM 의견:** {provider별 한국어 요약}
- **애매한 이유:** {한국어 설명}
- **Evidence:** {코드 사실 기반 근거}
- **장단점:** {선택지 비교}
```

### Stage 3: 사용자 승인 후 수정

자동 수정하지 않습니다. 먼저 리뷰 결과를 요약해 사용자에게 보여주고 승인을 받습니다.

#### 3-1. Present summary

사용자에게 아래 정보를 요약합니다.

- FIX 항목 수와 표
- DISMISS 항목 수와 표
- AMBIGUOUS 항목 수와 표
- 상세 내용은 `agent_code_review.md` 참고

#### 3-2. Ask for approval

사용자에게 수정할 항목 번호를 받습니다.

- 전체 수정: `all`
- 선택 수정: `1, 2, 5`
- 수정 안 함: `none`
- FIX만 전부 수정: `fix만`

#### 3-3. Apply only approved items

승인된 항목만 처리합니다.

1. 대상 소스 파일 읽기
2. 제안된 수정 적용
3. 필요하면 진단 도구 실행
4. 프로젝트 테스트 실행
5. 깨지는 수정은 되돌리고 실패 이유 보고
6. 성공적으로 반영된 항목은 `agent_code_review.md`에서 제거

#### 3-4. Update final report

사용자에게 아래를 간단히 보고합니다.

- 수정된 항목 수
- 기각된 항목 수
- 건너뛴 항목 수
- `agent_code_review.md`에 남은 항목 수

## Error Handling

| Failure | Fallback |
|---------|----------|
| `codex` CLI unavailable | 현재 세션이 Codex 관점 stand-in pass 수행 |
| `codex review` fails (권한, 세션 경로, 로그인 포함) | 현재 세션이 Codex 관점 stand-in pass 수행 |
| `agy` CLI unavailable | 현재 세션이 Gemini 관점 stand-in pass 수행 |
| `agy -p` fails/hangs/refuses (인증, 행, 보안 가드 거부 포함) | 워치독으로 종료 후 현재 세션이 Gemini 관점 stand-in pass 수행 |
| `agy` 가 작업트리(추적 파일) 수정 | 되돌리지 않고 경고 + `agy` 결과 폐기 + stand-in 전환 (`git checkout` 금지 — 미커밋 리뷰 대상 보호) |
| 외부 reviewer output is unstructured | 리더 에이전트가 수동 정규화 |
| Diff too large | 파일 그룹으로 분할 후 병합 |
| Provider timeout | 해당 pass를 현재 세션 stand-in으로 재실행 |
| Approved fix breaks tests | 해당 수정 되돌리고 실패 이유 보고 |
| Individual review file write fails | 재시도 후, 실패 사실을 최종 요약에 명시 |

## Examples

```bash
$multi-review
$multi-review src/auth.ts src/middleware/validate.ts
$multi-review --workspace
$multi-review --staged
```

