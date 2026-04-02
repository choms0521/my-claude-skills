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
| **check-github-copilot-review** | GitHub Copilot 리뷰 코멘트 자동 처리 (코드 수정/기각 + 댓글 + resolve + 커밋·푸시, 최대 3사이클 자동 폴링) | `/check-github-copilot-review [PR URL \| PR번호] [--reset]` |

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

# 현재 브랜치 PR의 Copilot 리뷰 처리 (사이클 1부터 시작, 최대 3사이클 자동 폴링)
/check-github-copilot-review

# 특정 PR의 Copilot 리뷰 처리
/check-github-copilot-review 123
/check-github-copilot-review https://github.com/owner/repo/pull/456

# 사이클 초기화 후 처음부터 다시 시작
/check-github-copilot-review --reset
/check-github-copilot-review 123 --reset
```

## 설치

### Claude Code로 바로 설치

Claude Code에서 아래 프롬프트를 입력하면 스킬이 즉시 설치됩니다:

```
이 저장소(https://github.com/choms0521/my-claude-skills)의 .claude/skills/ 하위 스킬들을
~/.claude/skills/에 심볼릭 링크로 설치해줘
```

저장소를 먼저 클론한 뒤, Claude Code가 알아서 심볼릭 링크를 생성하고 설치를 완료합니다.

### 수동 설치

이 저장소의 스킬을 모든 프로젝트에서 사용하려면 `~/.claude/skills/`에 심볼릭 링크를 생성합니다.

> **주의:** 대상 경로에 이미 일반 디렉토리가 존재하면 심볼릭 링크 생성이 실패합니다. 기존 디렉토리가 있다면 먼저 삭제(`rm -rf ~/.claude/skills/<스킬명>`)한 후 실행하세요.

### 전체 스킬 일괄 설치

```bash
# ~/.claude/skills 디렉토리 확인
mkdir -p ~/.claude/skills

# 각 스킬을 심볼릭 링크로 연결
ln -sfn /path/to/my-claude-skills/.claude/skills/multi-review ~/.claude/skills/multi-review
ln -sfn /path/to/my-claude-skills/.claude/skills/check-github-copilot-review ~/.claude/skills/check-github-copilot-review
```

### 개별 스킬 설치

```bash
# multi-review만 설치
ln -sfn /path/to/my-claude-skills/.claude/skills/multi-review ~/.claude/skills/multi-review

# check-github-copilot-review만 설치
ln -sfn /path/to/my-claude-skills/.claude/skills/check-github-copilot-review ~/.claude/skills/check-github-copilot-review
```

### 스킬 파일 직접 복사 (심볼릭 링크 대신)

```bash
# 저장소 업데이트와 동기화하지 않아도 되는 경우
cp -r /path/to/my-claude-skills/.claude/skills/check-github-copilot-review ~/.claude/skills/
```

### 설치 확인

설치 후 Claude Code에서 `/check-github-copilot-review` 또는 `/multi-review`를 입력하면 스킬이 로드됩니다.

> **참고:** 심볼릭 링크 방식은 이 저장소를 `git pull`하면 자동으로 최신 스킬이 반영됩니다.

## 스킬 추가 방법

1. `.claude/skills/<새-스킬명>/SKILL.md` 파일 생성
2. YAML frontmatter에 `name`, `description`, `triggers` 정의
3. 실행 프로토콜 작성
4. 이 README의 스킬 테이블에 추가

## 요구사항

- [Claude Code](https://claude.com/claude-code) CLI
- [GitHub CLI](https://cli.github.com/) (`gh`) — check-github-copilot-review 스킬에 필수
- (선택) [Codex CLI](https://github.com/openai/codex) — `npm install -g @openai/codex` (`codex review`로 직접 호출)
- (선택) OMC CLI — Gemini 디스패치에 사용 (`omc ask gemini`)
- (선택) [Gemini CLI](https://github.com/google/gemini-cli) — `npm install -g @google/gemini-cli` (OMC를 통해 호출)

Codex/Gemini CLI가 미설치된 경우 Claude만 사용하여 동작합니다.
