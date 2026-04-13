# TypeScript - Senior Interview Questions
### Language: en

## Q1: Explain advanced generics: recursive types and variadic tuple types.

### Question
Describe advanced generic patterns in TypeScript: recursive generic types, variadic tuple types, and how they enable powerful type-level abstractions. Provide concrete examples of where these are used in practice.

### Model Answer
Recursive generic types are types that reference themselves in their own definition, enabling typing of arbitrarily nested data structures. The classic example is a JSON-compatible type:

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
```

More complex recursive generics appear in path typing for nested objects. A `DeepPartial<T>` makes all properties optional at every level of nesting:

```typescript
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;
```

TypeScript imposes limits on recursive type instantiation depth to prevent infinite loops. Circularly-referenced types that aren't data-structure recursions (e.g., a type that tries to enumerate all possible subsets) will hit "Type instantiation is excessively deep" errors. The fix is to introduce a "depth counter" type parameter or restructure the recursion.

Variadic tuple types (TypeScript 4.0+) allow generic rest elements in tuple positions, enabling functions that work with tuples of arbitrary length while preserving individual element types. The `...T` spread in tuple types distributes the tuple:

```typescript
type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];
type Result = Concat<[1, 2], [3, 4]>; // [1, 2, 3, 4]
```

This enables precise typing for functions like `concat` or `zip`. The most impactful application is typing function composition:

```typescript
type Head<T extends unknown[]> = T extends [infer First, ...unknown[]] ? First : never;
type Tail<T extends unknown[]> = T extends [unknown, ...infer Rest] ? Rest : never;
```

These primitives enable typing of `pipe` and `compose` functions where the output type of each function must match the input type of the next, and the overall return type is the output of the last function. Libraries like `fp-ts` use exactly this technique.

```typescript
declare function pipe<A, B, C>(
  value: A,
  f1: (a: A) => B,
  f2: (b: B) => C
): C;
// With variadic tuples, this can generalize to any number of functions
```

### Key Points
- Recursive generic types reference themselves to type arbitrarily nested structures (JSON, `DeepPartial`, tree nodes)
- TypeScript limits recursion depth; deep recursion requires a depth-counter parameter workaround
- Variadic tuple types (`...T` in tuple positions) preserve individual element types across generic operations
- `infer` with tuple rest patterns (`[infer First, ...infer Rest]`) enables `Head`/`Tail` type primitives
- These techniques underpin typed `pipe`/`compose`, recursive data types, and variadic function overloads

### Follow-up Prompts
- How would you type a `flatten` function that takes a nested array and returns a flat array, preserving element types?
- What error do you see when a recursive type is "excessively deep" and how do you fix it?
- How does TypeScript's `[infer First, ...infer Rest]` pattern differ from JavaScript's array destructuring?

### Difficulty: advanced
### Tags: generics, recursive-types, variadic-tuples, infer, typescript

---

## Q2: How do template literal types work and what can you do with them?

### Question
Explain TypeScript template literal types: the syntax, how they combine with mapped types and `infer`, and practical use cases for generating type-safe string patterns.

### Model Answer
Template literal types (TypeScript 4.1+) extend string literal types to allow string interpolation at the type level. The syntax mirrors JavaScript template literals but operates on types:

```typescript
type World = 'world';
type Greeting = `hello ${World}`; // 'hello world'
```

When combined with union types, template literal types generate a union of all combinations:

```typescript
type Direction = 'top' | 'right' | 'bottom' | 'left';
type CSSProperty = `margin-${Direction}`; // 'margin-top' | 'margin-right' | ...
type PaddingProperty = `padding-${Direction}`; // 'padding-top' | 'padding-right' | ...
```

This is how you can precisely type CSS property names, event names, or any string pattern with enumerated variants. TypeScript ships with string manipulation types: `Uppercase<S>`, `Lowercase<S>`, `Capitalize<S>`, and `Uncapitalize<S>`, which transform string literal types.

Combined with `infer` in conditional types, template literal types enable extraction of parts of string types:

```typescript
type ExtractRoute<T extends string> =
  T extends `/${infer Rest}` ? Rest : never;

type Route = ExtractRoute<'/users/profile'>; // 'users/profile'
```

One of the most powerful applications is generating getter/setter method names from property names, which is how some ORM and builder pattern types work:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }
```

Template literal types are also used for typing event systems. If you have an event map where keys are event names and values are the handler payload types, you can generate typed `on('eventName', handler)` signatures that enforce payload types per event name.

A practical limitation: template literal types work best with finite unions. If combined with `string` (infinite), the result is just `string`. Complex nested template literals can also become hard to read and slow to compile.

### Key Points
- Template literal types use backtick syntax at the type level: `` `prefix-${UnionType}` `` generates all combinations
- Combined with union types, they produce unions of all string combinations (CSS properties, event names)
- Built-in string manipulation types: `Capitalize`, `Uncapitalize`, `Uppercase`, `Lowercase`
- With `infer` in conditional types, they extract segments from string literal types
- Key remapping in mapped types with `as \`get${Capitalize<string & K>}\`` generates typed method names

### Follow-up Prompts
- How would you type a router where route parameters like `:id` and `:slug` are extracted from the path string as required properties of an object?
- What is the result of `` `${string}-${number}` `` as a type, and why?
- How do template literal types interact with `infer` for parsing structured string formats?

### Difficulty: advanced
### Tags: template-literal-types, string-manipulation, mapped-types, infer, typescript

---

## Q3: What is type-level programming in TypeScript?

### Question
Describe what type-level programming means in TypeScript, what the type system is capable of computing, and what real-world problems benefit from type-level computation. Include the concept of type-level recursion and its limits.

### Model Answer
Type-level programming refers to writing logic that executes at the TypeScript type-checking level — at compile time — rather than at runtime. TypeScript's type system is, remarkably, Turing-complete: you can encode boolean logic, arithmetic, string parsing, list operations, and even sorting algorithms entirely in types. While this doesn't mean you should, understanding it reveals the depth of what's possible for library authors.

The building blocks of type-level programming are: conditional types (type-level if/else), mapped types (type-level map/filter), template literal types (type-level string operations), recursive types (type-level loops), and `infer` (type-level pattern matching and extraction).

Type-level boolean logic:

```typescript
type And<A extends boolean, B extends boolean> =
  A extends true ? B extends true ? true : false : false;

type Or<A extends boolean, B extends boolean> =
  A extends true ? true : B extends true ? true : false;
```

Type-level arithmetic (counting via tuple length):

```typescript
type BuildTuple<N extends number, T extends unknown[] = []> =
  T['length'] extends N ? T : BuildTuple<N, [...T, unknown]>;

type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length'];
```

Practical applications in real libraries: `tRPC` uses type-level programming to infer the full API contract (input/output types for every procedure) from server-side router definitions, making client calls fully typed without code generation. `Prisma` uses advanced generics to type query results based on the `include`/`select` shape passed to the query. `Zod` infers the TypeScript type from a schema definition at the type level. These are not curiosities — they are the features that make these libraries delightful to use.

The practical limits: type instantiation depth is bounded by TypeScript (the "Type instantiation is excessively deep and possibly infinite" error). Complex recursive types are slow to check and can make the TypeScript language server unresponsive. The guidance is: use type-level programming where it provides meaningful user-facing value (accurate return types, validated inputs), not as a demonstration of cleverness.

### Key Points
- TypeScript's type system is Turing-complete: it can compute arbitrary values at the type level
- Conditional types, mapped types, recursive types, and `infer` are the primitives of type-level programming
- Real-world use: tRPC, Prisma, Zod, and similar libraries use type-level computation for API contracts and query result types
- Recursive type computation is bounded by TypeScript's instantiation limit — deeply recursive types cause errors and slowness
- The standard is: use type-level programming where it provides real DX value, not for its own sake

### Follow-up Prompts
- How does tRPC infer client-side types from server-side router definitions without code generation?
- What is the "Type instantiation is excessively deep" error and what are the strategies to work around it?
- How does Zod's `z.infer<typeof schema>` work at the type level?

### Difficulty: advanced
### Tags: type-level-programming, conditional-types, recursive-types, typescript, type-system

---

## Q4: Explain covariance and contravariance in TypeScript.

### Question
Explain covariance and contravariance in TypeScript's type system. How do they apply to function parameters and return types, and what are the practical implications for type compatibility?

### Model Answer
Variance describes how type compatibility relates to subtypes. If `Dog` is a subtype of `Animal` (i.e., `Dog` is assignable to `Animal`), variance determines whether `Container<Dog>` is assignable to `Container<Animal>`.

Covariance means the subtyping relationship is preserved in the same direction. A covariant position accepts a more specific type where a less specific one is expected. Return types in TypeScript are covariant: a function returning `Dog` is assignable to a function returning `Animal`, because whenever an `Animal` is expected, providing a `Dog` is safe — `Dog` satisfies the `Animal` contract.

```typescript
type AnimalFactory = () => Animal;
type DogFactory = () => Dog;
// DogFactory is assignable to AnimalFactory (covariant return type)
const factory: AnimalFactory = (() => new Dog()); // OK
```

Contravariance means the subtyping relationship is reversed. A contravariant position requires a less specific (wider) type where a more specific one is expected. Function parameter types in TypeScript are contravariant (when `strictFunctionTypes` is enabled): a function that accepts `Animal` is assignable to a function that accepts `Dog`. Why? Because a function that handles any `Animal` certainly handles `Dog`, but a function that only handles `Dog` cannot safely be called with a generic `Animal`.

```typescript
type AnimalHandler = (a: Animal) => void;
type DogHandler = (d: Dog) => void;
// AnimalHandler is assignable to DogHandler (contravariant parameter)
const handler: DogHandler = ((a: Animal) => a.breathe()); // OK
```

This is counterintuitive at first: `AnimalHandler` is compatible with `DogHandler`, not the other way around. The rule is: the caller of `DogHandler` will pass a `Dog`, so the handler must be able to handle at least a `Dog` — and anything that handles `Animal` (a supertype) certainly handles `Dog`.

TypeScript with `strictFunctionTypes` (included in `strict`) enforces contravariance for function parameters. Without it, TypeScript uses "bivariance" for function parameters (accepts both directions), which is less safe but more permissive. Method shorthand syntax (`method(): void`) still uses bivariance; property function syntax (`method: () => void`) uses contravariance.

Invariance means no relationship holds in either direction. Mutable generic containers are invariant: `Array<Dog>` is not assignable to `Array<Animal>` because you could push a `Cat` into an `Array<Animal>`, corrupting the `Array<Dog>`. This is why TypeScript's arrays are technically unsound in certain mutation scenarios, though `ReadonlyArray<Dog>` is covariant in its element type.

### Key Points
- Covariance (return types): `Dog extends Animal` means `() => Dog` is assignable to `() => Animal`
- Contravariance (parameter types, with `strictFunctionTypes`): `Dog extends Animal` means `(a: Animal) => void` is assignable to `(d: Dog) => void`
- Method shorthand syntax uses bivariance; property function syntax uses contravariance — prefer property syntax for correctness
- Mutable generic containers are invariant; `ReadonlyArray` is covariant in its element type
- `strictFunctionTypes` enables contravariant checking for function type parameters

### Follow-up Prompts
- Why is `Array<Dog>` not assignable to `Array<Animal>` in a sound type system?
- What is the practical consequence of TypeScript's bivariant method checking, and when does it cause bugs?
- How does variance interact with TypeScript's structural typing system?

### Difficulty: advanced
### Tags: covariance, contravariance, variance, strict-function-types, type-compatibility

---

## Q5: What is the `satisfies` operator and when do you use it?

### Question
Explain TypeScript's `satisfies` operator (introduced in 4.9): what problem it solves compared to type annotation and `as` casting, the exact type inference behavior, and practical use cases.

### Model Answer
Before `satisfies`, you had two options for type-checking an object literal: annotate it with a type variable (which widens the inferred type to the annotation) or leave it unannotated (which preserves the literal type but loses validation). `satisfies` introduced a third option: validate that a value matches a type while preserving the most specific inferred type.

The problem with annotation:

```typescript
type Config = { port: number | string; host: string };

// With annotation: port's type is widened to number | string
const config: Config = { port: 3000, host: 'localhost' };
config.port.toFixed(); // Error: toFixed may not exist on string

// With satisfies: port is validated against Config but typed as number
const config2 = { port: 3000, host: 'localhost' } satisfies Config;
config2.port.toFixed(); // OK! TypeScript knows port is specifically number
```

`satisfies` checks that the value is assignable to the type without widening the variable's type to the annotation. You get the validation of a type annotation with the specificity of inference.

This is particularly valuable for:

1. Palette/config objects where you want autocomplete on specific keys but also want literal types preserved:

```typescript
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, string | number[]>;
// palette.red is number[], not string | number[]
// palette.green is string, not string | number[]
```

2. Route configuration where you want TypeScript to catch typos but preserve specific route string types for use in other types.

3. Plugin configurations or any registry pattern where the value is a map of known keys to specific types, but each entry has a more specific type than the union allows.

The key distinction from `as`:
- `as Type` (type assertion) overrides TypeScript's type entirely — no checking, you're asserting the type is correct
- `: Type` (annotation) widens the inferred type to the annotation — you lose specificity
- `satisfies Type` — validates against the type, preserves the most specific inferred type

`satisfies` also works well with `const`:

```typescript
const routes = {
  home: '/',
  about: '/about',
} satisfies Record<string, `/${string}`>;
// routes.home is '/', not string — useful for further type operations
```

### Key Points
- `satisfies` validates a value against a type without widening the variable's type to the annotation
- Compared to `: Type` annotation: same validation, but keeps the most specific inferred literal types
- Compared to `as Type` assertion: `satisfies` actually validates; `as` suppresses type checking
- Ideal for config/palette/registry objects where entries have specific types within a general union
- Enables post-validation access to the specific inferred type of each property (e.g., calling methods only on `number`, not `number | string`)

### Follow-up Prompts
- How would you combine `satisfies` with `as const` and what effect do both have on the resulting type?
- When would you choose `: Type` annotation over `satisfies` and why?
- How does `satisfies` interact with generic types — can you use a generic constraint with `satisfies`?

### Difficulty: advanced
### Tags: satisfies, type-annotation, type-inference, typescript-4-9, typescript

---

## Q6: Explain TypeScript's module resolution algorithms in depth.

### Question
Describe how TypeScript resolves module imports: the difference between Classic and Node resolution, the `moduleResolution: bundler` mode, `paths` aliases, `exports` in `package.json`, and common issues in monorepos.

### Model Answer
When TypeScript encounters `import { foo } from 'some-module'`, it needs to find the type declaration for `some-module`. The algorithm it uses depends on the `moduleResolution` setting in `tsconfig.json`.

`Classic` resolution (legacy, `--module amd` or `--module system`) walks up the directory tree looking for `some-module.ts` or `some-module.d.ts`, then looks for `some-module/index.ts`. It is rarely used today.

`Node` resolution mimics Node.js's CommonJS resolution: check `some-module.ts`, `some-module.tsx`, `some-module.d.ts` in the current directory; if not found, look in `node_modules/some-module/` using the `main` field of `package.json` to find the entry point, then look for `@types/some-module`. This worked well for CommonJS but doesn't support modern package.json `exports` field.

`Node16` and `NodeNext` support ECMAScript module semantics including the `exports` field in `package.json`. The `exports` field allows packages to expose different entry points for different conditions (`import`, `require`, `types`). TypeScript uses the `types` condition to find the correct type declarations. This mode also requires explicit file extensions in import paths for ESM compatibility (`.js` even when importing a `.ts` file — this is counterintuitive but intentional).

`bundler` (TypeScript 5.0+) is the recommended setting for projects using Vite, esbuild, webpack, or Rollup. It supports `exports`-field condition resolution (including custom conditions like `react-native`, `browser`, `development`) without requiring explicit extensions. It doesn't enforce Node.js module strictness, making it more permissive for bundler-processed code.

`paths` in `tsconfig.json` creates aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@ui/*": ["packages/ui/src/*"],
      "@utils/*": ["packages/utils/src/*"]
    }
  }
}
```

This tells TypeScript where to find modules matching those patterns, enabling clean imports in monorepos. However, `paths` is types-only — the runtime module bundler (webpack, Vite) must also be configured with the same aliases for imports to resolve at runtime.

`references` in `tsconfig.json` enable project references — a first-class monorepo feature where TypeScript builds and type-checks dependent packages separately, using their emitted `.d.ts` files. This enables incremental compilation and correct cross-package type resolution without `paths` hacks.

### Key Points
- `moduleResolution: Node` is the default but doesn't support package `exports` field
- `moduleResolution: bundler` (TS 5.0+) is recommended for Vite/esbuild/webpack projects; supports `exports` conditions without extension requirements
- `Node16`/`NodeNext` fully support ESM including `exports` but require explicit `.js` extensions in imports
- `paths` in `tsconfig` creates type-level aliases; the bundler must also be configured for runtime resolution
- TypeScript project `references` enable proper cross-package type resolution in monorepos with incremental compilation

### Follow-up Prompts
- Why does `moduleResolution: Node16` require `.js` extensions in imports even when the source files are `.ts`?
- How do you configure a dual CJS/ESM package that TypeScript can consume correctly with proper types in both modes?
- What is the difference between `paths` aliases and TypeScript project `references` for monorepo type resolution?

### Difficulty: advanced
### Tags: module-resolution, tsconfig, paths, exports, monorepo, typescript

---

## Q7: How do you optimize TypeScript performance and address type instantiation limits?

### Question
Describe strategies for diagnosing and fixing TypeScript compilation performance issues: identifying slow types, the `--generateTrace` option, structural vs. nominal typing considerations, and tsconfig optimizations.

### Model Answer
TypeScript compilation slowness manifests as slow `tsc` builds, an unresponsive language server in the editor, and "Type instantiation is excessively deep and possibly infinite" errors. Diagnosing and fixing these issues requires understanding how TypeScript's type checker works.

The first diagnostic step is `tsc --generateTrace traceDir --noEmit`. This generates Chrome DevTools-compatible trace files showing exactly how much time TypeScript spent on each type check. Open the trace in `chrome://tracing` or Perfetto and look for the slowest type instantiation events. The trace reveals which types are causing expensive recursive instantiation.

Common causes of slow types: deeply recursive mapped or conditional types, large union types (10+ members that are checked for assignability frequently), excessive use of `infer` with complex patterns, and mixing `any` in unexpected ways (which can cause TypeScript to explore many branches).

Fixes for recursive type depth errors and slow recursive types:
1. Add a depth counter type parameter and a base case that short-circuits at a limit
2. Break the recursive type into a non-recursive helper using `infer`
3. Use `interface` instead of `type` alias for recursive structures — TypeScript handles recursive interface merging more efficiently than recursive type aliases in some cases

`skipLibCheck: true` in `tsconfig.json` skips type-checking all `.d.ts` files, significantly speeding up compilation in projects with many third-party dependencies. This is safe as long as you trust the declaration files. `isolatedModules: true` prevents certain slow single-file transpilation anti-patterns.

Project references (`references` in `tsconfig.json`) split a large project into independently built sub-projects. TypeScript caches the compiled output of each sub-project, so changing one package only recompiles that package and its dependents, not the entire codebase. This is the most impactful optimization for large monorepos.

Excluding unnecessary files and directories is important: `exclude: ["node_modules", "dist", "build", "coverage"]` prevents TypeScript from type-checking files it shouldn't. Including only the files you need via `include` or `files` also helps.

For the language server specifically, the VS Code TypeScript extension's "TypeScript: Restart TS Server" command and the "TypeScript: Open TS Server Log" can reveal language server-specific slowness. Large `union` types in frequently-checked positions are a common culprit.

### Key Points
- `tsc --generateTrace` produces Chrome DevTools-compatible traces showing which type instantiations are slow
- Recursive conditional/mapped types and large unions are the most common performance culprits
- `skipLibCheck: true` speeds up compilation by skipping `.d.ts` type checking for dependencies
- Project `references` enable incremental builds — only recompile changed sub-projects in monorepos
- Depth-counter type parameters provide a controlled escape from infinite recursive type instantiation

### Follow-up Prompts
- What is the difference in performance between `type` aliases and `interface` for recursive data structures?
- How do you use the TypeScript trace to identify which user-written type is causing slowness?
- What does `incremental: true` do in tsconfig.json, and how does it differ from project `references`?

### Difficulty: advanced
### Tags: typescript-performance, tsconfig, type-instantiation, generateTrace, incremental-compilation

---

## Q8: How do you configure TypeScript for a production codebase?

### Question
Describe a production-grade TypeScript configuration: the key `tsconfig.json` options, the `strict` mode family of flags, project references, and how to balance strictness with developer ergonomics.

### Model Answer
A production TypeScript configuration should enable maximum type safety while remaining practical. The configuration strategy starts with the `strict` flag, which enables a bundle of safety-related compiler options, and builds from there.

`"strict": true` enables: `strictNullChecks` (no implicit null/undefined acceptance), `strictFunctionTypes` (contravariant function parameter checking), `strictPropertyInitialization` (class properties must be initialized), `noImplicitAny` (explicit types required where inference fails), `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables` (catch variables typed as `unknown` in TypeScript 4.4+), and `strictBindCallApply`.

Beyond `strict`, recommended additional flags for production:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,    // array[i] is T | undefined, not T
    "exactOptionalPropertyTypes": true,  // distinguishes missing vs undefined
    "noImplicitReturns": true,           // all code paths must return in non-void functions
    "noFallthroughCasesInSwitch": true,  // explicit break/return in switch cases
    "noPropertyAccessFromIndexSignature": true, // must use bracket notation for index signatures
    "forceConsistentCasingInFileNames": true
  }
}
```

`noUncheckedIndexedAccess` is particularly impactful: array element access (`arr[0]`) returns `T | undefined` rather than `T`, forcing you to handle the "out of bounds" case. This catches many common runtime errors at compile time but requires null checks throughout array-heavy code.

`exactOptionalPropertyTypes` distinguishes between `{ prop?: string }` (property can be absent) and `{ prop: string | undefined }` (property must be present but can be `undefined`). This prevents accidentally setting optional properties to `undefined` when they should be omitted.

`paths` for monorepo alias resolution, `baseUrl` for module resolution root, `rootDir` and `outDir` to separate source and compiled output.

For libraries being published to npm, configure `declaration: true` to emit `.d.ts` files and `declarationMap: true` to emit source maps for the declaration files (enabling "go to definition" to navigate to the original `.ts` source). The `types` or `exports` field in `package.json` points consumers to the right declaration file.

A pragmatic approach for large migrations: start with `strict: true` and address all errors. Then add `noUncheckedIndexedAccess` in a subsequent phase. The team should align on which strictness flags are enabled and avoid leaving `// @ts-ignore` or `any` without a tracked technical debt comment.

### Key Points
- `strict: true` is the baseline; adds `strictNullChecks`, `strictFunctionTypes`, `noImplicitAny`, and several others
- `noUncheckedIndexedAccess` makes array element access return `T | undefined`, preventing out-of-bounds runtime errors
- `exactOptionalPropertyTypes` distinguishes absent vs. `undefined` optional properties
- Project `references` and incremental compilation are essential for monorepo build performance
- Library configurations: `declaration: true`, `declarationMap: true`, and the `exports` field in `package.json`

### Follow-up Prompts
- What is the difference between `strictNullChecks` and `noUncheckedIndexedAccess` in terms of what they protect against?
- How do you configure separate `tsconfig.json` files for source code, tests, and build output?
- What is `verbatimModuleSyntax` (TypeScript 5.0) and when should you enable it?

### Difficulty: advanced
### Tags: tsconfig, strict-mode, configuration, typescript, production

---

## Q9: What are strategies for migrating a large JavaScript codebase to TypeScript?

### Question
Describe a systematic approach to migrating a large JavaScript application to TypeScript: tooling, incremental strategies, `allowJs`, `checkJs`, declaration files for existing code, and common pitfalls.

### Model Answer
Migrating a large JavaScript codebase to TypeScript is a multi-phase effort that should be approached incrementally to minimize disruption to ongoing development. A "big bang" migration that converts all files simultaneously is high-risk and blocks other work for weeks or months. The incremental approach allows the team to ship features throughout the migration.

Phase 1: Enable TypeScript without converting files. Add a `tsconfig.json` with `"allowJs": true` and `"checkJs": false`. This allows TypeScript to compile `.js` files without reporting errors. Add `"outDir"` and configure the build pipeline to use `tsc` or a bundler with TypeScript support. The entire codebase is now "in" TypeScript's purview but nothing changes functionally.

Phase 2: Add type checking to existing JS files. Enable `"checkJs": true` and address the errors incrementally. Use `// @ts-check` at the top of individual files to opt individual files into checking without enabling it globally. Use JSDoc type annotations (`@param {string} name`, `@returns {User}`) to add types to `.js` files without converting them to `.ts`.

Phase 3: Convert files to `.ts` incrementally. Prioritize: core utilities, API client code, shared types, and then feature files. Rename `.js` to `.ts` one file at a time. The conversion will surface type errors that JSDoc annotations may have hidden. Use `// @ts-ignore` or type assertions sparingly to unblock compilation while tracking the real issues as technical debt.

A critical tool for tracking progress is the `"strict"` flag. Start with it off during the migration and enable strictness options one at a time after the bulk of the migration is complete. `noImplicitAny` is the most impactful and is often the last flag enabled because it requires explicit types everywhere inference fails.

For third-party dependencies without types, install `@types/package-name` or write minimal declaration files (`.d.ts`) with `declare module 'package-name'` and type the APIs you actually use.

Common pitfalls: widening types with `any` to escape errors (it defeats the purpose — use `unknown` and narrow properly), `@ts-ignore` comments that accumulate and never get resolved (use ESLint's `ban-ts-comment` rule to prevent), and inconsistent type definitions between the migration's declaration files and the eventual TypeScript implementation.

Metrics to track migration progress: percentage of `.ts` files vs `.js` files, number of `any` uses (tracked via ESLint `@typescript-eslint/no-explicit-any`), and TypeScript strict error count per module.

### Key Points
- Use `allowJs: true` to enable TypeScript compilation without converting files immediately
- Enable `checkJs: true` or `// @ts-check` per-file to add type checking to existing JS incrementally
- Prioritize converting core shared utilities and types first; feature code follows
- Enable `strict` flags incrementally after bulk conversion; `noImplicitAny` is typically last
- Track progress with file-type metrics, `any` count, and strict error count; avoid accumulating unresolved `// @ts-ignore`

### Follow-up Prompts
- How do you handle a third-party library with no TypeScript types and no `@types` package available?
- What is the `// @ts-nocheck` directive and when is it appropriate to use during migration?
- How do you migrate a file that uses CommonJS `module.exports` and `require()` to TypeScript ESM syntax?

### Difficulty: advanced
### Tags: migration, allowJs, checkJs, javascript-to-typescript, incremental-adoption

---

## Q10: What are TypeScript custom transformers and when would you write one?

### Question
Explain TypeScript custom transformers (compiler plugins): what they are, how they work in the compilation pipeline, what problems they solve, and provide examples of real-world use cases. Include how to implement a simple transformer.

### Model Answer
TypeScript custom transformers are plugins that hook into the TypeScript compilation pipeline and transform the Abstract Syntax Tree (AST) before code is emitted. They execute during the TypeScript compilation step, operating on the fully type-checked AST, and can add, remove, or modify AST nodes. The output is standard JavaScript.

The TypeScript compiler exposes the transformation API through `ts.createTransformer()`. A transformer is a function that takes a `TransformationContext` and returns a function from `ts.SourceFile` (or another AST node type) to a transformed version. The visitor pattern (using `ts.visitEachChild` and `ts.visitNode`) is used to traverse and selectively modify the AST:

```typescript
import * as ts from 'typescript';

function removeConsoleLogTransformer(
  context: ts.TransformationContext
): ts.Transformer<ts.SourceFile> {
  return (sourceFile: ts.SourceFile) => {
    function visitor(node: ts.Node): ts.Node {
      // Check if node is a console.log call expression
      if (
        ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) &&
        ts.isPropertyAccessExpression(node.expression.expression) &&
        node.expression.expression.name.text === 'log' &&
        ts.isIdentifier(node.expression.expression.expression) &&
        node.expression.expression.expression.text === 'console'
      ) {
        // Remove the node by returning an empty statement or undefined
        return ts.factory.createEmptyStatement();
      }
      return ts.visitEachChild(node, visitor, context);
    }
    return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
  };
}
```

Real-world use cases for custom transformers include: automatic dependency injection (Angular's View Engine), stripping decorators or transforming them into runtime calls (legacy decorator support), compile-time internationalization (replacing `t('key')` calls with translated strings at build time), dead code elimination based on environment variables (stripping debug-only code), and generating type metadata for runtime reflection.

The practical challenge: TypeScript's compiler API is not officially stable and changes between major versions. Transformers that work with TypeScript 4.x may break with 5.x. This is why production transformers are typically maintained by dedicated library teams (e.g., the Angular team, the MobX team for legacy decorator support).

For most projects, the need for custom transformers is rare. Babel macros, Vite plugins, and webpack loaders operate on a lower level (text or parsed JavaScript AST without TypeScript type information) and are more accessible. Custom TypeScript transformers are appropriate when you specifically need type information during the transformation.

### Key Points
- Transformers hook into TypeScript's compilation pipeline, operating on the fully type-checked AST before emit
- Implemented as visitor functions using `ts.visitNode` and `ts.visitEachChild` to traverse and transform nodes
- Real-world uses: DI metadata, decorator transformation, compile-time i18n, environment-based dead code elimination
- TypeScript's compiler API is not officially stable — transformers may break across major TypeScript versions
- Babel macros and Vite plugins are more accessible alternatives when type information isn't needed during transformation

### Follow-up Prompts
- How do you run a custom TypeScript transformer with `tsc` vs. with `ts-jest` vs. with `ts-loader` in webpack?
- What is the difference between a "before" transformer and an "after" transformer in TypeScript's emit pipeline?
- How does `ttypescript` (or `ts-patch`) enable using transformers without a custom build script?

### Difficulty: advanced
### Tags: typescript-transformers, compiler-api, ast, compilation, plugins
