# My Claude Skills

Claude Code에서 사용하는 커스텀 스킬 모음 저장소입니다.

직접 만든 스킬들을 지속적으로 추가하고 관리하기 위한 공간입니다.

> **참고:** `src/` 디렉토리는 스킬 테스트·데모용 샘플 코드입니다. 실제 서비스 코드가 아닙니다.

## 구조

```
.claude/skills/
└── <skill-name>/
    └── SKILL.md        ← 스킬 정의 파일
```

각 스킬은 `.claude/skills/<skill-name>/SKILL.md` 형태로 구성됩니다.

## 등록된 스킬

| 스킬 | 설명 | 사용법 |
|------|------|--------|
| **multi-review** | 3개 LLM(Claude, Codex, Gemini) 병렬 코드 리뷰 + 종합 + 사용자 승인 후 수정 | `/multi-review [파일 \| --workspace \| --staged]` |

## 스킬 추가 방법

1. `.claude/skills/<새-스킬명>/SKILL.md` 파일 생성
2. YAML frontmatter에 `name`, `description`, `triggers` 정의
3. 실행 프로토콜 작성
4. 이 README의 스킬 테이블에 추가

## 스킬 사용

Claude Code에서 슬래시 커맨드로 호출:

```bash
# 브랜치 변경사항 리뷰 (기본)
/multi-review

# 특정 파일 리뷰
/multi-review src/auth.ts src/api.ts

# 워크스페이스 전체 리뷰
/multi-review --workspace

# 스테이징된 변경만 리뷰
/multi-review --staged
```

## 요구사항

- [Claude Code](https://claude.com/claude-code) CLI
- (선택) OMC CLI — Codex/Gemini 디스패치에 사용 (`omc ask`)
- (선택) [Codex CLI](https://github.com/openai/codex) — `npm install -g @openai/codex` (OMC를 통해 호출)
- (선택) [Gemini CLI](https://github.com/google/gemini-cli) — `npm install -g @google/gemini-cli` (OMC를 통해 호출)

OMC 또는 Codex/Gemini CLI가 미설치된 경우 Claude만 사용하여 동작합니다.
