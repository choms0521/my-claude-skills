## Runtime Adapter

- Runtime: Claude Code
- Invocation: `/conduct-coach`
- Install target: `~/.claude/skills/conduct-coach`
- Support level: full
- Canonical source: `skills/<name>/...`에서 생성된 Claude용 어댑터입니다.
- Runtime notes: 이 스킬은 Claude Code 세션 JSONL 기록(`~/.claude/projects/**/*.jsonl`)을 읽고, `~/.claude/agents/conduct-judge.md` 심사관 서브에이전트를 멱등 설치하며, 진단 결과를 `~/.claude/rules/agent-discipline.md`에 병합합니다. 진단 이력은 `~/.claude/.conduct-coach/history/`에 저장됩니다.
