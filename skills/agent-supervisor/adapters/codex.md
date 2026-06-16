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
