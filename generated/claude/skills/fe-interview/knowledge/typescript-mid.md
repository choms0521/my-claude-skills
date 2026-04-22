# TypeScript - Mid-Level Interview Questions
### Language: en

## Q1: How do generics work in TypeScript and what problems do they solve?

### Question
Explain TypeScript generics: what they are, how they're declared, common use cases, and how constraints work.

### Model Answer
Generics allow you to write reusable code that works with multiple types while preserving type safety. Without generics, you face a dilemma: use `any` (losing type safety) or write separate functions for each type (code duplication). Generics solve this by introducing type parameters — placeholders that are filled in when the generic is used.

A generic function is declared with angle brackets containing one or more type parameters, conventionally named `T`, `K`, `V`, or descriptive names like `TItem`:

```typescript
function identity<T>(value: T): T {
  return value;
}
const num = identity(42);       // T inferred as number
const str = identity('hello');  // T inferred as string
```

TypeScript infers the type argument from the argument passed, so explicit annotation is rarely needed. When inference can't work (e.g., factory functions with no arguments), you provide the type explicitly: `identity<string>('hello')`.

Constraints limit what types a type parameter can accept using `extends`. This is essential when your function needs to access specific properties of `T`:

```typescript
function getLength<T extends { length: number }>(value: T): number {
  return value.length; // TypeScript knows T has .length
}
getLength('hello');    // works
getLength([1, 2, 3]);  // works
getLength(42);         // Error: number has no .length
```

Multiple type parameters handle relationships between types. The `keyof` operator combined with generics enforces that a key actually exists on an object:

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: 'Alice', age: 30 };
getProperty(user, 'name'); // string
getProperty(user, 'age');  // number
getProperty(user, 'foo');  // Error: 'foo' not in keyof typeof user
```

Generics also apply to interfaces, classes, and type aliases. A `Repository<T>` interface can describe CRUD operations for any entity type, making the pattern reusable without sacrificing type information.

### Key Points
- Generics introduce type parameters (`<T>`) as placeholders filled in at call/instantiation time
- TypeScript infers type arguments from usage; explicit annotation is only needed when inference fails
- `extends` constraints restrict what types are acceptable and unlock access to specific properties
- `keyof T` combined with generics creates typesafe property access patterns
- Generics apply to functions, interfaces, type aliases, and classes

### Follow-up Prompts
- How does TypeScript infer generic types when there are multiple type parameters?
- What is the difference between a generic constraint `T extends string` and using `string` directly as the parameter type?
- How do you use generics to type a function that accepts a class constructor and returns an instance?

### Difficulty: intermediate
### Tags: generics, type-parameters, constraints, keyof, typescript

---

## Q2: Explain union and intersection types.

### Question
Describe union types and intersection types in TypeScript, how they combine types, and when you would use each. Include examples of practical use cases.

### Model Answer
Union types (`A | B`) represent a value that can be one of several types. A variable of type `string | number` can hold either a string or a number. When working with a union type, TypeScript only allows you to use operations that are valid for all members of the union until you narrow the type to a specific member.

```typescript
function formatId(id: string | number): string {
  if (typeof id === 'string') {
    return id.toUpperCase(); // TypeScript knows id is string here
  }
  return id.toFixed(0);     // TypeScript knows id is number here
}
```

Union types model the "or" relationship. They are useful for function parameters that accept multiple types, for state that can be in several shapes (a result that is either a value or an error), and for modeling discriminated unions (tagged variants).

Intersection types (`A & B`) combine multiple types into one. A value of type `A & B` must satisfy all properties of both `A` and `B`. They model the "and" relationship — the result has every property from every type in the intersection.

```typescript
type Timestamped = { createdAt: Date; updatedAt: Date };
type WithId = { id: string };
type User = { name: string; email: string };

type PersistedUser = User & WithId & Timestamped;
// PersistedUser has: name, email, id, createdAt, updatedAt
```

Intersection types are useful for mixins, for combining a base type with additional metadata, and for composing complex types from reusable pieces without inheritance.

A key difference: union types widen the set of acceptable input types (the function accepts more), while intersection types narrow the set of values that satisfy the type (the value must satisfy more). A `string | number` accepts either; a `string & Serializable` accepts only strings that are also Serializable.

One subtlety: intersection of primitive types that conflict produces `never`. `string & number` is `never` because no value can be both a string and a number simultaneously. This is intentional behavior used in type-level programming.

### Key Points
- Union `A | B` means "either A or B" — the value can be any of the listed types
- Intersection `A & B` means "both A and B" — the value must satisfy all listed types
- Working with union types requires narrowing (type guards) to access type-specific members
- Intersection types are used for composition, mixing in extra properties, and combining type pieces
- Intersecting incompatible primitives produces `never` — this is a feature used in advanced type programming

### Follow-up Prompts
- What is a discriminated union and why is it preferred over a plain union for modeling state machines?
- How does TypeScript narrow a union type inside an if statement?
- What happens when you intersect two object types that have the same property with different types?

### Difficulty: intermediate
### Tags: union-types, intersection-types, type-system, typescript

---

## Q3: What are type guards and how does type narrowing work?

### Question
Explain type narrowing in TypeScript: what it is, how TypeScript performs it automatically, and how to write custom type guards using `is` predicates.

### Model Answer
Type narrowing is TypeScript's ability to refine the type of a variable within a specific code block based on runtime checks. When you check a condition about a value, TypeScript uses the check to narrow the type in the branch where the check is true. This is how you safely work with union types.

TypeScript performs automatic narrowing for several constructs. `typeof` checks narrow primitive types: `typeof x === 'string'` narrows `x` to `string` in the true branch. `instanceof` checks narrow class instances: `x instanceof Date` narrows `x` to `Date`. `in` checks narrow object types: `'name' in obj` narrows `obj` to types that have a `name` property. Equality checks and truthiness also narrow: checking `if (x)` narrows away `null`, `undefined`, `0`, `''`, and `false`.

Discriminated unions use a shared "discriminant" property (a literal type) to narrow between union members. This is the most robust and idiomatic narrowing pattern:

```typescript
type Circle = { kind: 'circle'; radius: number };
type Square = { kind: 'square'; side: number };
type Shape = Circle | Square;

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'square': return shape.side ** 2;
  }
}
```

Custom type guard functions use the `value is Type` return type predicate. They return a `boolean`, and when they return `true`, TypeScript narrows the argument to the specified type in the calling code:

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function processValue(value: unknown) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // TypeScript knows: string
  }
}
```

The `asserts value is Type` assertion guard (used with `void` return type) tells TypeScript that if the function returns normally (doesn't throw), the variable is of that type going forward. This is useful for validation functions that throw on invalid input.

A critical limitation: TypeScript trusts your type predicate. If your `isString` function incorrectly returns `true` for non-strings, TypeScript will narrow incorrectly, leading to runtime errors. Type guards are a bridge between TypeScript's static world and JavaScript's dynamic runtime — they must be implemented correctly.

### Key Points
- TypeScript automatically narrows types in branches guarded by `typeof`, `instanceof`, `in`, equality, and truthiness checks
- Discriminated unions (shared literal-typed property) are the most robust narrowing pattern for complex variants
- Custom type guards use `value is Type` return predicate; TypeScript trusts them unconditionally
- Assertion guards (`asserts value is Type`) narrow type after the function returns without throwing
- TypeScript cannot verify that type guard implementations are correct — they are a safety contract you must uphold

### Follow-up Prompts
- What is the `never` type's role in exhaustive checking with discriminated unions?
- How would you type a function that parses JSON from localStorage and validates its shape?
- What is the difference between `unknown` and `any` when used as the input type to a type guard?

### Difficulty: intermediate
### Tags: type-guards, narrowing, discriminated-unions, type-predicates, typescript

---

## Q4: Explain utility types: Partial, Required, Pick, Omit, and others.

### Question
Describe the built-in TypeScript utility types, how they transform types, and provide practical use cases for `Partial`, `Required`, `Pick`, `Omit`, `Readonly`, `Record`, `ReturnType`, and `Parameters`.

### Model Answer
TypeScript's utility types are generic type transformations built into the standard library. They operate on existing types to produce new ones, reducing the need to manually duplicate type definitions for variants.

`Partial<T>` makes all properties of `T` optional. It is the go-to type for update/patch operations where you might only provide some fields:

```typescript
type User = { id: string; name: string; email: string };
function updateUser(id: string, updates: Partial<User>): User { ... }
updateUser('1', { name: 'Alice' }); // only name, email is omitted
```

`Required<T>` is the opposite — makes all properties required. Useful after processing optional configurations to assert that defaults have been applied.

`Pick<T, K>` creates a type with only the specified keys from `T`. `Omit<T, K>` creates a type with all keys except the specified ones. They are complementary:

```typescript
type UserPreview = Pick<User, 'id' | 'name'>;       // { id, name }
type UserWithoutId = Omit<User, 'id'>;              // { name, email }
```

`Readonly<T>` makes all properties `readonly`, preventing mutation. Useful for immutable data structures and props in React components where you want to enforce that the component doesn't mutate its props.

`Record<K, V>` creates an object type with keys of type `K` and values of type `V`. It's the typed version of a plain object used as a dictionary:

```typescript
type RolePermissions = Record<'admin' | 'user' | 'guest', string[]>;
```

`ReturnType<T>` extracts the return type of a function type. `Parameters<T>` extracts the parameter types as a tuple. These are invaluable for typing utilities that wrap other functions:

```typescript
type FetchResult = ReturnType<typeof fetchUser>; // Promise<User>
type FetchArgs = Parameters<typeof fetchUser>;   // [id: string]
```

`NonNullable<T>` removes `null` and `undefined` from a union. `Extract<T, U>` and `Exclude<T, U>` filter union members. `Awaited<T>` unwraps Promise types, essential when working with async functions.

### Key Points
- `Partial<T>` / `Required<T>` toggle all properties optional/required
- `Pick<T, K>` / `Omit<T, K>` select or exclude specific properties by key name
- `Record<K, V>` creates a typed dictionary; `Readonly<T>` prevents mutation
- `ReturnType<T>` and `Parameters<T>` extract function signature types without manual annotation
- `NonNullable<T>`, `Extract`, `Exclude`, and `Awaited` handle union filtering and Promise unwrapping

### Follow-up Prompts
- How would you implement `Partial<T>` yourself using mapped types?
- What is the difference between `Omit<T, K>` and `Pick<T, Exclude<keyof T, K>>`?
- When would `ReturnType` be preferred over explicitly typing the return value?

### Difficulty: intermediate
### Tags: utility-types, partial, pick, omit, record, typescript

---

## Q5: What is the difference between enum and const enum?

### Question
Compare regular enums and const enums in TypeScript. What are the compile-time and runtime differences, and what are the trade-offs of each? When should you avoid both in favor of alternatives?

### Model Answer
Regular TypeScript enums are real objects at runtime. When you compile a `enum Direction { Up, Down, Left, Right }`, TypeScript emits JavaScript code that creates a bidirectional mapping object: `{ Up: 0, Down: 1, Left: 2, Right: 3, 0: 'Up', 1: 'Down', ... }`. This means you can look up both `Direction.Up` (returns `0`) and `Direction[0]` (returns `'Up'`). The object exists at runtime and is present in the output bundle.

`const enum` is compiled away entirely. TypeScript replaces all usages of the const enum with their literal values at compile time. No runtime object is created:

```typescript
const enum Direction { Up, Down, Left, Right }
const move = Direction.Up;
// Compiles to:
const move = 0 /* Direction.Up */;
```

This produces smaller bundle output and potentially faster code (no object property lookups), but with a significant trade-off: because the enum is erased, it cannot be used in computed contexts, exported across module boundaries when using `isolatedModules` (as in most modern toolchains using esbuild or Babel), or iterated over at runtime.

The `isolatedModules` flag (required by esbuild, Babel, and Vite's TypeScript transpilation) forbids `const enum` in most cases because these tools transpile files in isolation without full type information — they can't replace const enum values they haven't seen. This makes `const enum` effectively unusable in most modern React/TypeScript setups.

The modern alternative to enums is a union of string literals combined with an object of constants:

```typescript
const Direction = { Up: 'UP', Down: 'DOWN', Left: 'LEFT', Right: 'RIGHT' } as const;
type Direction = typeof Direction[keyof typeof Direction]; // 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
```

This pattern has no runtime overhead beyond the object itself, works with all transpilers, is easily iterable, and produces clear and readable types. It is the recommended approach in most modern TypeScript style guides.

### Key Points
- Regular enum compiles to a real bidirectional mapping object at runtime; const enum is erased and replaced with literals
- `const enum` is incompatible with `isolatedModules` (Babel, esbuild, Vite), making it unusable in most modern toolchains
- Both enum types have quirks; the `as const` object + union type pattern is the modern alternative
- String literal unions (`'up' | 'down'`) are the simplest form for exhaustive value sets
- `as const` object pattern provides both the type union and the runtime object for iteration

### Follow-up Prompts
- Why do numeric enums have a reverse mapping but string enums don't?
- What is the `isolatedModules` compiler option and why does it matter for enum usage?
- How do you iterate over all values of an enum at runtime, and how does that differ with the `as const` alternative?

### Difficulty: intermediate
### Tags: enum, const-enum, typescript, as-const, compilation

---

## Q6: What are declaration files (.d.ts) and how do you write them?

### Question
Explain what TypeScript declaration files are, when you need to write them, and the key syntax for declaring modules, functions, classes, and ambient declarations.

### Model Answer
Declaration files (`.d.ts` files) contain TypeScript type information without any implementation. They describe the types of existing JavaScript code — either your own or third-party libraries. TypeScript uses them to provide type checking and IntelliSense for code that isn't written in TypeScript.

You need to write declaration files in three situations: (1) you are shipping a JavaScript library and want TypeScript consumers to have types, (2) you are using a third-party JavaScript library that doesn't have types on DefinitelyTyped (`@types/package-name`), or (3) you need to extend or augment types from another library.

The `declare` keyword is the foundation of declaration files. It tells TypeScript "this thing exists at runtime, trust me" without providing an implementation:

```typescript
// Declaring a variable, function, class
declare const API_URL: string;
declare function fetchUser(id: string): Promise<User>;
declare class EventEmitter {
  on(event: string, listener: Function): this;
  emit(event: string, ...args: any[]): boolean;
}
```

To declare a module (for a JavaScript library without types), use `declare module`:

```typescript
declare module 'some-js-library' {
  export function doThing(input: string): number;
  export interface Config { timeout: number; }
  export default function(config: Config): void;
}
```

Ambient declarations with `declare global` extend global types, useful for adding custom properties to `window` or extending built-in types:

```typescript
declare global {
  interface Window {
    analyticsQueue: AnalyticsEvent[];
  }
}
```

For module augmentation (extending types from an existing module), you import the module namespace and add to it:

```typescript
import 'express';
declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
```

TypeScript automatically finds `.d.ts` files referenced in `tsconfig.json`'s `types` or `typeRoots` options, or placed alongside the corresponding `.js` files. For npm packages, place the path in the `types` or `typings` field of `package.json`.

### Key Points
- `.d.ts` files contain type declarations without implementation; they describe shapes of existing JavaScript
- `declare` tells TypeScript something exists at runtime without providing code
- `declare module` types an entire third-party JavaScript library
- `declare global` extends global types like `Window`, `Document`, or global functions
- Module augmentation (`import 'x'; declare module 'x' { ... }`) extends types from existing modules

### Follow-up Prompts
- What is the difference between a `.d.ts` file in `node_modules/@types/` and one shipped with a package?
- How do you generate declaration files automatically from TypeScript source using `tsc`?
- What is the `/// <reference types="..." />` triple-slash directive and when do you use it?

### Difficulty: intermediate
### Tags: declaration-files, d.ts, ambient-declarations, module-augmentation, typescript

---

## Q7: What is module augmentation and how do you extend third-party types?

### Question
Explain TypeScript module augmentation: the syntax for extending existing modules, practical use cases, and how it differs from declaration merging.

### Model Answer
Module augmentation allows you to add new declarations to an existing module's type definitions without modifying the original source. This is TypeScript's mechanism for extending types from libraries when you add functionality or when a library's types are incomplete.

The syntax requires you to import the module first (to create a module context) and then re-declare the module with additional types inside a `declare module` block:

```typescript
// Extending Express Request to add a user property (common pattern for auth middleware)
import { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; roles: string[] };
    requestId: string;
  }
}

// Now all Request objects have user and requestId in scope
app.use((req: Request, res, next) => {
  console.log(req.user?.id); // TypeScript knows this property exists
});
```

Module augmentation works because TypeScript merges interface declarations. When you declare `interface Request` in the augmentation, it merges with the original `interface Request` from the library, adding new properties without removing existing ones. This is "declaration merging."

Declaration merging also works for namespaces and classes in specific ways: you can add static methods to a class via namespace merging, and extend a namespace with additional members. However, you cannot add new methods to an existing class's prototype through declaration merging alone (you'd need to modify the prototype in JavaScript too).

Global augmentation extends ambient types available throughout the codebase:

```typescript
declare global {
  interface Array<T> {
    groupBy<K extends string>(selector: (item: T) => K): Record<K, T[]>;
  }
}
```

Important: module augmentation only modifies types, not runtime behavior. If you add a method to `Array` in the types, you must also add it at runtime (e.g., with a polyfill) or TypeScript will compile, but the code will fail at runtime.

The practical difference between augmentation and declaration merging: augmentation is for modules (files), declaration merging is for interfaces, namespaces, and functions declared in the same file or via `declare global`.

### Key Points
- Module augmentation adds types to an existing module's interface by re-declaring `module 'name' { }` in your code
- It works through TypeScript's interface declaration merging — augmented properties are added to the existing interface
- Used for: adding properties to library types (Express Request, Fastify), extending globals, patching incomplete types
- Augmentation is types-only — you must also provide the runtime implementation separately
- `declare global` augments global types like built-in interfaces; module augmentation targets specific imports

### Follow-up Prompts
- Why must you import the module before augmenting it, and what happens if you don't?
- How do you extend the types of a React component from a UI library to accept additional props?
- What are the limits of module augmentation — what can't you change about an existing module's types?

### Difficulty: intermediate
### Tags: module-augmentation, declaration-merging, typescript, interfaces, d.ts

---

## Q8: What are discriminated unions and how do you use them?

### Question
Explain discriminated unions (also called tagged unions or algebraic data types) in TypeScript, how to define them, and how to use them for exhaustive pattern matching and modeling state.

### Model Answer
A discriminated union is a union type where each member has a common property with a unique literal type called the "discriminant" or "tag." TypeScript uses this discriminant to narrow the type in switch or if/else branches, giving you full access to the members specific to each variant.

The discriminant is typically a `kind`, `type`, or `status` property with a string literal type. Every member of the union must have this property, but each member's value for it is unique:

```typescript
type LoadingState = { status: 'loading' };
type SuccessState = { status: 'success'; data: User[] };
type ErrorState = { status: 'error'; error: Error; retryCount: number };

type FetchState = LoadingState | SuccessState | ErrorState;
```

In a switch statement, TypeScript narrows to the correct variant in each case, giving you access only to properties that exist on that variant:

```typescript
function renderState(state: FetchState): JSX.Element {
  switch (state.status) {
    case 'loading': return <Spinner />;
    case 'success': return <UserList users={state.data} />; // .data is available
    case 'error': return <ErrorView error={state.error} />;  // .error is available
  }
}
```

Exhaustiveness checking is a powerful feature: if your switch doesn't handle all cases, TypeScript will warn you when a new variant is added to the union. This is done by adding a `default` branch that assigns to `never`:

```typescript
default:
  const exhaustiveCheck: never = state; // Error if state is not never
  throw new Error(`Unhandled state: ${exhaustiveCheck}`);
```

Discriminated unions are superior to alternatives for modeling state: compared to nullable properties (`{ data?: User[]; error?: Error; loading: boolean }`), discriminated unions make impossible states unrepresentable. With nullable properties, someone could set both `data` and `error`, which is meaningless. The discriminated union structurally prevents this.

This pattern maps directly to the Elm architecture and Redux's action model, both of which use discriminated unions/tagged variants extensively.

### Key Points
- Discriminated unions have a shared literal-typed "tag" property that TypeScript uses for narrowing
- Each variant in the union has a unique tag value; TypeScript narrows in switch/if branches
- Exhaustive checking via `never` assignment in the default case catches unhandled variants at compile time
- Discriminated unions make impossible states unrepresentable — a key advantage over boolean/optional field approaches
- Maps directly to algebraic data types (ADTs) from functional programming

### Follow-up Prompts
- How would you model a payment processing flow (pending, authorized, captured, refunded, failed) as a discriminated union?
- What is the `never` type and how does it enable exhaustive checking?
- How do discriminated unions compose with generic types? Show an example of a generic Result<T, E> type.

### Difficulty: intermediate
### Tags: discriminated-unions, pattern-matching, never, exhaustive-checking, state-modeling

---

## Q9: What are mapped types in TypeScript?

### Question
Explain mapped types: the syntax, how they transform types, and practical examples including read-only, optional, and custom property transformations.

### Model Answer
Mapped types allow you to create new types by transforming the properties of an existing type. They iterate over the keys of a type and apply transformations — changing modifiers, value types, or key names. Most of TypeScript's built-in utility types (`Partial`, `Required`, `Readonly`, `Record`) are implemented with mapped types.

The basic syntax iterates over a union of keys using `in`:

```typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Partial<T> = {
  [K in keyof T]?: T[K];
};
```

`keyof T` produces the union of all keys of type `T`. `T[K]` is an indexed access type — the type of property `K` on `T`. Together, `[K in keyof T]: T[K]` copies all properties of `T` with their original types, and you add modifiers or transform the value type.

Modifier removal uses the `-` prefix to remove `readonly` or `?`:

```typescript
type Required<T> = {
  [K in keyof T]-?: T[K]; // -? removes the optional modifier
};

type Mutable<T> = {
  -readonly [K in keyof T]: T[K]; // removes readonly
};
```

You can transform value types, not just modifiers. This creates a type where every property is wrapped in a Promise, useful for typing lazy or async property patterns:

```typescript
type Promisified<T> = {
  [K in keyof T]: Promise<T[K]>;
};
```

Key remapping with `as` (TypeScript 4.1+) allows you to transform property names using template literal types:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
// Getters<{ name: string }> = { getName: () => string }
```

You can also filter properties by intersecting the remapped key with `never` to exclude specific properties conditionally.

### Key Points
- Mapped types iterate over key unions with `[K in UnionType]` syntax, transforming each property
- `keyof T` and indexed access `T[K]` are the building blocks for most mapped types
- Add `readonly` or `?` modifiers; use `-readonly` or `-?` to remove them
- Key remapping with `as` transforms property names, enabling getter/setter pattern generation
- All built-in utility types (`Partial`, `Required`, `Readonly`, `Record`) are implemented as mapped types

### Follow-up Prompts
- How would you create a mapped type that converts all method properties of a type to their return types?
- What is the difference between `[K in keyof T]: T[K]` and `{ [K in keyof T]: T[K] }` as a standalone type?
- How do you use key filtering in a mapped type to create a type with only certain kinds of properties?

### Difficulty: intermediate
### Tags: mapped-types, keyof, indexed-access, type-transformation, typescript

---

## Q10: What are conditional types in TypeScript?

### Question
Explain conditional types in TypeScript: the syntax, how they evaluate, practical applications, and how the `infer` keyword enables type extraction.

### Model Answer
Conditional types have the form `T extends U ? X : Y` — they evaluate to `X` if `T` is assignable to `U`, and `Y` otherwise. They bring if/else logic to the type level, enabling types that depend on other types in complex ways.

At their simplest, conditional types check assignability:

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<string>; // true
type B = IsString<number>; // false
```

The real power emerges when combined with generics. When `T` is a union, conditional types distribute over each member:

```typescript
type ToArray<T> = T extends any ? T[] : never;
type StrOrNumArrays = ToArray<string | number>; // string[] | number[]
```

This "distributive" behavior is the default for conditional types in generic positions. You can prevent distribution by wrapping both sides in square brackets: `[T] extends [U]`.

The `infer` keyword declares a type variable to be inferred within the extends clause. It lets you extract parts of a type that TypeScript matches:

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Unpack<T> = T extends Array<infer U> ? U : T;
type PromiseValue<T> = T extends Promise<infer V> ? V : T;

type Fn = () => string;
type FnReturn = ReturnType<Fn>; // string

type Arr = number[];
type Element = Unpack<Arr>; // number
```

Conditional types can be nested for complex logic:

```typescript
type NonNullable<T> = T extends null | undefined ? never : T;
// Removes null and undefined from a union
```

The `never` type in conditional types acts as a filter. In a distributed conditional type, members that evaluate to `never` are removed from the resulting union, making `never` useful for exclusion:

```typescript
type Exclude<T, U> = T extends U ? never : T;
type OnlyStrings = Exclude<string | number | boolean, number | boolean>; // string
```

Conditional types are evaluated lazily when their type parameter is generic — TypeScript defers evaluation until the type argument is known. This is why `ReturnType<typeof someFunction>` resolves correctly even though `T` is generic in the definition.

### Key Points
- Conditional types: `T extends U ? X : Y` — type-level if/else based on type assignability
- Distributive conditional types: when `T` is generic, the condition distributes over each union member
- `infer` extracts sub-types from matched patterns — enables `ReturnType`, `Parameters`, `Awaited` utility types
- `never` in a distributed conditional type filters union members (used in `Exclude`, `NonNullable`)
- Wrap in `[T] extends [U]` to prevent distributive behavior when needed

### Follow-up Prompts
- Why does `string | number extends string ? 'yes' : 'no'` evaluate to `'no'`, but distributes in a generic context?
- How would you write a conditional type that extracts the element type from a Promise or a plain value?
- What is the `infer` keyword's scope — can you use an inferred type variable multiple times in the true branch?

### Difficulty: intermediate
### Tags: conditional-types, infer, distributive-types, never, typescript
