---
name: reauth-docmost
description: "docmost MCP 인증 토큰 갱신 — 로그인된 Chrome 세션의 authToken 쿠키를 복호화해 ~/.claude.json의 docmost Bearer 토큰에 주입하고 재연결을 안내한다. docmost MCP가 토큰 만료/401/unauthorized 오류를 낼 때 사용. Claude는 헤더를 직접 읽고, Codex 0.151.0+는 bearer_token_env_var(DOCMOST_MCP_TOKEN)로 셸 환경에서 읽으며 그 값은 ~/.codex/docmost-token.env가 ~/.claude.json에서 파생시킨다. 한 파일만 갱신하면 두 런타임 공통 적용."
triggers: ["reauth docmost","reauth-docmost","docmost 재인증","docmost 토큰 갱신","docmost 토큰 만료","docmost authToken expired","docmost token expired","docmost 401","docmost unauthorized","docmost 인증 오류","docmost auth error"]
argument-hint: "[--dry-run]"
runtime: claude
support-level: full
generated-from: skills/reauth-docmost
---

<!-- Generated file. Edit skills/<name>/... and rebuild. -->

## Runtime Adapter

- Runtime: Claude Code
- Invocation: `/reauth-docmost`
- Install target: `~/.claude/skills/reauth-docmost`
- Support level: full
- Canonical source: `skills/<name>/...`에서 생성된 Claude용 어댑터입니다.

# reauth-docmost

docmost MCP 서버는 Bearer 토큰으로 인증하는데, 이 토큰 값은 로그인된 docmost
웹 세션(`http://172.31.79.201:3000`)이 들고 있는 `authToken` 쿠키와 동일하다.
이 스킬은 그 쿠키를 로컬 Chrome 쿠키 저장소에서 읽어 복호화한 뒤, 단일 진실
공급원인 `$HOME/.claude.json`의 `mcpServers.docmost.headers.Authorization`에
주입한다. Claude는 이 헤더를 직접 읽는다. Codex 0.151.0 이상은 `http_headers_helper`가
돌려준 `Authorization`을 예약 헤더로 거부하므로, 대신 `bearer_token_env_var`
(`DOCMOST_MCP_TOKEN`)로 셸 환경에서 토큰을 읽는다. 이 환경변수는 `~/.codex/docmost-token.env`가
셸 시작 시 `$HOME/.claude.json`에서 파생시키므로, 이 스킬이 그 한 파일만 갱신하면
두 런타임이 같은 토큰을 쓴다(단일 소스 유지). Codex는 셸 시작 때 값을 읽으므로 갱신
후에는 새 셸에서 Codex를 다시 띄워야 한다.

핵심 로직은 스크립트 자산(`scripts/reauth_docmost.py`)에 있다. 이 문서는 스크립트를
어떻게 실행하고 결과(종료 코드)를 어떻게 해석하는지를 정의한다.

## 언제 실행하나

- 사용자가 명시적으로 이 스킬을 호출할 때
- docmost MCP 도구 호출이 토큰 만료/인증 오류로 실패할 때 (예: 401, unauthorized,
  "token expired", "authentication failed"). 이런 오류 맥락을 보면 이 스킬을 떠올린다.

## 전제

- macOS + Google Chrome이며, 대상 docmost 웹앱에 **현재 로그인된 상태**여야 한다.
  (스크립트는 브라우저가 이미 가진 유효 토큰을 복사할 뿐, 새로 로그인하지 않는다.)
- 스크립트 실행 중 macOS가 "Chrome Safe Storage" 키체인 접근을 물으면 승인해야 한다.
- Python 패키지 `cryptography`가 설치돼 있어야 한다.

## 스크립트 위치

```bash
SKILL_DIR="$HOME/.claude/skills/reauth-docmost"
```

## 1단계 — 드라이런(보고 전용)

먼저 아무것도 쓰지 않고 무엇을 하려는지 확인한다.

```bash
python3 "$SKILL_DIR/scripts/reauth_docmost.py" --dry-run
```

출력에는 추출된 토큰(마스킹), 프로필, 계정 이메일, 만료 시각, 현재 설정 토큰과의
차이, 그리고 Codex 배선 사전점검 결과가 담긴다. 종료 코드로 다음을 판단한다(아래
표 참고). 게이트를 통과하지 못하면(코드 3/4/5 등) 주입하지 말고 그 사유를
사용자에게 그대로 전한다.

## 2단계 — 주입

드라이런이 코드 0으로 통과했을 때만 실제 주입한다.

```bash
python3 "$SKILL_DIR/scripts/reauth_docmost.py"
```

성공하면 스크립트가 `$HOME/.claude.json`을 원자적으로 교체하고, 교체 전 원본을
`.bak-reauth-docmost-<타임스탬프>`로 백업한 경로를 출력한다.

## 3단계 — 재연결 안내

설정 파일을 바꿔도 실행 중인 세션의 MCP 클라이언트는 자동으로 새 토큰을 다시 읽지
않는다. 스킬은 프로세스를 강제 재시작하지 않으므로, 사용자에게 재연결을 안내한다.

- Claude Code: `/mcp`에서 docmost 서버를 재연결하거나 세션을 재시작한다.
- 재연결 후 `docmost_get_current_user` 같은 도구를 한 번 호출해 인증이 회복됐는지 확인한다.

## 종료 코드 해석

| 코드 | 의미 | 다음 행동 |
|---|---|---|
| 0 | 성공(주입 완료) 또는 드라이런 게이트 통과 | 실제 주입이면 3단계 재연결 안내 |
| 2 | 유효한 authToken 쿠키를 못 찾음/복호화 실패 | Chrome에서 `http://172.31.79.201:3000`에 로그인 후 재시도. 키체인 프롬프트 승인 여부 확인 |
| 3 | 추출 토큰이 만료됐거나 곧 만료 | 브라우저에서 재로그인해 새 토큰을 발급받은 뒤 재시도(만료 토큰 주입은 무의미) |
| 4 | 추출 토큰이 이미 설정된 토큰과 동일 | 재실행해도 소용없음. 브라우저에서 재로그인해 새 토큰을 만들어야 함 |
| 5 | `mcpServers.docmost`가 설정에 없음 | docmost MCP 서버를 먼저 구성. 스킬은 항목을 새로 만들지 않음 |
| 1 | 기타 오류 | stderr 메시지 확인(예: `cryptography` 미설치) |

## 안전 참고

- 스크립트는 `$HOME/.claude.json`만 수정한다. Codex는 `~/.codex/docmost-token.env`가
  셸 시작 때 그 파일에서 토큰을 파생시켜 `DOCMOST_MCP_TOKEN`으로 노출하므로, 스킬은
  Codex 설정을 매번 건드릴 필요가 없다(초기 배선은 1회만).
- 매 주입마다 타임스탬프 백업을 남기고, 임시 파일 원자 교체로 쓴다. 원본 파일 권한을
  보존한다. Claude Code가 이 파일에 동시 쓰기를 할 수 있으므로 읽기-수정-쓰기 창을
  짧게 유지하지만, 만약을 위해 백업을 확인할 수 있다.
- 토큰 전체 값은 출력/로그에 남기지 않는다(앞 12자/뒤 8자만 표시).
- Codex 배선(`bearer_token_env_var = "DOCMOST_MCP_TOKEN"` + `~/.codex/docmost-token.env` +
  셸 프로파일의 source)이 불완전하면 드라이런 사전점검이 경고한다. 그 경우 Codex는 갱신을
  상속하지 못하므로 사용자에게 알린다.

## Codex 최초 배선(1회)

Codex가 `bearer_token_env_var`로 토큰을 받으려면 다음이 한 번 갖춰져야 한다(이후 토큰
갱신은 이 스킬이 `$HOME/.claude.json`만 바꾸면 됨).

1. `~/.codex/config.toml`의 docmost 서버: `bearer_token_env_var = "DOCMOST_MCP_TOKEN"`
   (`http_headers_helper`는 제거 — Codex 0.151.0+에서 `Authorization` 예약 헤더 거부).
2. `~/.codex/docmost-token.env`가 `$HOME/.claude.json`에서 토큰을 파생시켜 export.
3. 셸 프로파일(예: `~/.zshrc`)에서 그 파일을 source.

