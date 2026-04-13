# fe-interview Skill Installer

> 이 문서를 Claude Code에 전달하면 자동으로 저장소를 클론하고 fe-interview 스킬을 전역 설치합니다.

## 설치 지침

아래 단계를 순서대로 실행하세요.

### Step 1: 저장소 클론

```bash
# 이미 클론된 경우 이 단계를 건너뛰세요
git clone https://github.com/choms0521/my-claude-skills.git ~/my-claude-skills
```

> 클론 경로는 원하는 위치로 변경 가능합니다. 이하 예시에서는 `~/my-claude-skills`를 기준으로 합니다.

### Step 2: 전역 스킬 디렉토리 생성

```bash
mkdir -p ~/.claude/skills
```

### Step 3: 심볼릭 링크로 전역 설치

```bash
# 기존에 동일 이름 디렉토리가 있으면 제거
rm -rf ~/.claude/skills/fe-interview

# 심볼릭 링크 생성
ln -sfn ~/my-claude-skills/.claude/skills/fe-interview ~/.claude/skills/fe-interview
```

### Step 4: 설치 확인

```bash
# 심볼릭 링크 확인
ls -la ~/.claude/skills/fe-interview

# 주요 파일 존재 확인
ls ~/.claude/skills/fe-interview/SKILL.md
ls ~/.claude/skills/fe-interview/graph/_graph.json
ls ~/.claude/skills/fe-interview/knowledge/_index.md
```

## 설치 후 사용

Claude Code에서 아래 커맨드로 실행:

```bash
# 기본 면접 연습 (Graph Mode)
/fe-interview

# 레벨/길이 지정
/fe-interview --level senior --length short

# Classic Mode (그래프 없이 knowledge 파일 기반)
/fe-interview --mode classic --level mid

# 이력서 기반 면접
/fe-interview --resume ./resume.pdf --length medium
```

## 업데이트

저장소를 pull하면 심볼릭 링크를 통해 자동으로 최신 버전이 반영됩니다:

```bash
cd ~/my-claude-skills && git pull
```

## 제거

```bash
rm ~/.claude/skills/fe-interview
```

> 심볼릭 링크만 제거되며 원본 저장소는 유지됩니다.
