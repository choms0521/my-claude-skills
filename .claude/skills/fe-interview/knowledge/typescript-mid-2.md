# TypeScript - Mid Interview Questions (Part 2)
### Language: en

## Q11: What is the `infer` keyword in TypeScript and how do you use it?

### Question
Explain the `infer` keyword in TypeScript conditional types. What does it do, and what are practical examples of using it?

### Model Answer
The `infer` keyword is used inside conditional types to introduce a type variable that TypeScript should infer at the point where the conditional type is evaluated. It essentially lets you extract and capture a portion of a type for use in the true branch of a conditional type. Without `infer`, you could check whether a type matches a pattern, but you could not extract parts of that pattern.

The basic syntax appears inside the `extends` clause of a conditional type: `T extends SomeType<infer U> ? U : never`. Here, if `T` extends `SomeType<U>` for some type `U`, TypeScript infers what `U` is and makes it available in the true branch. The `infer U` declaration introduces `U` as a locally scoped type variable within the conditional type.

A foundational use case is extracting the return type of a function — in fact, this is how TypeScript's built-in `ReturnType<T>` utility is implemented: `type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never`. If you pass `typeof someFunction` as `T`, TypeScript infers `R` as the function's return type. Similarly, `Parameters<T>` uses `infer P` to extract the parameter tuple: `T extends (...args: infer P) => any ? P : never`.

Another practical use is extracting the element type from an array or Promise: `type Unbox<T> = T extends Promise<infer U> ? U : T` — pass in `Promise<string>` and get `string` back. For arrays: `type ElementType<T> = T extends Array<infer E> ? E : never`. These patterns are extremely common in utility type libraries and API response transformation code.

`infer` can also appear multiple times in the same conditional type to capture multiple parts simultaneously. For example, extracting the first and rest parameters: `type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never`. With TypeScript 4.0+ variadic tuple types, `infer` becomes even more powerful for manipulating tuple types — extracting specific positions, splitting tuples, and building transformation pipelines at the type level.

### Key Points
- `infer` introduces a type variable inside a conditional type's `extends` clause that TypeScript infers automatically
- Only valid inside conditional types (`T extends ... infer U ? U : never`)
- Powers built-in utility types: `ReturnType`, `Parameters`, `InstanceType`, `Awaited`
- Can appear multiple times in one conditional type to extract multiple type parts
- Essential for building generic utility types that transform or extract parts of other types

### Follow-up Prompts
- How would you implement `Awaited<T>` (which unwraps nested Promises) using `infer`?
- Can `infer` be used in the false branch of a conditional type?
- How does `infer` interact with union types when the input is a union?

### Difficulty: intermediate
### Tags: infer, conditional-types, utility-types, typescript-advanced

---

## Q12: What are template literal types in TypeScript?

### Question
Explain template literal types in TypeScript. What are they, how do you use them, and what practical problems do they solve?

### Model Answer
Template literal types are a TypeScript type-level feature that mirrors JavaScript's template literal syntax. Just as template literals in JavaScript let you construct strings by embedding expressions — `\`Hello ${name}\`` — template literal types let you construct new string literal types by combining existing string literal types. They were introduced in TypeScript 4.1.

The syntax is identical to JavaScript template literals but at the type level: `` type Greeting = `Hello ${string}` ``. This type matches any string that starts with "Hello " followed by any string. More powerfully, when you combine template literal types with union types, TypeScript distributes the template over each union member, creating a new union: `` type EventName = `on${Capitalize<'click' | 'focus' | 'blur'>}` `` produces `'onClick' | 'onFocus' | 'onBlur'`.

A key practical use case is strongly typing event-driven APIs. Consider a function that registers event handlers: `function on(event: EventName, handler: () => void)` where `EventName` is a template literal union. Callers get autocomplete and type checking for event names without maintaining a separate enum. Similarly, CSS property generation, API route typing, and i18n key validation are all natural uses.

TypeScript provides several utility types designed to work with template literal types: `Uppercase<S>`, `Lowercase<S>`, `Capitalize<S>`, and `Uncapitalize<S>` operate on string literal types. These are especially useful when generating camelCase getter/setter names or converting between naming conventions at the type level. For example, generating a type-safe object of getter functions from a record of property names.

Template literal types also work with `infer` to extract portions of string types: `` type GetEventType<S> = S extends `on${infer E}` ? E : never ``. Pass in `'onClick'` and get `'Click'` back. This enables building sophisticated type parsers — URL parameter extraction, SQL query type inference, and GraphQL schema parsing have all been implemented using template literal types and `infer` combinations.

### Key Points
- Template literal types construct new string types by combining literal types: `` `prefix_${OtherType}` ``
- Distributes over union types — `` `on${'A' | 'B'}` `` produces `'onA' | 'onB'`
- Built-in string manipulation types: `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize`
- Combines with `infer` to extract parts of string types (e.g., parse event names, URL segments)
- Practical uses: type-safe event names, API routes, CSS property keys, i18n key validation

### Follow-up Prompts
- How would you create a type that extracts URL parameters from a route string like `'/users/:id/posts/:postId'`?
- What happens when you use a non-literal string type (just `string`) inside a template literal type?
- How do template literal types interact with mapped types to transform object key names?

### Difficulty: intermediate
### Tags: template-literal-types, string-types, typescript-4, conditional-types

---

## Q13: What are assertion functions in TypeScript?

### Question
What are TypeScript assertion functions? How do you declare them, and how do they differ from type guards?

### Model Answer
Assertion functions are TypeScript functions that assert something about their argument is true — and if not, throw an error. They tell the TypeScript compiler that if the function returns (without throwing), a certain condition about an argument is guaranteed. The key syntactic feature is the `asserts` keyword in the return type position, which signals this special behavior.

The two forms of assertion functions are `asserts condition` and `asserts arg is Type`. The first asserts that a boolean expression is true: `function assert(condition: unknown): asserts condition { if (!condition) throw new Error('Assertion failed') }`. After calling `assert(user !== null)`, TypeScript knows `user` is not null for the rest of the scope. The second form combines assertion with type narrowing: `function assertIsString(val: unknown): asserts val is string { if (typeof val !== 'string') throw new Error('Not a string') }`. After calling `assertIsString(x)`, TypeScript treats `x` as `string`.

The critical difference from regular type guards is the return type. A type guard returns `boolean`: `function isString(val: unknown): val is string { return typeof val === 'string' }`. You use it in an `if` statement, and TypeScript narrows the type within the branch. An assertion function returns `void` (or never, if it always throws) and TypeScript narrows the type immediately after the call — no `if` statement needed. This is appropriate when you want to throw on invalid input rather than handle both branches.

Assertion functions are particularly useful in test setup code (asserting that a value is defined before using it in a test), input validation at API boundaries, and configuration validation at startup. They are also common in utility libraries that wrap invariant checks — the popular `invariant` package can be typed as an assertion function.

One important limitation: assertion functions must be arrow functions or regular function declarations — they cannot be inline type assertions. Also, the `asserts` return type tells TypeScript to trust your runtime check, so you must ensure your implementation actually throws when the condition is not met. TypeScript does not verify that your function's implementation correctly corresponds to its `asserts` type annotation.

### Key Points
- Assertion functions use `asserts condition` or `asserts arg is Type` in their return type
- If the function returns without throwing, TypeScript narrows types based on the assertion
- Unlike type guards (return `boolean`, used in `if`), assertion functions narrow immediately after the call
- Must actually throw when the assertion fails — TypeScript trusts the annotation without checking the implementation
- Common uses: validation at API boundaries, test setup, startup configuration checks

### Follow-up Prompts
- What happens at the type level if an assertion function is called but the condition is false at runtime?
- How would you create an assertion function that narrows a value to a specific interface?
- Can you use assertion functions with the `&&` operator or ternary expressions?

### Difficulty: intermediate
### Tags: assertion-functions, type-guards, type-narrowing, typescript

---

## Q14: What are branded types in TypeScript?

### Question
Explain branded types (also called nominal types or opaque types) in TypeScript. What problem do they solve, and how do you implement them?

### Model Answer
TypeScript's type system is structural — two types are compatible if their shapes match, regardless of their names or semantic meaning. This means `type UserId = string` and `type PostId = string` are completely interchangeable. You can pass a `UserId` where a `PostId` is expected and TypeScript will not complain. For many domains, this is a safety problem: passing the wrong ID type to a function can cause hard-to-debug runtime bugs that TypeScript should catch.

Branded types solve this by adding a unique "brand" property to a primitive type that makes it structurally distinct from other types with the same underlying shape. The common pattern uses an intersection with an object type containing a unique symbol property: `type UserId = string & { readonly __brand: 'UserId' }`. Now `UserId` and `PostId` (which has `{ readonly __brand: 'PostId' }`) are structurally different — TypeScript will reject passing one where the other is expected.

Since the branded type is a subtype of its base type (e.g., `UserId` extends `string`), you can use branded values everywhere the base type is accepted. You can pass a `UserId` to a function expecting `string`. But you cannot pass a plain `string` where a `UserId` is expected without an explicit cast.

The creation of branded values requires a constructor function that performs a cast: `function createUserId(id: string): UserId { return id as UserId }`. This is typically the validation point — you validate the input before casting, ensuring that only validated values ever carry the brand. The brand only exists at the type level; at runtime, the value is just a plain string with no extra properties.

Branded types are widely used for validated primitive values: email addresses that have been verified, currency amounts in a specific denomination, non-empty strings, positive integers, and URL-safe strings. Libraries like `zod` can output branded types as the result of schema validation, combining runtime and compile-time safety. The `type-fest` library provides a `Tagged<Type, Tag>` utility that implements branded types cleanly.

### Key Points
- TypeScript is structural — type aliases for primitives are interchangeable without branding
- Branded types add a phantom property (`& { readonly __brand: 'Name' }`) to make types nominally distinct
- Constructor functions serve as the validation/casting point to create branded values
- The brand is type-only — no runtime overhead; the value remains the underlying primitive at runtime
- Common uses: validated strings (email, URL), typed IDs, currency amounts, non-empty collections

### Follow-up Prompts
- How do branded types interact with serialization (JSON.stringify/parse)?
- What is the difference between branded types and using a class to wrap a primitive?
- How would you implement a branded `NonEmptyArray<T>` type?

### Difficulty: intermediate
### Tags: branded-types, nominal-types, type-safety, structural-typing

---

## Q15: How does type narrowing work with discriminated unions?

### Question
Explain discriminated unions in TypeScript and how they enable exhaustive type narrowing. How does TypeScript use the discriminant to narrow types?

### Model Answer
A discriminated union (also called a tagged union or algebraic data type) is a union type where each member has a common property with a unique literal type — the "discriminant." TypeScript uses the discriminant to narrow the type within switch statements and if/else chains, giving you full type information for each specific variant without any type casting.

The pattern requires each union member to share a property name with a unique literal type value. For example: `type Shape = { kind: 'circle'; radius: number } | { kind: 'square'; side: number } | { kind: 'triangle'; base: number; height: number }`. The `kind` property is the discriminant. When you check `if (shape.kind === 'circle')`, TypeScript knows within that branch that `shape` has the `circle` variant's shape — `shape.radius` is accessible and `shape.side` is not.

Discriminated unions work especially well with `switch` statements. TypeScript narrows the type in each `case` arm automatically: `switch (shape.kind) { case 'circle': return Math.PI * shape.radius ** 2; case 'square': return shape.side ** 2 }`. Each case gives you full autocomplete and type safety for that specific variant.

The discriminant does not have to be a string literal. It can be any literal type: number literals (`kind: 1 | 2 | 3`), boolean, enum members, or `null`/`undefined`. The requirement is that each union member's discriminant property has a distinct, non-overlapping literal type so TypeScript can uniquely identify each variant.

Discriminated unions are particularly powerful for modeling state machines and API responses. A fetch state type like `{ status: 'loading' } | { status: 'success'; data: User } | { status: 'error'; error: Error }` makes it impossible to access `data` without first checking that `status === 'success'`. This eliminates entire categories of runtime null-access bugs by making the state machine explicit at the type level.

### Key Points
- Discriminated union: union of types sharing a common property with unique literal type per variant
- TypeScript narrows to the specific variant type after checking the discriminant
- Works with `if/else` and `switch` — each branch gets the narrowed type with full autocomplete
- Discriminant can be any literal type: string, number, boolean, enum member
- Ideal for state machines, API responses, Redux actions, and AST node types

### Follow-up Prompts
- How do you handle exhaustiveness checking with discriminated unions to catch missing cases?
- What is the difference between a discriminated union and a regular union with optional properties?
- How would you design a Result type (Ok/Error) using a discriminated union?

### Difficulty: intermediate
### Tags: discriminated-unions, type-narrowing, algebraic-data-types, switch

---

## Q16: How do you perform exhaustive checks using the `never` type?

### Question
Explain exhaustive checking in TypeScript using the `never` type. How does it work, and why is it useful for discriminated union handling?

### Model Answer
Exhaustive checking is a technique that uses TypeScript's `never` type to ensure you have handled every possible case in a union type. If you add a new variant to a discriminated union, exhaustive checks cause compile-time errors in every switch/if-else that does not handle the new case — making it impossible to forget to update related logic.

The `never` type represents a value that should never exist. A variable can only be assigned to `never` if TypeScript's control flow analysis determines it is truly impossible to reach that point. In a switch statement over a discriminated union, after all known cases are handled, the remaining type in the `default` branch is `never` — because all variants have been covered and TypeScript knows there are no values left.

The exhaustive check pattern: `function assertNever(x: never): never { throw new Error('Unhandled case: ' + JSON.stringify(x)) }`. At the end of your switch: `default: return assertNever(shape)`. If all cases are handled, the `shape` argument in the `default` branch has type `never`, and passing it to `assertNever` (which expects `never`) is valid. If you forget a case (or add a new variant to the union), TypeScript sees that the `default` branch is reachable with a non-`never` type and reports an error: "Argument of type 'Triangle' is not assignable to parameter of type 'never'."

An alternative that avoids the runtime throw is assigning to a `never` variable: `default: const _exhaustive: never = shape`. If all cases are handled, this assignment is valid (assigning `never` to `never`). If a case is missing, TypeScript reports a type error on the assignment. This approach is purely compile-time with no runtime cost.

Exhaustive checks are especially valuable in large codebases where union types evolve over time. When a new action type is added to a Redux reducer, new shape added to a geometry library, or a new status added to an API response type, exhaustive checks automatically surface every location in the codebase that needs updating — catching omissions at compile time rather than as runtime bugs in production.

### Key Points
- `never` represents an unreachable type — a value that TypeScript knows cannot exist at that point
- After handling all variants in a switch/if-else, the remaining type narrows to `never`
- `assertNever(x: never): never` pattern causes a compile error if any variant goes unhandled
- Alternative: `const _: never = x` for a purely compile-time check with no runtime throw
- Especially valuable when union types evolve — new variants surface all unhandled locations at compile time

### Follow-up Prompts
- What is the difference between `never` and `void` in TypeScript?
- How does the `assertNever` pattern behave if you accidentally pass a value of type `any` to it?
- How would you use exhaustive checking in a Redux reducer with a discriminated union of action types?

### Difficulty: intermediate
### Tags: never-type, exhaustive-checks, discriminated-unions, type-safety

---

## Q17: What is the difference between `readonly` arrays/tuples and regular arrays in TypeScript?

### Question
Explain `readonly` arrays and tuples in TypeScript. How do you declare them, and how do they differ from mutable arrays in terms of allowed operations?

### Model Answer
`readonly` arrays in TypeScript prevent mutation of the array — you cannot push, pop, splice, sort, or otherwise modify the array in place. You can read elements by index and use non-mutating methods like `map`, `filter`, `slice`, and `reduce`, but any operation that would modify the original array is a compile-time error. The underlying runtime value is still a regular JavaScript array — `readonly` is a compile-time constraint only.

There are two equivalent syntaxes for readonly arrays: `readonly T[]` and `ReadonlyArray<T>`. Both are identical in behavior. For tuples, you prepend `readonly`: `readonly [string, number]`. This prevents both element mutation and length changes. TypeScript also provides `Readonly<T[]>` which applies the `Readonly` utility to the array type, though `ReadonlyArray<T>` is cleaner.

The assignability rules follow a predictable pattern: a mutable array is assignable to a `readonly` array (you can always read from something you can mutate), but a `readonly` array is NOT assignable to a mutable array (you cannot treat something you cannot mutate as something you can). This matches the principle of Liskov substitution — a readonly view is a subtype of the mutable type.

`as const` assertions create readonly tuples with inferred literal types. `const point = [1, 2] as const` gives you `readonly [1, 2]` — a tuple with literal types `1` and `2`, not the broader `readonly number[]`. This is extremely useful for defining immutable configuration objects and ensures the inferred type is as specific as possible.

In function signatures, using `readonly` arrays for parameters signals to callers that the function will not mutate the input. This is a contract that TypeScript enforces — if a function accepts `ReadonlyArray<number>`, it cannot call `.push()` on the array inside the function body. This is especially valuable for pure functions and functional programming patterns where immutability is a core principle.

### Key Points
- `readonly T[]` or `ReadonlyArray<T>` prevents push/pop/splice and all mutating methods at compile time
- Mutable arrays are assignable to readonly arrays, but NOT vice versa (readonly is a subtype)
- `readonly [A, B]` for readonly tuples — prevents element mutation and length changes
- `as const` creates readonly tuples with inferred literal types: `[1, 'x'] as const` → `readonly [1, 'x']`
- Use in function parameters to document and enforce that the function does not mutate its input

### Follow-up Prompts
- Why is `ReadonlyArray<T>` not assignable to `Array<T>`, even though they have the same elements?
- How does `Readonly<T>` differ from `ReadonlyArray<T>` when applied to array types?
- What is `DeepReadonly<T>` and why is it not built into TypeScript?

### Difficulty: intermediate
### Tags: readonly, immutability, arrays, tuples, as-const

---

## Q18: What are function overloads in TypeScript?

### Question
Explain function overloads in TypeScript. When would you use them, how do you declare them, and what are the implementation constraints?

### Model Answer
Function overloads let you specify multiple type signatures for a single function, enabling TypeScript to type-check calls differently based on the argument types and return different types accordingly. This is useful when a function's return type or parameter types vary depending on what arguments are passed — something a single generic signature may not be able to express precisely.

Overloads are declared as multiple function signatures before the single implementation signature. The implementation signature is the actual function body, and it must be broad enough to accept all the overloaded call forms. However, the implementation signature is invisible to callers — TypeScript only exposes the overload signatures to the outside world. Only the overload signatures are shown in autocomplete and used for type-checking calls.

A classic example is a `createElement` function that returns specific element types based on the tag name argument: the overload `createElement(tag: 'input'): HTMLInputElement`, `createElement(tag: 'canvas'): HTMLCanvasElement`, and `createElement(tag: string): HTMLElement`. The implementation signature accepts `string` and returns `HTMLElement`. When a caller passes the literal `'input'`, TypeScript matches the first overload and the return type is `HTMLInputElement`.

The ordering of overloads matters: TypeScript tries each overload in order and uses the first one that matches. More specific overloads should be listed before more general ones. If a general overload appears first, it will match everything and the specific overloads will never be reached.

A common mistake is making the implementation signature compatible with callers. The implementation signature must be written separately from the overloads and must be internally consistent with handling all cases, but it is not available for external calls. Callers must match one of the explicit overload signatures.

Overloads are often overused. Many cases can be handled more cleanly with generics and conditional types. Prefer overloads when the relationship between input and output types is not expressible with generics — specifically when different argument types map to fundamentally different return types without a clean generic relationship.

### Key Points
- Multiple signature declarations before one implementation function — only the overload signatures are visible to callers
- Implementation signature must be broad enough to handle all overload cases
- Overloads are tried in order — put more specific before more general
- Implementation signature is NOT callable by external code — only the explicitly declared overloads are
- Use when different argument type combinations produce genuinely different return types not expressible with generics

### Follow-up Prompts
- Why is the implementation signature of a function overload not visible to external callers?
- When would you use function overloads instead of a union type parameter or generic?
- How do method overloads in a class differ from function overloads?

### Difficulty: intermediate
### Tags: function-overloads, typescript, type-signatures, api-design

---

## Q19: What is the difference between namespaces and modules in TypeScript?

### Question
Explain the difference between TypeScript namespaces and ES modules. When should you use each, and what are the pitfalls of namespaces?

### Model Answer
TypeScript namespaces (originally called "internal modules") are a TypeScript-specific mechanism for organizing code within a file or across files using the `namespace` keyword. ES modules are the modern JavaScript standard for code organization, using `import` and `export` statements. These are fundamentally different mechanisms that solve similar organizational problems but in very different ways.

Namespaces group related code under a named object. `namespace Validation { export interface StringValidator { ... } export function isAcceptable(str: string): boolean { ... } }`. From outside, you access members as `Validation.StringValidator` and `Validation.isAcceptable`. Namespaces can span multiple files using `/// <reference path="..." />` triple-slash directives, and `tsc` concatenates them with `--outFile`. Namespaces are TypeScript-only — they compile to immediately-invoked function expressions (IIFEs) that populate a global object.

ES modules use `import`/`export`: `export interface StringValidator { ... }` in one file, `import { StringValidator } from './validation'` in another. Each file is its own module scope. ES modules are a JavaScript standard supported natively by all modern browsers and Node.js. They work with bundlers, tree-shaking, lazy loading, and all modern tooling.

Namespaces are largely a historical artifact from when JavaScript had no native module system. They solved the global scope pollution problem before ES modules existed. Today, the TypeScript team recommends using ES modules in nearly all cases. The TypeScript documentation explicitly says to prefer modules over namespaces.

The appropriate use cases for namespaces today are limited. Declaration files (`.d.ts`) for older global libraries use namespaces to describe types that live on global objects — `declare namespace jQuery { ... }`. Augmenting global types uses declaration merging with namespaces: `declare global { namespace NodeJS { interface ProcessEnv { MY_VAR: string } } }`. These are type declaration scenarios, not code organization scenarios.

A common mistake is mixing namespaces with modules — using `namespace` inside a file that also has `import`/`export` statements. TypeScript treats any file with a top-level import or export as a module, and namespaces inside modules create nested object structures rather than global namespaces. Stick to one approach per file.

### Key Points
- Namespaces: TypeScript-only, compile to IIFEs, group code under a named object, span files with triple-slash references
- ES modules: JavaScript standard, `import`/`export` syntax, file-based scope, supported by all modern tooling
- Prefer ES modules for all application code — namespaces are a legacy pattern
- Namespaces are still valid in declaration files (`.d.ts`) for describing global libraries and augmenting global types
- Never mix namespaces and ES module imports in the same file

### Follow-up Prompts
- How do you augment the global `Window` interface using a namespace declaration?
- What is an ambient namespace and when would you see one in a `.d.ts` file?
- How does TypeScript's `--outFile` option relate to the use of namespaces?

### Difficulty: intermediate
### Tags: namespaces, es-modules, typescript, declaration-files, module-system

---

## Q20: What does TypeScript's strict mode enable, and why should you use it?

### Question
What flags does TypeScript's `strict` mode enable? Explain the most important ones and why strict mode should be the default for new projects.

### Model Answer
TypeScript's `strict: true` in `tsconfig.json` is a shorthand that enables a collection of strictness-related compiler flags simultaneously. Rather than enabling strictness checks one by one, `strict: true` turns them all on. The TypeScript team adds new strict checks to this flag over time, so enabling `strict` ensures you benefit from future safety improvements automatically.

The most impactful flag enabled by `strict` is `strictNullChecks`. Without it, `null` and `undefined` are assignable to every type — `const x: string = null` compiles fine. With `strictNullChecks`, `null` and `undefined` are their own distinct types. A function returning `string | null` must be handled differently from one returning `string`. This single flag eliminates TypeScript's most notorious safety gap and prevents the majority of production null-reference errors.

`noImplicitAny` prevents TypeScript from silently inferring `any` when it cannot determine a type. Without it, `function process(data) { ... }` compiles with `data` typed as `any`, bypassing all type checking. With `noImplicitAny`, you must explicitly annotate the type or fix the inference failure. This forces you to write types in ambiguous positions rather than accidentally opting out of type safety.

`strictFunctionTypes` enforces contravariant function parameter types. Without it, TypeScript uses bivariant checking for method parameters (for historical reasons), which allows potentially unsafe assignments. With `strictFunctionTypes`, function type parameters are checked contravariantly — you cannot assign a function that accepts a subtype to a variable expecting a function that accepts the supertype.

`strictPropertyInitialization` requires that class properties declared in the class body are initialized either in the declaration or in the constructor. Without it, a class can have `name: string` without assigning it anywhere, and accessing `this.name` silently returns `undefined` at runtime. With this flag, TypeScript requires initialization or an explicit `!` non-null assertion to acknowledge the intentional omission.

Other flags in `strict`: `alwaysStrict` (emits `'use strict'` in output), `strictBindCallApply` (types `bind`, `call`, and `apply` correctly), `useUnknownInCatchVariables` (types caught errors as `unknown` instead of `any`, requiring explicit type narrowing before use). Each flag addresses a specific category of runtime errors that TypeScript can catch statically.

### Key Points
- `strict: true` enables multiple safety flags: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictPropertyInitialization`, and others
- `strictNullChecks` is the most impactful — makes `null`/`undefined` explicit types, prevents null-reference bugs
- `noImplicitAny` prevents accidental `any` inference — forces explicit types in ambiguous positions
- `useUnknownInCatchVariables` types caught errors as `unknown` (safe) instead of `any` (unsafe)
- Enable `strict: true` from project start — retrofitting strict mode into an existing non-strict codebase is painful

### Follow-up Prompts
- How do you handle the `useUnknownInCatchVariables` flag when you need to access error properties?
- What is the `exactOptionalPropertyTypes` flag and why is it not in `strict` by default?
- How would you gradually enable strict mode on an existing non-strict TypeScript codebase?

### Difficulty: intermediate
### Tags: strict-mode, tsconfig, strictNullChecks, noImplicitAny, typescript-config

---
