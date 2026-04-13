# Frontend Interview Knowledge Index

카테고리+난이도별 질문 파일 카탈로그. SKILL.md가 질문 선택 시 이 파일을 먼저 참조합니다.
파일명에 `-2` 접미사가 붙은 파일은 해당 카테고리의 확장 질문(Q11~Q20)입니다.

## Files

| File | Category | Level | Questions | Difficulty Range |
|------|----------|-------|-----------|-----------------|
| javascript-junior.md | JavaScript | junior | 10 (Q1-Q10) | basic - intermediate |
| javascript-junior-2.md | JavaScript | junior | 10 (Q11-Q20) | basic - intermediate |
| javascript-junior-3.md | JavaScript | junior | 10 (Q21-Q30) | basic - intermediate |
| javascript-mid.md | JavaScript | mid | 10 (Q1-Q10) | intermediate - advanced |
| javascript-mid-2.md | JavaScript | mid | 10 (Q11-Q20) | intermediate - advanced |
| javascript-senior.md | JavaScript | senior | 10 (Q1-Q10) | advanced |
| javascript-senior-2.md | JavaScript | senior | 10 (Q11-Q20) | advanced |
| html-css-junior.md | HTML/CSS | junior | 10 (Q1-Q10) | basic - intermediate |
| html-css-junior-2.md | HTML/CSS | junior | 10 (Q11-Q20) | basic - intermediate |
| html-css-junior-3.md | HTML/CSS | junior | 10 (Q21-Q30) | basic - intermediate |
| html-css-mid.md | HTML/CSS | mid | 10 (Q1-Q10) | intermediate - advanced |
| html-css-mid-2.md | HTML/CSS | mid | 10 (Q11-Q20) | intermediate - advanced |
| react-junior.md | React | junior | 10 (Q1-Q10) | basic - intermediate |
| react-junior-2.md | React | junior | 10 (Q11-Q20) | basic - intermediate |
| react-mid.md | React | mid | 10 (Q1-Q10) | intermediate - advanced |
| react-mid-2.md | React | mid | 10 (Q11-Q20) | intermediate - advanced |
| react-senior.md | React | senior | 10 (Q1-Q10) | advanced |
| react-senior-2.md | React | senior | 10 (Q11-Q20) | advanced |
| typescript-mid.md | TypeScript | mid | 10 (Q1-Q10) | intermediate - advanced |
| typescript-mid-2.md | TypeScript | mid | 10 (Q11-Q20) | intermediate - advanced |
| typescript-senior.md | TypeScript | senior | 10 (Q1-Q10) | advanced |
| typescript-senior-2.md | TypeScript | senior | 10 (Q11-Q20) | advanced |
| performance-mid.md | Performance | mid | 10 (Q1-Q10) | intermediate - advanced |
| performance-mid-2.md | Performance | mid | 10 (Q11-Q20) | intermediate - advanced |
| performance-senior.md | Performance | senior | 10 (Q1-Q10) | advanced |
| performance-senior-2.md | Performance | senior | 10 (Q11-Q20) | advanced |
| system-design-senior.md | System Design | senior | 10 (Q1-Q10) | advanced |
| system-design-senior-2.md | System Design | senior | 10 (Q11-Q20) | advanced |
| system-design-senior-3.md | System Design | senior | 10 (Q21-Q30) | advanced |
| security-senior.md | Web Security | senior | 10 (Q1-Q10) | advanced |
| security-senior-2.md | Web Security | senior | 10 (Q11-Q20) | advanced |
| architecture-senior.md | Architecture | senior | 10 (Q1-Q10) | advanced |
| architecture-senior-2.md | Architecture | senior | 10 (Q11-Q20) | advanced |
| nextjs-mid.md | Next.js | mid | 10 (Q1-Q10) | intermediate - advanced |
| nextjs-senior.md | Next.js | senior | 10 (Q1-Q10) | advanced |
| testing-mid.md | Testing | mid | 10 (Q1-Q10) | intermediate - advanced |
| testing-senior.md | Testing | senior | 10 (Q1-Q10) | advanced |
| accessibility-mid.md | Accessibility | mid | 10 (Q1-Q10) | intermediate - advanced |
| accessibility-senior.md | Accessibility | senior | 10 (Q1-Q10) | advanced |

## Category-Level Matrix

| Category | Junior | Mid | Senior | Total |
|----------|--------|-----|--------|-------|
| JavaScript | 30 | 20 | 20 | 70 |
| HTML/CSS | 30 | 20 | - | 50 |
| React | 20 | 20 | 20 | 60 |
| TypeScript | - | 20 | 20 | 40 |
| Performance | - | 20 | 20 | 40 |
| System Design | - | - | 30 | 30 |
| Web Security | - | - | 20 | 20 |
| Architecture | - | - | 20 | 20 |
| Next.js | - | 10 | 10 | 20 |
| Testing | - | 10 | 10 | 20 |
| Accessibility | - | 10 | 10 | 20 |
| **Total** | **80** | **130** | **180** | **390** |

**Grand Total: 390 questions across 39 files, 11 categories**

## Level Recommendations

| Level | Recommended Categories | Files | Questions |
|-------|----------------------|-------|-----------|
| Junior (1-3yr) | JavaScript, HTML/CSS, React | 8 files | 80 questions |
| Mid (4-7yr) | JS, HTML/CSS, React, TypeScript, Performance, Next.js, Testing, Accessibility | 18 files | 210 questions |
| Senior (8yr+) | All categories | 39 files | 390 questions |

## Naming Convention

- `{category}-{level}.md` — 기본 파일 (Q1-Q10)
- `{category}-{level}-2.md` — 확장 파일 (Q11-Q20)
- 추후 `-3`, `-4` 등으로 추가 확장 가능

## Knowledge Graph (v2)

v2에서는 `graph/` 디렉토리에 지식 그래프가 추가되었습니다:
- `graph/_graph.json` — 114개 노드 + 140개 엣지 (세션 시작 시 로드)
- `graph/nodes/**/*.json` — 노드별 상세 파일 (필요 시 로드)
- `graph/roles/*.json` — 3명 면접관 역할 정의

그래프 모드(`--mode graph`)에서는 노드 관계를 따라 동적 질문을 생성하며, 클래식 모드(`--mode classic`)에서는 기존 knowledge 파일을 직접 사용합니다.

## Last Updated
2026-04-13
