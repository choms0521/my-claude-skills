## Runtime Adapter

- Runtime: Codex
- Invocation: `$reauth-docmost`
- Install target: `$CODEX_HOME/skills/reauth-docmost` (기본값: `~/.codex/skills/reauth-docmost`)
- Support level: full
- Canonical source: `skills/<name>/...`에서 생성된 Codex용 스킬입니다.
- Codex 0.151.0+는 `http_headers_helper`가 돌려준 `Authorization`을 예약 헤더로
  거부합니다(`MCP HTTP headers helper returned a reserved header`). 그래서 docmost는
  `~/.codex/config.toml`의 `[mcp_servers.docmost] bearer_token_env_var = "DOCMOST_MCP_TOKEN"`로
  토큰을 받습니다. 이 환경변수는 `~/.codex/docmost-token.env`가 셸 시작 때
  `~/.claude.json`에서 파생시켜 export하고, `~/.zshrc` 등 셸 프로파일이 그 파일을
  source합니다(최초 1회 배선). 따라서 이 스킬이 `~/.claude.json`을 갱신하면 Codex도
  같은 토큰을 쓰며, Codex 설정 자체는 매번 수정하지 않습니다. Codex는 셸 시작 때 값을
  읽으므로, 갱신 후에는 새 셸에서 Codex를 다시 띄워야 새 토큰이 반영됩니다.
