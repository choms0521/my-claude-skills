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
| **mp3-downloader** | YouTube/YouTube Music에서 MP3 다운로드 (yt-dlp+ffmpeg 기반, 자동 의존성 설치, 디렉토리 자동 생성) | `/mp3-downloader <url> [--out <dir>]` |
| **fe-interview** | 프론트엔드 면접 코치 — Knowledge Graph 기반 적응형 면접. 3명 면접관(CTO/팀리드/시니어), S/A/B/C/D 등급, 합의 평가, 개선 로드맵 | `/fe-interview [--mode graph\|classic] [--resume <파일>] [--level junior\|mid\|senior] [--length short\|medium\|long]` |

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

# YouTube URL에서 MP3 다운로드 (기본 ~/mp3에 저장)
/mp3-downloader https://www.youtube.com/watch?v=xxxxx

# 커스텀 경로에 저장
/mp3-downloader https://www.youtube.com/watch?v=xxxxx --out $HOME/Music

# 영상 설명에서 트랙 링크 추출 후 다운로드
/mp3-downloader --extract-from-description https://www.youtube.com/watch?v=xxxxx

# 프론트엔드 면접 연습 (기본 - 연차 입력 후 시작, Graph Mode)
/fe-interview

# 이력서 기반 면접 연습
/fe-interview --resume ./resume.pdf --length medium

# 시니어 레벨 짧은 세션
/fe-interview --level senior --length short

# Classic Mode — knowledge/ 파일 기반 질문 (그래프 없이)
/fe-interview --mode classic --level mid

# 테스트 모드 (Graph Mode 전용)
# Dry-run: 질문 시퀀스/면접관 배분 검증 (~1분)
/fe-interview --test dry-run --level mid --length short

# Tester Agent: AI가 주니어로 답변, 등급 C-D 나오는지 검증
/fe-interview --test agent:junior --length short

# Tester Agent: AI가 시니어로 답변, 등급 A-S 나오는지 검증
/fe-interview --test agent:senior --length short
```

## 설치

### Claude Code로 바로 설치

Claude Code에서 아래 프롬프트를 입력하면 스킬이 즉시 설치됩니다.

**심볼릭 링크 방식** — `git pull`로 항상 최신 상태 유지:

```
이 저장소(https://github.com/choms0521/my-claude-skills)를 클론하고,
.claude/skills/ 하위 스킬들을 ~/.claude/skills/에 심볼릭 링크로 설치해줘
```

**복사 방식** — 독립적으로 사용, 원본 저장소 불필요:

```
이 저장소(https://github.com/choms0521/my-claude-skills)의 .claude/skills/ 하위 스킬들을
~/.claude/skills/에 복사해서 설치해줘
```

Claude Code가 저장소 클론부터 설치까지 알아서 처리합니다.

> **참고:** 심볼릭 링크 방식은 `~/.claude/skills/`에 동일 이름의 디렉토리가 이미 있으면 실패할 수 있습니다. 기존 디렉토리를 먼저 삭제하도록 프롬프트에 추가하거나, Claude Code가 안내할 때 확인하세요.

### 수동 설치

이 저장소의 스킬을 모든 프로젝트에서 사용하려면 `~/.claude/skills/`에 심볼릭 링크를 생성하거나 직접 복사합니다.

> **주의:** 대상 경로에 이미 일반 디렉토리가 존재하면 심볼릭 링크 생성이 실패합니다. 기존 디렉토리가 있다면 먼저 삭제(`rm -rf ~/.claude/skills/<스킬명>`)한 후 실행하세요.

### 전체 스킬 일괄 설치

```bash
# ~/.claude/skills 디렉토리 확인
mkdir -p ~/.claude/skills

# 각 스킬을 심볼릭 링크로 연결
ln -sfn /path/to/my-claude-skills/.claude/skills/multi-review ~/.claude/skills/multi-review
ln -sfn /path/to/my-claude-skills/.claude/skills/check-github-copilot-review ~/.claude/skills/check-github-copilot-review
ln -sfn /path/to/my-claude-skills/.claude/skills/mp3-downloader ~/.claude/skills/mp3-downloader
ln -sfn /path/to/my-claude-skills/.claude/skills/fe-interview ~/.claude/skills/fe-interview
```

### 개별 스킬 설치

```bash
# multi-review만 설치
ln -sfn /path/to/my-claude-skills/.claude/skills/multi-review ~/.claude/skills/multi-review

# check-github-copilot-review만 설치
ln -sfn /path/to/my-claude-skills/.claude/skills/check-github-copilot-review ~/.claude/skills/check-github-copilot-review

# mp3-downloader만 설치
ln -sfn /path/to/my-claude-skills/.claude/skills/mp3-downloader ~/.claude/skills/mp3-downloader

# fe-interview만 설치
ln -sfn /path/to/my-claude-skills/.claude/skills/fe-interview ~/.claude/skills/fe-interview
```

### 스킬 파일 직접 복사 (심볼릭 링크 대신)

```bash
# 저장소 업데이트와 동기화하지 않아도 되는 경우
cp -r /path/to/my-claude-skills/.claude/skills/check-github-copilot-review ~/.claude/skills/
```

### 설치 확인

설치 후 Claude Code에서 `/fe-interview`, `/multi-review`, `/check-github-copilot-review` 등을 입력하면 스킬이 로드됩니다.

> **참고:** 심볼릭 링크 방식은 이 저장소를 `git pull`하면 자동으로 최신 스킬이 반영됩니다.

## fe-interview 스킬 상세

### 개요

Knowledge Graph 기반 적응형 프론트엔드 면접 코치입니다. 121개 개념 노드와 161개 엣지로 구성된 지식 그래프를 탐색하며, 3명의 면접관이 협력하여 면접을 진행합니다.

### 면접관 페르소나

| 면접관 | 역할 | 담당 영역 |
|--------|------|-----------|
| CTO | 아키텍처·시스템 설계 관점 평가 | System Design, Architecture, Performance |
| 팀리드 | 실무 협업·코드 품질 관점 평가 | React, Testing, Accessibility, Next.js |
| 시니어 개발자 | 기초·심화 기술 관점 평가 | JavaScript, HTML/CSS, TypeScript, Security |

### 두 가지 모드

- **Graph Mode** (기본): `_graph.json` 지식 그래프를 탐색하며 동적 질문 생성. 적응형 난이도 조절, 꼬리질문, 크로스 토픽 질문 지원
- **Classic Mode** (`--mode classic`): `knowledge/` 디렉토리의 마크다운 파일에서 직접 질문. 그래프 없이 간단하게 사용

### 세션 길이

| 길이 | 질문 수 | 예상 소요 시간 |
|------|---------|---------------|
| short | 5-7문제 | ~20분 |
| medium (기본) | 10-12문제 | ~40분 |
| long | 15-18문제 | ~60분 |

### 평가 체계

각 질문에 대해 S/A/B/C/D 등급으로 평가하고, 세션 종료 후 3명 면접관이 합의하여 종합 리포트를 생성합니다:
- 카테고리별 강점/약점 분석
- 개선 우선순위 로드맵
- 추천 학습 자료

### 테스트 모드 (Graph Mode 전용)

스킬의 질문 품질과 평가 정확도를 검증하기 위한 자동화 모드입니다:

- **Dry-run** (`--test dry-run`): 답변 없이 질문 시퀀스, 면접관 배분, 그래프 탐색 경로만 검증 (~1분)
- **Tester Agent** (`--test agent:junior|mid|senior`): AI가 지정된 레벨로 답변하며 전체 프로세스 검증 (~10-20분)

### 파일 구조

```
.claude/skills/fe-interview/
├── SKILL.md                    # 스킬 정의 (891줄)
├── graph/
│   ├── _graph.json             # 지식 그래프 (121노드, 161엣지)
│   ├── nodes/**/*.json         # 노드별 상세 (11개 카테고리)
│   ├── roles/*.json            # 면접관 역할 정의
│   └── history/session-log.json # 세션 이력 (로컬 전용)
├── knowledge/                  # 카테고리×레벨별 질문 파일 (39개)
└── scripts/
    ├── graph-cli.py            # 그래프 관리 CLI
    └── update_knowledge.sh     # 질문 현황 확인
```

### fe-interview 단독 설치

fe-interview 스킬만 별도로 설치하려면 `fe-interview-installer.md` 문서를 참고하세요. Claude Code에 해당 문서를 붙여넣으면 자동으로 설치됩니다.

```bash
# 심볼릭 링크 (저장소 클론 후)
ln -sfn /path/to/my-claude-skills/.claude/skills/fe-interview ~/.claude/skills/fe-interview

# 또는 직접 복사
cp -r /path/to/my-claude-skills/.claude/skills/fe-interview ~/.claude/skills/
```

> **참고:** fe-interview는 `graph/`, `knowledge/`, `scripts/` 하위 디렉토리를 모두 포함하므로 SKILL.md만 복사하면 동작하지 않습니다. 디렉토리 전체를 복사하세요.

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
- (자동 설치) `yt-dlp`, `ffmpeg` — mp3-downloader 스킬에 필요 (미설치 시 스크립트가 자동 설치 시도)

Codex/Gemini CLI가 미설치된 경우 Claude만 사용하여 동작합니다.
