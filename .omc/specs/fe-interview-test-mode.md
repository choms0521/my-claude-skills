# fe-interview Test Mode 설계 명세서

## 1. 개요

fe-interview v2 스킬의 질문 생성 품질, 적응형 난이도 조절, 면접관 역할 배분, 평가 정확도를 자동화된 방식으로 검증하는 테스트 모드.

### 두 가지 테스트 모드

| 모드 | CLI 플래그 | 용도 | 소요 시간 |
|------|-----------|------|----------|
| **Dry-run** | `--test dry-run` | 질문 흐름/순서/면접관 배분 빠른 확인 | ~1분 |
| **Tester Agent** | `--test agent:junior\|mid\|senior` | AI가 해당 레벨로 답변하며 전체 프로세스 검증 | ~10-20분 |

---

## 2. Mode A: Dry-run

### 2-1. 목적

- 질문 생성 순서가 그래프 탐색 로직에 맞는지 확인
- 면접관 역할 배분이 카테고리에 맞게 되는지 확인
- `requires` → `deepens` → `tests_together` 엣지 순서가 올바른지 확인
- 세션 설정(레벨, 카테고리, 길이)에 따라 질문이 적절히 필터링되는지 확인

### 2-2. 실행 흐름

```
/fe-interview --test dry-run --level mid --length short
```

1. Pre-Stage: 사용자 질문 없이 자동으로 세션 설정
   - `--level`로 레벨 결정 (선택, 기본값: mid)
   - `--length`로 세션 길이 결정 (기본: short)
   - 카테고리: 해당 레벨의 기본 카테고리 전체
2. Stage 0: 그래프 로드 + 질문 계획 수립 (동일)
3. Stage 1: **답변 없이** 질문만 순서대로 출력

### 2-3. 출력 형식

```markdown
# Dry-Run Report: fe-interview

**Level:** mid | **Length:** short (7 questions) | **Categories:** 8

## Question Sequence

| # | Node | Category | Interviewer | Edge From | Edge Type | Difficulty |
|---|------|----------|-------------|-----------|-----------|-----------|
| 1 | js-variables-scope | JavaScript | 시니어 개발자 | (start) | - | basic |
| 2 | js-closure | JavaScript | 시니어 개발자 | js-variables-scope | requires | basic-intermediate |
| 3 | react-hooks | React | 팀리드 | js-closure | applies_to | intermediate |
| 4 | react-state-mgmt | React | 팀리드 | react-hooks | deepens | intermediate-advanced |
| 5 | perf-rendering | Performance | CTO | react-state-mgmt | impacts | advanced |
| 6 | css-layout | HTML/CSS | 시니어 개발자 | (new track) | - | basic-intermediate |
| 7 | a11y-keyboard | Accessibility | 팀리드 | (new track) | - | intermediate |

## Graph Traversal Analysis

- **requires edges followed:** 2
- **deepens edges followed:** 1
- **impacts edges followed:** 1
- **applies_to edges followed:** 1
- **tests_together edges used:** 0
- **New track starts:** 2

## Interviewer Distribution

| Interviewer | Questions | Categories |
|-------------|-----------|-----------|
| CTO 면접관 | 1 (14%) | performance |
| 팀리드 면접관 | 3 (43%) | react, accessibility |
| 시니어 개발자 면접관 | 3 (43%) | javascript, html-css |

## Category Coverage

| Category | Nodes Selected | Nodes Available | Coverage |
|----------|---------------|-----------------|---------|
| JavaScript | 2 | 17 | 12% |
| React | 2 | 12 | 17% |
| Performance | 1 | 10 | 10% |
| HTML/CSS | 1 | 13 | 8% |
| Accessibility | 1 | 8 | 13% |

## Validation Checks

- [x] 모든 질문이 해당 레벨에 포함된 노드에서 선택됨
- [x] requires 엣지가 deepens 엣지보다 먼저 탐색됨
- [x] 면접관 배분이 focus_categories와 일치
- [x] questionTarget(7)에 맞게 질문 수 제한됨
- [ ] tests_together 크로스 토픽 질문 포함 (short 세션이라 미포함)
```

### 2-4. 파일 저장

`fe-interview-dryrun-{YYYY-MM-DD-HHmm}.md`로 프로젝트 루트에 저장.

---

## 3. Mode B: Tester Agent

### 3-1. 목적

- AI가 지정된 레벨(junior/mid/senior)로 답변하며 **실제 면접 전체 과정**을 자동 실행
- 평가 정확도 검증: 주니어 답변에 C/D, 시니어 답변에 A/S가 나오는지
- 적응형 난이도가 실제로 작동하는지 (등급에 따라 그래프 분기 확인)
- 최종 합의 리포트가 올바르게 생성되는지
- 3명 면접관의 평가가 일관성 있는지

### 3-2. 실행 흐름

```
/fe-interview --test agent:junior --length short
/fe-interview --test agent:mid --length medium
/fe-interview --test agent:senior --length short
```

1. Pre-Stage: 자동 세션 설정 (Dry-run과 동일)
2. Stage 0: 그래프 로드 + 질문 계획 수립 (동일)
3. Stage 1: **Tester Agent가 자동 답변**
   - 각 질문에 대해 Tester Agent(서브에이전트)가 지정된 레벨로 답변
   - 면접관이 평가 + 꼬리질문
   - Tester Agent가 꼬리질문에도 답변
   - 적응형 난이도 조절이 실제로 작동
4. Stage 2: 종합 리포트 생성 (동일) + **테스트 메타 섹션 추가**

### 3-3. Tester Agent 프롬프트 설계

Tester Agent는 별도 서브에이전트로 실행되며, 다음 시스템 프롬프트를 받음:

```
당신은 프론트엔드 개발자 면접 지원자입니다.

## 당신의 레벨: {junior|mid|senior}

### Junior (1-3년차)
- 기본 개념은 알지만 설명이 부정확하거나 불완전
- 실무 경험 언급이 거의 없음
- "그런 거 들어본 적은 있는데..." 패턴
- 코드 예시를 들 때 문법 오류가 있을 수 있음
- 핵심 키워드는 알지만 원리 설명이 부족
- Key Points의 40-60% 정도만 커버

### Mid (4-7년차)
- 개념을 정확히 이해하고 설명 가능
- 실무에서 사용한 경험을 구체적으로 언급
- 트레이드오프를 인식하지만 깊은 분석은 부족
- 코드 예시를 올바르게 제시
- 관련 개념을 연결지어 설명 가능
- Key Points의 65-80% 정도 커버

### Senior (8년차+)
- 원리부터 실무 적용까지 체계적으로 설명
- 다양한 상황에서의 트레이드오프 분석
- 직접 겪은 사례와 해결 방법 구체적 제시
- 엣지 케이스와 성능 영향까지 고려
- 대안 기술/접근법과의 비교 분석
- Key Points의 85-100% 커버 + 추가 인사이트

## 답변 규칙
- 한국어로 답변
- 면접 상황에 맞는 자연스러운 어투 사용
- 레벨에 맞는 깊이로만 답변 (시니어 지식을 주니어가 알면 안 됨)
- 꼬리질문에도 동일 레벨 수준으로 답변
- 답변 길이: 주니어 2-3문장, 미드 4-6문장, 시니어 6-10문장
```

### 3-4. 테스트 리포트 추가 섹션

기존 면접 리포트에 다음 섹션이 추가됨:

```markdown
---

## 🧪 Test Mode Metadata

**Mode:** Tester Agent
**Tester Level:** {junior|mid|senior}
**Expected Grade Range:** {Junior: C-D | Mid: B-C | Senior: A-S}

## 평가 정확도 분석

### 등급 분포

| Grade | 횟수 | 비율 | 기대치 대비 |
|-------|------|------|-----------|
| S | 0 | 0% | {적절/과대/과소} |
| A | 1 | 14% | {적절/과대/과소} |
| B | 3 | 43% | {적절/과대/과소} |
| C | 2 | 29% | {적절/과대/과소} |
| D | 1 | 14% | {적절/과대/과소} |

### 기대치 대비 판정

| Tester Level | 기대 등급 | 실제 평균 등급 | 판정 |
|-------------|----------|-------------|------|
| junior | C-D (1.0-2.0) | {actual} | ✅ 적합 / ⚠️ 과대평가 / ⚠️ 과소평가 |
| mid | B-C (2.5-3.5) | {actual} | ✅ 적합 / ⚠️ 과대평가 / ⚠️ 과소평가 |
| senior | A-S (4.0-5.0) | {actual} | ✅ 적합 / ⚠️ 과대평가 / ⚠️ 과소평가 |

### 적응형 난이도 검증

| 이벤트 | 발생 횟수 | 기대치 |
|--------|----------|--------|
| deepens 엣지 심화 (A/S 연속 후) | {n} | Junior: 0-1, Mid: 1-3, Senior: 3+ |
| requires 역추적 (C/D 연속 후) | {n} | Junior: 2+, Mid: 0-1, Senior: 0 |
| tests_together 크로스 토픽 | {n} | Junior: 0, Mid: 1-2, Senior: 2+ |

### 면접관 합의 검증

| 검증 항목 | 결과 |
|----------|------|
| 3명 면접관 모두 평가를 생성했는가 | ✅/❌ |
| 평가 관점이 역할에 맞는가 (CTO=전략, 팀리드=실무, 시니어=기술) | ✅/❌ |
| 합의 종합등급이 개별 등급의 합리적 범위 내인가 | ✅/❌ |
| 개선 로드맵이 구체적이고 실행 가능한가 | ✅/❌ |

### 종합 판정

**테스트 결과:** ✅ PASS / ⚠️ WARN / ❌ FAIL

판정 기준:
- PASS: 기대 등급 범위 이내 + 적응형 난이도 작동 + 합의 평가 정상
- WARN: 등급이 기대치에서 1단계 벗어남 OR 적응형 난이도 일부 미작동
- FAIL: 등급이 기대치에서 2단계 이상 벗어남 OR 합의 평가 미생성
```

---

## 4. SKILL.md 수정 범위

### 4-1. Frontmatter 수정

```
argument-hint: "[--mode graph|classic] [--test dry-run|agent:junior|agent:mid|agent:senior] [--resume <file_path>] [--level junior|mid|senior] [--length short|medium|long]"
```

### 4-2. 새 섹션 추가: Test Mode Protocol

Pre-Stage에 테스트 모드 분기 추가:

```
0-1. 인자 파싱에서 --test 플래그 감지
0-T1. 테스트 모드 초기화
  - --test dry-run: Stage 0 → Dry-run 실행 → 리포트 출력
  - --test agent:{level}: Stage 0 → Tester Agent 초기화 → Stage 1 자동 실행 → Stage 2 리포트
0-T2. 테스트 모드에서는 AskUserQuestion 호출 없이 자동 진행
  - --level이 없으면 테스트 레벨과 동일하게 설정
  - --length가 없으면 short로 기본 설정
  - 카테고리는 해당 레벨의 기본 카테고리 전체
  - showModelAnswer: OFF (리포트에서만)
  - resumeMode: null
```

### 4-3. Stage 1 수정

기존 면접 루프에 조건 분기 추가:

```
사용자 답변 대기 단계에서:
  if (testMode === 'agent') {
    // AskUserQuestion 대신 Tester Agent 서브에이전트 호출
    // Agent에게 현재 질문 + 노드의 key_points + 레벨 정보 전달
    // Agent의 답변을 사용자 답변으로 처리
  } else if (testMode === 'dry-run') {
    // 질문만 기록하고 답변/평가 건너뛰기
    // 다음 질문으로 자동 이동 (적응형 난이도는 B등급 가정으로 진행)
  } else {
    // 기존: AskUserQuestion으로 사용자 답변 대기
  }
```

### 4-4. Stage 2 수정

리포트 생성 시 테스트 모드 메타데이터 섹션 추가.

---

## 5. 구현 계획

| 단계 | 내용 | 예상 산출물 |
|------|------|-----------|
| 1 | SKILL.md에 테스트 모드 프로토콜 추가 | SKILL.md 수정 |
| 2 | Dry-run 리포트 템플릿 정의 | SKILL.md 내 Dry-run 섹션 |
| 3 | Tester Agent 프롬프트 설계 | SKILL.md 내 Tester Agent 섹션 |
| 4 | 평가 정확도 분석 템플릿 정의 | SKILL.md 내 리포트 확장 |
| 5 | 실제 테스트 실행으로 검증 | dry-run + agent 각 1회 실행 |

---

## 6. 미결 사항

1. **Tester Agent의 꼬리질문 답변 횟수**: 매번 최대 4회? 아니면 레벨에 따라 조절? (주니어: 1-2회 후 "모르겠습니다", 시니어: 3-4회)
2. **배치 테스트**: `--test agent:all`로 junior/mid/senior 3번 연속 실행 후 비교 리포트?
3. **테스트 결과 저장 위치**: 프로젝트 루트? `.omc/test-results/`?
4. **Dry-run의 적응형 난이도 시뮬레이션**: 고정 B등급 가정? 아니면 랜덤?
