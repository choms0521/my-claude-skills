# Claude 코드 리뷰

**날짜:** 2026-03-24
**범위:** src/api.ts, src/auth.ts, src/utils.ts (전체 파일 리뷰)
**집중 영역:** Logic correctness, error handling, SOLID principles, spec compliance, anti-patterns

## 리뷰 항목

[REVIEW_ITEM]
file: src/auth.ts
line: 11-14
severity: CRITICAL
category: security
title: 평문 비밀번호를 SQL 쿼리로 직접 비교
description: login 함수에서 비밀번호를 SQL 쿼리의 WHERE 조건으로 직접 비교하고 있습니다. bcrypt로 해시된 비밀번호를 저장하고 있다면 이 쿼리는 항상 실패하며, 평문 저장 시에는 심각한 보안 취약점입니다. changePassword에서는 bcrypt.hash를 사용하므로 login과 불일치합니다.
suggestion: username으로만 조회 후 bcrypt.compare로 비밀번호를 검증하세요:
```typescript
const user = await db.raw('SELECT * FROM users WHERE username = ?', [username])
if (user && await bcrypt.compare(password, user.password)) {
  const token = generateToken(user, JWT_SECRET)
  return { token, user }
}
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/auth.ts
line: 10-20
severity: HIGH
category: error-handling
title: login 실패 시 undefined 반환
description: 인증 실패 시 명시적 반환값이 없어 undefined가 반환됩니다. 호출자가 실패와 성공을 명확히 구분하기 어렵고, 반환값에 대한 null check을 빠뜨리면 런타임 에러가 발생할 수 있습니다.
suggestion: 실패 시 null을 명시적으로 반환하거나 에러를 던지세요:
```typescript
if (user && await bcrypt.compare(password, user.password)) {
  const token = generateToken(user, JWT_SECRET)
  return { token, user }
}
return null
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/auth.ts
line: 48
severity: LOW
category: best-practice
title: 토큰 만료 시간 매직 넘버
description: expiresIn: 86400은 의미가 불명확합니다. 24시간을 의미하지만 코드만으로는 파악이 어렵습니다.
suggestion: 명명된 상수를 사용하세요:
```typescript
const TOKEN_EXPIRY = '24h'
// ...
{ expiresIn: TOKEN_EXPIRY }
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 12-89
severity: HIGH
category: best-practice
title: God Object 안티패턴 — ApiHandler가 모든 책임을 담당
description: ApiHandler 클래스가 프로필 조회, 사용자 삭제, 캐시 관리, 아이템 CRUD, 주문 처리를 모두 담당합니다. 단일 책임 원칙(SRP)을 위반하며 유지보수와 테스트가 어렵습니다.
suggestion: 도메인별로 핸들러를 분리하세요: UserHandler, CacheHandler, ItemHandler, OrderHandler 등으로 분리하여 각각 하나의 책임만 갖도록 리팩토링하세요.
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 37-46
severity: HIGH
category: logic
title: getData 캐시의 Race Condition
description: 동시 요청 시 cache[key]가 아직 없는 상태에서 여러 요청이 동시에 DB 조회를 수행할 수 있습니다. 불필요한 중복 DB 호출이 발생하고, 비동기 작업 완료 순서에 따라 캐시 값이 달라질 수 있습니다.
suggestion: Promise를 캐시하여 중복 요청을 방지하세요:
```typescript
async getData(req: Request, res: Response) {
  const key = req.query.key as string
  if (!this.cache[key]) {
    this.cache[key] = this.db.findData(key)
  }
  const data = await this.cache[key]
  res.json(data)
}
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 59-66
severity: HIGH
category: best-practice
title: 입력 파라미터(req.body) 직접 변이
description: req.body 객체를 직접 수정(mutation)하고 있습니다. 이는 immutability 원칙을 위반하며, Express 미들웨어 체인에서 예기치 않은 부작용을 일으킬 수 있습니다.
suggestion: 새 객체를 생성하세요:
```typescript
async updateItem(req: Request, res: Response) {
  const updatedItem = {
    ...req.body,
    updatedAt: new Date(),
    updatedBy: req.user?.id,
  }
  await this.db.update(updatedItem.id, updatedItem)
  res.json(updatedItem)
}
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 69-88
severity: HIGH
category: style
title: processOrder의 과도한 중첩 (7레벨)
description: 7단계 깊이의 중첩된 if문은 가독성이 극히 낮고 유지보수가 어렵습니다. 또한 유효하지 않은 주문에 대한 에러 응답 없이 항상 성공 응답을 반환합니다.
suggestion: guard clause 패턴으로 평탄화하세요:
```typescript
async processOrder(req: Request, res: Response) {
  const order = req.body
  if (!order?.items?.length) {
    return res.status(400).json({ error: 'Invalid order' })
  }
  for (const item of order.items) {
    if (!item?.quantity || item.quantity <= 0 || !item.price) continue
    const total = item.quantity * item.price
    // process item total
  }
  res.json({ status: 'processed' })
}
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 79
severity: MEDIUM
category: best-practice
title: console.log 디버그 코드 잔존
description: 프로덕션 코드에 console.log가 남아있습니다. 로거를 사용해야 하며, 이미 클래스에 logger 인스턴스가 주입되어 있으므로 이를 활용해야 합니다.
suggestion: `console.log` 대신 `this.logger.info`를 사용하세요.
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 23-28
severity: HIGH
category: error-handling
title: getProfile에서 user null 체크 없음
description: db.findUser가 null을 반환할 경우 user.name 접근 시 TypeError가 발생합니다. 존재하지 않는 사용자 ID로 요청 시 서버가 크래시될 수 있습니다.
suggestion: null 체크를 추가하세요:
```typescript
async getProfile(req: Request, res: Response) {
  const userId = req.params.id
  const user = await this.db.findUser(userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.send(`<html><body><h1>Welcome ${escapeHtml(user.name)}</h1><p>${escapeHtml(user.bio)}</p></body></html>`)
}
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 48-56
severity: MEDIUM
category: security
title: createItem에서 req.body 미검증
description: 사용자 입력(req.body)을 검증 없이 직접 DB에 전달하고 있습니다. Mass assignment 공격에 취약하며, 예상치 못한 필드가 DB에 저장될 수 있습니다.
suggestion: 입력 스키마를 정의하고 검증하세요:
```typescript
const createItemSchema = z.object({
  name: z.string(),
  price: z.number().positive(),
})
const validated = createItemSchema.parse(req.body)
const item = await this.db.create(validated)
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/utils.ts
line: 29-31
severity: HIGH
category: error-handling
title: parseConfig에서 JSON 파싱 에러 미처리
description: 잘못된 JSON 문자열이 전달되면 JSON.parse가 SyntaxError를 던지며 호출자에게 그대로 전파됩니다. 반환 타입도 any로 타입 안전성이 없습니다.
suggestion: try-catch로 감싸고 타입을 지정하세요:
```typescript
export function parseConfig<T>(configStr: string): T {
  try {
    return JSON.parse(configStr) as T
  } catch (error) {
    throw new Error(`Invalid config JSON: ${(error as Error).message}`)
  }
}
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/utils.ts
line: 34-36
severity: HIGH
category: logic
title: formatCurrency의 타입 안전성 부재
description: amount 파라미터가 any 타입이므로 null, undefined, 문자열 등이 전달되면 런타임 에러(toFixed is not a function)가 발생합니다. 또한 달러 기호가 하드코딩되어 있어 다국어 지원이 불가합니다.
suggestion: 타입을 명시하고 검증을 추가하세요:
```typescript
export function formatCurrency(amount: number, locale = 'en-US', currency = 'USD'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/utils.ts
line: 38-40
severity: MEDIUM
category: security
title: loadTemplate의 경로 순회(Path Traversal) 위험
description: 사용자 제공 경로를 검증 없이 fs.readFile에 전달하면 `../../etc/passwd` 같은 경로로 시스템 파일에 접근할 수 있습니다.
suggestion: 허용된 디렉토리 내로 경로를 제한하세요:
```typescript
import path from 'path'
const TEMPLATE_DIR = path.resolve(__dirname, '../templates')

export async function loadTemplate(templateName: string): Promise<string> {
  const resolved = path.resolve(TEMPLATE_DIR, templateName)
  if (!resolved.startsWith(TEMPLATE_DIR)) {
    throw new Error('Invalid template path')
  }
  return await fs.readFile(resolved, 'utf8')
}
```
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/utils.ts
line: 19-27
severity: LOW
category: best-practice
title: 사용되지 않는 legacyHash 함수
description: 주석에 "Unused function"으로 명시되어 있으며, 보안적으로도 약한 해시 알고리즘입니다. 데드 코드는 코드베이스의 복잡성을 불필요하게 증가시킵니다.
suggestion: 사용처가 없다면 함수를 삭제하세요. 필요한 경우 crypto 모듈의 표준 해시를 사용하세요.
[/REVIEW_ITEM]

[REVIEW_ITEM]
file: src/api.ts
line: 14
severity: MEDIUM
category: best-practice
title: cache 타입이 any
description: cache의 타입이 any로 선언되어 타입 안전성이 없습니다. Map이나 Record를 사용하면 타입 추론이 가능합니다.
suggestion: `private cache: Record<string, unknown> = {}` 또는 `private cache = new Map<string, unknown>()`으로 변경하세요.
[/REVIEW_ITEM]
