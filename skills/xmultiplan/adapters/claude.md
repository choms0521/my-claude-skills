## Runtime Adapter

- Runtime: Claude Code
- Invocation: `/xmultiplan`
- Install target: `~/.claude/skills/xmultiplan`
- Support level: full
- Canonical source: `skills/<name>/...`에서 생성된 Claude용 어댑터입니다.
- Runtime notes: Claude가 HOST일 때 기본값(`--planner codex --critic claude`)은 외부 `codex exec`로 초안을 받고 Claude가 인라인으로 비평합니다. critic이 Claude이면 별도 외부 호출 없이 현재 세션이 직접 평가합니다.
