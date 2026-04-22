# Dual-Runtime Skill Architecture

이 저장소는 Claude와 Codex를 동시에 지원할 때, 스킬 본문을 두 벌 수동 관리하지 않기 위한 구조를 사용합니다.

## Directory Layout

```text
.claude/skills/              # 현재 운영 중인 Claude 스킬 원본
skills/<name>/               # 공통 원본(source of truth)
  skill.json                 # 이름, 설명, trigger, 런타임 지원 수준
  common.md                  # 런타임 중립 본문
  <asset-paths...>           # 선택: 스킬이 참조하는 임의의 보조 파일/디렉터리
  adapters/
    claude.md                # Claude 전용 어댑터 노트
    codex.md                 # Codex 전용 어댑터 노트
generated/
  claude/skills/<name>/SKILL.md
  codex/skills/<name>/SKILL.md
.codex/
  skills/<name>/...          # 선택: 프로젝트 로컬 Codex 배포본
tools/
  bootstrap-skills.mjs       # 기존 Claude 스킬을 공통 구조로 초기 이관
  build-skills.mjs           # generated/ 산출물 생성
  sync-codex-project-skills.mjs # generated/codex -> .codex/skills 동기화
  validate-skills.mjs        # 누락/불일치 검사
```

## Support Levels

- `full`: 해당 런타임에서 바로 사용 가능
- `portable`: 큰 수정 없이 포팅 가능
- `adapter-required`: 질문 surface, 에이전트 호출, 경로 차이를 어댑터에서 보정해야 함
- `runtime-specific`: 특정 런타임의 설정 파일/UX에 강하게 결합돼 별도 설계가 필요함

## Commands

```bash
# 기존 .claude/skills/* -> skills/* 스캐폴드 생성
node tools/bootstrap-skills.mjs

# skills/* -> generated/{claude,codex}/skills/* 생성
node tools/build-skills.mjs

# 특정 스킬만 다시 생성
node tools/build-skills.mjs multi-review

# 필수 파일/생성 산출물 검증
node tools/validate-skills.mjs

# 특정 스킬만 검증
node tools/validate-skills.mjs multi-review

# 프로젝트 로컬 Codex 스킬 디렉터리로 동기화
node tools/sync-codex-project-skills.mjs

# 특정 스킬만 프로젝트 로컬 Codex 스킬로 동기화
node tools/sync-codex-project-skills.mjs multi-review
```

## Recommended Workflow For New Skills

1. `skills/<name>/skill.json` 생성
2. `skills/<name>/common.md` 작성
3. 필요한 경우 `skill.json`의 `assets`에 스킬 루트 기준 상대경로를 선언하고 `skills/<name>/` 아래에 둡니다
4. `skills/<name>/adapters/claude.md` 작성
5. `skills/<name>/adapters/codex.md` 작성
6. `node tools/build-skills.mjs <name>`
7. `node tools/validate-skills.mjs <name>`
8. 프로젝트 로컬 Codex 사용 시 `node tools/sync-codex-project-skills.mjs <name>`

공통 본문에서 런타임별 설명이 꼭 필요하면 `common.md` 안에 아래 마커를 사용합니다.

```md
공통 설명

<!-- runtime:claude:start -->
Claude 전용 안내
<!-- runtime:end -->

<!-- runtime:codex:start -->
Codex 전용 안내
<!-- runtime:end -->
```

빌드 시 현재 런타임에 맞는 블록만 남기고 다른 블록은 제거합니다.

## Migration Notes

- 현재는 `.claude/skills/*/SKILL.md`에서 공통 구조를 부트스트랩합니다.
- `assets`는 특정 이름 규약이 아니라 스킬 루트 기준의 임의 상대경로 목록입니다. 파일이든 디렉터리든 선언할 수 있습니다.
- `bootstrap-skills`는 `.claude/skills/<name>/` 아래의 숨김이 아닌 최상위 자산 디렉터리/파일을 감지해 함께 복사합니다. `.omc` 같은 숨김 상태 디렉터리는 재귀적으로 제외합니다.
- `build-skills`는 `SKILL.md`뿐 아니라 `skill.json`의 `assets`에 선언된 경로도 `generated/{runtime}/skills/<name>/`로 함께 복사합니다. 복사 시 숨김 파일/디렉터리는 패키징하지 않습니다.
- 프로젝트에서 Codex가 `./.codex/skills`를 읽도록 운영할 경우, `generated/codex/skills`를 정본 산출물로 보고 `sync-codex-project-skills.mjs`로 로컬 배포본을 갱신합니다.
- 장기적으로는 `skills/*`를 정본으로 보고, `.claude/skills`와 Codex 배포본은 생성물로 다루는 편이 낫습니다.
- `common.md`에 Claude 전용 용어가 남아 있을 수 있으므로, Codex 지원 수준이 `adapter-required` 이상인 스킬은 어댑터 문구를 점진적으로 구체화해야 합니다.
- 런타임 전용 지시가 공통 본문에 섞이면 실제 포팅 난이도와 다르게 문서가 부풀어집니다. 그런 경우 마커 블록으로 분리한 뒤 지원 수준을 다시 판단하는 편이 안전합니다.
