## Runtime Adapter

- Runtime: Codex
- Invocation: `$xmultiplan`
- Install target: `$CODEX_HOME/skills/xmultiplan` (기본값: `~/.codex/skills/xmultiplan`)
- Support level: full
- Canonical source: `skills/<name>/...`에서 생성된 Codex용 스킬입니다.
- Runtime notes: Codex가 HOST일 때 기본값(`--planner codex --critic claude`)은 Codex가 초안을 인라인으로 작성하고, critic=claude는 외부 `claude -p`로 호출합니다. 외부 `claude` CLI가 없으면 폴백 규칙에 따라 Codex 인라인 stand-in으로 비평하되 "역할 분리 약함"을 명시합니다.
