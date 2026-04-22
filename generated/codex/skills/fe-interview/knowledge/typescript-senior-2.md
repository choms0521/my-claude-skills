# TypeScript - Senior Interview Questions (Part 2)
### Language: en

## Q11: How do you emulate Higher-Kinded Types (HKT) in TypeScript?

### Question
TypeScript does not natively support Higher-Kinded Types. Explain what HKTs are, why they are useful, and how the TypeScript community emulates them using type-level tricks.

### Model Answer
Higher-Kinded Types (HKTs) are types that abstract over type constructors — types that take types as parameters. In languages like Haskell or Scala, you can write a `Functor` typeclass that works over any type constructor `F`, so `map` has the signature `map: <A, B>(fa: F<A>, f: (a: A) => B) => F<B>`. This works for `Array`, `Promise`, `Option`, `Either`, and any other functor without writing separate implementations. TypeScript's type system does not support type constructors as type parameters directly — you cannot write `<F extends TypeConstructor>` where `F` itself is parameterized.

The most practical emulation technique uses a "URI-keyed" type map and index lookups. You define an interface that maps string literal keys to concrete type applications, then use the key as a proxy for the type constructor. The `fp-ts` library pioneered this approach in the TypeScript ecosystem. You declare an interface `URItoKind<A>` that maps `'Array' -> Array<A>`, `'Option' -> Option<A>`, etc. The HKT "kind" is then `URItoKind<A>[URI]` where `URI` is a string key. A functor can be typed as `interface Functor<F extends URIS> { map: <A, B>(fa: Kind<F, A>, f: (a: A) => B) => Kind<F, B> }` where `Kind<F, A>` is the index lookup.

A more recent technique uses `interface` declaration merging and a `HKT` interface. You declare `interface HKT { readonly _URI: string; readonly _A: unknown }` and then for each type constructor, you merge into a global registry. Higher-order constraints are expressed using conditional types: `type Apply<F extends HKT, A> = F extends { _URI: infer U } ? URItoKind<A>[U] : never`. This is a lighter-weight version of the URI map approach.

The `effect-ts` Effect library (and its predecessor `fp-ts`) makes extensive use of HKT emulation to enable generic programming over type constructors. You can write generic algorithms that work over any `Functor`, `Monad`, or `Traversable` without knowing the specific type constructor — the concrete implementation is selected at the call site by passing a type-class instance.

The limitation of all emulation approaches is that they are opt-in — every new type constructor must be registered in the global map. The TypeScript compiler does not enforce this, so you get runtime errors if you forget to register. Proper HKT support at the language level would not require this registration. There is an open TypeScript feature request for HKTs but it has not been implemented due to significant type-checker performance concerns.

### Key Points
- HKTs abstract over type constructors (`F<A>`) rather than concrete types — TypeScript cannot express this natively
- URI-keyed map emulation: a global `URItoKind<A>` interface maps string keys to applied type constructors
- `Kind<F, A>` = `URItoKind<A>[F]` serves as the proxy for `F<A>` at the type level
- Enables writing generic functors, monads, and traversals that work over registered type constructors
- Used by `fp-ts` and `effect-ts`; requires manual registration of each new type constructor in the global map

### Follow-up Prompts
- Why cannot TypeScript simply add HKT support by allowing `<F<_>>` as a type parameter syntax?
- How does `fp-ts` version 2 differ from version 1 in its HKT emulation approach?
- What would be the TypeScript type signature of a generic `sequence` function that works over any `Traversable`?

### Difficulty: advanced
### Tags: hkt, higher-kinded-types, fp-ts, type-system, generics

---

## Q12: What is the Effect-TS library and what does it bring to TypeScript's type system?

### Question
Explain the Effect library (effect-ts). What type-level guarantees does it provide, and how does it change how you model errors, dependencies, and async operations in TypeScript?

### Model Answer
Effect is a TypeScript library for building production-grade applications that encodes three dimensions of a computation into a single type: the success value, the error type, and the required dependencies (context/environment). The core type is `Effect<Success, Error, Requirements>` — also written as `Effect<A, E, R>`. A function returning `Effect<User, DatabaseError | NotFoundError, UserRepository>` tells you at the type level that it produces a `User` on success, can fail with either `DatabaseError` or `NotFoundError`, and requires a `UserRepository` to be provided in the environment. None of this information is lost or implicit.

The error channel (`E`) is the most significant departure from conventional TypeScript. In standard TypeScript, errors thrown by functions are invisible to the type system — `async function getUser(): Promise<User>` does not tell callers what errors to expect. You can throw anything and the type system does not track it. Effect's `E` parameter tracks error types precisely. TypeScript knows exactly what errors a computation might produce, and the type system requires you to handle each error type explicitly or propagate it.

The requirements channel (`R`) implements dependency injection at the type level. Instead of importing singletons or relying on module-level state, you declare what a computation needs (`UserRepository`, `DatabasePool`, `Logger`) in its type, and provide actual implementations at the program's entry point via `Effect.provideService`. TypeScript verifies that all requirements are satisfied before the program can run — an `Effect<A, E, UserRepository>` cannot be executed until `UserRepository` has been provided. This is typed dependency injection that competes with full IoC frameworks like InversifyJS but with zero runtime overhead beyond what Effect provides.

Effect uses a fiber-based concurrency model — lightweight green threads managed by the Effect runtime. Fibers can be interrupted, forked, raced, and managed with structured concurrency patterns. `Effect.all([effectA, effectB])` runs effects in parallel and returns a tuple of results. `Effect.race(effectA, effectB)` runs both and returns the first to succeed, automatically interrupting the loser. These primitives compose cleanly and the types reflect the composition accurately.

The library also provides composable retries, timeouts, resource management (`Effect.acquireRelease` for the bracket pattern), structured logging, metrics, and tracing — all type-safe and composable. The learning curve is steep because Effect requires adopting a new paradigm (functional effect systems), but the result is applications where the type system enforces invariants that conventional TypeScript cannot express at all.

### Key Points
- Core type: `Effect<Success, Error, Requirements>` encodes success value, typed errors, and required context
- Typed error channel: unlike Promise/try-catch, all possible errors are tracked in the type signature
- Requirements/context channel: typed dependency injection — TypeScript enforces all dependencies are provided before execution
- Fiber-based concurrency: structured concurrency with fork, race, interrupt, and timeout as composable primitives
- High learning curve but provides guarantees (typed errors, typed DI) impossible with conventional TypeScript patterns

### Follow-up Prompts
- How does Effect's error handling differ from the Result/Either pattern in fp-ts?
- What is the difference between `Effect.gen` and `pipe` in Effect's programming style?
- How would you migrate an existing Express.js route handler to use Effect for typed error handling?

### Difficulty: advanced
### Tags: effect-ts, functional-programming, typed-errors, dependency-injection, concurrency

---

## Q13: How do you implement type-safe routing in TypeScript?

### Question
Explain how to implement type-safe routing in TypeScript, where route parameters are inferred from the route pattern string. Walk through the type-level mechanisms involved.

### Model Answer
Type-safe routing means the TypeScript type system can infer route parameter names and types directly from a route pattern string like `'/users/:id/posts/:postId'`, such that accessing `params.id` and `params.postId` is type-safe while accessing `params.name` is a type error. This is achieved through a combination of template literal types and conditional types with `infer`.

The core type extracts parameter names from a route string: `` type ExtractParams<Route extends string> = Route extends `${string}:${infer Param}/${infer Rest}` ? Param | ExtractParams<`/${Rest}`> : Route extends `${string}:${infer Param}` ? Param : never ``. This recursive template literal type matches `:paramName` segments, extracts the name with `infer Param`, and recurses on the rest of the path. The result is a union of string literals: for `'/users/:id/posts/:postId'`, you get `'id' | 'postId'`.

Converting the parameter name union to an object type requires `Record`: `type RouteParams<Route extends string> = Record<ExtractParams<Route>, string>`. Now `RouteParams<'/users/:id/posts/:postId'>` is `{ id: string; postId: string }`. A route handler function can be typed generically: `function createRoute<R extends string>(path: R, handler: (params: RouteParams<R>) => Response): Route<R>`. The type of `params` is inferred from the literal type of `path`.

Frameworks like TanStack Router and Remix (with its file-based routing) implement type-safe routing at a higher level. TanStack Router goes further — not just route parameters but also search parameters (query strings), loaders, and actions are all typed, with types inferred from route configuration rather than declared manually. The router's type system tracks the full set of routes as a union type, so navigating to `router.navigate({ to: '/users/$id', params: { id: '123' } })` is type-checked.

tRPC, while not a router in the traditional sense, achieves type-safe API routes by sharing TypeScript types between server and client. The server defines router procedures with typed inputs and outputs using Zod schemas, and the client uses a proxy object that infers all procedure names and their input/output types from the server definition. This is "end-to-end type safety" — the type system verifies that client calls match server expectations without generating code.

The limitations of string-based type-safe routing are real. The TypeScript type-checker's performance degrades with very large route trees or very complex route strings. TypeScript has recursion depth limits that can be hit with deeply nested type computations. Production routing libraries work around these limits through careful design and sometimes through code generation rather than pure type inference.

### Key Points
- Template literal types with `infer` extract `:paramName` segments from route strings into a union type
- `Record<ExtractParams<Route>, string>` converts the name union to a typed params object
- Generic route functions infer param types from the literal type of the path argument
- TanStack Router extends this to search params, loaders, and actions — full route type safety
- tRPC achieves end-to-end type safety via shared TypeScript types between server and client

### Follow-up Prompts
- How would you extend the `ExtractParams` type to support optional parameters (`:id?`)?
- What are the TypeScript compiler performance implications of deeply recursive template literal types?
- How does TanStack Router handle type safety for nested route layouts?

### Difficulty: advanced
### Tags: type-safe-routing, template-literal-types, trpc, tanstack-router, conditional-types

---

## Q14: How do you implement type-safe i18n in TypeScript?

### Question
Explain how to build a type-safe internationalization (i18n) system in TypeScript where translation key names are type-checked and parameter interpolation is validated.

### Model Answer
Type-safe i18n ensures that translation key lookups are validated against the actual keys in your translation files, and that string interpolation parameters match what the translation string expects. Without type safety, a typo in a translation key (`t('user.nam')` instead of `t('user.name')`) is a silent runtime bug — with type safety, it is a compile-time error.

The foundational type converts a nested translation object into a union of dot-notation path strings. Given `{ user: { name: string; age: string } }`, the type should produce `'user.name' | 'user.age'`. This requires a recursive type: `type Paths<T, Prefix extends string = ''> = { [K in keyof T]: T[K] extends string ? (Prefix extends '' ? K : \`${Prefix}.${K & string}\`) : Paths<T[K], Prefix extends '' ? K & string : \`${Prefix}.${K & string}\`> }[keyof T]`. The result is a union of all valid dot-notation paths through the object.

The `t()` function is then typed as `function t(key: TranslationKey): string` where `TranslationKey = Paths<typeof en>` (using your English translation object as the type source). TypeScript autocompletes valid keys and errors on invalid ones. For runtime lookup, you split the key on `.` and traverse the object.

Interpolation parameters are more complex. A translation string like `"Hello {name}, you have {count} messages"` should produce a type `{ name: string; count: string }` as the required second argument to `t()`. This requires extracting `{paramName}` patterns from the string value — similar to route parameter extraction. You use template literal types with `infer` to extract parameter names from the string type, then form an object type.

The complete typed `t()` signature: `function t<K extends TranslationKey>(key: K, params: ExtractInterpolations<TranslationValue<K>>): string` where `TranslationValue<K>` looks up the string value at path `K` in the translations object. `ExtractInterpolations` extracts `{paramName}` patterns into an object type. If the translation has no interpolations, `params` can be optional.

The `next-intl` library for Next.js and `typesafe-i18n` are production implementations of this pattern. They typically use code generation to produce types from translation files, which avoids TypeScript's recursion depth limitations on very large translation files. Pure type inference works well for small-to-medium translation files but can cause TypeScript performance issues at scale.

### Key Points
- Recursive `Paths<T>` type converts nested translation objects into a union of valid dot-notation key strings
- `t(key: TranslationKey)` provides autocomplete and validates keys against actual translation file structure
- Template literal types with `infer` extract `{paramName}` patterns from translation strings for typed interpolation
- At scale, code generation is preferred over pure type inference to avoid TypeScript performance issues
- `next-intl` and `typesafe-i18n` are production implementations of this pattern

### Follow-up Prompts
- How would you handle plural forms in a type-safe i18n system?
- What TypeScript performance issues arise with very large translation files and how do production libraries solve them?
- How would you type the `t()` function to make `params` optional when the translation has no interpolations?

### Difficulty: advanced
### Tags: i18n, type-safe-i18n, template-literal-types, recursive-types, typescript

---

## Q15: How do you implement the builder pattern with full type safety in TypeScript?

### Question
Explain how to implement the builder pattern in TypeScript such that calling methods in the wrong order or missing required calls results in a compile-time error rather than a runtime error.

### Model Answer
The type-safe builder pattern uses TypeScript's type system to track which builder methods have been called and what state has been accumulated. Instead of returning the same builder type from every method, each method call returns a new builder type that reflects the accumulated state. This allows TypeScript to enforce that required methods are called, optional methods are not duplicated, and `build()` is only callable when all required fields have been provided.

The technique uses generic type parameters to track builder state as a type-level record. Start with a "config" type that maps builder steps to "present" or "absent" markers: `type BuilderState = { name: 'present' | 'absent'; timeout: 'present' | 'absent' }`. The builder class is generic over this state: `class RequestBuilder<S extends BuilderState>`. Methods that set required fields narrow the state: `setName(name: string): RequestBuilder<S & { name: 'present' }>`. The `build()` method is only available when all required state is `'present'`: it uses a conditional type or an overload restricted to `RequestBuilder<{ name: 'present'; timeout: 'present' }>`.

A more elegant approach uses phantom type parameters — type parameters that appear only in the type signature and have no runtime representation. `class Builder<T>` where `T` is a type-level set of "completed steps." Each method call adds to the set: `setName(): Builder<T | 'name'>`. The `build()` method requires `T` to extend `'name' | 'timeout'`: `build<U extends T>(this: Builder<U> extends Builder<'name' | 'timeout'> ? Builder<U> : never): Config`. TypeScript checks this at the call site.

The most practical and readable approach uses intersection types accumulated across method calls. Each builder method returns an intersection of the current builder with a new interface declaring the just-provided field. `build()` is typed to accept only the intersection that includes all required interfaces. This is how `knex` query builder achieves partial type safety — each chained method narrows the return type.

Real-world uses of type-safe builders include SQL query builders (ensuring `WHERE` is called before `ORDER BY`, or that `SELECT` is called before `FROM`), HTTP request builders (ensuring URL is set before calling `send()`), and configuration builders (ensuring all required fields are set before creating an object). The `@effect/schema`, Zod, and Valibot all use builder-like patterns internally with full type safety on the chaining order.

### Key Points
- Each builder method returns a new generic type reflecting accumulated state — not the same `this` type
- Phantom type parameters or type-level records track which steps have been completed
- `build()` is conditionally available only when all required state is present — a type error otherwise
- Intersection types accumulated across calls are the most readable practical approach
- Used in SQL query builders, HTTP request builders, and configuration DSLs

### Follow-up Prompts
- How does the `satisfies` operator help with type-safe builders in TypeScript 4.9+?
- How would you implement a type-safe SQL `SELECT` builder where selecting columns before specifying a table is a type error?
- What is the performance impact of deeply nested generic types on the TypeScript compiler?

### Difficulty: advanced
### Tags: builder-pattern, phantom-types, type-safety, generics, conditional-types

---

## Q16: What are phantom types and how do you use them in TypeScript?

### Question
Explain phantom types in TypeScript. What are they, what problems do they solve, and how do they differ from branded types?

### Model Answer
Phantom types are type parameters that appear in a generic type's declaration but do not appear in its runtime representation. The type parameter is "phantom" — it exists only at the type level, carrying semantic information that the type system can use for checking, without adding any runtime overhead or structure. The name comes from the fact that the type parameter is invisible at runtime.

The canonical example is a `Validated<T, Brand>` type where `Brand` is a phantom parameter: `type Validated<T, Brand> = T & { readonly __brand: Brand }`. The `Brand` type parameter distinguishes different kinds of validated values without the values themselves carrying different runtime shapes. `Validated<string, 'Email'>` and `Validated<string, 'URL'>` are structurally different at the type level but identical at runtime — both are just strings.

Phantom types excel at encoding state machines in the type system. Consider a database connection that can be `Connected` or `Disconnected`. You define: `type Connection<S extends 'connected' | 'disconnected'> = { _state: S; /* other fields */ }`. The `_state` field exists at runtime but only to carry the phantom brand. A function `query` only accepts `Connection<'connected'>`, so calling it on a disconnected connection is a compile-time error. Functions that transition state return the new state: `connect(c: Connection<'disconnected'>): Connection<'connected'>`.

The difference from branded types is subtle but important. Branded types (as commonly implemented) add a unique tag to make two types with the same underlying shape structurally incompatible — primarily for distinguishing ID types. Phantom types are a broader pattern that uses a type parameter to encode arbitrary semantic state — not just "this is a UserId vs a PostId" but "this connection is in state X" or "this value has been through validation step Y." Phantom types are more expressive because the phantom parameter can be any type, including union types, generic parameters, and complex conditional types.

A sophisticated use is a type-safe state machine where phantom types track the current state, and only valid transitions are available. A form builder might be `FormBuilder<'empty' | 'hasName' | 'hasEmail' | 'complete'>` where `submit()` is only defined on `FormBuilder<'complete'>`. The type system enforces the state machine's rules.

### Key Points
- Phantom type parameters appear in the type declaration but not in the runtime value structure
- Used to encode semantic state, validation status, permissions, or state machine transitions at the type level
- Zero runtime overhead — phantom information is erased at compile time
- More expressive than branded types — the phantom can encode multi-dimensional state, not just identity
- Common uses: state machine encoding, validated value types, capability-based access control

### Follow-up Prompts
- How would you use phantom types to implement a capability-based access control system?
- What is the difference between a phantom type and a type tag (like branded types)?
- How would you encode a multi-step wizard form as a state machine using phantom types?

### Difficulty: advanced
### Tags: phantom-types, type-safety, state-machines, branded-types, generics

---

## Q17: How do you emulate dependent types in TypeScript?

### Question
Explain dependent types and how TypeScript approximates them using existing type system features. What are the limitations compared to true dependent type systems?

### Model Answer
Dependent types are types that depend on runtime values — the type of an expression changes based on what value it holds. In languages with true dependent types like Idris or Coq, you can express "a vector of exactly length n" where `n` is a runtime value, and the type system verifies at compile time that operations on vectors are length-safe. TypeScript does not have true dependent types, but several approximations are possible.

The most common approximation uses overloads and conditional types to express relationships between argument values and return types. A function that takes a boolean `strict` argument and returns different types based on whether it is `true` or `false`: `function parse(input: string, strict: true): ParsedValue; function parse(input: string, strict: false): ParsedValue | null; function parse(input: string, strict: boolean): ParsedValue | null`. When TypeScript sees `parse(x, true)`, it knows the return type is `ParsedValue` (not nullable). This approximates "the return type depends on the value of `strict`" for the specific literal values `true` and `false`.

Template literal types with `infer` approximate dependent string types. Given a type that extracts route parameters from a string `'/users/:id'`, the type of `params` depends on the specific string value passed. `createRoute('/users/:id', handler)` produces a handler where `handler`'s `params` argument has type `{ id: string }` — inferred from the route string value. The string value "dependently types" the handler parameter.

Variadic tuple types enable length-dependent types for tuples. `function first<T extends unknown[]>(arr: [...T]): T[0]` — the return type depends on the specific tuple type `T`, which is determined by the argument values. You can express "takes a tuple of length N and returns an array of N callbacks" using mapped tuple types.

The fundamental limitation is that TypeScript's type-level computation only works on type-level values (literal types, type parameters) — not arbitrary runtime values. You cannot express "this array has exactly 5 elements" where 5 is computed at runtime, only where 5 is a literal type. Anything that depends on data read from a database, user input, or network response cannot be dependently typed in TypeScript. True dependent type systems track these through their type checkers — a significant capability TypeScript does not have and is unlikely to add due to decidability concerns.

### Key Points
- Dependent types: types that depend on runtime values — TypeScript approximates but does not fully support this
- Overloads with literal type parameters approximate value-dependent return types for specific known values
- Template literal types and `infer` enable string-value-dependent types (route params, translation keys)
- Variadic tuple types enable length-dependent tuple operations
- Fundamental limitation: only type-level values (literals, type params) can affect types — runtime-computed values cannot

### Follow-up Prompts
- How would you type a `zip` function that takes two arrays of the same length and returns a tuple array?
- What is the difference between TypeScript's type narrowing and true dependent types?
- Why would adding full dependent types to TypeScript make type checking undecidable?

### Difficulty: advanced
### Tags: dependent-types, variadic-tuples, type-system, conditional-types, overloads

---

## Q18: How do you build a type-safe event emitter in TypeScript?

### Question
Walk through implementing a fully type-safe event emitter in TypeScript where event names, payload types, and listener signatures are all type-checked.

### Model Answer
A type-safe event emitter uses a generic type parameter to define the mapping from event names to their payload types. Every `on`, `off`, and `emit` method then uses this map to ensure that event names are valid keys, listener signatures match the payload type, and `emit` provides the correct payload type. No `any` is needed.

The events map is defined as a generic type: `type EventMap = Record<string, unknown>`. The emitter class is generic over an `E extends EventMap`: `class TypedEventEmitter<E extends EventMap>`. The `on` method uses a mapped type to constrain the listener: `on<K extends keyof E>(event: K, listener: (payload: E[K]) => void): this`. The `emit` method similarly: `emit<K extends keyof E>(event: K, payload: E[K]): boolean`. TypeScript enforces at every call site that the event name is a valid key and the payload/listener match the declared type.

Usage: `interface AppEvents { 'user:login': { userId: string; timestamp: Date }; 'error': Error; 'count:change': number }`. Then `const emitter = new TypedEventEmitter<AppEvents>()`. Calling `emitter.on('user:login', (payload) => {})` gives `payload` the inferred type `{ userId: string; timestamp: Date }`. Calling `emitter.emit('user:login', { userId: '123' })` is a type error — missing `timestamp`. Calling `emitter.on('typo', ...)` is a type error — `'typo'` is not a key of `AppEvents`.

For more ergonomic usage, the emitter is often declared with a concrete event type rather than generic: `const emitter = new TypedEventEmitter<AppEvents>()` — TypeScript infers `E = AppEvents` from the type argument. You can also use a factory function pattern: `createEventEmitter<AppEvents>()` that returns a typed instance.

Node.js's `EventEmitter` can be typed more strongly using declaration merging. You create an interface that overloads `on`, `emit`, and `once` with specific signatures for your events. By declaring `interface MyEmitter extends EventEmitter { on(event: 'data', listener: (data: Buffer) => void): this; /* etc */ }`, you get type safety without a custom implementation. This is common in Node.js stream typing.

The `EventEmitter3` library and `mitt` are popular typed event emitter libraries. `mitt` in particular has a clean TypeScript-first API: `const emitter = mitt<AppEvents>()`. The library types are designed around the events map pattern, providing excellent type inference out of the box.

### Key Points
- Generic `EventMap extends Record<string, unknown>` maps event names to payload types
- `on<K extends keyof E>(event: K, listener: (payload: E[K]) => void)` enforces listener type per event
- `emit<K extends keyof E>(event: K, payload: E[K])` enforces payload type per event
- Declaration merging can augment Node.js `EventEmitter` with specific event signatures without a custom class
- `mitt` library provides a TypeScript-first event emitter that follows this pattern out of the box

### Follow-up Prompts
- How would you add support for wildcard event listeners (`'*'`) to a type-safe event emitter?
- How would you type an event emitter that supports once-listeners with automatic type narrowing?
- What are the trade-offs between class-based and object-based event emitter implementations for TypeScript?

### Difficulty: advanced
### Tags: event-emitter, type-safety, generics, mapped-types, typescript-patterns

---

## Q19: What are declaration merging strategies in TypeScript and when do you use them?

### Question
Explain TypeScript's declaration merging. What kinds of declarations can be merged, and what are the practical use cases for each merging strategy?

### Model Answer
Declaration merging is TypeScript's ability to combine multiple declarations with the same name into a single definition. This is a foundational feature for augmenting existing types — adding properties to interfaces, extending namespaces, and enriching module types from external packages. TypeScript merges declarations based on their kind, with different rules for each combination.

Interface merging is the most common and straightforward form. Multiple `interface Foo { ... }` declarations with the same name are automatically merged into a single interface containing all declared members. This enables incrementally extending an interface across multiple files or modules. Crucially, it enables declaration augmentation — extending types from external packages without modifying their source. `interface Window { myCustomProperty: string }` adds to the built-in `Window` interface across the entire project.

Module augmentation uses declaration merging to add types to external packages. Inside a `declare module 'some-library' { interface SomeType { newProperty: string } }` block, you can add to or modify types exported by the library. This is how TypeScript projects add types to packages that do not have built-in TypeScript support, or add missing properties. For example, augmenting Express's `Request` type to add a `user` property after authentication middleware: `declare global { namespace Express { interface Request { user?: AuthenticatedUser } } }`.

Namespace merging allows adding to an existing namespace from a different location. A class and a namespace can be merged if they share the same name — the namespace acts as a companion namespace, adding static properties and nested types to the class: `class Foo { }; namespace Foo { export type Options = { ... }; export const defaultOptions: Options = { ... } }`. This pattern is used by libraries like React (`React.FC`, `React.ReactNode` are in the `React` namespace, merged with React's import).

Function and namespace merging enables adding properties to a function: `function myFn() { ... }; namespace myFn { export const version = '1.0' }`. Consumers can call `myFn()` and also access `myFn.version`. This mirrors how CommonJS modules with properties are typed — the module is both callable and has attached properties.

Enum merging through namespaces allows adding string-valued members or methods to an enum: `enum Direction { Up, Down }; namespace Direction { export function parse(s: string): Direction { ... } }`. This adds the `parse` static method to the `Direction` namespace that callers access as `Direction.parse('up')`.

### Key Points
- Interface merging: multiple `interface Foo {}` declarations combine into one — enables incremental augmentation
- Module augmentation: `declare module 'lib' { interface X { ... } }` extends types from external packages
- Class + namespace merging: adds companion static types/values to a class under the same name
- Function + namespace merging: makes a function also carry named properties (like a module with a default export)
- Declaration merging is TypeScript-only — it has no runtime effect; all merging is purely at the type level

### Follow-up Prompts
- How would you augment the `Request` type in Express to add a `user` property after authentication middleware?
- What is the difference between interface merging and type alias merging (and why can't type aliases be merged)?
- How does declaration merging enable the `global` augmentation pattern for extending built-in browser types?

### Difficulty: advanced
### Tags: declaration-merging, module-augmentation, interface-merging, namespaces, typescript

---

## Q20: What are the performance implications of monomorphization vs. polymorphism in TypeScript compiled JavaScript?

### Question
Explain how JavaScript engines handle monomorphization and polymorphism for TypeScript-compiled code. How does TypeScript's type system interact with V8's hidden classes and inline caches, and what performance patterns should TypeScript developers be aware of?

### Model Answer
JavaScript engines like V8 use hidden classes (also called shapes or maps) to optimize object property access. When objects are created with the same properties in the same order, V8 assigns them the same hidden class and can use inline caches (ICs) to optimize property reads to direct memory offsets — essentially as fast as native struct field access. When objects have different shapes (different properties, different order), the IC becomes polymorphic or megamorphic, and property access falls back to slower hash table lookups.

TypeScript's type system is compile-time only — it does not affect the JavaScript that V8 sees. However, how you write TypeScript directly affects the JavaScript output, which in turn affects V8's optimization. A TypeScript union type `type Shape = Circle | Square` tells TypeScript that a variable can be either, but the actual JavaScript objects at runtime may have completely different shapes. If `Circle` has `{ kind: 'circle', radius: number }` and `Square` has `{ kind: 'square', side: number }`, V8 sees two different hidden classes whenever it processes these shapes.

Monomorphic code — code where a function always receives objects of the same hidden class — gets V8's full JIT optimization. A function `getArea(shape: Circle)` that only ever receives circle objects is monomorphic and will be optimized with a fast, direct memory access path. A polymorphic function `getArea(shape: Shape)` that receives both circles and squares causes V8 to use a polymorphic IC with 2 entries. Beyond 4 different shapes, V8 gives up and uses a megamorphic IC with no caching — significantly slower.

TypeScript developers can influence this by structuring types to encourage monomorphic call sites. Avoid using broad union types in hot paths where performance matters — instead, dispatch to type-specific functions early and call specialized functions with specific types. Discriminated union switches should dispatch quickly and then call monomorphic helpers. Factory functions that always create objects with the same properties in the same order help maintain consistent hidden classes.

TypeScript generics compile to monomorphic JavaScript functions — there is no runtime specialization like C++ templates. `function identity<T>(x: T): T { return x }` compiles to `function identity(x) { return x }` — one JavaScript function that V8 must handle for every type it is called with. If called with strings and numbers and objects, V8 sees polymorphic usage. This is why generic utility functions called from many different sites with different types can become megamorphic. The React Compiler (Forget) is aware of this and attempts to minimize the number of distinct shapes that flow through hot rendering paths.

Understanding this connection between TypeScript's structural type system and V8's hidden class optimization is a senior-level skill. TypeScript's type system is designed for correctness, not performance shaping — but knowing how TypeScript's patterns translate to JavaScript shapes helps you write code that V8 can optimize effectively.

### Key Points
- V8 uses hidden classes and inline caches (ICs) for fast property access — monomorphic ICs are fastest
- TypeScript types are compile-time only — they do not affect runtime hidden classes; object structure does
- Polymorphic functions (receiving objects of different shapes) cause polymorphic/megamorphic ICs — slower
- TypeScript generics compile to single JS functions — called with different types = polymorphic V8 site
- Discriminated unions: dispatch to type-specific functions early to keep hot paths monomorphic

### Follow-up Prompts
- How does the `--isolatedModules` TypeScript flag affect the compiled output and why do bundlers prefer it?
- What tools can you use to profile hidden class deoptimizations in a TypeScript/V8 application?
- How does React's VDOM reconciliation create pressure on V8's inline caches, and how does the React Compiler address this?

### Difficulty: advanced
### Tags: performance, v8, monomorphization, hidden-classes, inline-caches, typescript

---
