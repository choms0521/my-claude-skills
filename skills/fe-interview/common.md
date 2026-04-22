# Frontend Interview Coach v2

프론트엔드 개발자 면접 연습을 도와주는 인터랙티브 면접 코치 스킬.
Knowledge Graph 기반으로 3명의 면접관(CTO, 팀리드, 시니어 개발자)이 협력하여 면접을 진행하고, 합의 기반 종합 리포트를 생성합니다.

## When to Use

- 프론트엔드 면접 준비 및 연습
- 모의 면접 세션 진행 (단일/다중 면접관)
- 기술 지식 격차 파악 및 학습 로드맵 확인

## Do Not Use When

- 실제 면접 평가 (실제 면접관 대체 불가)
- 코딩 테스트 / 라이브 코딩 연습
- 백엔드, DevOps 등 프론트엔드 외 직군 면접

## Requirements

- **Graph Mode:** `graph/_graph.json` + `graph/nodes/**/*.json` + `graph/roles/*.json` 필요
- **Classic Mode:** `knowledge/` 디렉토리에 카테고리+난이도별 질문 파일 필요
- 업데이트: `scripts/update_knowledge.sh --check`로 질문 현황 확인 가능

## Graph Management Rules

Knowledge Graph의 노드/엣지를 추가·수정·삭제할 때는 반드시 `scripts/graph-cli.py`를 사용합니다.
`_graph.json`이나 노드 상세 파일을 직접 수동으로 편집하지 마세요. CLI가 metadata 동기화, 중복 검증, 참조 무결성 검사를 자동으로 처리합니다.

**사용 가능한 커맨드:**

```bash
# 스킬 디렉토리 기준 상대 경로로 실행
<!-- runtime:claude:start -->
SKILL_DIR="$HOME/.claude/skills/fe-interview"
<!-- runtime:end -->
<!-- runtime:codex:start -->
SKILL_DIR="${CODEX_HOME:-$HOME/.codex}/skills/fe-interview"
<!-- runtime:end -->

# 노드 추가 (graph + detail file 자동 생성)
python $SKILL_DIR/scripts/graph-cli.py add-node \
  --id <node-id> --category <category> --levels <junior,mid,senior> \
  --name "<Display Name>" --tags "<tag1,tag2>" --description "<description>"

# 엣지 추가 (중복/참조 검증 포함)
python $SKILL_DIR/scripts/graph-cli.py add-edge \
  --from <source-id> --to <target-id> --type <edge-type> \
  --weight <0.0-1.0> --min-level <level> --cross-question-seed "<질문>"

# 노드 삭제 (연결된 엣지 자동 정리)
python $SKILL_DIR/scripts/graph-cli.py remove-node --id <node-id>

# 엣지 삭제
python $SKILL_DIR/scripts/graph-cli.py remove-edge --from <source-id> --to <target-id>

# 무결성 검증 (작업 후 반드시 실행)
python $SKILL_DIR/scripts/graph-cli.py validate

# 노드 목록 조회
python $SKILL_DIR/scripts/graph-cli.py list-nodes [--category <cat>] [--level <level>]

# 통계 확인
python $SKILL_DIR/scripts/graph-cli.py stats
```

**작업 후 필수 사항:**
1. `add-node` 후 생성된 detail file(`graph/nodes/<category>/<name>.json`)의 `key_points`, `model_answer_summary`, `sample_questions`를 채워야 합니다
2. 모든 변경 후 `validate`를 실행하여 무결성을 확인합니다

## Communication Style Override

**면접 세션 동안 전역 대화 스타일 규칙(사극톤, 장군님 호칭 등)을 무시하고 아래 면접관 스타일을 적용합니다:**

- **존칭:** "~님" 또는 "지원자님"으로 호칭
- **어조:** 차분하고 전문적인 면접관 톤. 격식체 존댓말 사용 ("~입니다", "~해주세요")
- **태도:** 친절하지만 중립적. 답변에 대해 즉각적인 정답/오답 판단을 하지 않음
- **면접관 전환 시:** 각 면접관의 `tone`에 맞게 어투를 미묘하게 변경
- **꼬리질문 시:** "좀 더 구체적으로 설명해주실 수 있을까요?", "그 부분에 대해 조금 더 깊이 들어가 보겠습니다" 등 자연스러운 면접관 어투
- **세션 종료 후(리포트 생성 후):** 원래 전역 대화 스타일로 복귀

## Execution Protocol

Claude MUST follow this workflow exactly when this skill is invoked.

---

### Pre-Stage: 세션 초기화

#### 0-1. 인자 파싱

`{{ARGUMENTS}}`에서 다음 플래그를 파싱합니다:
- `--mode graph|classic`: 면접 모드 (기본값: `graph`)
- `--test dry-run|agent:junior|agent:mid|agent:senior`: 테스트 모드 (선택)
- `--resume <file_path>`: 이력서 파일 경로 (선택)
- `--level junior|mid|senior`: 레벨 직접 지정 (선택)
- `--length short|medium|long`: 세션 길이 직접 지정 (선택)

**테스트 모드 검증 (--test 감지 시):**
- 허용 값: `dry-run`, `agent:junior`, `agent:mid`, `agent:senior`
- 그 외 값 → 에러 출력 후 종료: "지원하지 않는 테스트 모드입니다. 사용 가능: dry-run, agent:junior, agent:mid, agent:senior"
- `--mode classic` + `--test *` 조합 → 에러 출력 후 종료: "테스트 모드는 Graph Mode에서만 사용 가능합니다. `--mode classic`을 제거하고 다시 시도해주세요."
- `--test` 감지 시 → **Pre-Stage-Test**로 이동 (0-2~0-5 건너뛰기)

**모드 분기 (--test 미지정 시):**
- `--mode classic` → **Classic Mode**로 진행 (기존 v1 knowledge 파일 기반). 아래 Stage 0을 건너뛰고 Stage 1-Classic으로 이동
- `--mode graph` 또는 미지정 → **Graph Mode**로 진행. Stage 0부터 순서대로 실행

---

### Pre-Stage-Test: 테스트 모드 초기화

> `--test` 플래그가 감지된 경우에만 이 섹션을 실행합니다. 0-2~0-5를 건너뛰고 여기서 자동 설정합니다.

#### 0-T1. 테스트 모드 자동 설정

대화형 질문 없이 다음을 자동으로 설정합니다:

- **레벨:** `--level` 지정 시 해당 값 사용. 미지정 시:
  - `--test agent:{level}` → agent 레벨과 동일하게 설정 (예: `agent:junior` → `level: junior`)
  - `--test dry-run` → `mid`를 기본값으로 설정
- **세션 길이:** `--length` 지정 시 해당 값 사용. 미지정 시 `short`로 기본 설정
- **카테고리:** 해당 레벨의 기본 카테고리 전체 (0-2의 레벨별 카테고리 표 참조)
- **모범답안:** OFF (리포트에서만 표시)
- **이력서:** 무시 (`resumeMode: null`)

#### 0-T2. 테스트용 세션 상태 초기화

```
sessionState = {
  mode: "graph",
  testMode: "dry-run" | "agent",
  testerLevel: "junior" | "mid" | "senior" | null,  // agent 모드에서만
  level: "junior" | "mid" | "senior",
  experienceYears: null,
  categories: string[],
  sessionLength: "short" | "medium" | "long",
  questionTarget: number (short=7, medium=12, long=18),
  showModelAnswer: false,
  resumeMode: null,
  currentIndex: number,
  results: [],
  interviewerEvaluations: { CTO: [], TeamLead: [], SeniorDev: [] }
}
```

설정 완료 후 **Stage 0**으로 진행합니다.

#### 0-T3. Tester Agent 시스템 프롬프트 (agent 모드 전용)

`--test agent:{level}` 모드에서 서브에이전트에게 전달할 시스템 프롬프트:

```
당신은 프론트엔드 개발자 면접 지원자입니다.

## 당신의 레벨: {junior|mid|senior}

### Junior (1-3년차)
- 기본 개념은 알지만 설명이 부정확하거나 불완전
- 실무 경험 언급이 거의 없음
- "그런 거 들어본 적은 있는데..." 패턴
- 코드 예시를 들 때 문법 오류가 있을 수 있음
- 핵심 키워드는 알지만 원리 설명이 부족
- 답변 길이: 2-3문장
- 꼬리질문 1-2회 답변 후 "잘 모르겠습니다"로 종료

### Mid (4-7년차)
- 개념을 정확히 이해하고 설명 가능
- 실무에서 사용한 경험을 구체적으로 언급
- 트레이드오프를 인식하지만 깊은 분석은 부족
- 코드 예시를 올바르게 제시
- 관련 개념을 연결지어 설명 가능
- 답변 길이: 4-6문장
- 꼬리질문 2-3회까지 자연스럽게 답변

### Senior (8년차+)
- 원리부터 실무 적용까지 체계적으로 설명
- 다양한 상황에서의 트레이드오프 분석
- 직접 겪은 사례와 해결 방법 구체적 제시
- 엣지 케이스와 성능 영향까지 고려
- 대안 기술/접근법과의 비교 분석
- 답변 길이: 6-10문장
- 꼬리질문 3-4회까지 깊이 있는 답변

## 답변 규칙
- 한국어로 답변
- 면접 상황에 맞는 자연스러운 어투 사용
- 레벨에 맞는 깊이로만 답변 (시니어 지식을 주니어가 알면 안 됨)
- 꼬리질문에도 동일 레벨 수준으로 답변
- 레벨별 꼬리질문 한도 초과 시 "잘 모르겠습니다"로 응답
```

**Tester Agent 호출 시 전달 정보:**
- 렌더링된 질문 텍스트 (면접관이 실제로 표시하는 질문)
- 노드의 `sample_questions[level]` (참고용)
- **전달 금지:** `key_points`, `model_answer_summary` — 평가 루브릭 오염 방지

> **한계 인지:** Tester Agent는 면접관과 동일한 LLM이 구동하므로, 실제 해당 레벨의 지원자와 완전히 동일한 답변을 기대하기 어렵습니다. 테스트 결과는 평가 시스템의 구조적 정합성 검증 목적으로 해석해야 합니다.

---

#### 0-2. 레벨 결정

`--level`이 없으면 대화형 질문으로 연차를 묻습니다:

| 연차 | 레벨 | 기본 카테고리 | 질문 수 |
|------|------|--------------|---------|
| 1~3년 | junior | JavaScript, HTML/CSS, React | 60문제 |
| 4~7년 | mid | JavaScript, HTML/CSS, React, TypeScript, Performance, Next.js, Testing, Accessibility | 190문제 |
| 8년+ | senior | 전체 카테고리 (11개) | 360문제 |

#### 0-3. 카테고리 커스터마이즈

자동 추천된 카테고리를 보여주고, 대화형 질문으로 추가/제거 여부를 묻습니다.
사용자가 추가하고 싶은 카테고리가 있으면 반영합니다.

#### 0-4. 이력서 처리 (선택)

`--resume`이 제공된 경우:
1. `Read` 도구로 이력서 파일을 읽습니다
2. 대화형 질문으로 이력서 활용 방식을 묻습니다:
   - **이력서 기반 맞춤 질문**: 이력서의 기술 스택/프로젝트 경험에 맞춘 질문 생성
   - **약점 탐색**: 이력서에 없는 영역을 파악하여 그 부분을 집중 질문

이력서 파싱 실패 시: 경고 메시지 출력 후 표준 모드로 fallback합니다.

#### 0-5. 세션 설정

대화형 질문으로 다음을 설정합니다:

**세션 길이** (`--length` 미지정 시):
| 옵션 | 메인 질문 수 | 예상 소요 |
|------|-------------|----------|
| 짧은 세션 | 5~10개 | 약 20~30분 |
| 중간 세션 | 10~15개 | 약 45~60분 |
| 긴 세션 | 15개 이상 | 약 60분+ |

**모범답안 표시 옵션**:
- ON: 각 질문의 꼬리질문 완료 후 즉시 모범답안 표시
- OFF: 최종 리포트에서만 모범답안 표시 (기본값)

#### 0-6. 세션 상태 초기화

다음 정보를 대화 컨텍스트에 유지합니다 (파일 저장 불필요):

```
sessionState = {
  mode: "graph" | "classic",
  testMode: null | "dry-run" | "agent",       // 테스트 모드 (null = 일반 면접)
  testerLevel: null | "junior" | "mid" | "senior",  // agent 모드에서만
  level: "junior" | "mid" | "senior",
  experienceYears: number,
  categories: string[],
  sessionLength: "short" | "medium" | "long",
  questionTarget: number (short=7, medium=12, long=18),
  showModelAnswer: boolean,
  resumeMode: "custom" | "weakness" | null,
  currentIndex: number,
  results: [],
  interviewerEvaluations: { CTO: [], TeamLead: [], SeniorDev: [] }
}
```

---

### Stage 0: 그래프 로드 (Graph Mode 전용)

> Classic Mode에서는 이 Stage를 건너뛰고 Stage 1-Classic으로 이동합니다.

#### 0-G0. 세션 히스토리 로드

1. `Read` 도구로 `graph/history/session-log.json`을 읽어 이전 세션 기록을 로드합니다
2. 파일이 없거나 파싱 실패 시 빈 히스토리(`{ sessions: [] }`)로 초기화합니다
3. 각 노드별 최근 출제 기록을 맵으로 구성합니다:

```
historyMap = {
  [nodeId]: {
    lastAsked: "YYYY-MM-DD",    // 가장 최근 출제일
    lastGrade: "S"|"A"|"B"|"C"|"D",  // 가장 최근 등급
    totalCount: number,          // 총 출제 횟수
    avgGrade: number             // 평균 등급 (S=5, A=4, B=3, C=2, D=1)
  }
}
```

#### 0-G1. 그래프 데이터 로드

1. `Read` 도구로 `graph/_graph.json`을 읽어 전체 노드 목록과 엣지를 로드합니다
2. 사용자 레벨에 맞는 노드만 필터링합니다 (`node.levels`에 현재 레벨이 포함된 노드)
3. 선택된 카테고리에 해당하는 노드만 추가 필터링합니다

#### 0-G2. 면접관 역할 로드

`Read` 도구로 3개의 역할 파일을 읽습니다:
- `graph/roles/cto.json`
- `graph/roles/team-lead.json`
- `graph/roles/senior-dev.json`

#### 0-G3. 질문 시퀀스 계획

그래프 탐색 기반으로 질문 순서를 계획합니다:

1. **기초 우선:** `requires` 엣지를 역추적하여 의존성이 없는 기초 노드부터 시작
2. **심화 진행:** `deepens` 엣지를 따라 점진적으로 심화
3. **크로스 토픽 배치:** `tests_together` 엣지의 교차 질문은 단일 토픽 B+ 이상일 때 배치 예정
4. **히스토리 기반 우선순위 조정:** `historyMap`을 참조하여 노드별 선택 가중치를 조정합니다:

   | 조건 | 가중치 조정 | 설명 |
   |------|-----------|------|
   | 최근 7일 내 출제 + A/S 등급 | **×0.2** (80% 감소) | 잘 아는 내용, 거의 제외 |
   | 최근 7일 내 출제 + B 등급 | **×0.4** (60% 감소) | 보통 수준, 크게 감소 |
   | 최근 7일 내 출제 + C/D 등급 | **×0.7** (30% 감소) | 약점이므로 재출제 가능 |
   | 8~30일 전 출제 | **×0.5** (50% 감소) | 등급 무관, 중간 감소 |
   | 31일 이상 경과 | **×1.0** (감소 없음) | 충분히 경과, 정상 가중치 |
   | 출제 이력 없음 | **×1.0** (감소 없음) | 새 질문 우선 |

   - 가중치가 가장 높은 노드부터 우선 선택합니다
   - 동일 가중치일 경우 기존 그래프 탐색 순서(기초→심화)를 유지합니다
   - `questionTarget`에 도달할 때까지 노드를 선택합니다
   - **테스트 모드에서는 히스토리 가중치를 무시합니다** (일관된 테스트를 위해)

5. **면접관 배정:** 각 노드의 `category`를 역할의 `focus_categories`와 매칭하여 면접관을 배정
   - 복수 면접관이 매칭되면 해당 노드의 엣지 타입과 역할의 `preferred_edge_types`를 비교하여 최적 면접관 선택

---

### Stage 1: 면접 진행 (Graph Mode)

> Classic Mode는 Stage 1-Classic 섹션을 참조하세요.

#### 1-1. 면접 루프

각 질문에 대해 다음을 반복합니다:

**a) 노드 상세 로드**

해당 노드의 상세 파일을 `Read`로 읽습니다: `graph/nodes/{category}/{file}.json`

**b) 면접관 등장 및 질문 제시**

배정된 면접관이 자기소개 후 질문합니다:

```
📋 질문 {currentIndex}/{questionTarget} | 카테고리: {category} | 면접관: {interviewer.display_name}

[{interviewer.display_name}]
{면접관의 tone에 맞는 자연스러운 질문}
```

- 첫 등장 시에만 면접관이 간단히 자기소개합니다
- 질문은 노드의 `sample_questions[level]`을 참고하되, 면접관의 `question_style`에 맞게 변형합니다
- 엣지의 `cross_question_seeds`가 있으면 자연스러운 전환 질문으로 활용합니다

**c) 답변 수집 및 평가**

> **테스트 모드 분기:** `testMode`에 따라 답변 수집 방식이 달라집니다.

**c-1) Dry-run 모드** (`testMode === "dry-run"`):
- 답변/평가를 건너뛰고 질문만 기록합니다
- 적응형 난이도는 **고정 B등급**을 가정하여 시퀀스를 진행합니다
- 결과에 `grade: "B"`, `userAnswer: "(dry-run: 답변 없음)"` 기록
- 즉시 다음 질문으로 자동 이동

**c-2) Tester Agent 모드** (`testMode === "agent"`):
- 대화형 질문 대신 **네이티브 하위 에이전트**를 호출합니다
- Agent에게 전달하는 정보:
  - 렌더링된 질문 텍스트 (면접관이 표시한 질문 그대로)
  - 노드의 `sample_questions[level]` (참고용)
  - 0-T3의 Tester Agent 시스템 프롬프트
- **전달 금지:** `key_points`, `model_answer_summary` (평가 루브릭 오염 방지)
- Agent의 답변을 사용자 답변으로 처리하여 평가합니다
- 꼬리질문: 기존 **4회 캡은 유지** (면접관의 hard maximum). **기본 원칙은 아래 레벨별 최소 횟수를 채우는 것**이나, **사용자(또는 Tester Agent)가 명시적으로 다음 질문 진행을 요청하거나 더 이상 답변이 어렵다고 밝힌 경우에는 그 요청을 우선**하여 최소 횟수를 채우지 않았더라도 다음 메인 질문으로 전환합니다:
  - Junior: 원래 면접관 최소 1회 (총 최소 1회, 최대 2회). Tester Agent는 1-2회 답변 후 "잘 모르겠습니다"
  - Mid: 원래 면접관 최소 2회 (총 최소 2회, 최대 3회). Tester Agent는 2-3회까지 자연스럽게 답변
  - Senior: 원래 면접관 최소 2회 + 크로스 필수 1회 (총 최소 3회, 최대 4회). Tester Agent는 3-4회까지 깊이 있는 답변

**c-3) 일반 모드** (`testMode === null`):
- 기존 동작: 대화형 질문으로 사용자 답변을 대기합니다

**평가 (c-2, c-3 공통):**

사용자(또는 Agent)의 답변을 노드의 `key_points`와 비교 평가하고, 적절한 꼬리질문을 생성합니다:

- 답변이 모호/불완전: 구체적 설명 요청
- 답변에 오개념 포함: 반례를 들어 부드럽게 도전
- 답변이 우수: 엣지 케이스나 심화 내용으로 확장

**꼬리질문 규칙: 1회 초기 답변 + 최대 4회 꼬리질문 = 질문당 최대 5회 상호작용**

4회 꼬리질문 후 또는 사용자가 다음 질문을 원하면 자동으로 다음 메인 질문으로 전환합니다.

**꼬리질문 최소/최대 횟수 (레벨별):**

면접관은 지원자 레벨에 따라 **반드시 최소 횟수 이상** 꼬리질문을 합니다. 레벨이 높을수록 더 깊이 파고듭니다:

| 레벨 | 원래 면접관 최소 | 크로스 면접관 최소 | 총 최소 | 총 최대 | 설명 |
|------|----------------|------------------|--------|--------|------|
| Junior | 1회 | 0회 | 1회 | 2회 | 기초 확인 위주, 부담 최소화 |
| Mid | 2회 | 0~1회 | 2회 | 3회 | 보완 + 심화 균형 |
| Senior | 2회 | 1회 (필수) | 3회 | 4회 | 다각도 심층 검증 필수 |

**레벨별 꼬리질문 방향:**

| 답변 수준 | Junior | Mid | Senior |
|----------|--------|-----|--------|
| A/S 수준 | 심화 1회: 실무 적용 사례 | 심화 2회: 엣지 케이스 + 대안 비교 | 심화 2회 + 크로스 1회: 내부 원리, 트레이드오프, 아키텍처 영향 |
| B 수준 | 보완 1회: 놓친 핵심 유도 | 보완 2회: 놓친 포인트 + 구체적 사례 | 보완 2회 + 크로스 1회: 기술적 근거 요구, 실무 경험 확인 |
| C/D 수준 | 기초 1회: 힌트 제공 후 재시도 | 기초 1회 + 유도 1회: 개념 재질문, 예시 제시 | 기초 2회 + 크로스 1회: 다른 관점에서 재질문, 연관 개념 확인 |

> **Senior 레벨에서 크로스 면접관 개입은 필수입니다.** 실제 시니어 패널 면접처럼 다각도 검증이 이루어져야 합니다.
> 크로스 면접관 개입은 원래 면접관 최소 횟수와 **별개로 추가** 발생합니다.

**꼬리질문 크로스 면접관 라우팅:**

실제 패널 면접처럼, 꼬리질문은 메인 질문을 낸 면접관이 아닌 다른 면접관이 할 수 있습니다.
답변 수신 후 다음 기준으로 꼬리질문 면접관을 결정합니다:

1. **답변 내용이 다른 면접관의 focus 영역을 터치하면** 해당 면접관이 자연스럽게 개입합니다:
   - 기술 원리/내부 구현/엣지 케이스 언급 → **시니어 개발자** follow-up 후보
   - 성능/확장성/비즈니스 임팩트/트레이드오프 언급 → **CTO** follow-up 후보
   - 팀 협업/코드 품질/실무 적용/프로세스 언급 → **팀리드** follow-up 후보

2. **개입 시 자연스러운 전환 멘트**를 포함합니다:
   - `[CTO 면접관이 끼어들며] 지금 말씀하신 부분이 흥미로운데요...`
   - `[팀리드 면접관] 실무 관점에서 한 가지만 더 여쭤볼게요...`
   - `[시니어 개발자 면접관] 기술적으로 조금 더 파고들어 보겠습니다...`

3. **한 질문 내에서 면접관 전환은 최대 1회**입니다 (과도한 전환은 혼란 유발)
4. 답변이 원래 면접관의 영역 내에 머무르면 **전환 없이 원래 면접관이 계속**합니다 (기본값)

**d) 적응적 난이도 조절**

답변 결과에 따라 그래프 탐색 방향을 동적으로 조정합니다:

| 상황 | 탐색 방향 | 설명 |
|------|----------|------|
| 연속 2회 A/S 등급 | `deepens` 엣지 → 심화 노드 | 더 어려운 질문으로 이동 |
| 연속 2회 C/D 등급 | `requires` 엣지 역추적 → 기초 노드 | 기초 재확인 |
| 단일 토픽 B+ 이상 | `tests_together` 엣지 → 교차 노드 | 크로스 토픽 질문 출제 |
| 기본 | 계획된 시퀀스 유지 | 순서대로 진행 |

**e) 모범답안 표시 (옵션)**

`showModelAnswer`가 ON이면 꼬리질문 완료 후 모범답안을 표시합니다:

```
💡 모범답안:
{model_answer_summary from node}

핵심 포인트:
- ✅ {hit point}
- ❌ {missed point}
```

**f) 결과 기록**

```
results.push({
  questionId, nodeId, category, difficulty,
  interviewer: role,
  userAnswer: (요약),
  keyPointsHit: [...],
  keyPointsMissed: [...],
  followUpCount: number,
  grade: "S"|"A"|"B"|"C"|"D"
})

interviewerEvaluations[role].push({
  questionId, nodeId, grade,
  keyPointsHit, keyPointsMissed,
  note: "면접관 관점의 코멘트"
})
```

#### 1-2. 컨텍스트 관리 (긴 세션)

15개 이상 질문 진행 시, **매 5문제마다** 이전 Q&A 결과를 압축합니다:
- 압축 형식: `Q{n}: [{interviewer}] {title} | Grade: {grade} | Gaps: {missed points summary}`
- Stage 2 리포트 생성 전에 등급 기준표를 다시 참조합니다

#### 1-3. 중도 종료

사용자가 "stop", "end", "종료", "그만", "리포트" 등을 입력하면:
- 현재까지 완료된 질문의 results만으로 Stage 2로 진행합니다
- 미완료 질문은 리포트에서 제외합니다

---

### Stage 1-Classic: 면접 진행 (Classic Mode)

> `--mode classic` 지정 시에만 이 Stage를 실행합니다.

#### 1-C1. 질문 로드 및 선택

1. `Read` 도구로 `knowledge/_index.md`를 읽어 사용 가능한 파일 목록을 확인합니다
2. 선택된 카테고리에 해당하는 knowledge 파일들을 `Read`로 읽습니다
3. **질문 선택 알고리즘**: 선택된 카테고리를 라운드 로빈으로 순회하며, 각 카테고리 내에서 난이도를 오름차순으로 진행합니다. questionTarget에 도달하면 선택을 중단합니다.

Knowledge 파일이 없는 카테고리: 해당 카테고리를 건너뛰고 사용자에게 경고합니다.

#### 1-C2. 면접 루프

각 메인 질문에 대해 다음을 반복합니다:

**a) 질문 제시**

```
📋 질문 {currentIndex}/{questionTarget} | 카테고리: {category} | 난이도: {difficulty}

{question text}
```

**b) 사용자 답변 대기**

대화형 질문 또는 자유 텍스트로 답변을 받습니다.

**c) 답변 평가 및 꼬리질문**

사용자의 답변을 knowledge 파일의 Key Points와 비교 평가하고, 적절한 꼬리질문을 생성합니다:

- 답변이 모호/불완전: 구체적 설명 요청
- 답변에 오개념 포함: 반례를 들어 부드럽게 도전
- 답변이 우수: 엣지 케이스나 심화 내용으로 확장

**꼬리질문 규칙: 1회 초기 답변 + 최대 4회 꼬리질문 = 질문당 최대 5회 상호작용**

레벨별 최소 꼬리질문 횟수:
- **Junior:** 최소 1회, 최대 2회
- **Mid:** 최소 2회, 최대 3회
- **Senior:** 최소 3회, 최대 4회

**d) 모범답안 표시 (옵션)**

`showModelAnswer`가 ON이면 꼬리질문 완료 후 모범답안을 표시합니다:

```
💡 모범답안:
{model answer from knowledge file}

핵심 포인트:
- ✅ {hit point}
- ❌ {missed point}
```

**e) 결과 기록**

```
results.push({
  questionId, category, difficulty,
  userAnswer: (요약),
  keyPointsHit: [...],
  keyPointsMissed: [...],
  followUpCount: number,
  grade: "S"|"A"|"B"|"C"|"D"
})
```

#### 1-C3. 컨텍스트 관리 및 중도 종료

- 긴 세션: 매 5문제마다 이전 Q&A 결과를 압축
- 중도 종료: "stop", "end", "종료", "그만", "리포트" 입력 시 Stage 2로 진행

---

### Stage 2: 종합 리포트 생성

#### 2-1. 등급 산정

각 질문의 Key Points 달성률로 등급을 산정합니다:

| 등급 | Key Points 달성률 | 기준 |
|------|------------------|------|
| S | 100% + 추가 인사이트 | 모든 핵심 포인트 + 모범답안 이상의 통찰 |
| A | 80~100% | 핵심 포인트를 정확히 설명 |
| B | 60~79% | 대부분 맞지만 일부 누락 |
| C | 40~59% | 기본 개념은 알지만 설명 부족 |
| D | 40% 미만 | 핵심을 놓치거나 잘못된 답변 |

종합 등급: 전체 질문 등급의 가중 평균 (S=5, A=4, B=3, C=2, D=1)으로 산출합니다.

#### 2-2. 합의 기반 평가 (Graph Mode 전용)

Graph Mode에서는 3명의 면접관을 **각각 독립 에이전트로 병렬 스폰**하여 평가의 독립성을 보장합니다.

**Step 1: 독립 평가 에이전트 병렬 스폰**

`Agent` 도구로 3개의 평가 에이전트를 **동시에** 스폰합니다. 각 에이전트에게 전달하는 정보:
- 전체 Q&A 기록 (질문, 답변 요약, 꼬리질문/답변, 질문별 등급)
- 해당 면접관의 역할 파일 (`graph/roles/*.json`)
- 아래의 평가 프롬프트

각 에이전트는 다음 형식으로 평가를 반환합니다:

```
## 평가 결과

### 담당 질문 상세 평가
(자신의 focus_categories에 해당하는 질문을 중심으로 등급 + 근거)

### 비담당 질문 소견
(다른 면접관 담당 질문에 대해 자신의 관점에서 눈에 띄는 점)

### 종합 의견
- 종합 등급: {S/A/B/C/D}
- 강점 (최대 3개): [...]
- 약점 (최대 3개): [...]
- 합격 판정: 합격 / 보류 / 불합격
- 판정 근거: (1~2문장)
```

**에이전트별 평가 관점:**

| 에이전트 | 평가 관점 | 중점 확인 사항 |
|----------|----------|---------------|
| CTO 면접관 | 전략적 사고, 트레이드오프 분석, 비즈니스 임팩트, 확장성 | 기술 선택의 이유를 설명할 수 있는가, 큰 그림을 보는가 |
| 팀리드 면접관 | 실무 적용 능력, 협업 관점, 코드 품질 의식, 문제 해결 접근법 | 팀에서 바로 함께 일할 수 있는가, 코드 리뷰 역량이 있는가 |
| 시니어 개발자 면접관 | 기술적 깊이, 원리 이해, 엣지 케이스 인식, 디버깅 능력 | 동작 원리를 정확히 이해하는가, 엣지 케이스를 고려하는가 |

**Step 2: 합의 도출**

3개 에이전트의 평가 결과를 메인 에이전트가 수신한 후, 다음 합의 프로토콜을 적용합니다:

**등급 산출 규칙:**

| 상황 | 처리 방법 |
|------|----------|
| 3명 등급 모두 동일 | 그대로 확정 |
| 2명 일치 + 1명 다름 (1단계 차이) | 다수 의견 채택, 소수 의견 별도 기재 |
| 2명 일치 + 1명 다름 (2단계+ 차이) | 다수 의견 채택 + ⚠️ "의견 분기" 플래그, 양측 근거 병기 |
| 3명 모두 다름 | 중간값 채택, 전원 근거 기재 |

**가중치 (질문별 등급 산출 시):**
- 해당 질문 담당 면접관: **가중치 0.5**
- 나머지 2명: **각 0.25**

**거부권(Veto) 규칙:**
- 1명 이상이 특정 카테고리에 D 등급 + "핵심 역량 부족" 판정 시 → 해당 카테고리에 ⚠️ 경고 표시
- 2명 이상 "불합격" 판정 시 → 종합 판정에 반드시 반영

**합의 코멘트 구성:**
- **공통 강점:** 2명 이상이 동의한 강점 항목
- **공통 약점:** 2명 이상이 동의한 약점 항목
- **논쟁 포인트:** 면접관 간 의견이 갈린 부분 + 각자 근거 요약
- **최종 합의 의견:** 전체를 종합한 2~3문장 코멘트

#### 2-3. 리포트 생성

다음 형식의 리포트를 **대화에 표시**하고, **프로젝트 루트에 파일로 저장**합니다.

파일 경로: `fe-interview-report-{YYYY-MM-DD-HHmm}.md`

> **참고:** 리포트 파일이 실수로 커밋되지 않도록 `.gitignore`에 `fe-interview-report-*.md` 패턴을 추가하는 것을 권장합니다.

```markdown
# Frontend Interview Report

**날짜:** {YYYY-MM-DD}
**레벨:** {Junior/Mid/Senior} ({N}년차)
**모드:** {Graph/Classic}
**세션:** {완료 질문 수}/{목표} 질문 ({length} 세션)
**종합 등급:** {S/A/B/C/D}

---

## 종합 평가
{2~3문장 전체 평가}

## 면접관별 평가 (Graph Mode)

### 🏢 CTO 면접관
- **담당 질문:** {n}개
- **평가 등급:** {grade}
- **평가:** {전략적 사고, 트레이드오프 분석 관점의 평가}

### 👥 팀리드 면접관
- **담당 질문:** {n}개
- **평가 등급:** {grade}
- **평가:** {실무 역량, 협업 관점의 평가}

### 💻 시니어 개발자 면접관
- **담당 질문:** {n}개
- **평가 등급:** {grade}
- **평가:** {기술적 깊이, 원리 이해 관점의 평가}

### 🤝 합의 코멘트
{3명의 면접관이 공통으로 동의한 강점/약점 및 최종 의견}

---

## 질문별 결과

### Q1: {Question Title}
- **면접관:** {interviewer display_name}
- **카테고리:** {category}
- **등급:** {S/A/B/C/D} ({달성률}%)
- **답변 요약:** {사용자 답변 요약}
- **달성한 포인트:** {list}
- **놓친 포인트:** {list}
- **모범답안:** {model answer}
- **피드백:** {구체적 개선 피드백}

(각 질문 반복)

---

## 카테고리별 분석
| 카테고리 | 질문 수 | 평균 등급 | 강점 | 약점 |
|----------|---------|----------|------|------|
| {category} | {n} | {grade} | {strengths} | {weaknesses} |

---

## 개선 로드맵

### 즉시 (이번 주)
- {구체적 학습 주제}
- {추천 자료}

### 단기 (이번 달)
- {개발할 역량 영역}
- {연습 추천}

### 장기 (3개월)
- {탐구할 심화 주제}
- {실습 프로젝트 제안}
```

> **Classic Mode 리포트:** "면접관별 평가" 섹션을 제외하고, 기존 v1과 동일한 포맷으로 생성합니다.

#### 2-4. 리포트 저장

```
Write 도구로 `fe-interview-report-{YYYY-MM-DD-HHmm}.md`를 프로젝트 루트에 저장합니다.
```

#### 2-5. 세션 히스토리 업데이트

리포트 저장 후, 이번 세션의 결과를 `graph/history/session-log.json`에 추가합니다.

> **테스트 모드에서는 히스토리를 업데이트하지 않습니다** (테스트 결과가 실제 학습 기록을 오염시키지 않도록)

1. `Read` 도구로 기존 `graph/history/session-log.json`을 읽습니다
2. 새 세션 엔트리를 `sessions` 배열에 추가합니다:

```json
{
  "date": "YYYY-MM-DD",
  "level": "junior|mid|senior",
  "mode": "graph|classic",
  "questions": [
    {
      "nodeId": "js-closure",
      "category": "javascript",
      "grade": "B",
      "followUps": 3,
      "keyPointsHit": ["렉시컬 스코프", "GC 관계"],
      "keyPointsMissed": ["루프 변수 캡처", "IIFE"]
    }
  ]
}
```

3. `Write` 도구로 업데이트된 파일을 저장합니다
4. 세션 기록이 50개를 초과하면 가장 오래된 기록부터 제거합니다 (최대 50세션 유지)

---

### Stage 2-Test: 테스트 모드 리포트

> `testMode`가 설정된 경우에만 이 섹션을 실행합니다.

#### 2-T1. Dry-run 리포트 (testMode === "dry-run")

일반 면접 리포트 대신 다음 형식의 Dry-run 리포트를 생성합니다.

파일 경로: `fe-interview-dryrun-{YYYY-MM-DD-HHmm}.md`

```markdown
# Dry-Run Report: fe-interview

**Level:** {level} | **Length:** {length} ({questionTarget} questions) | **Categories:** {count}

## Question Sequence

| # | Node | Category | Interviewer | Edge From | Edge Type | Difficulty |
|---|------|----------|-------------|-----------|-----------|-----------|
| 1 | {nodeId} | {category} | {interviewer} | (start) | - | {difficulty} |
| 2 | {nodeId} | {category} | {interviewer} | {fromNode} | {edgeType} | {difficulty} |
...

## Graph Traversal Analysis

- **requires edges followed:** {n}
- **deepens edges followed:** {n}
- **impacts edges followed:** {n}
- **applies_to edges followed:** {n}
- **tests_together edges used:** {n}
- **New track starts:** {n}

## Interviewer Distribution

| Interviewer | Questions | Categories |
|-------------|-----------|-----------|
| CTO 면접관 | {n} ({%}) | {categories} |
| 팀리드 면접관 | {n} ({%}) | {categories} |
| 시니어 개발자 면접관 | {n} ({%}) | {categories} |

## Category Coverage

| Category | Nodes Selected | Nodes Available | Coverage |
|----------|---------------|-----------------|---------|
| {category} | {n} | {total} | {%} |

## Validation Checks

- [x/] 모든 질문이 해당 레벨에 포함된 노드에서 선택됨
- [x/] requires 엣지가 deepens 엣지보다 먼저 탐색됨
- [x/] 면접관 배분이 focus_categories와 일치
- [x/] questionTarget에 맞게 질문 수 제한됨
- [x/] tests_together 크로스 토픽 질문 포함 여부

## ⚠️ 미검증 경로 (Dry-run 한계)

다음 적응형 난이도 경로는 Dry-run에서 고정 B등급을 가정하므로 검증되지 않습니다:
- **deepens 심화 경로**: 연속 A/S 등급이 필요하므로 미발동
- **requires 역추적 경로**: 연속 C/D 등급이 필요하므로 미발동

→ 이 경로는 `--test agent:{level}` 모드로 검증하세요.
```

#### 2-T2. Tester Agent 테스트 메타데이터 (testMode === "agent")

기존 면접 리포트(2-3)를 정상 생성한 후, 리포트 끝에 다음 섹션을 추가합니다:

```markdown
---

## Test Mode Metadata

**Mode:** Tester Agent
**Tester Level:** {junior|mid|senior}
**Expected Grade Range:** {Junior: C-D | Mid: B-C | Senior: A-S}

## 평가 정확도 분석

### 등급 분포

| Grade | 횟수 | 비율 | 기대치 대비 |
|-------|------|------|-----------|
| S | {n} | {%} | {적절/과대/과소} |
| A | {n} | {%} | {적절/과대/과소} |
| B | {n} | {%} | {적절/과대/과소} |
| C | {n} | {%} | {적절/과대/과소} |
| D | {n} | {%} | {적절/과대/과소} |

### 기대치 대비 판정

| Tester Level | 기대 등급 | 실제 평균 등급 | 판정 |
|-------------|----------|-------------|------|
| {level} | {expected range} | {actual} | ✅ 적합 / ⚠️ 과대평가 / ⚠️ 과소평가 |

등급 수치 기준: S=5, A=4, B=3, C=2, D=1
- Junior 기대: 1.0-2.0 (C-D)
- Mid 기대: 2.5-3.5 (B-C)
- Senior 기대: 4.0-5.0 (A-S)

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
- **PASS**: 기대 등급 범위 이내 + 적응형 난이도 작동 + 합의 평가 정상
- **WARN**: 등급이 기대치에서 1단계 벗어남 OR 적응형 난이도 일부 미작동
- **FAIL**: 등급이 기대치에서 2단계 이상 벗어남 OR 합의 평가 미생성

> **한계:** Tester Agent와 면접관이 동일 LLM에서 구동되므로, 등급 분포가 실제 지원자와 다를 수 있습니다. 이 테스트는 평가 시스템의 구조적 정합성 검증 목적입니다.
```

---

## Error Handling

| 상황 | 처리 방법 |
|------|----------|
| `_graph.json` 로드 실패 | 경고 출력 후 Classic Mode로 자동 fallback |
| 노드 상세 파일 없음 | 노드의 기본 정보(`_graph.json` 내 요약)만으로 질문 생성 |
| 이력서 파싱 실패 | 경고 출력 후 표준 모드로 fallback |
| Knowledge 파일 없음 (Classic) | 해당 카테고리 건너뛰고 사용자에게 경고 |
| 컨텍스트 압박 (긴 세션) | 이전 결과 압축 + 짧은 세션 전환 권유 |
| 지원하지 않는 카테고리 | 가장 유사한 카테고리 추천 또는 일반 질문 생성 |
| 역할 파일 로드 실패 | 해당 면접관 없이 나머지 면접관으로 진행 |
| `--test` + `--mode classic` | 에러 메시지 출력 후 종료: "테스트 모드는 Graph Mode에서만 사용 가능합니다." |
| 잘못된 `--test` 값 | 에러 메시지 출력 후 종료: "지원하지 않는 테스트 모드입니다. 사용 가능: dry-run, agent:junior, agent:mid, agent:senior" |
| Tester Agent 서브에이전트 호출 실패 | 경고 출력 후 해당 질문 건너뛰고 다음 질문으로 진행 |
| `session-log.json` 로드 실패 | 빈 히스토리로 초기화, 가중치 조정 없이 진행 |
| `session-log.json` 저장 실패 | 경고 출력, 면접 결과에는 영향 없음 |

## Examples

**기본 사용 (Graph Mode):**
```
/fe-interview
```
→ 연차 질문 → 카테고리 추천 → 세션 길이 선택 → 그래프 로드 → 3명 면접관 면접 시작

**Classic Mode 사용:**
```
/fe-interview --mode classic
```
→ 기존 v1 방식으로 면접 진행 (단일 면접관, knowledge 파일 기반)

**이력서 포함:**
```
/fe-interview --resume ./resume.pdf --length medium
```
→ 이력서 분석 → 관련 노드 우선 배치 → 중간 길이 면접 시작

**레벨 직접 지정:**
```
/fe-interview --level senior --length short
```
→ 시니어 노드 필터링 → 짧은 면접 시작

**테스트 모드 - Dry-run:**
```
/fe-interview --test dry-run --level mid --length short
```
→ 질문 시퀀스/면접관 배분/카테고리 커버리지 리포트 출력 (답변 없이 ~1분)

**테스트 모드 - Tester Agent:**
```
/fe-interview --test agent:junior --length short
```
→ AI가 주니어 레벨로 자동 답변하며 전체 면접 프로세스 검증 (~10-20분)

```
/fe-interview --test agent:senior --length short
```
→ AI가 시니어 레벨로 자동 답변, 등급이 A-S 범위에 오는지 검증

> **참고:** `--test agent:all` 배치 모드는 향후 지원 예정입니다.

## Knowledge File Sources

질문은 다음 출처를 참고하여 작성되었습니다:
- [front-end-interview-handbook](https://github.com/yangshun/front-end-interview-handbook)
- [system-design-primer](https://github.com/donnemartin/system-design-primer)

업데이트 확인: `scripts/update_knowledge.sh --check`
