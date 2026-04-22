# JavaScript - Mid Interview Questions (Part 2)
### Language: en

## Q11: What is currying and partial application in JavaScript?

### Question
Explain currying and partial application. How do they differ, and what practical problems do they solve?

### Model Answer
Currying is the technique of transforming a function that takes multiple arguments into a sequence of functions that each take a single argument. A curried version of `add(a, b)` becomes `add(a)(b)` — calling `add(3)` returns a new function waiting for `b`. The name comes from mathematician Haskell Curry.

Partial application is related but distinct. It means creating a new function by pre-filling some (not necessarily one) of the arguments of an existing function. `Function.prototype.bind` is the built-in partial application mechanism: `const add5 = add.bind(null, 5)` creates a function that always adds 5 to its argument.

The practical value of both techniques is the ability to create specialized functions from general ones. Consider a logging function `log(level, message)`. Partial application gives you `const logError = log.bind(null, 'error')`, and you can now call `logError('something failed')` throughout your code without repeating the level argument. Currying gives the same result with a different syntax style.

In functional programming, currying enables function composition pipelines. When every function in a pipeline takes exactly one argument, they can be chained without adapter code. Libraries like Ramda and lodash/fp adopt auto-currying, where functions automatically handle both full and partial application.

A simple curry implementation illustrates the concept: a curry function checks if the number of supplied arguments satisfies the original function's arity (`fn.length`). If so, it calls `fn`; otherwise, it returns a new function collecting more arguments. Real-world implementations handle edge cases like variadic functions and argument order carefully.

The distinction to remember: currying always produces unary (one-argument) functions in a chain; partial application can pre-fill any number of arguments, leaving any number remaining.

### Key Points
- Currying transforms `f(a, b, c)` into `f(a)(b)(c)` — a chain of unary functions
- Partial application pre-fills some arguments, returning a function expecting the rest
- `Function.prototype.bind` is JavaScript's built-in partial application tool
- Both enable creating specialized functions from general ones, improving reusability
- Currying is especially useful in functional composition pipelines

### Follow-up Prompts
- How would you implement a generic `curry` function in JavaScript?
- What is the difference between a curried function and a function that returns a function?
- How do auto-curried functions in libraries like Ramda differ from manual currying?

### Difficulty: intermediate
### Tags: currying, partial application, functional programming, higher-order functions, bind

---

## Q12: What is memoization and how do you implement it in JavaScript?

### Question
Explain memoization. When is it appropriate, what are its trade-offs, and how would you implement a general `memoize` utility?

### Model Answer
Memoization is an optimization technique where a function caches its return value for a given set of inputs, so repeated calls with the same arguments skip recomputation and return the cached result immediately. It trades memory for speed and is most beneficial for pure functions with expensive computations and frequently repeated inputs.

A basic memoize implementation wraps a function and maintains a cache (typically a `Map` or plain object keyed by the arguments). On each call, it checks if a cached result exists for the given arguments; if so, it returns the cached value; otherwise it computes, stores, and returns the result.

```javascript
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

The key challenge is cache key generation. `JSON.stringify(args)` works for primitive arguments but has limitations: it cannot serialize functions, `Symbol`, `undefined`, circular references, or object references (two different objects with the same shape produce the same key but might be intended as distinct inputs). For object arguments, you may need a more sophisticated key strategy, such as a `WeakMap`-based approach or a serialization library.

Memoization is appropriate when: the function is pure (same inputs always yield same outputs), computation is significantly expensive, and inputs repeat frequently. It is inappropriate when the function has side effects, when results depend on external state that can change, or when the range of inputs is so large that the cache grows unboundedly (causing a memory leak).

In React, `useMemo` and `useCallback` are built-in memoization hooks. `React.memo` memoizes entire component renders. Understanding the underlying concept helps you apply these hooks correctly and avoid premature optimization.

### Key Points
- Memoization caches function results keyed by input arguments to avoid redundant computation
- Only appropriate for pure functions with expensive computation and repeating inputs
- Cache key generation is the main implementation challenge, especially for object arguments
- An unbounded cache is a memory leak risk — consider cache size limits or TTL strategies
- React's `useMemo`, `useCallback`, and `React.memo` are practical applications of memoization

### Follow-up Prompts
- How would you add a cache size limit or TTL (time-to-live) to a memoize implementation?
- What happens if you memoize a function that depends on a closure variable that can change?
- How does React's `useMemo` differ from a general-purpose `memoize` utility?

### Difficulty: intermediate
### Tags: memoization, performance, caching, pure functions, optimization

---

## Q13: What is the iterable protocol in JavaScript?

### Question
Explain JavaScript's iterable and iterator protocols. How do they work, and how can you create a custom iterable?

### Model Answer
JavaScript has two related protocols that define how objects can be iterated: the iterable protocol and the iterator protocol. Together they power `for...of` loops, spread syntax, destructuring, `Array.from`, and generator functions.

An object is iterable if it has a method at the key `Symbol.iterator` that returns an iterator. An iterator is an object with a `next()` method that returns an object with two properties: `value` (the current value) and `done` (a boolean indicating whether iteration is complete). When `done` is `true`, the iteration ends.

Built-in iterables include `Array`, `String`, `Map`, `Set`, `arguments`, `NodeList`, and generator objects. Plain objects `{}` are not iterable by default, which is why `for...of` throws on them.

You can create a custom iterable by implementing `Symbol.iterator`:

```javascript
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      }
    };
  }
};

for (const n of range) console.log(n); // 1, 2, 3, 4, 5
```

Generator functions provide a much more concise way to create iterables. A generator function (marked with `function*`) uses `yield` to produce values one at a time. Calling the generator function returns a generator object that implements both the iterable and iterator protocols.

The iterable protocol enables lazy evaluation — values are computed on demand rather than all at once. This is powerful for potentially infinite sequences or large datasets where you only need a subset of values. `Array.from(iterable)` and spread `[...iterable]` eagerly consume all values, while `for...of` consumes one at a time.

### Key Points
- The iterable protocol requires a `Symbol.iterator` method that returns an iterator
- An iterator has a `next()` method returning `{ value, done }`
- `for...of`, spread, destructuring, and `Array.from` all rely on the iterable protocol
- Built-in iterables: `Array`, `String`, `Map`, `Set`, `arguments`, generator objects
- Generator functions (`function*` with `yield`) create iterables concisely and support lazy evaluation

### Follow-up Prompts
- How would you create an infinite sequence iterable that generates Fibonacci numbers on demand?
- What is the difference between an iterable and an iterator? Can an object be both?
- How does `for...of` differ from `for...in` in terms of the protocols they use?

### Difficulty: intermediate
### Tags: iterable, iterator, Symbol.iterator, generator, for-of, protocol

---

## Q14: What are JavaScript `Symbol`s and when would you use them?

### Question
Explain the `Symbol` primitive type. What problems do Symbols solve, and what are the well-known Symbols?

### Model Answer
`Symbol` is a primitive type introduced in ES6. Every Symbol value is unique and immutable — `Symbol('description') !== Symbol('description')` even with the same description string. This uniqueness makes Symbols ideal as property keys that are guaranteed not to collide with any other key, whether defined by user code, third-party libraries, or the JavaScript runtime itself.

The primary use case for Symbols is defining non-enumerable, non-colliding property keys on objects. When you add a Symbol-keyed property to an object, it will not appear in `for...in` loops, `Object.keys()`, or `JSON.stringify()`. It is only accessible via `Object.getOwnPropertySymbols()` or directly through the stored Symbol reference. This makes Symbols useful for adding metadata or internal bookkeeping to objects without polluting their visible interface.

Well-known Symbols (also called built-in Symbols) are pre-defined Symbol values on the `Symbol` object that JavaScript uses internally to control object behavior. You can override them to customize how your objects interact with language features:

- `Symbol.iterator` — defines the iterable protocol for `for...of`
- `Symbol.toPrimitive` — controls type coercion to primitives
- `Symbol.hasInstance` — customizes `instanceof` behavior
- `Symbol.toStringTag` — customizes `Object.prototype.toString` output
- `Symbol.asyncIterator` — defines async iteration for `for await...of`

`Symbol.for(key)` registers a Symbol in a global registry, allowing the same Symbol to be retrieved across different modules or realms with `Symbol.for(key)`. This is the only way to create Symbols that can be shared without passing the reference directly.

Practical scenarios: unique event names in an event system, hidden object state in class internals, extending built-in objects without risking name clashes, and implementing custom iteration behavior. Symbols strike a balance between the visibility of string keys and the true privacy of `WeakMap`-based approaches.

### Key Points
- Every Symbol is unique — even two Symbols with the same description are not equal
- Symbol-keyed properties are non-enumerable and invisible to `JSON.stringify` and `Object.keys`
- Well-known Symbols (`Symbol.iterator`, `Symbol.toPrimitive`, etc.) let you customize language behavior
- `Symbol.for(key)` creates globally shared Symbols accessible by key across modules
- Use Symbols for collision-proof property keys, internal metadata, and customizing built-in protocols

### Follow-up Prompts
- How would you use `Symbol.toPrimitive` to customize how an object converts to a number or string?
- What is the difference between `Symbol('id')` and `Symbol.for('id')`?
- How can you retrieve all Symbol-keyed properties from an object?

### Difficulty: intermediate
### Tags: Symbol, well-known symbols, Symbol.iterator, property keys, ES6

---

## Q15: What is `structuredClone` and how does it differ from other cloning approaches?

### Question
Explain `structuredClone`. How does it work, what does it support, and how does it compare to `JSON.parse(JSON.stringify())` and manual deep clone implementations?

### Model Answer
`structuredClone` is a global function introduced in modern browsers and Node.js 17 that creates a deep clone of a value using the Structured Clone Algorithm — the same algorithm browsers use internally to transfer data between workers and in IndexedDB. It is the most capable and standards-compliant built-in deep cloning option available today.

Compared to the classic `JSON.parse(JSON.stringify(value))` workaround, `structuredClone` handles many more types correctly. It correctly clones `Date` objects (preserving them as `Date`, not converting to strings), `RegExp`, `Map`, `Set`, `ArrayBuffer`, `TypedArray`, `Blob`, `ImageData`, `Error`, and recursive/circular references. The JSON approach drops `undefined`, functions, and `Symbol` values, turns `Date` into strings, and throws on circular references.

`structuredClone` does have limitations. It cannot clone functions — attempting to clone an object containing a function throws a `DataCloneError`. It also cannot clone DOM nodes, class instances lose their prototype (they become plain objects), and getters/setters are not preserved. So `structuredClone` is ideal for cloning plain data structures but not class instances with behavior.

Manual deep clone implementations (recursive `Object.assign` or `JSON` tricks) are fragile and error-prone. Libraries like Lodash's `_.cloneDeep` handle more edge cases but add bundle weight. `structuredClone` is the best built-in option for data cloning without adding dependencies.

Practical use cases: cloning complex state objects before mutation (for undo history), passing data to Web Workers, and resetting form state to an initial snapshot. For simple flat objects, spread `{ ...obj }` suffices. For nested data without functions, `structuredClone` is the cleanest choice.

### Key Points
- `structuredClone` creates a deep clone using the Structured Clone Algorithm, the same used by IndexedDB and Web Workers
- Correctly handles `Date`, `Map`, `Set`, `RegExp`, `ArrayBuffer`, and circular references — unlike the JSON approach
- Cannot clone functions, DOM nodes, or class prototypes — these throw or are lost
- Class instances lose their prototype; the clone will be a plain object
- Available natively in modern browsers and Node.js 17+ without libraries

### Follow-up Prompts
- What happens when you `structuredClone` an object that contains a class instance with methods?
- How would you deep clone an object containing functions since `structuredClone` cannot?
- Why does Lodash's `_.cloneDeep` still exist if `structuredClone` is available natively?

### Difficulty: intermediate
### Tags: structuredClone, deep clone, Structured Clone Algorithm, JSON, cloning

---

## Q16: What is `AbortController` and how do you use it to cancel async operations?

### Question
Explain `AbortController` and `AbortSignal`. How do you use them to cancel `fetch` requests and other async operations?

### Model Answer
`AbortController` is a browser and Node.js API that provides a mechanism to cancel asynchronous operations, most commonly `fetch` requests. It was introduced to solve the problem of having no standard way to cancel an in-flight HTTP request from JavaScript.

The pattern involves three pieces: `AbortController`, `AbortSignal`, and the consumer that accepts the signal. You create a controller with `const controller = new AbortController()`. The controller has a `signal` property (an `AbortSignal` instance). You pass this signal to `fetch` (or any other cancelable API) as `{ signal: controller.signal }`. When you call `controller.abort()`, the fetch is cancelled and the returned promise rejects with an `AbortError`.

```javascript
const controller = new AbortController();
const { signal } = controller;

fetch('/api/data', { signal })
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('Request was cancelled');
    } else {
      throw err;
    }
  });

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);
```

You can also pass a reason to `abort(reason)`, which becomes available as `signal.reason`. The `signal.aborted` boolean lets you check if cancellation has already occurred. You can listen for the abort event on the signal directly: `signal.addEventListener('abort', handler)`.

`AbortSignal.timeout(ms)` is a convenience method that creates a signal that automatically aborts after a timeout, without needing to manage the controller yourself.

Beyond `fetch`, AbortSignal is increasingly supported across web APIs: `addEventListener` (to auto-remove listeners), `ReadableStream`, and Node.js streams. You can also build your own cancelable async functions by checking `signal.aborted` at checkpoints and calling `signal.throwIfAborted()` to raise the abort error.

### Key Points
- `AbortController` provides `.abort()` to cancel operations; its `.signal` is passed to cancelable APIs
- `fetch` natively supports AbortSignal via the `{ signal }` option and rejects with `AbortError` on cancellation
- Always check `error.name === 'AbortError'` to distinguish cancellations from network errors
- `AbortSignal.timeout(ms)` creates a self-timing signal without needing a controller
- Use `signal.throwIfAborted()` to make your own async functions respect cancellation

### Follow-up Prompts
- How would you implement a React hook that automatically cancels a fetch when the component unmounts?
- How can you combine multiple signals so that either controller aborting cancels the operation?
- What is the difference between `signal.aborted` and `signal.throwIfAborted()`?

### Difficulty: intermediate
### Tags: AbortController, AbortSignal, fetch, cancellation, async, timeout

---

## Q17: What is the `Intl` API and how does it help with internationalization?

### Question
Explain the JavaScript `Intl` object. What formatters does it provide, and why is it preferable to manual formatting?

### Model Answer
The `Intl` object is JavaScript's built-in internationalization API, standardized as part of the ECMAScript Internationalization API Specification. It provides locale-sensitive formatting and comparison for numbers, dates, times, lists, and relative time — all without requiring third-party libraries for common use cases.

`Intl.NumberFormat` formats numbers according to locale conventions. `new Intl.NumberFormat('de-DE').format(1234567.89)` produces `"1.234.567,89"` (German format with period as thousands separator and comma as decimal). You can specify styles like `currency`, `percent`, or `unit`. For currency: `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(9.99)` gives `"$9.99"`.

`Intl.DateTimeFormat` formats dates and times. You can choose which components to show (year, month, day, hour, minute, second) and their format (numeric, long, short, narrow). `new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full' }).format(new Date())` gives a full Korean date string like `"2025년 4월 10일 목요일"`.

`Intl.RelativeTimeFormat` produces human-friendly relative time strings. `new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-1, 'day')` produces `"yesterday"` instead of `"-1 day"`.

`Intl.Collator` enables locale-aware string sorting, which is critical for languages with diacritics or non-ASCII alphabets. `['ä', 'z', 'a'].sort(new Intl.Collator('de').compare)` sorts correctly according to German alphabetical order.

`Intl.ListFormat` formats arrays into natural-language lists. `new Intl.ListFormat('en', { type: 'conjunction' }).format(['apples', 'bananas', 'oranges'])` gives `"apples, bananas, and oranges"`.

Using `Intl` is preferable to manual formatting because it is built into the runtime, handles edge cases that are impossible to anticipate (right-to-left languages, plural forms, calendar systems), and stays updated as locale data evolves.

### Key Points
- `Intl.NumberFormat` handles locale-aware number, currency, and percentage formatting
- `Intl.DateTimeFormat` handles locale-aware date and time formatting with component control
- `Intl.RelativeTimeFormat` produces natural-language relative time (yesterday, 3 hours ago)
- `Intl.Collator` enables correct locale-sensitive string sorting
- `Intl.ListFormat` formats arrays into natural conjunctions or disjunctions

### Follow-up Prompts
- How would you format a price in Japanese Yen using `Intl.NumberFormat`?
- How does `Intl.PluralRules` help when building strings like "1 item" vs "5 items"?
- What are the performance implications of creating `Intl` formatter instances on every render?

### Difficulty: intermediate
### Tags: Intl, internationalization, i18n, locale, formatting, NumberFormat, DateTimeFormat

---

## Q18: What are the differences between `localStorage`, `sessionStorage`, and `IndexedDB`?

### Question
Compare Web Storage APIs: `localStorage`, `sessionStorage`, and `IndexedDB`. When would you choose each, and what are their limitations?

### Model Answer
`localStorage` and `sessionStorage` are part of the Web Storage API. Both store key-value pairs where both keys and values must be strings (non-strings are coerced via `.toString()`). The fundamental difference is persistence: `localStorage` persists indefinitely until explicitly cleared by code or the user, surviving browser restarts and tab closures. `sessionStorage` exists only for the duration of the page session — it is cleared when the tab or browser window is closed.

`localStorage` is also shared across all tabs and windows of the same origin, making it suitable for user preferences, theme settings, or authentication tokens that should be consistent everywhere. `sessionStorage` is isolated per tab, making it useful for wizard step data or unsaved form input that should not carry over to other tabs.

Both are synchronous APIs, which means large reads or writes can block the main thread. They have a storage limit of roughly 5–10 MB per origin (browser-dependent) and only store strings. Attempting to store complex objects requires `JSON.stringify` on write and `JSON.parse` on read, and this loses `Date`, functions, and circular references.

`IndexedDB` is a much more capable client-side database. It stores structured data including files and blobs, has no practical storage limit (browser may prompt the user for large amounts), supports transactions, indexes, cursors, and complex queries. It is asynchronous and non-blocking. However, its native API is verbose and callback-based, which is why libraries like Dexie.js are commonly used as wrappers.

Choose `localStorage` for simple, small, persistent key-value data (preferences, settings). Choose `sessionStorage` for temporary per-tab data. Choose `IndexedDB` for large datasets, structured data, offline-capable apps, or anything requiring query capability. For very sensitive data like auth tokens, consider cookies with `HttpOnly` flag instead of any Web Storage API.

### Key Points
- `localStorage` persists across sessions and is shared across tabs of the same origin; `sessionStorage` is per-tab and cleared on close
- Both Web Storage APIs are synchronous, limited to ~5–10 MB, and require string values
- `IndexedDB` is asynchronous, has larger storage limits, and supports structured data, transactions, and indexes
- Neither `localStorage` nor `sessionStorage` is secure for sensitive tokens — prefer `HttpOnly` cookies
- Libraries like Dexie.js simplify the verbose IndexedDB API

### Follow-up Prompts
- How would you synchronize `localStorage` changes across multiple browser tabs?
- What are the security risks of storing JWTs in `localStorage` versus `HttpOnly` cookies?
- How does the browser's storage quota system work for IndexedDB?

### Difficulty: intermediate
### Tags: localStorage, sessionStorage, IndexedDB, Web Storage, persistence, client-side storage

---

## Q19: What is `requestAnimationFrame` and why is it preferred over `setTimeout` for animations?

### Question
Explain `requestAnimationFrame`. How does it work, why is it better than timer-based animations, and how do you implement an animation loop with it?

### Model Answer
`requestAnimationFrame` (rAF) is a browser API that schedules a callback to run before the next browser repaint. Instead of running on a fixed timer interval, it synchronizes with the browser's display refresh rate — typically 60 Hz (16.67 ms per frame) but adaptively matching 90 Hz, 120 Hz, or higher displays on modern hardware.

The key advantage over `setTimeout` and `setInterval` is that rAF is tied to the actual rendering cycle. `setInterval(animate, 16)` fires approximately every 16 ms regardless of whether the browser is ready to paint, which can cause animations to paint mid-frame (tearing) or skip frames. `requestAnimationFrame` ensures the callback runs at exactly the right moment — after layout and before painting — producing visually smooth animations.

Additional benefits: the callback receives a high-resolution timestamp (in milliseconds) as its argument, allowing frame-rate-independent animation by computing how much time has passed since the last frame. When the tab is hidden or minimized, rAF automatically pauses, saving CPU and battery — `setInterval` continues firing even on hidden tabs.

A basic animation loop:

```javascript
let startTime = null;

function animate(timestamp) {
  if (!startTime) startTime = timestamp;
  const elapsed = timestamp - startTime;

  // move element based on elapsed time, not frame count
  element.style.transform = `translateX(${elapsed * 0.1}px)`;

  if (elapsed < 2000) {
    requestAnimationFrame(animate); // schedule next frame
  }
}

requestAnimationFrame(animate);
```

To cancel a pending rAF callback, save the returned ID and call `cancelAnimationFrame(id)`. This is important in React components to cancel animations on unmount.

CSS transitions and animations should be preferred over JavaScript rAF when possible, as they can run on the compositor thread and bypass main thread congestion. rAF is best for complex, JavaScript-driven animations where CSS alone is insufficient.

### Key Points
- `requestAnimationFrame` schedules a callback before the next browser repaint, synchronized with the display refresh rate
- Produces smoother animations than `setInterval` by avoiding mid-frame paints and adapting to display Hz
- Automatically pauses when the tab is hidden, saving CPU and battery
- The callback receives a high-resolution timestamp — use elapsed time, not frame count, for frame-rate-independent animation
- Cancel with `cancelAnimationFrame(id)`; prefer CSS animations for simple transitions

### Follow-up Prompts
- How would you implement a frame-rate cap (e.g., max 30 fps) using `requestAnimationFrame`?
- Why is using the timestamp argument for animation position more reliable than counting frames?
- How do CSS animations differ from rAF-based animations in terms of which thread executes them?

### Difficulty: intermediate
### Tags: requestAnimationFrame, animation, performance, browser rendering, setTimeout, rAF

---

## Q20: How does JavaScript handle asynchronous iteration with `for await...of`?

### Question
Explain async iteration in JavaScript. What is `Symbol.asyncIterator`, how does `for await...of` work, and what are practical use cases?

### Model Answer
Async iteration extends the synchronous iterator protocol to handle values that arrive asynchronously. The async iterable protocol requires a `Symbol.asyncIterator` method that returns an async iterator — an object whose `next()` method returns a Promise that resolves to `{ value, done }` rather than the object directly.

`for await...of` is the consumption side of this protocol. It is syntactic sugar that calls `Symbol.asyncIterator` on the target, then repeatedly calls `next()` and awaits each resulting Promise before proceeding to the next iteration. It can only be used inside `async` functions (or at the top level of ES modules).

Async generators (`async function*`) are the most convenient way to create async iterables. Using `yield` inside an async generator produces values that are wrapped in Promises automatically:

```javascript
async function* fetchPages(urls) {
  for (const url of urls) {
    const response = await fetch(url);
    const data = await response.json();
    yield data;
  }
}

async function processAll() {
  for await (const page of fetchPages(urlList)) {
    console.log(page);
  }
}
```

Practical use cases include: consuming paginated APIs where each page requires a network request, reading streams of data (Node.js `ReadableStream` implements `Symbol.asyncIterator`), processing real-time data feeds (WebSocket messages, Server-Sent Events), and reading files line by line in Node.js.

Node.js Readable streams implement `Symbol.asyncIterator`, so you can write `for await (const chunk of readableStream)` without manual event listener management. This dramatically simplifies stream consumption code.

Error handling in async iteration works with standard `try/catch` inside or around the `for await...of` loop. The `finally` block is guaranteed to run even if iteration is interrupted, making cleanup reliable.

### Key Points
- `Symbol.asyncIterator` defines the async iterable protocol; `next()` returns a Promise of `{ value, done }`
- `for await...of` awaits each value in sequence and requires an `async` function context
- Async generators (`async function*` with `yield`) are the easiest way to produce async iterables
- Node.js Readable streams implement `Symbol.asyncIterator` natively for convenient consumption
- Use cases: paginated APIs, streams, real-time feeds, file reading line by line

### Follow-up Prompts
- How would you implement an async iterable that polls an API every second and yields new results?
- What happens if you use `break` inside a `for await...of` loop — is the iterator properly cleaned up?
- How does async iteration compare to using `Promise.all` for processing a list of async operations?

### Difficulty: intermediate
### Tags: async iteration, Symbol.asyncIterator, for-await-of, async generator, streams

---
