# Dual-Runtime Skill Architecture

이 저장소는 Claude와 Codex를 동시에 지원할 때, 스킬 본문을 두 벌 수동 관리하지 않기 위한 구조를 사용합니다.

## Directory Layout

```text
.claude/skills/              # 현재 운영 중인 Claude 스킬 원본
skills/<name>/               # 공통 원본(source of truth)
  skill.json                 # 이름, 설명, trigger, 런타임 지원 수준
  common.md                  # 런타임 중립 본문
  adapters/
    claude.md                # Claude 전용 어댑터 노트
    codex.md                 # Codex 전용 어댑터 노트
generated/
  claude/skills/<name>/SKILL.md
  codex/skills/<name>/SKILL.md
tools/
  bootstrap-skills.mjs       # 기존 Claude 스킬을 공통 구조로 초기 이관
  build-skills.mjs           # generated/ 산출물 생성
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
```

## Recommended Workflow For New Skills

1. `skills/<name>/skill.json` 생성
2. `skills/<name>/common.md` 작성
3. `skills/<name>/adapters/claude.md` 작성
4. `skills/<name>/adapters/codex.md` 작성
5. `node tools/build-skills.mjs <name>`
6. `node tools/validate-skills.mjs <name>`

## Migration Notes

- 현재는 `.claude/skills/*/SKILL.md`에서 공통 구조를 부트스트랩합니다.
- 장기적으로는 `skills/*`를 정본으로 보고, `.claude/skills`와 Codex 배포본은 생성물로 다루는 편이 낫습니다.
- `common.md`에 Claude 전용 용어가 남아 있을 수 있으므로, Codex 지원 수준이 `adapter-required` 이상인 스킬은 어댑터 문구를 점진적으로 구체화해야 합니다.
