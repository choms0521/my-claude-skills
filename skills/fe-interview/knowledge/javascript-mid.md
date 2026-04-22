# JavaScript - Mid-Level Interview Questions
### Language: en

## Q1: How does prototypal inheritance work in JavaScript?

### Question
Explain prototypal inheritance in JavaScript. How does the prototype chain work, and how does it differ from classical inheritance in languages like Java or C++?

### Model Answer
JavaScript uses prototypal inheritance, which is fundamentally different from the class-based inheritance found in languages like Java or C++. Every object in JavaScript has an internal link to another object called its prototype. When you access a property or method on an object, JavaScript first looks at the object itself. If it is not found, it traverses up the prototype chain until it finds the property or reaches the end of the chain (`null`).

```javascript
const animal = {
  breathe() { return 'breathing'; }
};

const dog = Object.create(animal);
dog.bark = function() { return 'woof'; };

console.log(dog.bark());    // 'woof' — own property
console.log(dog.breathe()); // 'breathing' — found on prototype
console.log(dog.__proto__ === animal); // true
```

Constructor functions and the `new` keyword are the traditional way to set up prototype chains:

```javascript
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a noise.`;
};

function Dog(name) {
  Animal.call(this, name); // call parent constructor
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.bark = function() { return 'woof'; };

const d = new Dog('Rex');
console.log(d.speak()); // 'Rex makes a noise.'
console.log(d.bark());  // 'woof'
```

ES6 `class` syntax is syntactic sugar over the same prototype-based mechanism:

```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a noise.`; }
}

class Dog extends Animal {
  bark() { return 'woof'; }
}
```

The key difference from classical inheritance: in prototypal inheritance, objects inherit directly from other objects (a flat, more flexible model). In classical inheritance, classes define blueprints and instances are created from those blueprints. JavaScript's model allows runtime modification of prototypes, property shadowing, and mixin patterns that are awkward in class-based languages.

### Key Points
- Every JavaScript object has a prototype chain; property lookup traverses the chain until `null`
- `Object.create(proto)` is the clearest way to set up prototypal delegation
- Constructor functions + `.prototype` and ES6 `class` are two syntaxes for the same underlying prototype mechanism
- Prototype modification at runtime affects all instances that share the prototype — powerful but dangerous
- Properties on instances shadow (override) same-named properties on prototypes

### Follow-up Prompts
- What is the difference between `__proto__`, `Object.getPrototypeOf()`, and `.prototype`?
- How do mixins work with prototypal inheritance in JavaScript?
- What are the performance implications of deeply nested prototype chains?

### Difficulty: intermediate
### Tags: prototypal inheritance, prototype chain, Object.create, class, constructor functions

---

## Q2: Explain the `this` keyword deeply — how is it determined?

### Question
How is the value of `this` determined in JavaScript? Walk through all the binding rules and explain what happens with nested functions and callbacks.

### Model Answer
The value of `this` in JavaScript is not determined by where a function is defined, but by how it is called. There are four main binding rules, applied in order of precedence.

**1. New binding** — when a function is called with `new`, `this` is the newly created object:
```javascript
function Person(name) { this.name = name; }
const p = new Person('Alice'); // this === p
```

**2. Explicit binding** — `call`, `apply`, or `bind` explicitly set `this`:
```javascript
function greet() { return `Hello, ${this.name}`; }
greet.call({ name: 'Bob' });    // 'Hello, Bob'
greet.apply({ name: 'Carol' }); // 'Hello, Carol'
const boundGreet = greet.bind({ name: 'Dave' });
boundGreet(); // 'Hello, Dave'
```

**3. Implicit binding** — when a function is called as a method of an object, `this` is that object:
```javascript
const obj = {
  name: 'Eve',
  greet() { return `Hello, ${this.name}`; }
};
obj.greet(); // 'Hello, Eve' — this === obj
```

**4. Default binding** — in all other cases, `this` is the global object (`window` in browsers, `global` in Node.js) or `undefined` in strict mode:
```javascript
function greet() { return this; }
greet(); // window or undefined (strict)
```

A common pitfall is implicit binding loss — when a method is detached from its object:
```javascript
const obj = { name: 'Eve', greet() { return this.name; } };
const detached = obj.greet;
detached(); // undefined — lost implicit binding
```

Arrow functions do not follow these rules — they capture `this` lexically from the enclosing scope at definition time and it cannot be changed with `call`, `apply`, or `bind`.

```javascript
const obj = {
  name: 'Eve',
  greetLater() {
    setTimeout(() => console.log(this.name), 100); // 'Eve' — lexical this
    setTimeout(function() { console.log(this.name); }, 100); // undefined — lost
  }
};
obj.greetLater();
```

### Key Points
- `this` is determined at call time, not at definition time (except for arrow functions)
- Four rules in order of precedence: new > explicit (call/apply/bind) > implicit (method call) > default (global/undefined)
- Implicit binding is lost when a method is assigned to a variable or passed as a callback
- Arrow functions capture `this` lexically and ignore all four binding rules

### Follow-up Prompts
- What does `bind` return and why would you create bound functions in advance?
- How does `this` work inside class methods vs. arrow function class fields?
- What is the value of `this` inside a `setTimeout` callback versus an arrow function callback?

### Difficulty: intermediate
### Tags: this keyword, binding rules, call apply bind, arrow functions, implicit binding, lexical this

---

## Q3: What are Promises and how does async/await work under the hood?

### Question
Explain Promises in JavaScript — their states and chaining. Then explain how `async/await` is built on top of Promises and what it compiles to.

### Model Answer
A Promise is an object representing the eventual completion or failure of an asynchronous operation. A Promise is in one of three states: `pending` (initial), `fulfilled` (resolved with a value), or `rejected` (failed with a reason). Once settled (fulfilled or rejected), a Promise's state is immutable.

```javascript
const p = new Promise((resolve, reject) => {
  setTimeout(() => {
    if (Math.random() > 0.5) resolve('success');
    else reject(new Error('failure'));
  }, 1000);
});

p
  .then(value => console.log('Resolved:', value))
  .catch(err => console.error('Rejected:', err))
  .finally(() => console.log('Always runs'));
```

Promises can be chained because `.then()` always returns a new Promise. If the handler returns a value, the next Promise resolves with that value. If it returns a Promise, the chain waits for it.

```javascript
fetch('/api/user')
  .then(res => res.json())         // returns Promise
  .then(user => fetch(`/api/posts/${user.id}`))
  .then(res => res.json())
  .then(posts => console.log(posts))
  .catch(err => console.error(err));
```

`async/await` is syntactic sugar over Promises. An `async` function always returns a Promise. The `await` keyword pauses execution of the async function until the awaited Promise settles, then resumes with the resolved value. Under the hood, the JavaScript engine transforms `async/await` into Promise chains.

```javascript
async function loadUserPosts(userId) {
  try {
    const userRes = await fetch(`/api/user/${userId}`);
    const user = await userRes.json();
    const postsRes = await fetch(`/api/posts/${user.id}`);
    return await postsRes.json();
  } catch (err) {
    console.error('Failed to load:', err);
    throw err;
  }
}
```

This is equivalent to the chained `.then()` example above but reads linearly, making it easier to reason about. Error handling uses familiar `try/catch` rather than `.catch()`.

For parallel async operations, use `Promise.all()` rather than sequential `await`:

```javascript
// Sequential — slower
const user = await fetchUser(id);
const posts = await fetchPosts(id);

// Parallel — faster
const [user, posts] = await Promise.all([fetchUser(id), fetchPosts(id)]);
```

### Key Points
- Promises have three states: pending, fulfilled, rejected — state is immutable once settled
- `.then()` returns a new Promise enabling chaining; errors propagate to the nearest `.catch()`
- `async` functions always return a Promise; `await` suspends the function until the Promise settles
- `async/await` is syntactic sugar — it compiles to Promise chains under the hood
- Use `Promise.all()` for concurrent operations instead of sequential `await` calls

### Follow-up Prompts
- What is the difference between `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`?
- How do you handle errors in Promise chains vs. async/await, and what are the tradeoffs?
- Can `await` be used outside of an `async` function in modern JavaScript?

### Difficulty: intermediate
### Tags: promises, async/await, asynchronous, event loop, microtask, Promise.all

---

## Q4: What is event delegation and why is it useful?

### Question
What is event delegation? Explain how it works using event bubbling, and describe the performance benefits it provides compared to attaching individual event listeners.

### Model Answer
Event delegation is a pattern where instead of attaching event listeners to every individual child element, you attach a single listener to a parent (or ancestor) element. When an event occurs on a child, it bubbles up through the DOM to the parent, where your listener handles it. You then inspect `event.target` to determine which specific child was interacted with.

Event bubbling is the mechanism that makes delegation possible: most DOM events (click, keyup, input, etc.) propagate from the target element up through its ancestors to the document root, firing on each element along the way.

```html
<ul id="menu">
  <li data-id="1">Item 1</li>
  <li data-id="2">Item 2</li>
  <li data-id="3">Item 3</li>
</ul>
```

Without delegation — attaching listeners to each `<li>`:
```javascript
document.querySelectorAll('#menu li').forEach(li => {
  li.addEventListener('click', e => console.log(e.target.dataset.id));
});
```

With delegation — one listener on the parent:
```javascript
document.getElementById('menu').addEventListener('click', e => {
  const li = e.target.closest('li');
  if (li) console.log(li.dataset.id);
});
```

The performance benefits are significant:
- **Memory**: one listener instead of N listeners, each listener object has memory overhead
- **Dynamic elements**: new `<li>` elements added later automatically work without re-attaching listeners
- **Setup time**: one `addEventListener` call is faster than N calls, especially for large lists

The `closest()` method is useful in delegation handlers because `e.target` may be a deep descendant (e.g., a `<span>` inside an `<li>`). `closest(selector)` traverses up from `e.target` until it finds a matching ancestor.

Be aware that not all events bubble — `focus`, `blur`, and `scroll` do not bubble (though `focusin` and `focusout` do). Also, delegation can be less efficient if your selector matching is expensive, or if events fire very frequently (like `mousemove`).

### Key Points
- Event delegation attaches one listener to a parent rather than individual listeners on each child
- It relies on event bubbling — events propagate from target up through ancestors
- Benefits: less memory, supports dynamically added elements, simpler setup/teardown
- Use `event.target.closest(selector)` to find the intended target even when the event fires on a child element
- Not all events bubble; `focus` and `blur` are common non-bubbling events

### Follow-up Prompts
- How does `event.stopPropagation()` affect delegation, and when would you need to use it?
- What is the difference between `event.target` and `event.currentTarget`?
- How would you implement a delegated event system from scratch (like jQuery's `.on()`)?

### Difficulty: intermediate
### Tags: event delegation, event bubbling, event listeners, performance, closest, target

---

## Q5: How can closures cause memory leaks?

### Question
Explain how closures can cause memory leaks in JavaScript. Give a concrete example, and describe how to identify and fix such leaks.

### Model Answer
Closures cause memory leaks when a function retains a reference to a large object or DOM element that should have been garbage collected. Because closures hold references to their outer scope's variables, the garbage collector cannot reclaim those values as long as the closure exists.

A classic leak pattern involves event listeners and DOM elements:

```javascript
function setup() {
  const largeData = new Array(1000000).fill('x'); // large allocation

  const button = document.getElementById('btn');
  button.addEventListener('click', function handler() {
    // This closure captures largeData even if it never uses it
    console.log('clicked');
  });
  // If button is removed from DOM but handler is not removed,
  // largeData cannot be GC'd because handler still references it
}
```

Even if `largeData` is never used in the handler, the JavaScript engine may keep the entire closure scope alive. This is because the closure's scope environment is shared — the engine cannot always determine which variables are actually needed.

Another common pattern is storing closures in global or long-lived data structures:

```javascript
const cache = {};

function createHandler(id) {
  const bigResource = loadResource(id); // large object
  cache[id] = function() {
    return bigResource.process();
  };
  // cache[id] lives forever, so bigResource is never GC'd
}
```

How to fix and prevent closure memory leaks:

1. **Remove event listeners** when elements are destroyed or components are unmounted:
```javascript
const handler = () => console.log('clicked');
button.addEventListener('click', handler);
// Later:
button.removeEventListener('click', handler);
```

2. **Nullify large references** when no longer needed:
```javascript
function setup() {
  let largeData = loadData();
  return function process() {
    const result = transform(largeData);
    largeData = null; // release after use
    return result;
  };
}
```

3. **Use WeakMap/WeakRef** for caches that should not prevent GC.

4. **Profile with DevTools**: Chrome's Memory tab, heap snapshots, and allocation timelines can pinpoint retained objects.

### Key Points
- Closures prevent garbage collection of their captured variables as long as the closure itself is reachable
- DOM event listeners are a major source of leaks when elements are removed without removing listeners
- Storing closures in global caches without a cleanup strategy causes long-term memory growth
- Fix by removing listeners, nullifying references, using WeakMap, or limiting closure scope to only what is needed
- Use browser DevTools heap snapshots to identify objects that should have been GC'd but weren't

### Follow-up Prompts
- How does `WeakMap` help prevent memory leaks compared to `Map`?
- In a React application, what is the equivalent of removing event listeners and how does it prevent leaks?
- How do you use Chrome DevTools to take a heap snapshot and identify a memory leak?

### Difficulty: intermediate
### Tags: memory leaks, closures, garbage collection, event listeners, WeakMap, performance

---

## Q6: What are WeakMap and WeakSet and when would you use them?

### Question
What are `WeakMap` and `WeakSet` in JavaScript? How do they differ from `Map` and `Set`, and what problems do they solve?

### Model Answer
`WeakMap` and `WeakSet` are collection types that hold weak references to their keys (WeakMap) or values (WeakSet). "Weak" means that if the only remaining reference to an object is through a `WeakMap` or `WeakSet`, the object can be garbage collected. This is the critical difference from `Map` and `Set`, which hold strong references.

`WeakMap` accepts only objects as keys and associates values with them:

```javascript
const cache = new WeakMap();

function process(obj) {
  if (cache.has(obj)) return cache.get(obj);
  const result = expensiveComputation(obj);
  cache.set(obj, result);
  return result;
}
```

When `obj` is no longer referenced anywhere else in the program, it becomes eligible for garbage collection, and its entry in the cache is automatically removed. With a regular `Map`, the cache entry would permanently prevent GC.

`WeakSet` holds only objects and is useful for tracking membership without preventing GC:

```javascript
const seen = new WeakSet();

function processOnce(element) {
  if (seen.has(element)) return;
  seen.add(element);
  doWork(element);
}
```

Key limitations: `WeakMap` and `WeakSet` are not enumerable — you cannot iterate over them or get their size. This is by design, because the GC could remove entries at any time, making enumeration non-deterministic.

Use cases:
- **Caching/memoization** keyed on objects without preventing GC (WeakMap)
- **Private data** for class instances using WeakMap instead of underscore-prefixed properties
- **Tracking visited/processed DOM nodes** without holding references after the nodes are removed (WeakSet)
- **Avoiding circular reference leaks** in data structures keyed by DOM elements

```javascript
// Private data pattern
const _private = new WeakMap();

class Person {
  constructor(name, age) {
    _private.set(this, { name, age });
  }
  getName() { return _private.get(this).name; }
}
```

### Key Points
- `WeakMap`/`WeakSet` hold weak references — entries can be GC'd when the key/value is otherwise unreachable
- They are not enumerable (no `.forEach`, no `.size`, no iteration) — by design for GC correctness
- Primary use cases: object-keyed caches, private instance data, membership tracking without preventing GC
- `WeakRef` (ES2021) is the lower-level primitive for individual weak references

### Follow-up Prompts
- How would you implement a memoization cache using WeakMap that avoids memory leaks?
- Why can WeakMap only use objects as keys, not primitives?
- What is `FinalizationRegistry` and how does it relate to WeakRef?

### Difficulty: intermediate
### Tags: WeakMap, WeakSet, garbage collection, memory management, Map, Set, weak references

---

## Q7: What are generators and what problems do they solve?

### Question
What are JavaScript generator functions? Explain how `yield` works, and describe practical use cases where generators are more appropriate than alternatives.

### Model Answer
Generators are a special type of function that can pause execution and resume it later. They are declared with `function*` syntax and use the `yield` keyword to pause and return a value. Each time the generator's `.next()` method is called, it resumes from where it left off.

```javascript
function* counter(start = 0) {
  let n = start;
  while (true) {
    yield n++;
  }
}

const gen = counter(1);
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
```

The generator maintains its state between calls. When `yield` is encountered, the function pauses and returns `{ value, done: false }`. When the function returns, it yields `{ value: undefined, done: true }`.

Generators implement the iterator protocol, making them usable with `for...of`, spread, and destructuring:

```javascript
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) yield i;
}

console.log([...range(0, 10, 2)]); // [0, 2, 4, 6, 8]
```

Practical use cases:

**Lazy evaluation** — generate potentially infinite sequences without computing all values upfront:
```javascript
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}
```

**Async control flow** — libraries like Redux-Saga use generators to describe async workflows as readable sequences:
```javascript
// Redux-Saga style
function* fetchUser(id) {
  const user = yield call(api.getUser, id);
  yield put(setUser(user));
}
```

**Custom iterators** — implement complex traversal logic (e.g., tree traversal) as a simple generator instead of maintaining explicit stack state.

**Two-way communication** — `next(value)` can send a value INTO a paused generator via the `yield` expression result:
```javascript
function* accumulator() {
  let total = 0;
  while (true) {
    total += yield total;
  }
}
```

### Key Points
- Generator functions (`function*`) can pause at `yield` and resume with `.next()`
- Each `.next()` call returns `{ value, done }` — `done` becomes `true` when the function returns
- Generators implement the iterator protocol, so they work with `for...of`, spread, and destructuring
- Key use cases: lazy infinite sequences, custom iterators, controlled async workflows (Redux-Saga)
- Two-way data flow is possible: `next(value)` passes a value back in; the `yield` expression evaluates to that value

### Follow-up Prompts
- How does `yield*` differ from `yield`, and when would you use it?
- How does Redux-Saga use generators to handle async side effects, and why does it prefer generators over async/await?
- Can you implement an async iterator using generators?

### Difficulty: intermediate
### Tags: generators, yield, iterators, lazy evaluation, infinite sequences, Redux-Saga

---

## Q8: What are Proxy and Reflect and what can you build with them?

### Question
What are `Proxy` and `Reflect` in JavaScript? Explain the concept of traps and describe practical use cases for these features.

### Model Answer
`Proxy` is an object that wraps another object (the target) and intercepts fundamental operations on it — property access, assignment, function calls, `in` operator, and more. The interception points are called traps, which are methods on a handler object you provide. `Reflect` provides methods that mirror the default behavior for each proxy trap, making it easy to implement traps that extend rather than replace the default behavior.

Basic proxy example:

```javascript
const target = { name: 'Alice', age: 30 };

const handler = {
  get(target, prop, receiver) {
    console.log(`Getting ${prop}`);
    return Reflect.get(target, prop, receiver); // default behavior
  },
  set(target, prop, value, receiver) {
    if (prop === 'age' && typeof value !== 'number') {
      throw new TypeError('age must be a number');
    }
    return Reflect.set(target, prop, value, receiver);
  }
};

const proxy = new Proxy(target, handler);
proxy.name;      // logs 'Getting name', returns 'Alice'
proxy.age = 'x'; // throws TypeError
```

Practical use cases:

**Validation**: enforce type constraints or schema validation on object writes (shown above).

**Reactive data** — Vue 3, MobX, and Valtio use Proxy to detect property access and mutation to automatically trigger UI updates:
```javascript
function reactive(obj) {
  return new Proxy(obj, {
    set(target, prop, value) {
      const result = Reflect.set(target, prop, value);
      notifySubscribers(prop); // trigger re-render
      return result;
    }
  });
}
```

**Default values / virtual properties** — return defaults for missing keys:
```javascript
const withDefaults = new Proxy({}, {
  get(target, prop) {
    return prop in target ? target[prop] : 'default';
  }
});
```

**Logging/debugging** — transparently log all property access and mutations.

**API mocking** — intercept function calls to return fixtures:
```javascript
const mockApi = new Proxy({}, {
  get(_, method) {
    return (...args) => Promise.resolve(fixtures[method](...args));
  }
});
```

`Reflect` is useful even without `Proxy` — it provides a functional way to perform object operations that were previously spread across `Object`, function methods, and operators.

### Key Points
- `Proxy` wraps an object and intercepts operations via handler traps (`get`, `set`, `apply`, `has`, `deleteProperty`, etc.)
- `Reflect` provides default implementations for each trap — always use `Reflect` inside traps to preserve correct behavior
- Major use cases: validation, reactive state (Vue 3), default values, logging, API mocking
- Proxy adds overhead — avoid using it on performance-critical hot paths
- Proxies are not equal to their targets (`proxy !== target`) — be careful in code that uses reference equality

### Follow-up Prompts
- How does Vue 3's reactivity system use Proxy differently from Vue 2's `Object.defineProperty`-based approach?
- What traps are available on Proxy and which operations do they intercept?
- How would you implement a deeply reactive (nested) proxy?

### Difficulty: intermediate
### Tags: Proxy, Reflect, metaprogramming, reactive, validation, traps, Vue 3

---

## Q9: What are the differences between ES Modules (ESM) and CommonJS (CJS)?

### Question
Compare ES Modules (ESM) and CommonJS (CJS). How do they differ in syntax, loading behavior, and interoperability? When would you choose one over the other?

### Model Answer
CommonJS (CJS) is Node.js's original module system, while ES Modules (ESM) is the standardized module format built into the JavaScript specification (ES2015). Both allow you to split code across files, but they differ substantially in design, loading behavior, and compatibility.

**Syntax differences:**

CommonJS uses `require()` and `module.exports`:
```javascript
// math.js (CJS)
function add(a, b) { return a + b; }
module.exports = { add };

// app.js (CJS)
const { add } = require('./math');
```

ESM uses `import` and `export` statements:
```javascript
// math.js (ESM)
export function add(a, b) { return a + b; }

// app.js (ESM)
import { add } from './math.js';
```

**Loading behavior:**

CJS `require()` is synchronous — the module is loaded, executed, and returned immediately. This works fine in Node.js but cannot work in browsers (which need async loading for network resources).

ESM is asynchronous by design. Imports are statically analyzed before execution — the module graph is fully resolved (all imports found and loaded) before any module code runs. This enables:
- **Tree shaking**: bundlers can statically determine which exports are used and eliminate dead code
- **Top-level `await`**: ESM modules can use `await` at the top level (CJS cannot)
- **Circular dependency handling**: ESM has better-defined behavior for circular imports

**Live bindings vs. value copies:**

ESM exports are live bindings — if a module updates an exported variable, importers see the updated value. CJS exports are copied at require time.

```javascript
// counter.mjs (ESM)
export let count = 0;
export function increment() { count++; }

// app.mjs
import { count, increment } from './counter.mjs';
increment();
console.log(count); // 1 — live binding, sees the update
```

**Interoperability:**

In Node.js, ESM can import CJS (CJS default export becomes the ESM default import). CJS cannot `require()` ESM files directly — you must use dynamic `import()` instead. This asymmetry is a source of friction in the ecosystem.

**Choosing between them:**

Use ESM for new projects — it is the standard, supported by all modern browsers and modern Node.js. Use CJS when maintaining existing Node.js libraries that need broad compatibility, or when working in a CJS-only environment.

### Key Points
- CJS uses `require()`/`module.exports`; ESM uses `import`/`export` — syntax is not interchangeable
- CJS loading is synchronous; ESM loading is asynchronous and statically analyzable
- ESM enables tree shaking, top-level await, and has better-defined circular dependency semantics
- ESM exports are live bindings; CJS exports are copies of values at require time
- In Node.js, ESM can import CJS but CJS cannot `require()` ESM (use dynamic `import()` instead)

### Follow-up Prompts
- How do you configure a Node.js project to use ESM (package.json `type` field, `.mjs` extension)?
- How does tree shaking work in a bundler like webpack or Rollup, and why does it require ESM?
- What is dynamic `import()` and how does it differ from static `import` declarations?

### Difficulty: intermediate
### Tags: ESM, CommonJS, modules, import, export, require, tree shaking, Node.js

---

## Q10: What are best practices for error handling in JavaScript?

### Question
What are the patterns and best practices for handling errors in JavaScript? Cover synchronous errors, Promise rejections, async/await errors, and global error handling.

### Model Answer
Robust error handling is essential for production JavaScript. Poorly handled errors lead to silent failures, confusing user experiences, and difficult debugging. Best practices span several areas.

**Synchronous errors** — use `try/catch` and always throw `Error` objects (not strings), because `Error` objects include a stack trace:

```javascript
function parseConfig(json) {
  try {
    return JSON.parse(json);
  } catch (err) {
    // Wrap with context — preserves original error
    throw new Error(`Failed to parse config: ${err.message}`);
  }
}
```

**Custom error types** — subclass `Error` to create domain-specific errors that can be caught selectively:

```javascript
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

try {
  validate(input);
} catch (err) {
  if (err instanceof ValidationError) {
    showFieldError(err.field, err.message);
  } else {
    throw err; // re-throw unexpected errors
  }
}
```

**Promise rejections** — always attach `.catch()` handlers. An unhandled Promise rejection will crash Node.js (versions 15+) and log warnings in browsers:

```javascript
fetchData()
  .then(process)
  .catch(err => {
    logger.error('fetchData failed', err);
    // decide whether to recover or re-throw
  });
```

**async/await** — use `try/catch` blocks. Be careful not to swallow errors silently:

```javascript
async function loadUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    logger.error('loadUser failed:', err);
    throw err; // re-throw so callers can handle it
  }
}
```

**Global error handling** — catch unhandled errors as a last resort safety net:

```javascript
// Browser
window.addEventListener('error', event => logger.error(event.error));
window.addEventListener('unhandledrejection', event => logger.error(event.reason));

// Node.js
process.on('uncaughtException', err => { logger.fatal(err); process.exit(1); });
process.on('unhandledRejection', reason => logger.error(reason));
```

**Avoid** empty `catch` blocks (swallowing errors), `catch` that catches then re-throws without adding context, and throwing non-Error values.

### Key Points
- Always throw `Error` objects, not strings — `Error` includes a stack trace
- Create custom error subclasses for domain-specific errors to enable selective catching
- Attach `.catch()` to every Promise chain; unhandled rejections crash Node.js 15+
- In async/await, use `try/catch` and re-throw errors unless you are intentionally recovering
- Register global error handlers (`window.onerror`, `unhandledrejection`, `process.on`) as a last-resort safety net

### Follow-up Prompts
- How do you implement a global error boundary in React, and how does it relate to JavaScript's try/catch?
- What is the `cause` property on `Error` (ES2022) and how does it help with error chaining?
- How would you design error handling for a multi-layered application (API layer, service layer, data layer)?

### Difficulty: intermediate
### Tags: error handling, try catch, custom errors, async errors, unhandled rejection, Error class

---
