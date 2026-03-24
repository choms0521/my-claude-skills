# Gemini 코드 리뷰

**날짜:** 2026-03-24
**범위:** src/api.ts, src/auth.ts, src/utils.ts (전체 파일 리뷰)
**집중 영역:** Code clarity, alternative approaches, edge cases, documentation gaps, naming

## 리뷰 항목

[REVIEW_ITEM]
file: src/auth.ts
line: 11-14
severity: CRITICAL
category: security
title: 데이터베이스 쿼리를 통한 평문 비밀번호 비교
description: login 함수에서 SQL 쿼리에 password를 직접 전달하여 비교하고 있습니다. 이는 데이터베이스에 비밀번호가 평문으로 저장되어 있거나, 해싱된 비밀번호를 올바르게 검증하지 못하고 있음을 의미합니다.
suggestion: 사용자 이름으로 사용자를 먼저 조회한 후, `bcrypt.compare`를 사용하여 입력된 비밀번호와 해싱된 비밀번호를 비교하십시오.
```typescript
export async function login(username: string, password: string) {
  const user = await db.raw('SELECT * FROM users WHERE username = ?', [username]);
  if (user && await bcrypt.compare(password, user.password)) {
    const token = generateToken(user, JWT_SECRET);
    return { token, user };
  }
  return null;
}
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 74-91
severity: MEDIUM
category: style
title: 중첩된 조건문(Pyramid of Doom)으로 인한 가독성 저해
description: `processOrder` 메서드 내에 수많은 `if` 문이 중첩되어 있어 코드의 흐름을 파악하기 어렵고 유지보수가 힘듭니다.
suggestion: Early Return(Guard Clauses) 패턴을 적용하여 로직을 평면화하십시오.
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 43-51
severity: HIGH
category: logic
title: 캐시 레이스 컨디션(Race Condition) 발생
description: `getData` 메서드에서 캐시 확인과 데이터 조회가 원자적으로 이루어지지 않습니다. 동일한 키에 대해 여러 요청이 동시에 들어오면 데이터베이스 조회가 중복으로 발생할 수 있습니다.
suggestion: Promise 자체를 캐싱하거나 세마포어 등을 사용하여 동시성을 제어하십시오.
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 65-67
severity: MEDIUM
category: best-practice
title: 입력 매개변수(Request Body)의 직접적인 변조
description: `req.body`를 직접 수정(`item.updatedAt = ...`)하는 것은 다른 미들웨어나 로직에서 해당 객체를 참조할 때 예기치 않은 부작용을 일으킬 수 있습니다.
suggestion: 객체 구조 분해 할당을 통해 새로운 객체를 생성하여 사용하십시오.
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/utils.ts
line: 36-38
severity: HIGH
category: error-handling
title: JSON.parse 예외 처리 누락
description: `parseConfig` 함수에서 `JSON.parse` 호출 시 입력값이 유효하지 않은 JSON일 경우 예외가 발생하여 프로세스가 중단될 수 있습니다.
suggestion: try-catch 구문을 사용하여 에러를 처리하고 명시적 에러를 던지십시오.
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/utils.ts
line: 41-43
severity: MEDIUM
category: logic
title: formatCurrency의 타입 불안정성
description: `amount` 인자가 `any`로 선언되어 있으며, 숫자가 아닌 값이 들어올 경우 `toFixed` 함수가 존재하지 않아 런타임 에러가 발생합니다.
suggestion: TypeScript의 타입을 명시하고 런타임 유효성 검사를 추가하십시오.
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 14-16
severity: LOW
category: best-practice
title: 무분별한 any 타입 사용 및 인터페이스 부재
description: `cache`, `db`, `logger` 등이 모두 `any`로 선언되어 있어 타입 추론 및 컴파일 타임 에러 체크가 불가능합니다.
suggestion: 각 의존성에 대한 인터페이스를 정의하여 주입받도록 개선하십시오.
[/REVIEW_ITEM]
