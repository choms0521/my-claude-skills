# JavaScript - Junior Interview Questions (Part 2)
### Language: en

## Q11: What is the difference between `null` and `undefined` in JavaScript?

### Question
Explain the difference between `null` and `undefined`. When would you use each, and how do they behave in comparisons?

### Model Answer
`undefined` is the default value JavaScript automatically assigns to variables that have been declared but not yet assigned a value. It also appears when you access an object property that doesn't exist, when a function has no explicit return statement, or when a function parameter is not provided by the caller. It represents the absence of a value in an unintentional or incomplete way.

`null`, on the other hand, is an intentional assignment that represents "no value" or "empty." A developer explicitly sets a variable to `null` to indicate that it purposefully holds nothing. For example, you might initialize a variable to `null` before a user makes a selection, or set a reference to `null` to release a held object.

In terms of types, `typeof undefined` returns `"undefined"`, while `typeof null` returns `"object"` — this is a well-known historical bug in JavaScript that has never been fixed for backward compatibility. This means you cannot reliably use `typeof` to check for `null`; instead, use a strict equality check `value === null`.

When comparing, `null == undefined` is `true` (loose equality treats them as equivalent), but `null === undefined` is `false` (strict equality distinguishes them). Neither `null` nor `undefined` equals any other value under loose equality. In arithmetic contexts, `undefined` coerces to `NaN` while `null` coerces to `0`, which can lead to subtle bugs.

A practical convention: use `undefined` to mean "not yet set" and `null` to mean "explicitly empty or cleared." This distinction makes your intent clearer to other developers reading the code.

### Key Points
- `undefined` is the automatic default for uninitialized variables, missing properties, and missing function arguments
- `null` is an explicit assignment indicating intentional absence of value
- `typeof null === "object"` is a historic bug; use `=== null` to check for null
- `null == undefined` is `true`, but `null === undefined` is `false`
- `null` coerces to `0` in arithmetic; `undefined` coerces to `NaN`

### Follow-up Prompts
- How would you write a function that handles both `null` and `undefined` inputs safely?
- What does optional chaining (`?.`) return when it encounters `null` or `undefined`?
- How does nullish coalescing (`??`) differ from the `||` operator when dealing with `null` and `undefined`?

### Difficulty: basic
### Tags: null, undefined, types, equality, coercion

---

## Q12: What are the spread and rest operators in JavaScript?

### Question
Explain the spread (`...`) and rest (`...`) operators. How are they different, and give examples of each use case.

### Model Answer
Both the spread and rest operators use the same `...` syntax, but they serve opposite purposes depending on the context. The spread operator "expands" an iterable into individual elements, while the rest operator "collects" individual elements into an array.

The spread operator can be used in several ways. When used in function calls, it expands an array into individual arguments: `Math.max(...[1, 2, 3])` is equivalent to `Math.max(1, 2, 3)`. When used in array literals, it merges or copies arrays: `const combined = [...arr1, ...arr2]`. When used in object literals (ES2018+), it copies or merges object properties: `const newObj = { ...obj1, ...obj2 }`. Spread creates a shallow copy, so nested objects are still referenced, not deeply cloned.

The rest operator appears in function parameter lists and destructuring. In function parameters, it collects all remaining arguments into a real array: `function sum(first, ...rest) { return rest.reduce((a, b) => a + b, first); }`. Unlike the old `arguments` object, the rest parameter is a genuine array with all array methods available, and it only captures the arguments not already matched by named parameters.

In destructuring, the rest operator collects the remaining elements or properties: `const [head, ...tail] = [1, 2, 3, 4]` gives `head = 1` and `tail = [2, 3, 4]`. For objects: `const { a, ...rest } = { a: 1, b: 2, c: 3 }` gives `a = 1` and `rest = { b: 2, c: 3 }`.

A key memory trick: rest is always in a definition (parameter list, destructuring target), while spread is always in an expression (function call, array/object literal).

### Key Points
- Spread expands iterables into individual elements; rest collects individual elements into an array
- Spread is used in expressions (function calls, array/object literals)
- Rest is used in definitions (function parameters, destructuring patterns)
- The rest parameter is a real array unlike the legacy `arguments` object
- Spread performs a shallow copy, not a deep clone

### Follow-up Prompts
- What is the difference between the rest parameter and the `arguments` object?
- How would you use spread to merge two objects while overriding specific properties?
- Can the rest parameter appear anywhere in a parameter list, or must it always be last?

### Difficulty: basic
### Tags: spread, rest, destructuring, array, function parameters

---

## Q13: How does destructuring work in JavaScript?

### Question
Explain array and object destructuring in JavaScript. What are some practical use cases, and what are the rules around default values and renaming?

### Model Answer
Destructuring is a syntax that allows you to unpack values from arrays or properties from objects into distinct variables in a concise, readable way. It was introduced in ES6 and is now one of the most commonly used JavaScript features.

Array destructuring extracts values by position. `const [a, b, c] = [1, 2, 3]` assigns `a = 1`, `b = 2`, `c = 3`. You can skip elements using commas: `const [first, , third] = [1, 2, 3]` gives `first = 1` and `third = 3`. You can also use the rest operator to collect remaining items: `const [head, ...tail] = [1, 2, 3, 4]`.

Object destructuring extracts values by property name. `const { name, age } = person` creates variables matching the object's property names. You can rename while destructuring: `const { name: userName } = person` creates `userName` instead of `name`. This is especially useful when dealing with API responses that use snake_case keys and you want camelCase variables.

Default values work in both array and object destructuring: `const { name = 'Anonymous' } = user` uses `'Anonymous'` if `name` is `undefined`. You can combine renaming and defaults: `const { name: userName = 'Anonymous' } = user`.

Destructuring is particularly powerful in function parameters. Instead of `function greet(options) { const name = options.name; }`, you can write `function greet({ name, age = 0 }) {}`, making the expected shape of the input immediately visible. It is also commonly used in React to extract props: `function Button({ label, onClick, disabled = false }) {}`.

Nested destructuring allows you to go deeper: `const { address: { city } } = user` extracts the `city` property from the nested `address` object. However, deeply nested destructuring can reduce readability, so use judgment about when to stop.

### Key Points
- Array destructuring assigns by position; object destructuring assigns by property name
- You can rename object properties during destructuring with `: newName` syntax
- Default values use `= defaultValue` syntax and apply only when the value is `undefined`
- Destructuring works in variable declarations, function parameters, and assignments
- Nested destructuring is possible but should be kept shallow for readability

### Follow-up Prompts
- How would you handle destructuring when a nested object might be `null` or `undefined`?
- What is the difference between `const { a = 1 } = {}` and `const { a } = { a: undefined }`?
- How does destructuring help when working with React props or API response data?

### Difficulty: basic
### Tags: destructuring, ES6, array, object, default values

---

## Q14: What are `Promise.all`, `Promise.race`, and `Promise.allSettled`? When would you use each?

### Question
Explain the differences between `Promise.all`, `Promise.race`, and `Promise.allSettled`. Provide a scenario where each would be the appropriate choice.

### Model Answer
`Promise.all` takes an iterable of Promises and returns a new Promise that resolves when all input Promises resolve, with an array of their results in the same order. If any single Promise rejects, the entire `Promise.all` immediately rejects with that rejection reason, regardless of the other Promises. Use this when you need all operations to succeed before proceeding — for example, loading multiple independent data sources that are all required to render a page.

`Promise.race` resolves or rejects as soon as the first Promise in the iterable settles (either resolves or rejects). The result reflects whatever the first settled Promise returned. A classic use case is implementing a timeout: you create a race between your actual fetch call and a `setTimeout`-based rejection. Whichever finishes first wins. Another use case is redundant requests — send the same request to multiple servers and use whichever responds first.

`Promise.allSettled` (ES2020) waits for all Promises to settle — whether they resolve or reject — and never itself rejects. It returns an array of result objects, each with a `status` field of either `"fulfilled"` (with a `value` property) or `"rejected"` (with a `reason` property). Use this when you want to run multiple independent operations and handle each result individually, even if some fail. For example, sending notifications to multiple users where a failure for one user should not block processing for others.

There is also `Promise.any` (ES2021), which resolves as soon as any single Promise resolves (the opposite of `Promise.all` failing on the first rejection). It rejects only if all Promises reject.

A decision guide: need all to succeed → `Promise.all`; need the fastest → `Promise.race`; need all results regardless of outcome → `Promise.allSettled`; need any one success → `Promise.any`.

### Key Points
- `Promise.all` rejects immediately if any Promise rejects; all must succeed for it to resolve
- `Promise.race` settles as soon as the first Promise settles (resolve or reject)
- `Promise.allSettled` always resolves with an array of outcome objects, never itself rejects
- `Promise.any` resolves when the first Promise resolves, rejects only if all reject
- The order of results in `Promise.all` and `Promise.allSettled` matches the input order, not completion order

### Follow-up Prompts
- How would you implement a timeout wrapper for any async function using `Promise.race`?
- What happens if you pass an empty array to `Promise.all` or `Promise.allSettled`?
- How would you use `Promise.allSettled` to report which API calls succeeded and which failed?

### Difficulty: basic
### Tags: Promise, async, Promise.all, Promise.race, Promise.allSettled, concurrency

---

## Q15: What is optional chaining (`?.`) and how does it work?

### Question
Explain optional chaining in JavaScript. What problem does it solve, and what are the different forms it can take?

### Model Answer
Optional chaining is a syntax introduced in ES2020 that allows you to safely access deeply nested object properties without having to manually check if each intermediate reference exists. Before optional chaining, accessing a deeply nested property like `user.address.city` would throw a `TypeError` if `user` was `null` or if `address` didn't exist. Developers had to write verbose guards like `user && user.address && user.address.city`.

With optional chaining, you write `user?.address?.city`. If any part of the chain is `null` or `undefined`, the entire expression short-circuits and returns `undefined` instead of throwing an error. This makes code significantly cleaner when dealing with optional data from APIs or user input.

Optional chaining works in three forms. First, property access: `obj?.prop` or `obj?.['dynamic-key']`. Second, method calls: `obj.method?.()` — this calls the method only if it exists and is a function; if it doesn't exist, it returns `undefined` rather than throwing "not a function." Third, array element access: `arr?.[0]` accesses the first element only if `arr` is not null or undefined.

You can chain multiple optional accesses together: `user?.profile?.settings?.theme`. The chain stops at the first `null` or `undefined` and returns `undefined` for the entire expression.

Optional chaining is often used alongside the nullish coalescing operator to provide a default: `user?.address?.city ?? 'Unknown City'`. This pattern is extremely common when working with API responses where fields may be absent.

Important: optional chaining does not suppress errors for non-nullish falsy values. `false?.toString()` still works because `false` is not `null` or `undefined`. Only `null` and `undefined` cause the short-circuit.

### Key Points
- Optional chaining returns `undefined` instead of throwing a TypeError when accessing `null` or `undefined`
- Three forms: property access (`?.prop`), method call (`?.()`), and bracket notation (`?.[]`)
- The chain short-circuits at the first `null` or `undefined`
- Combine with `??` to provide fallback values
- Only `null` and `undefined` trigger the short-circuit — other falsy values like `0`, `false`, `""` do not

### Follow-up Prompts
- How does optional chaining interact with the nullish coalescing operator `??`?
- What is the difference between `obj?.method()` and `obj.method?.()`?
- Are there any performance considerations when using optional chaining in a tight loop?

### Difficulty: basic
### Tags: optional chaining, nullish, ES2020, null safety, property access

---

## Q16: What is the nullish coalescing operator (`??`) and how does it differ from `||`?

### Question
Explain the nullish coalescing operator `??`. How does it differ from the logical OR `||` operator, and when should you prefer one over the other?

### Model Answer
The nullish coalescing operator `??` was introduced in ES2020 and returns the right-hand side operand only when the left-hand side is `null` or `undefined`. It is designed as a safer alternative to `||` for providing default values.

The logical OR operator `||` returns the right-hand side when the left-hand side is any falsy value: `false`, `0`, `""` (empty string), `NaN`, `null`, or `undefined`. This behavior is often undesirable. Consider a `volume` setting that can legitimately be `0`. If you write `const vol = userVolume || 50`, a user-set volume of `0` would incorrectly fall through to the default of `50`, because `0` is falsy.

With `??`, only `null` and `undefined` trigger the fallback. So `const vol = userVolume ?? 50` correctly keeps `0` as a valid value and only uses `50` when `userVolume` is actually `null` or `undefined`. The same applies to empty strings, `false`, and `NaN` — `??` preserves these values as valid.

A practical rule: use `||` when you want to fall back on any "empty" value (false, empty string, zero, etc.), and use `??` when you only want to fall back when a value is truly absent (`null`/`undefined`). The latter is almost always what you want for configuration defaults and API response defaults.

You can also combine `??` with optional chaining: `config?.timeout ?? 5000` reads the timeout from config if it exists, and defaults to 5000 only if `config` is absent or `timeout` is not set. Note that `??` cannot be used directly alongside `||` or `&&` without parentheses — JavaScript requires explicit grouping to avoid ambiguity.

### Key Points
- `??` returns the right side only when the left side is `null` or `undefined`
- `||` returns the right side for any falsy value (`0`, `""`, `false`, `NaN`, `null`, `undefined`)
- Prefer `??` for configuration defaults where `0`, `false`, or `""` are valid values
- `??` can be combined with optional chaining for safe default access
- Mixing `??` with `||` or `&&` requires parentheses to avoid a syntax error

### Follow-up Prompts
- What would `0 ?? 'default'` and `0 || 'default'` each return?
- How do you use `??=` (nullish assignment) to set a default only once?
- Can you use `??` inside a ternary expression?

### Difficulty: basic
### Tags: nullish coalescing, logical OR, falsy, default values, ES2020

---

## Q17: What are `Set` and `Map` in JavaScript and how do they differ from arrays and plain objects?

### Question
Explain JavaScript's `Set` and `Map` data structures. What are their key characteristics, and when would you choose them over arrays or plain objects?

### Model Answer
`Set` is a collection of unique values. Unlike arrays, a `Set` will not store duplicate entries — adding a value that already exists simply has no effect. `Set` accepts any type of value (primitives and objects). The most common use case for `Set` is deduplication: `const unique = [...new Set(array)]` converts an array to a `Set` (removing duplicates) and back to an array. Sets also provide O(1) average-time lookup with `has()`, which is faster than `Array.includes()` for large collections.

`Set` methods include `add(value)`, `delete(value)`, `has(value)`, `clear()`, and the `size` property. It is iterable, so you can use `for...of` or spread it. Unlike arrays, Sets do not have index-based access or methods like `map`, `filter`, or `reduce` — if you need those, convert to an array first.

`Map` is a key-value store like a plain object, but with important differences. Map keys can be any type — objects, functions, primitives — not just strings and symbols as with plain objects. Maps maintain insertion order for iteration, which is also true of modern plain objects for string keys, but Map makes this a formal guarantee. Maps have a `size` property directly, while you need `Object.keys(obj).length` for objects. Maps also do not have prototype-based key collisions (no risk of accidentally overriding `constructor` or `toString`).

`Map` methods: `set(key, value)`, `get(key)`, `has(key)`, `delete(key)`, `clear()`, and `size`. Iterating over a `Map` with `for...of` gives `[key, value]` pairs.

When to choose: use `Set` when you need a collection of unique values with fast membership testing. Use `Map` when you need a key-value store where keys are not strings, or when you want cleaner semantics without object prototype pollution. For simple string-keyed configuration data or JSON-compatible structures, plain objects are still the pragmatic choice.

### Key Points
- `Set` stores unique values of any type with O(1) `has()` lookup
- `Map` stores key-value pairs where keys can be any type, not just strings
- `Map` maintains insertion order and has a `size` property
- `Set` and `Map` are both iterable with `for...of`
- Use `Set` for deduplication and membership testing; use `Map` for flexible key-value storage

### Follow-up Prompts
- How would you convert a `Set` to an array and back?
- What are `WeakSet` and `WeakMap`, and when would you use them instead of `Set` and `Map`?
- How does `Map` handle object equality for keys — does `{ a: 1 }` equal another `{ a: 1 }` as a key?

### Difficulty: basic
### Tags: Set, Map, data structures, collection, WeakMap, WeakSet

---

## Q18: How do `JSON.parse` and `JSON.stringify` work, and what are their limitations?

### Question
Explain `JSON.parse` and `JSON.stringify`. What data types can they handle, what do they lose, and how can you use their optional parameters?

### Model Answer
`JSON.stringify` converts a JavaScript value to a JSON string. `JSON.parse` does the reverse — it parses a JSON string back into a JavaScript value. Together, they are the standard way to serialize and deserialize data for storage or transmission.

`JSON.stringify` supports strings, numbers, booleans, `null`, arrays, and plain objects. However, it silently drops or transforms several JavaScript types. `undefined` values in objects are omitted entirely; `undefined` in arrays becomes `null`. Functions are also omitted. `Symbol` keys and values are dropped. `NaN` and `Infinity` become `null`. `Date` objects are converted to their ISO string representation — but when you parse them back, you get a string, not a `Date` object. Circular references cause `JSON.stringify` to throw a `TypeError`.

The optional second argument to `JSON.stringify` is a replacer. It can be an array of property names to include (a whitelist), or a function that receives each key and value and returns the value to serialize (returning `undefined` omits the property). The optional third argument is a space argument — passing a number (like `2`) or a string (like `'\t'`) produces prettily indented output, useful for debugging.

`JSON.parse` also accepts an optional second argument: a reviver function. It receives each key and value during parsing and can transform them. A common use is converting ISO date strings back into `Date` objects: if the value matches a date pattern, return `new Date(value)`.

Error handling is important: `JSON.parse` throws a `SyntaxError` if the string is not valid JSON, so always wrap it in `try/catch` when parsing untrusted input. `JSON.stringify` throws on circular references. These are the two most common runtime errors involving JSON.

### Key Points
- `JSON.stringify` drops `undefined`, functions, and `Symbol` values; converts `Date` to strings; throws on circular references
- `JSON.parse` accepts a reviver function to transform values during parsing
- `JSON.stringify` accepts a replacer (whitelist array or transform function) and a space argument for pretty-printing
- Always wrap `JSON.parse` in `try/catch` when parsing external or user-supplied data
- JSON roundtrip does not preserve `Date` objects, `Map`, `Set`, or class instances with methods

### Follow-up Prompts
- How would you write a replacer that excludes all keys starting with an underscore?
- How can you handle circular references in `JSON.stringify`?
- What is the difference between `JSON.stringify(value, null, 2)` and the default output?

### Difficulty: basic
### Tags: JSON, serialization, JSON.parse, JSON.stringify, data transfer

---

## Q19: What is the difference between `setTimeout` and `setInterval`? How do you cancel them?

### Question
Explain `setTimeout` and `setInterval`. How do they work in the event loop context, and how do you stop them?

### Model Answer
`setTimeout(callback, delay)` schedules a function to run once after at least `delay` milliseconds. `setInterval(callback, interval)` schedules a function to run repeatedly, with at least `interval` milliseconds between executions. Both return a numeric ID that can be used to cancel them.

To cancel a `setTimeout` before it fires, call `clearTimeout(id)`. To stop a `setInterval`, call `clearInterval(id)`. Failing to clear intervals is a common source of memory leaks — if you set up an interval in a component or module and never clear it when the component unmounts or the module is destroyed, the callback continues to fire and may reference stale data or closed-over variables.

The "at least" in the delay description is important. Both `setTimeout` and `setInterval` work through the event loop's task queue. The delay specifies the minimum time before the callback is added to the queue, but if the call stack is busy with synchronous code, the callback will wait until the stack is empty. This means `setTimeout(fn, 0)` does not run immediately — it runs after all currently executing synchronous code finishes.

`setInterval` has a subtle issue: if the callback itself takes longer to execute than the interval duration, calls can "pile up" or be fired with no gap. An alternative pattern for repeating tasks is recursive `setTimeout`: call `setTimeout` again at the end of each callback. This guarantees a delay between the end of one execution and the start of the next.

For animations, neither `setTimeout` nor `setInterval` is the right choice — `requestAnimationFrame` is preferred because it ties execution to the browser's repaint cycle, producing smoother animations and automatically pausing when the tab is not visible.

### Key Points
- `setTimeout` runs once after a minimum delay; `setInterval` runs repeatedly at a minimum interval
- Both return IDs; use `clearTimeout` and `clearInterval` to cancel them
- The delay is a minimum, not a guarantee — the event loop may delay execution further
- Uncancelled intervals cause memory leaks; always clear them in cleanup code
- `setInterval` can pile up if the callback is slower than the interval; recursive `setTimeout` avoids this

### Follow-up Prompts
- Why does `setTimeout(fn, 0)` not execute `fn` immediately?
- How would you implement a debounce function using `setTimeout` and `clearTimeout`?
- When would you choose recursive `setTimeout` over `setInterval`?

### Difficulty: basic
### Tags: setTimeout, setInterval, event loop, timers, async, clearTimeout

---

## Q20: What are common JavaScript string methods you use regularly?

### Question
Name and explain commonly used JavaScript string methods. Cover searching, transforming, and extracting substrings.

### Model Answer
JavaScript strings have a rich set of built-in methods. They are immutable — every method returns a new string rather than modifying the original.

For searching and testing, `includes(searchString)` returns `true` if the string contains the given substring. `startsWith(prefix)` and `endsWith(suffix)` check the beginning and end. `indexOf(searchString)` returns the index of the first match or `-1` if not found. `lastIndexOf` searches from the end. `search(regex)` works like `indexOf` but accepts a regular expression.

For extracting substrings, `slice(start, end)` is the most commonly used — it accepts negative indices that count from the end, and `end` is exclusive. `substring(start, end)` is similar but does not support negative indices. Avoid `substr` (deprecated). `at(index)` is a newer method that accepts negative indices: `str.at(-1)` gives the last character.

For transforming, `toUpperCase()` and `toLowerCase()` convert case. `trim()` removes whitespace from both ends; `trimStart()` and `trimEnd()` target one side. `replace(searchValue, replacement)` replaces the first match (use `replaceAll` or a regex with the `g` flag for all matches). `padStart(targetLength, padString)` and `padEnd` pad a string to a given length — useful for formatting numbers.

For splitting and joining, `split(separator)` converts a string to an array. The complement is `Array.join(separator)`. For template assembly, `repeat(count)` repeats a string.

For matching, `match(regex)` returns an array of matches. With the `g` flag, it returns all matches. `matchAll(regex)` returns an iterator of all matches with capture groups, and requires the `g` flag.

### Key Points
- Strings are immutable — all methods return new values
- `slice` is the preferred substring method; it supports negative indices
- `includes`, `startsWith`, `endsWith` are the clearest existence checks
- `trim`, `trimStart`, `trimEnd` remove whitespace
- `split` converts strings to arrays; `join` converts arrays back to strings

### Follow-up Prompts
- What is the difference between `slice` and `substring` when given negative arguments?
- How would you count the occurrences of a substring in a string?
- How does `replaceAll` differ from using `replace` with a global regex?

### Difficulty: basic
### Tags: string, string methods, slice, includes, trim, replace, split

---
