---
name: agent-supervisor
description: "On-demand evaluator that reads recent Claude Code sessions, grades agent conduct (manners + discipline) via a custom judge subagent, interviews the user, and writes a global discipline rules file."
triggers: ["agent-supervisor"]
argument-hint: "[--days 7|3] [--scope global|current]"
runtime: codex
support-level: none
generated-from: skills/agent-supervisor
---

<!-- Generated file. Edit skills/<name>/... and rebuild. -->

## Runtime Adapter

- Runtime: Codex
- Invocation: (not available)
- Install target: (not installed)
- Support level: none (unsupported / 미지원)
- Canonical source: `skills/<name>/...`에서 생성된 Codex용 스텁입니다.

### Why this skill is Claude Code only (Codex unsupported)

agent-supervisor는 Claude Code 전용 스킬이며 Codex 런타임에서는 동작하지 않습니다(미지원). 다음 전제에 의존하기 때문입니다.

- **세션 기록 소스**: Claude Code는 모든 세션을 `~/.claude/projects/<encoded-cwd>/<uuid>.jsonl`에 기록합니다. Codex는 동일한 형식의 세션 JSONL 기록을 같은 위치에 남기지 않으므로, collect 단계의 입력 자체가 존재하지 않습니다.
- **심사관 서브에이전트**: 진단은 `~/.claude/agents/agent-supervisor-judge.md`로 설치되는 커스텀 Claude Code 서브에이전트(시스템 프롬프트 + read-only 도구)에 위임됩니다. Codex에는 이 서브에이전트 발견/위임 기전이 없습니다.
- **문답 surface**: 진단 항목별 3갈래 확인은 Claude Code의 `AskUserQuestion` 도구를 사용합니다. Codex에는 대응 surface가 없습니다.
- **출력 대상**: 전역 지침은 `~/.claude/rules/agent-discipline.md`에 병합되어 모든 Claude Code 세션에 자동 로드됩니다. 이는 Claude Code의 메모리 계층에 한정된 기전입니다.

Codex에서 유사 기능이 필요하다면 별도의 세션 로그 소스·심사관·질문 surface·지침 파일을 정의하는 독립 스킬로 다시 설계해야 합니다. 본 스킬은 그 작업을 수행하지 않습니다.

# Agent Supervisor — 에이전트 행동 진단 및 전역 지침 생성 스킬

최근 Claude Code 세션 기록을 읽어 AI 에이전트의 행동(예절·말투, 규율·정직·명령 준수)을 등급화하고,
사용자와의 문답으로 합의한 규칙을 전역 지침 파일에 고정하는 온디맨드 스킬입니다.

진단은 별도의 심사관 서브에이전트(read-only)에 위임하여 컨텍스트를 격리하고, 민감정보는
수집 단계에서 결정론적 정규식으로 선마스킹합니다. 매 실행의 진단을 이력으로 저장하여
다음 실행 때 개선/악화 추이를 비교합니다.

## 동작 흐름

```
collect (수집·선마스킹·절삭)
  → calibrate (심사관 자가검증)
  → evaluate (심사관 서브에이전트 채점: S/A/B/C/D + 사례)
  → diff (직전 진단과 추이 비교)
  → interview (항목별 3갈래: 의도 / 수정 / 오진)
  → compose (답변 → 규칙 문안)
  → merge (전역 지침 파일 멱등 병합)
  → save history (이번 진단 저장)
```

## Codex 런타임

이 스킬은 Claude Code 전용입니다(Codex 미지원). Claude Code의 세션 JSONL 기록, 심사관 서브에이전트,
대화형 질문 surface, 전역 지침 파일 자동 로드 기전에 의존하므로 Codex 런타임에서는 동작하지 않습니다.
자세한 사유는 어댑터 노트를 참고하십시오.


