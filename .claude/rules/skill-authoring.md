# Skill Authoring Workflow

이 저장소에서 새 스킬을 만들거나 기존 스킬을 수정할 때는 `.claude/skills`나 `generated/*`를 직접 편집하지 않습니다.
정본은 항상 `skills/<name>/`입니다.

## 기본 원칙

- 실제 수정 위치: `skills/<name>/...`
- 생성물: `generated/{claude,codex}/skills/<name>/...`
- Claude 노출 경로: `.claude/skills/<name>/SKILL.md`
- Codex 프로젝트 로컬 노출 경로: `.codex/skills/<name>/...`

Claude 쪽 `SKILL.md`는 generated Claude 산출물을 가리키도록 연결되어 있으므로, generated를 다시 만들면 반영됩니다.

## 새 스킬 생성 순서

1. `skills/<name>/skill.json` 생성
2. `skills/<name>/common.md` 작성
3. 필요하면 보조 파일/디렉터리를 `skills/<name>/` 아래에 추가
4. `skills/<name>/adapters/claude.md` 작성
5. `skills/<name>/adapters/codex.md` 작성
6. `node tools/build-skills.mjs <name>`
7. `node tools/validate-skills.mjs <name>`
8. Codex 프로젝트 로컬 배포본이 필요하면 `node tools/sync-codex-project-skills.mjs <name>`

## 각 파일의 역할

- `skill.json`: 이름, 설명, trigger, argument hint, 런타임 지원 수준, 자산 목록
- `common.md`: Claude/Codex 공통 본문
- `adapters/claude.md`: Claude용 호출 방식과 런타임 노트
- `adapters/codex.md`: Codex용 호출 방식과 런타임 노트

## assets 규칙

스킬이 스크립트, 템플릿, 데이터 파일, 질문지 같은 보조 자산을 쓰면 `skill.json`의 `assets`에 스킬 루트 기준 상대경로를 선언합니다.

예시:

```json
{
  "assets": ["scripts", "templates/report.md", "data"]
}
```

주의:

- `assets`는 특정 디렉터리 이름 집합이 아니라 임의 상대경로 목록입니다
- 파일과 디렉터리 모두 가능
- 숨김 상태 디렉터리나 런타임 찌꺼기(`.omc` 등)는 자산으로 넣지 않습니다

## 작성 시 주의점

- `generated/*`를 직접 수정하지 않습니다
- `.claude/skills/*/SKILL.md`를 직접 수정하지 않습니다
- 공통 내용은 `common.md`에 쓰고, 런타임 차이만 adapter에 둡니다
- 스킬 본문에서 상대경로 자산을 참조하면 반드시 `assets`에 선언합니다
- Codex에서 바로 안 되는 Claude 전용 전제(`AskUserQuestion`, `~/.claude/...`, OMC 전용 호출 등)는 `common.md`에 무심코 늘리지 말고 adapter/codex에서 보정 전략을 적습니다
- README에 스킬 추가/변경/삭제 내용을 PR 전에 반영합니다

## 자주 하는 실수

- `skills/<name>`만 바꾸고 build를 안 돌림
- build는 했지만 Codex 프로젝트 로컬 배포본 sync를 안 해서 `.codex/skills`가 stale 됨
- 보조 자산을 추가하고도 `assets`에 선언하지 않음
- runtime-specific 스킬인데 common 본문을 억지로 완전 공통화하려고 함

## 빠른 체크리스트

- `skills/<name>/skill.json`에 메타데이터가 있는가
- `assets`가 실제 자산 경로와 일치하는가
- `node tools/build-skills.mjs <name>`를 실행했는가
- `node tools/validate-skills.mjs <name>`를 실행했는가
- Codex 프로젝트 로컬 사용 시 `node tools/sync-codex-project-skills.mjs <name>`를 실행했는가
