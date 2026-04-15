# persona-builder Skill Installer

> 이 문서를 Claude Code에 전달하면 자동으로 persona-builder 스킬을 설치합니다.

## 설치 지침

아래 단계를 순서대로 실행하세요.

### Step 1: 전역 스킬 디렉토리 생성

```bash
mkdir -p ~/.claude/skills/persona-builder
```

### Step 2: SKILL.md 다운로드

```bash
curl -fsSL -o ~/.claude/skills/persona-builder/SKILL.md \
  "https://raw.githubusercontent.com/choms0521/my-claude-skills/main/.claude/skills/persona-builder/SKILL.md"
```

### Step 3: 설치 확인

```bash
# 파일 존재 확인
ls -la ~/.claude/skills/persona-builder/SKILL.md

# 파일 크기 확인 (0이 아닌지)
wc -l ~/.claude/skills/persona-builder/SKILL.md
```

설치가 완료되면 사용자에게 아래 내용을 안내하세요:

- 설치 경로: `~/.claude/skills/persona-builder/SKILL.md`
- 사용법: `/persona-builder`
- 모든 프로젝트에서 전역으로 사용 가능합니다.

## 설치 후 사용

Claude Code에서 아래 커맨드로 실행:

```bash
# 봇 페르소나 생성 (글로벌 적용)
/persona-builder

# 현재 프로젝트에만 적용
/persona-builder --scope workspace

# 빠르게 (힌트 없이 질문만)
/persona-builder --quick

# 기존 페르소나 삭제
/persona-builder --remove
/persona-builder --remove --scope workspace
```

## 업데이트

최신 버전으로 업데이트하려면 같은 curl 명령을 다시 실행하세요:

```bash
curl -fsSL -o ~/.claude/skills/persona-builder/SKILL.md \
  "https://raw.githubusercontent.com/choms0521/my-claude-skills/main/.claude/skills/persona-builder/SKILL.md"
```

## 제거

```bash
rm -rf ~/.claude/skills/persona-builder
```
