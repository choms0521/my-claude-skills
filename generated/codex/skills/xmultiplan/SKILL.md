---
name: xmultiplan
description: "Cross-runtime consensus planning. A planner runtime drafts the plan and a critic runtime evaluates it in a closed loop until APPROVE. Roles are configurable: defaults to Codex planner + Claude critic. Plan-only; marks the result pending approval and never executes."
triggers: ["xmultiplan","cross-plan","crossplan"]
argument-hint: "[--planner codex|claude] [--critic codex|claude] [--model M] [--effort medium] [--rounds 2] <task description>"
runtime: codex
support-level: full
generated-from: skills/xmultiplan
---

<!-- Generated file. Edit skills/<name>/... and rebuild. -->

## Runtime Adapter

- Runtime: Codex
- Invocation: `$xmultiplan`
- Install target: `$CODEX_HOME/skills/xmultiplan` (기본값: `~/.codex/skills/xmultiplan`)
- Support level: full
- Canonical source: `skills/<name>/...`에서 생성된 Codex용 스킬입니다.
- Runtime notes: Codex가 HOST일 때 기본값(`--planner codex --critic claude`)은 Codex가 초안을 인라인으로 작성하고, critic=claude는 외부 `claude -p`로 호출합니다. 외부 `claude` CLI가 없으면 폴백 규칙에 따라 Codex 인라인 stand-in으로 비평하되 "역할 분리 약함"을 명시합니다.

# xmultiplan — Cross-runtime consensus planning (Planner ↔ Critic)

xmultiplan은 **계획 초안을 짜는 역할(PLANNER)과 그 초안을 비평하는 역할(CRITIC)을 서로 다른 런타임에 배정**해, 두 역할이 합의(APPROVE)에 도달할 때까지 닫힌 루프를 돌리는 계획 전용 스킬이다. ralplan과 달리 초안 작성자를 자유롭게 고를 수 있고, 기본값은 **Codex가 초안 / Claude가 비평**이다.

xmultiplan은 계획 모듈이다. 컨텍스트를 읽고 계획 문서를 작성·갱신할 수 있으나, 결과물은 항상 `pending approval`로 표시하고 멈춘다. 소스 파일 수정, 커밋, 푸시, PR 생성, 실행 스킬 호출, 구현 위임을 **하지 않는다**.

## 입력

```
$xmultiplan [flags] <task description>
```

| 플래그 | 기본값 | 의미 |
|---|---|---|
| `--planner <codex\|claude>` | `codex` | 초안을 작성할 런타임 |
| `--critic <codex\|claude>` | `claude` | 초안을 비평할 런타임 |
| `--model <model>` | (미지정) | Codex 역할이 외부 호출일 때 `codex exec -m`에 전달할 모델. 미지정 시 사용자의 `~/.codex/config.toml` 기본값을 존중한다 |
| `--effort <minimal\|low\|medium\|high\|xhigh>` | `medium` | Codex 역할의 추론 강도(`model_reasoning_effort`). 어려운 설계는 `high` 권장 |
| `--rounds <N>` | `2` | PLANNER↔CRITIC 최대 반복 횟수(1 이상 4 이하로 클램프) |

## 핵심 개념 — HOST 런타임과 역할 배정

- **HOST**: 지금 이 스킬을 실행 중인 런타임(Claude 또는 Codex).
- 역할이 **HOST에 배정**되면 **인라인**으로 수행한다(외부 프로세스 없음).
- 역할이 **HOST가 아닌 런타임**에 배정되면 **외부 CLI**로 호출한다(`codex exec` 또는 `claude -p`).
- 기본값(`--planner codex --critic claude`)을 Claude에서 실행하면: 초안은 외부 `codex exec`, 비평은 인라인 Claude. Codex에서 실행하면: 초안은 인라인 Codex, 비평은 외부 `claude -p`.

## 절차

### 0. 인자 파싱과 역할 해석

1. 마지막 플래그 뒤의 자유 텍스트를 `<task description>`으로 본다. 비어 있으면 사용자에게 한 줄로 작업 설명을 요청하고 멈춘다.
2. `--planner`, `--critic`을 정규화한다(소문자, 미지정 시 기본값). 값이 `codex`/`claude`가 아니면 오류로 멈춘다.
3. `--rounds`는 정수로 파싱 후 1~4로 클램프한다. `--effort`는 허용값 집합에 없으면 `medium`으로 되돌린다.
4. 각 역할에 대해 `runtime == HOST`이면 `inline`, 아니면 `external`로 표시한다.

### 1. 가드(boundary guard)

- **동일 컨텍스트 자가검토 경고**: PLANNER와 CRITIC이 **모두 HOST에 인라인 배정**되면(예: Claude HOST에서 `--planner claude --critic claude`) 같은 컨텍스트가 스스로를 승인하는 꼴이다. 이 경우 한 줄 경고를 남기고, 한쪽 역할을 다른 런타임으로 옮기길 권한다. 그래도 진행하되 최종안에 "역할 분리 약함" 주석을 남긴다.
- 두 역할이 모두 **HOST가 아닌 같은 런타임**이면(예: Claude HOST에서 둘 다 codex) 서로 다른 두 외부 프로세스라 컨텍스트는 분리된다. 다만 같은 모델이므로 관점 다양성은 제한적임을 1줄 알린다.
- 실행 경계는 절대 넘지 않는다(아래 "금지 사항").

### 2. PLANNER 초안 (round 1)

PLANNER에게 아래 **초안 계약**에 맞춘 계획을 요청한다. `inline`이면 HOST가 직접 작성하고, `external`이면 해당 런타임 harness로 호출한다.

초안 계약(PLANNER가 산출할 형식):

```
# Plan: <한 줄 제목>

## RALPLAN-DR Summary
- Principles (3~5개): 이 계획을 관통하는 원칙
- Decision Drivers (상위 3개): 무엇이 설계를 좌우했는가
- Viable Options (2개 이상): 각 선택지의 bounded pros/cons, 그리고 선택한 안과 그 근거
  (살아남은 안이 하나뿐이면 나머지를 왜 배제했는지 명시)

## Plan Steps
- 순서가 있는 단계. 각 단계마다: 목표 / 산출물 / **측정 가능한 종료 조건**
  (종료 조건은 "정상 동작" 같은 모호한 표현 금지. 실행 가능한 명령이나 측정 가능한 결과로)

## Acceptance Criteria
- 테스트 가능한 수용 기준. 구체적 명령/조건과 통과 기준을 함께

## Risks & Mitigations
- 주요 위험과 각각의 구체적 완화책
```

### 3. CRITIC 평가

CRITIC에게 PLANNER의 현재 초안 전문을 주고 아래 **비평 계약**으로 평가시킨다.

비평 계약(CRITIC이 산출할 형식):

```
Verdict: APPROVE | ITERATE | REJECT

(APPROVE가 아니면) Findings — 번호 매긴 구체적·실행 가능한 지적:
다음 기준에 비추어 평가한다.
1. 원칙-선택지 일관성: Principles와 선택한 Option이 모순되지 않는가
2. 공정한 대안: 2개 이상의 대안이 진지하게(허수아비 아님) 비교됐는가
3. 위험 완화의 구체성: 각 위험에 실효성 있는 완화책이 있는가
4. 수용 기준의 검증 가능성: 모호한 표현 없이 테스트 가능한가
5. 단계 종료 조건의 측정 가능성: 각 단계가 측정 가능한 종료 조건을 갖는가
```

CRITIC은 반드시 셋 중 하나의 Verdict를 첫 줄에 낸다. `ITERATE`/`REJECT`면 PLANNER가 고칠 수 있도록 항목별로 무엇을 어떻게 보완해야 하는지 적는다.

### 4. 재검토 루프 (최대 `--rounds`회)

`APPROVE`가 아니면 한 라운드를 더 돈다.

1. CRITIC의 Findings를 수집한다.
2. PLANNER에게 **직전 초안 전문 + CRITIC Findings**를 함께 주고 수정본을 요청한다(외부 호출은 stateless이므로 매 라운드 전체 맥락을 프롬프트에 다시 싣는다).
3. 다시 CRITIC 평가로 돌아간다.
4. `APPROVE` 또는 `--rounds` 도달까지 반복한다.
5. `--rounds` 안에 `APPROVE`에 못 미치면, 가장 마지막(최선) 버전을 제시하되 미해결 Findings를 함께 남긴다.

### 5. 최종안 정착

1. 최종 계획을 `pending approval`로 표시한다.
2. `docs/plans/` 아래에 `xmultiplan-<작업-슬러그>.md`로 저장한다. `docs/plans/`가 없으면 만든다. 최종안에는 ADR 블록(Decision / Drivers / Alternatives considered / Why chosen / Consequences / Follow-ups)을 포함한다.
3. 어떤 변이(mutation)·위임도 하지 않고, 합의 결과 요약(라운드 수, 최종 Verdict, 사용한 PLANNER/CRITIC 런타임·모델, 저장 경로)을 보고하고 멈춘다.

## 외부 런타임 호출 harness

`external` 역할에만 사용한다. 외부 CLI는 반드시 **10분 상한**으로 실행한다(런타임이 명시적 timeout을 지원하면 `timeout=600000`, 아니면 셸 `timeout`/`gtimeout` 같은 watchdog로 같은 상한을 강제). 긴 프롬프트는 argv에 직접 넣지 말고 stdin/임시 파일로 넘긴다.

### Codex 역할 (`codex exec`, 읽기 전용)

```bash
CODEX_RUN_PARENT="$HOME/.codex-run-tmp"
mkdir -p "$CODEX_RUN_PARENT"
CODEX_PROMPT="$(mktemp "$CODEX_RUN_PARENT/xmultiplan-prompt-XXXXXX.txt")"
CODEX_OUT="$(mktemp "$CODEX_RUN_PARENT/xmultiplan-out-XXXXXX.md")"
CODEX_RUN_HOME="$(mktemp -d "$CODEX_RUN_PARENT/home-XXXXXX")"
cleanup() { rm -rf "$CODEX_RUN_HOME" "$CODEX_PROMPT" "$CODEX_OUT"; }
trap cleanup EXIT INT TERM

# 역할 프롬프트(초안 계약 또는 비평 계약) + 작업 맥락을 프롬프트 파일에 기록
cat > "$CODEX_PROMPT" <<'EOF'
<role contract + task description + (재검토면) 직전 초안 전문과 CRITIC Findings>
EOF

mkdir -p "$CODEX_RUN_HOME/.codex"
[ -f "$HOME/.codex/auth.json" ] && cp "$HOME/.codex/auth.json" "$CODEX_RUN_HOME/.codex/auth.json"
[ -f "$HOME/.codex/config.toml" ] && cp "$HOME/.codex/config.toml" "$CODEX_RUN_HOME/.codex/config.toml"

# 반드시 timeout=600000(10분). -s read-only 로 저장소를 건드리지 못하게 한다.
# --model 은 --model 플래그가 있을 때만 붙인다(없으면 사용자 기본 모델 존중).
HOME="$CODEX_RUN_HOME" \
codex exec -s read-only \
  -c model_reasoning_effort="${EFFORT:-medium}" \
  ${MODEL:+-m "$MODEL"} \
  -o "$CODEX_OUT" \
  - < "$CODEX_PROMPT"

# 계획/비평 텍스트는 "$CODEX_OUT" 에 최종 메시지로 기록된다. 그 파일을 읽어 다음 단계로 넘긴다.
```

- 계획은 텍스트 생성이지 저장소 편집이 아니므로 PLANNER도 반드시 `-s read-only`로 돈다.
- `-s read-only`는 저장소 *수정*만 막을 뿐, planning 중 PLANNER가 cwd의 파일을 *읽는* 것은 허용된다(코드 맥락을 반영한 더 정확한 계획을 위한 의도된 동작이다).
- `codex exec -o <FILE>`은 에이전트의 **최종 메시지만** 파일에 기록하므로 stdout 로그를 파싱할 필요가 없다.
- 로그인/권한/환경 제약으로 호출이 실패하거나 출력이 비면 즉시 폴백(아래)으로 전환한다. 실패한 외부 결과는 재활용하지 않는다.

### Claude 역할 (`claude -p`, 비대화형)

```bash
CLAUDE_PROMPT="$(mktemp "${TMPDIR:-/tmp}/xmultiplan-claude-XXXXXX.txt")"
cleanup_c() { rm -f "$CLAUDE_PROMPT"; }
trap cleanup_c EXIT INT TERM

cat > "$CLAUDE_PROMPT" <<'EOF'
<role contract + task description + (재검토면) 직전 초안 전문과 CRITIC Findings>
EOF

# 반드시 timeout=600000(10분). 비대화형 텍스트 출력.
claude -p --output-format text < "$CLAUDE_PROMPT"
```

- Claude가 HOST이고 critic=claude(기본값)이면 이 harness를 쓰지 않고 **인라인**으로 비평한다. 이 harness는 Claude가 HOST가 아닌(즉 Codex가 HOST인) 상황에서 claude 역할을 외부로 부를 때만 쓴다.

### 폴백 (graceful stand-in)

- 어떤 `external` 역할의 CLI가 PATH에 없거나 로그인/권한으로 실패하면, **그 역할을 HOST 런타임의 인라인 stand-in으로 수행**한다. 단 이 경우 역할 분리가 약해지므로(특히 PLANNER와 CRITIC이 둘 다 HOST stand-in으로 수렴하면) 최종안에 "런타임 폴백 발생: 역할 분리 약함" 경고를 명시한다.
- 폴백 stand-in은 원래 역할의 관점을 유지한다(예: Codex PLANNER 폴백이면 "다른 모델이라면 어떻게 짰을지" 관점으로 초안을 짠다).

## 금지 사항 (execution boundary)

- 소스 파일 편집, 파일 생성/삭제(계획 문서 `docs/plans/*.md` 저장 제외), 커밋, 푸시, PR 생성.
- 실행 스킬 호출이나 구현 위임.
- 외부 PLANNER가 read-only를 우회해 저장소를 수정하려 시도하면 그 결과를 폐기하고 폴백으로 전환한다.
- 사용자가 같은 턴에서 명시적으로 실행을 승인하기 전에는 어떤 변이도 일으키지 않는다.

