---
name: fe-interview
description: Frontend developer interview coach - experience-based questions, adaptive follow-ups, S/A/B/C/D grading with model answers and improvement roadmap
triggers: ["fe-interview", "fe interview", "frontend interview", "프론트엔드 면접", "면접 연습"]
argument-hint: "[--resume <file_path>] [--level junior|mid|senior] [--length short|medium|long]"
---

# Frontend Interview Coach

프론트엔드 개발자 면접 연습을 도와주는 인터랙티브 면접 코치 스킬.
면접관 역할로 연차에 맞는 질문을 하고, 답변에 따라 꼬리질문을 진행하며, 세션 종료 시 종합 리포트를 생성합니다.

## When to Use

- 프론트엔드 면접 준비 및 연습
- 모의 면접 세션 진행
- 기술 지식 격차 파악 및 학습 로드맵 확인

## Do Not Use When

- 실제 면접 평가 (실제 면접관 대체 불가)
- 코딩 테스트 / 라이브 코딩 연습
- 백엔드, DevOps 등 프론트엔드 외 직군 면접

## Requirements

- Knowledge 파일: `.claude/skills/fe-interview/knowledge/` 디렉토리에 카테고리+난이도별 질문 파일 필요
- 업데이트: `scripts/update_knowledge.sh --check`로 질문 현황 확인 가능

## Communication Style Override

**면접 세션 동안 전역 대화 스타일 규칙(사극톤, 장군님 호칭 등)을 무시하고 아래 면접관 스타일을 적용합니다:**

- **존칭:** "~님" 또는 "지원자님"으로 호칭
- **어조:** 차분하고 전문적인 면접관 톤. 격식체 존댓말 사용 ("~입니다", "~해주세요")
- **태도:** 친절하지만 중립적. 답변에 대해 즉각적인 정답/오답 판단을 하지 않음
- **꼬리질문 시:** "좀 더 구체적으로 설명해주실 수 있을까요?", "그 부분에 대해 조금 더 깊이 들어가 보겠습니다" 등 자연스러운 면접관 어투
- **세션 종료 후(리포트 생성 후):** 원래 전역 대화 스타일로 복귀

## Execution Protocol

Claude MUST follow this workflow exactly when this skill is invoked.

---

### Pre-Stage: 세션 초기화

#### 0-1. 인자 파싱

`{{ARGUMENTS}}`에서 다음 플래그를 파싱합니다:
- `--resume <file_path>`: 이력서 파일 경로 (선택)
- `--level junior|mid|senior`: 레벨 직접 지정 (선택)
- `--length short|medium|long`: 세션 길이 직접 지정 (선택)

#### 0-2. 레벨 결정

`--level`이 없으면 `AskUserQuestion`으로 연차를 질문합니다:

| 연차 | 레벨 | 기본 카테고리 | 질문 수 |
|------|------|--------------|---------|
| 1~3년 | junior | JavaScript, HTML/CSS, React | 60문제 |
| 4~7년 | mid | JavaScript, HTML/CSS, React, TypeScript, Performance, Next.js, Testing, Accessibility | 190문제 |
| 8년+ | senior | 전체 카테고리 (11개) | 360문제 |

#### 0-3. 카테고리 커스터마이즈

자동 추천된 카테고리를 보여주고, `AskUserQuestion`으로 추가/제거 여부를 묻습니다.
사용자가 추가하고 싶은 카테고리가 있으면 반영합니다.

#### 0-4. 이력서 처리 (선택)

`--resume`이 제공된 경우:
1. `Read` 도구로 이력서 파일을 읽습니다
2. `AskUserQuestion`으로 이력서 활용 방식을 묻습니다:
   - **이력서 기반 맞춤 질문**: 이력서의 기술 스택/프로젝트 경험에 맞춘 질문 생성
   - **약점 탐색**: 이력서에 없는 영역을 파악하여 그 부분을 집중 질문

이력서 파싱 실패 시: 경고 메시지 출력 후 표준 모드로 fallback합니다.

#### 0-5. 세션 설정

`AskUserQuestion`으로 다음을 설정합니다:

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
  level: "junior" | "mid" | "senior",
  experienceYears: number,
  categories: string[],
  sessionLength: "short" | "medium" | "long",
  questionTarget: number (short=7, medium=12, long=18),
  showModelAnswer: boolean,
  resumeMode: "custom" | "weakness" | null,
  currentIndex: number,
  results: []
}
```

---

### Stage 1: 질문 선택 및 면접 진행

#### 1-1. 질문 로드 및 선택

1. `Read` 도구로 `knowledge/_index.md`를 읽어 사용 가능한 파일 목록을 확인합니다
2. 선택된 카테고리에 해당하는 knowledge 파일들을 `Read`로 읽습니다
3. **질문 선택 알고리즘**: 선택된 카테고리를 라운드 로빈으로 순회하며, 각 카테고리 내에서 난이도를 오름차순으로 진행합니다. questionTarget에 도달하면 선택을 중단합니다.

Knowledge 파일이 없는 카테고리: 해당 카테고리를 건너뛰고 사용자에게 경고합니다.

#### 1-2. 면접 루프

각 메인 질문에 대해 다음을 반복합니다:

**a) 질문 제시**

```
📋 질문 {currentIndex}/{questionTarget} | 카테고리: {category} | 난이도: {difficulty}

{question text}
```

**b) 사용자 답변 대기**

`AskUserQuestion` 또는 자유 텍스트로 답변을 받습니다.

**c) 답변 평가 및 꼬리질문**

사용자의 답변을 knowledge 파일의 Key Points와 비교 평가하고, 적절한 꼬리질문을 생성합니다:

- 답변이 모호/불완전: 구체적 설명 요청
- 답변에 오개념 포함: 반례를 들어 부드럽게 도전
- 답변이 우수: 엣지 케이스나 심화 내용으로 확장

**꼬리질문 규칙: 1회 초기 답변 + 최대 4회 꼬리질문 = 질문당 최대 5회 상호작용**

4회 꼬리질문 후 또는 사용자가 다음 질문을 원하면 자동으로 다음 메인 질문으로 전환합니다.

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

#### 1-3. 컨텍스트 관리 (긴 세션)

15개 이상 질문 진행 시, **매 5문제마다** 이전 Q&A 결과를 압축합니다:
- 압축 형식: `Q{n}: {title} | Grade: {grade} | Gaps: {missed points summary}`
- Stage 2 리포트 생성 전에 등급 기준표를 knowledge 파일에서 다시 읽습니다

#### 1-4. 중도 종료

사용자가 "stop", "end", "종료", "그만", "리포트" 등을 입력하면:
- 현재까지 완료된 질문의 results만으로 Stage 2로 진행합니다
- 미완료 질문은 리포트에서 제외합니다

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

#### 2-2. 리포트 생성

다음 형식의 리포트를 **대화에 표시**하고, **프로젝트 루트에 파일로 저장**합니다.

파일 경로: `fe-interview-report-{YYYY-MM-DD-HHmm}.md`

```markdown
# Frontend Interview Report

**날짜:** {YYYY-MM-DD}
**레벨:** {Junior/Mid/Senior} ({N}년차)
**세션:** {완료 질문 수}/{목표} 질문 ({length} 세션)
**종합 등급:** {S/A/B/C/D}

---

## 종합 평가
{2~3문장 전체 평가}

## 질문별 결과

### Q1: {Question Title}
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

#### 2-3. 리포트 저장

```
Write 도구로 `fe-interview-report-{YYYY-MM-DD-HHmm}.md`를 프로젝트 루트에 저장합니다.
```

---

## Error Handling

| 상황 | 처리 방법 |
|------|----------|
| 이력서 파싱 실패 | 경고 출력 후 표준 모드로 fallback |
| Knowledge 파일 없음 | 해당 카테고리 건너뛰고 사용자에게 경고 |
| 컨텍스트 압박 (긴 세션) | 이전 결과 압축 + 짧은 세션 전환 권유 |
| 지원하지 않는 카테고리 | 가장 유사한 카테고리 추천 또는 일반 질문 생성 |

## Examples

**기본 사용:**
```
/fe-interview
```
→ 연차 질문 → 카테고리 추천 → 세션 길이 선택 → 면접 시작

**이력서 포함:**
```
/fe-interview --resume ./resume.pdf --length medium
```
→ 이력서 분석 → 활용 방식 선택 → 중간 길이 면접 시작

**레벨 직접 지정:**
```
/fe-interview --level senior --length short
```
→ 시니어 카테고리 추천 → 짧은 면접 시작

## Knowledge File Sources

질문은 다음 출처를 참고하여 작성되었습니다:
- [front-end-interview-handbook](https://github.com/yangshun/front-end-interview-handbook)
- [system-design-primer](https://github.com/donnemartin/system-design-primer)

업데이트 확인: `scripts/update_knowledge.sh --check`
