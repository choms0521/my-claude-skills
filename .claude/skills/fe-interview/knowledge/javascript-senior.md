# JavaScript - Senior Interview Questions
### Language: en

## Q1: How does the V8 JavaScript engine work internally?

### Question
Explain how the V8 JavaScript engine processes and executes JavaScript code. Cover parsing, compilation, and runtime optimization strategies like JIT compilation and hidden classes.

### Model Answer
V8 is Google's open-source JavaScript engine used in Chrome and Node.js. It converts JavaScript source code into machine code through a multi-stage pipeline designed to balance fast startup with peak execution performance.

**Parsing**: V8 first parses source code into an Abstract Syntax Tree (AST). It uses a two-phase parsing strategy for performance: a pre-parser does a quick scan to determine function boundaries and scope without building a full AST. Only when a function is actually called does the full parser build the complete AST for that function (lazy parsing). This reduces startup time significantly.

**Ignition (Bytecode Interpreter)**: The AST is compiled into bytecode by Ignition, V8's interpreter. Ignition executes this bytecode directly and collects profiling information — which functions are called frequently ("hot"), what types of values are passed to them, and what shapes of objects are used.

**TurboFan (Optimizing JIT Compiler)**: When Ignition identifies hot code, it hands it to TurboFan, V8's optimizing just-in-time compiler. TurboFan uses the profiling data to generate highly optimized machine code. Key optimizations include:

- **Inline caching (IC)**: Caches the result of property lookups so repeated access to `obj.x` doesn't re-lookup every time
- **Function inlining**: Replaces function call sites with the function body to eliminate call overhead
- **Type specialization**: If a function always receives numbers, TurboFan generates integer or floating-point machine code rather than generic object handling

**Hidden Classes (Shapes)**: V8 uses hidden classes (also called "maps" or "shapes") to efficiently handle property access on JavaScript objects. When you create an object and add properties, V8 assigns a hidden class. If two objects have the same properties added in the same order, they share the same hidden class, and property access can be as fast as a struct field lookup in C.

If you add properties in inconsistent orders or delete properties, V8 creates new hidden classes and cannot optimize as effectively:

```javascript
// Good: consistent shape
function Point(x, y) { this.x = x; this.y = y; }
const p1 = new Point(1, 2);
const p2 = new Point(3, 4); // same hidden class as p1

// Bad: inconsistent property order (creates different hidden classes)
const a = {}; a.x = 1; a.y = 2;
const b = {}; b.y = 2; b.x = 1;
```

**Deoptimization**: If TurboFan's assumptions are violated (e.g., a function that previously received numbers now receives a string), V8 deoptimizes — discards the optimized code and falls back to Ignition. This is called a "bailout" and can cause performance cliffs.

### Key Points
- V8 uses lazy parsing, bytecode interpretation (Ignition), and JIT compilation (TurboFan) in a pipeline
- Hidden classes enable fast property lookup — maintain consistent object shapes for best performance
- Inline caching and type specialization are key optimizations — breaking type consistency causes deoptimization
- TurboFan can deoptimize (bail out) back to the interpreter if its assumptions are invalidated at runtime
- Understanding V8's optimization heuristics guides practical performance tuning

### Follow-up Prompts
- What specific coding patterns cause V8 to deoptimize, and how do you avoid them?
- How does V8's garbage collector (Orinoco) work and what are its generational phases?
- How do you use the `--trace-opt` and `--trace-deopt` flags in Node.js to diagnose JIT performance?

### Difficulty: advanced
### Tags: V8, JIT compilation, hidden classes, Ignition, TurboFan, performance, engine internals

---

## Q2: How does JavaScript memory management and garbage collection work?

### Question
Describe how JavaScript manages memory. Explain the generational garbage collection strategy, what triggers a GC cycle, and how to write code that minimizes GC pressure.

### Model Answer
JavaScript uses automatic memory management through garbage collection (GC). Memory has two main areas: the stack (for primitive values and references) and the heap (for objects and closures). The GC's job is to reclaim heap memory for objects that are no longer reachable from the program's root set (global variables, call stack, etc.).

**Reachability**: An object is considered reachable if it can be accessed by any path from a root. GC traverses the reference graph from roots and marks everything reachable. Anything not marked is garbage and can be collected.

**Generational Collection**: V8 (and most modern engines) use a generational GC based on the empirical observation that most objects die young. The heap is divided into:

- **Young generation (Nursery)**: Newly allocated objects go here. Minor GC runs frequently on this small space and is fast. Objects that survive several minor GC cycles are promoted to old generation.
- **Old generation**: Long-lived objects. Major GC (full GC or "Mark-Compact") runs less frequently but takes longer.

V8's GC (codenamed Orinoco) uses several techniques to minimize pause times:
- **Incremental marking**: breaks the marking phase into small steps interleaved with JavaScript execution
- **Concurrent marking**: performs marking on background threads while JS runs
- **Parallel scavenging**: uses multiple threads for young generation collection
- **Lazy sweeping**: reclaims old generation memory incrementally rather than all at once

**Writing GC-friendly code**:

Minimize object allocation in hot loops — each allocation potentially puts pressure on the young generation:
```javascript
// Avoid: allocates a new object on every frame
function update() {
  const delta = { x: dx, y: dy }; // new object every call
  move(delta);
}

// Better: reuse a pre-allocated object
const _delta = { x: 0, y: 0 };
function update() {
  _delta.x = dx; _delta.y = dy;
  move(_delta);
}
```

Avoid creating large arrays of short-lived objects. Prefer typed arrays (`Float64Array`, `Int32Array`) for numeric data — they allocate contiguous memory outside the normal object heap and have no GC overhead per element.

Use `WeakMap` and `WeakRef` for caches to allow GC of entries when keys are unreachable. Remove event listeners and clear timers when no longer needed.

### Key Points
- GC reclaims memory for objects unreachable from the root set — ensure you are not accidentally keeping references alive
- Generational GC separates short-lived (young generation) and long-lived (old generation) objects for efficiency
- V8's Orinoco GC uses incremental, concurrent, and parallel techniques to reduce pause times
- Minimize allocations in hot paths — object allocation increases GC frequency and pause duration
- Use typed arrays for numeric data, WeakMap for object-keyed caches, and always clean up listeners/timers

### Follow-up Prompts
- What is a "stop-the-world" GC pause and how do V8's concurrent and incremental techniques reduce it?
- How do you use the Chrome Memory Profiler to identify memory leaks and allocation hot spots?
- What is the difference between a memory leak and a GC pressure problem, and how do you diagnose each?

### Difficulty: advanced
### Tags: garbage collection, memory management, V8, generational GC, Orinoco, performance, memory leaks

---

## Q3: Explain the difference between microtasks and macrotasks in depth.

### Question
Go beyond the basics: explain the complete task scheduling model in browsers. Cover the microtask checkpoint, rendering pipeline integration, `requestAnimationFrame`, and how `queueMicrotask` differs from `Promise.resolve().then()`.

### Model Answer
JavaScript's concurrency model is built on a task scheduling system with multiple queues of different priorities. Understanding the full picture requires going beyond just "microtasks run before macrotasks."

**The Task Model:**

A macrotask (or simply "task") represents a unit of work from an external source: a `setTimeout` callback, a `setInterval` tick, an I/O callback, a `MessageChannel` message, or a user event handler. The browser's event loop picks one task from the task queue per iteration.

After every macrotask completes (and before the next macrotask is picked), the event loop runs the microtask checkpoint: it drains the entire microtask queue to completion. This means if a microtask schedules another microtask, it runs immediately — the queue is fully emptied. Only when the microtask queue is empty does the loop proceed.

Microtasks include: Promise callbacks (`.then`, `.catch`, `.finally`), `queueMicrotask()` callbacks, `MutationObserver` callbacks, and `await` continuations.

```javascript
setTimeout(() => console.log('macrotask 1'), 0);
Promise.resolve().then(() => {
  console.log('microtask 1');
  Promise.resolve().then(() => console.log('microtask 2')); // queued immediately
});
setTimeout(() => console.log('macrotask 2'), 0);

// Output: microtask 1, microtask 2, macrotask 1, macrotask 2
```

**Rendering Pipeline Integration:**

In browsers, the rendering pipeline (style calculation, layout, paint, composite) runs as part of the event loop but only when the browser determines it is time to render — typically at the display's refresh rate (e.g., 60fps = every ~16.7ms). The browser will not render between microtasks or mid-macrotask, only between macrotasks when the rendering opportunity arises.

`requestAnimationFrame` (rAF) callbacks run just before the browser paints — they are executed as part of the rendering update step, not as regular macrotasks. This makes rAF the correct tool for animations.

```
[Task] → [Microtask checkpoint] → [rAF callbacks] → [Render] → [Task] → ...
```

**`queueMicrotask` vs `Promise.resolve().then()`:**

Both schedule a microtask. `queueMicrotask(fn)` is the explicit API for this purpose. It is marginally cleaner (no Promise object allocation, no wrapper). Both have identical priority — neither is "faster" than the other.

```javascript
queueMicrotask(() => console.log('explicit microtask'));
Promise.resolve().then(() => console.log('promise microtask'));
// Order is first-in-first-out within the microtask queue
```

A dangerous edge case: if a microtask keeps queuing new microtasks infinitely, the microtask queue never empties and the browser's rendering is starved — effectively a hang.

### Key Points
- After every macrotask, the entire microtask queue is drained before the next macrotask is picked — including microtasks scheduled by microtasks
- Macrotasks: setTimeout, setInterval, I/O, user events, MessageChannel
- Microtasks: Promise callbacks, queueMicrotask, MutationObserver, await continuations
- Browser rendering happens between macrotasks when the browser determines an update is due — not between microtasks
- `requestAnimationFrame` callbacks run in the rendering step, just before paint — use it for smooth animations
- An infinite microtask loop starves rendering and freezes the UI

### Follow-up Prompts
- How does `MessageChannel` compare to `setTimeout(fn, 0)` as a way to yield to the event loop?
- What happens to the rendering pipeline if a single macrotask takes 500ms to complete?
- How does Node.js differ from browsers in its event loop implementation (e.g., `process.nextTick` vs microtasks)?

### Difficulty: advanced
### Tags: event loop, microtask, macrotask, rendering pipeline, requestAnimationFrame, queueMicrotask, task scheduling

---

## Q4: What are Service Workers and how do they enable offline capabilities?

### Question
Explain what Service Workers are, their lifecycle, and how they intercept network requests. Describe how to build a caching strategy for offline support.

### Model Answer
A Service Worker is a script that runs in a background thread separate from the main browser thread. It acts as a proxy between the web application and the network, enabling features like offline caching, push notifications, and background sync. Service Workers are a core part of Progressive Web Apps (PWAs).

**Key characteristics:**
- Runs in a separate thread — no DOM access, no `window` object
- Persistent — survives page refreshes, can run when the page is closed
- HTTPS required — must be served over a secure origin (or localhost for development)
- Scope-limited — controls requests only within its registered scope

**Lifecycle:**

1. **Register**: The page registers the service worker
2. **Install**: The service worker installs and typically pre-caches assets
3. **Activate**: The new worker takes control, old caches can be cleaned up
4. **Idle / Fetch**: Handles fetch events for controlled pages

```javascript
// Register (in main page)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

// sw.js
const CACHE_NAME = 'v1';
const PRECACHE_URLS = ['/', '/index.html', '/app.js', '/styles.css'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of open pages
});
```

**Caching Strategies:**

- **Cache First**: Check cache, fall back to network. Best for static assets that rarely change.
- **Network First**: Try network, fall back to cache. Best for frequently updated data.
- **Stale While Revalidate**: Return cached version immediately, update cache from network in background. Best balance for most content.

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || networkFetch; // Cache First
    })
  );
});
```

Workbox (Google's library) provides abstractions over these strategies, handling edge cases like cache versioning and cleanup automatically.

### Key Points
- Service Workers run in a background thread, intercept fetch events, and enable offline capabilities
- They have a distinct lifecycle: install → activate → idle/fetch; upgrades require new install + activate cycle
- Common strategies: Cache First (static assets), Network First (dynamic data), Stale While Revalidate (balanced)
- `event.waitUntil()` keeps the service worker alive until the provided Promise resolves
- Service workers only work on HTTPS; use Workbox to simplify complex caching strategies

### Follow-up Prompts
- How do you handle cache invalidation when you deploy a new version of your app?
- What is the difference between the `Cache API` used by service workers and the browser's HTTP cache?
- How do you implement background sync to retry failed requests when the user comes back online?

### Difficulty: advanced
### Tags: service workers, PWA, offline, caching strategies, fetch interception, Workbox, background sync

---

## Q5: How does JavaScript interact with WebAssembly?

### Question
Explain how JavaScript and WebAssembly interact. What are the boundary costs, how do you share memory, and what types of workloads benefit most from WebAssembly?

### Model Answer
WebAssembly (WASM) is a binary instruction format that runs at near-native speed in the browser. It is not a replacement for JavaScript but a complement — JavaScript and WASM coexist and call each other across a well-defined boundary.

**Calling WASM from JavaScript:**

```javascript
// Load and instantiate a WASM module
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/math.wasm'),
  { env: { /* imports from JS to WASM */ } }
);

const { add, multiply } = instance.exports;
console.log(add(2, 3));      // 5 — calling WASM function from JS
console.log(multiply(4, 5)); // 20
```

**Shared Memory (`WebAssembly.Memory`):**

WASM and JavaScript share a linear memory buffer — an `ArrayBuffer` (or `SharedArrayBuffer` for multithreaded WASM). JavaScript can read and write to this memory directly using typed arrays, enabling zero-copy data exchange:

```javascript
const memory = new WebAssembly.Memory({ initial: 1 }); // 1 page = 64KB
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/image.wasm'),
  { env: { memory } }
);

const heap = new Uint8Array(memory.buffer);
// Write input data to shared memory
heap.set(imageData, 0);
// Call WASM to process it in-place
instance.exports.processImage(0, imageData.length);
// Read results from same memory
const result = heap.slice(0, outputSize);
```

**Boundary Costs:**

Crossing the JS/WASM boundary has overhead. Each call from JS to WASM or WASM to JS involves type checking and marshalling. Primitive types (i32, i64, f32, f64) cross cheaply. Complex objects (strings, arrays, structured data) require serialization into linear memory.

This means the JS/WASM boundary should be crossed as infrequently as possible — ideally once to hand off a large chunk of data, let WASM do intensive computation, and return a result.

**Ideal workloads for WASM:**
- Heavy numeric computation (physics engines, signal processing, cryptography)
- Image/video/audio processing
- Porting existing C/C++/Rust code to the browser (e.g., SQLite, ffmpeg, game engines)
- Compression/decompression algorithms

**Poor fit for WASM:**
- DOM manipulation (WASM has no DOM access — must call JS for that)
- Simple string/object manipulation (boundary cost offsets gains)
- Short-lived tasks (module load time adds latency)

Tools like Emscripten (C/C++ → WASM), wasm-bindgen (Rust → WASM with JS glue code), and AssemblyScript (TypeScript-like → WASM) make the workflow practical.

### Key Points
- WASM and JavaScript share a linear memory buffer — use typed arrays on the JS side to read/write WASM memory
- JS/WASM boundary crossings have overhead; batch data and minimize crossing frequency for best performance
- WASM excels at heavy numeric computation, media processing, and porting native libraries
- WASM cannot access the DOM — it must call exported JS functions for any browser API interaction
- wasm-bindgen and Emscripten automate the glue code for passing complex types across the boundary

### Follow-up Prompts
- How do you pass a JavaScript string to a WebAssembly function, and what does wasm-bindgen do to automate this?
- What is WASI (WebAssembly System Interface) and how does it extend WASM beyond the browser?
- How would you benchmark a JavaScript implementation against a WASM implementation to decide which to use?

### Difficulty: advanced
### Tags: WebAssembly, WASM, JavaScript interop, SharedArrayBuffer, performance, Emscripten, wasm-bindgen

---

## Q6: How do you profile and optimize JavaScript performance?

### Question
Describe the tools and methodologies you use to identify and fix JavaScript performance bottlenecks. Cover CPU profiling, memory profiling, rendering performance, and specific code patterns to optimize.

### Model Answer
Performance optimization is a measurement-driven process. Never optimize without data — use profiling tools to find the actual bottleneck rather than guessing.

**CPU Profiling with Chrome DevTools:**

The Performance panel records a timeline of all activity: JavaScript execution, style/layout/paint, compositing. The flame chart shows which functions consumed the most time. Look for:
- Long JavaScript tasks (>50ms) that block the main thread
- Functions appearing repeatedly or taking unexpectedly long
- Layout thrashing (interleaved reads and writes to the DOM that force repeated layout calculations)

```javascript
// Layout thrashing — forces layout on every iteration
for (const el of elements) {
  el.style.width = el.offsetWidth + 10 + 'px'; // read then write in loop
}

// Fixed — batch reads, then batch writes
const widths = elements.map(el => el.offsetWidth); // all reads
elements.forEach((el, i) => el.style.width = widths[i] + 10 + 'px'); // all writes
```

**Runtime profiling:**

```javascript
console.time('operation');
heavyOperation();
console.timeEnd('operation');

// Or use the User Timing API for precise measurement
performance.mark('start');
heavyOperation();
performance.mark('end');
performance.measure('heavy-op', 'start', 'end');
console.log(performance.getEntriesByName('heavy-op')[0].duration);
```

**Memory Profiling:**

Heap snapshots in the Memory panel show all live objects. Take a snapshot before and after a suspected leak, then compare to find objects that grew unexpectedly. The Allocation Timeline records allocations over time and shows which code allocates the most.

**Code-level optimizations:**

- **Avoid V8 deoptimization triggers**: don't change object shapes after creation, avoid `try/catch` in hot functions (it prevented optimization in older V8 versions, though this is less true in modern V8), avoid `arguments` object in hot paths
- **Use typed arrays** for numeric data — no GC overhead, cache-friendly memory layout
- **Debounce/throttle** expensive event handlers (scroll, resize, input)
- **Web Workers** for CPU-intensive tasks to avoid blocking the main thread
- **`requestIdleCallback`** for non-urgent work during idle periods

**Rendering performance:**

Use the Layers panel to verify compositing is working as expected. `will-change: transform` or `transform: translateZ(0)` promotes elements to their own GPU layer, allowing animation without triggering layout or paint. But overuse wastes GPU memory.

### Key Points
- Profile before optimizing — use Chrome DevTools Performance and Memory panels to find real bottlenecks
- Layout thrashing (interleaved DOM reads and writes) is a major rendering performance killer — batch them
- CPU-intensive work belongs in Web Workers to keep the main thread free for UI
- Typed arrays, object shape consistency, and avoiding deoptimization triggers improve V8 performance
- Use `will-change` and GPU layers for animations, but sparingly — they have memory costs

### Follow-up Prompts
- How do you use Lighthouse's performance audit to identify and prioritize optimizations?
- What is the RAIL model (Response, Animation, Idle, Load) and how does it guide performance targets?
- How would you diagnose a page that is slow to respond to user input (high Input Delay)?

### Difficulty: advanced
### Tags: performance, profiling, Chrome DevTools, layout thrashing, Web Workers, memory profiling, V8 optimization

---

## Q7: Explain the Observer, Mediator, and Strategy design patterns in JavaScript.

### Question
Describe the Observer, Mediator, and Strategy design patterns. Implement each in modern JavaScript and explain the real-world frontend scenarios where each pattern solves a genuine problem.

### Model Answer
Design patterns are reusable solutions to recurring structural problems. In JavaScript, patterns often look different from classic OOP implementations because of the language's dynamic nature and first-class functions.

**Observer Pattern:**

Defines a one-to-many dependency between objects: when one object (subject) changes state, all dependents (observers) are notified automatically. This is the basis for event emitters, reactive state systems, and DOM events.

```javascript
class EventEmitter {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(fn);
    return () => this.off(event, fn); // returns unsubscribe function
  }

  off(event, fn) {
    this.#listeners.get(event)?.delete(fn);
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(fn => fn(...args));
  }
}

const store = new EventEmitter();
const unsub = store.on('change', data => console.log('changed:', data));
store.emit('change', { value: 42 });
unsub(); // remove listener
```

Real-world use: custom event buses in React apps, RxJS Observables, Node.js EventEmitter, MobX autorun, Vue's reactivity system.

**Mediator Pattern:**

Reduces direct dependencies between components by routing all communication through a central mediator object. Components know about the mediator but not each other.

```javascript
class ChatRoom {
  #users = new Map();

  register(user) { this.#users.set(user.name, user); }

  send(from, to, message) {
    const recipient = this.#users.get(to);
    recipient?.receive(`${from}: ${message}`);
  }
}

class User {
  constructor(name, room) {
    this.name = name;
    this.room = room;
    room.register(this);
  }
  send(to, msg) { this.room.send(this.name, to, msg); }
  receive(msg) { console.log(`[${this.name}] received: ${msg}`); }
}
```

Real-world use: Redux store as a mediator between React components, API gateways, chat application message routing.

**Strategy Pattern:**

Defines a family of algorithms, encapsulates each one, and makes them interchangeable. The client selects a strategy at runtime without knowing the implementation details.

```javascript
const sortStrategies = {
  bubble: arr => { /* bubble sort impl */ return arr; },
  quick: arr => [...arr].sort((a, b) => a - b),
  merge: arr => { /* merge sort impl */ return arr; },
};

class DataList {
  constructor(data, strategy = 'quick') {
    this.data = data;
    this.strategy = strategy;
  }
  sort() { return sortStrategies[this.strategy](this.data); }
  setStrategy(strategy) { this.strategy = strategy; }
}

// Validation strategies
const validators = {
  required: val => val != null && val !== '',
  email: val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  minLength: len => val => val.length >= len,
};
```

Real-world use: sorting/filtering strategies, form validation pipelines, payment processors, authentication providers.

### Key Points
- Observer decouples publishers from subscribers — foundation of event systems and reactive programming
- Mediator centralizes communication to reduce N×M coupling between components to N+M
- Strategy makes algorithms interchangeable at runtime — ideal for pluggable behaviors (validation, sorting, auth)
- In JavaScript, strategies are often just functions or objects — no need for full class hierarchies
- These patterns appear throughout popular frameworks: Observer in Vue/RxJS, Mediator in Redux, Strategy in validation libraries

### Follow-up Prompts
- How does the Observer pattern relate to reactive programming libraries like RxJS?
- When would you choose Mediator over a pub/sub event bus?
- Can you implement a form validation system using the Strategy pattern that supports composable validation rules?

### Difficulty: advanced
### Tags: design patterns, Observer, Mediator, Strategy, EventEmitter, Redux, architecture

---

## Q8: What are the key tools and challenges in a JavaScript monorepo?

### Question
What is a monorepo and what problems does it solve? Describe the main tools used for JavaScript monorepos (Turborepo, Nx, pnpm workspaces) and the key challenges around dependency management, build orchestration, and CI performance.

### Model Answer
A monorepo is a single version-controlled repository containing multiple projects or packages that may depend on each other. As opposed to polyrepo (one repo per project) or a monolith (one deployable), a monorepo enables shared code without the overhead of publishing npm packages between repos.

**Problems a monorepo solves:**
- **Atomic changes**: a single commit can update shared library code and all consumers simultaneously
- **Dependency alignment**: all packages use the same version of shared dependencies
- **Code sharing**: internal packages can be imported directly without publishing
- **Unified tooling**: linting, testing, and CI configuration is centralized

**Core tools:**

`pnpm workspaces` is the package manager layer — it handles installing dependencies across all packages and symlinking internal packages so they can reference each other:

```json
// pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

`Turborepo` is a build orchestration tool. It understands the dependency graph between packages, runs tasks in the correct order, and aggressively caches outputs:

```json
// turbo.json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"] },
    "lint": {}
  }
}
```

`Nx` is a more opinionated system that also offers code generation, affected-command detection (only run tasks for changed packages and their dependents), and a plugin ecosystem for frameworks.

**Key challenges:**

**Dependency management**: Internal packages must be carefully versioned. With `pnpm workspaces`, internal packages are symlinked so changes take effect immediately. Managing peer dependencies and ensuring consistent external dependency versions requires discipline.

**Build caching**: Without caching, a CI build runs all tasks every time. Turborepo and Nx both support local and remote caching — if inputs haven't changed, the cached output is restored. Remote caching (e.g., Vercel's remote cache for Turborepo) allows developers and CI to share cache entries, dramatically reducing CI times.

**Affected detection**: Running only the packages affected by a given change (and their dependents) is critical for scalability. Nx has first-class support for this with `nx affected`.

**TypeScript project references**: For TypeScript monorepos, `tsconfig.json` `references` allow incremental compilation across packages, avoiding full rebuilds.

**CI performance**: Large monorepos need careful CI design — fan out tasks across parallel jobs, use remote caching, and only build/test affected paths.

### Key Points
- Monorepos enable atomic multi-package changes, dependency alignment, and code sharing without publishing
- pnpm workspaces handles dependency installation and symlinking; Turborepo/Nx orchestrate builds
- Build caching (local and remote) is critical — without it, monorepos become slower than polyrepos at scale
- Affected detection (only building changed packages and dependents) is essential for CI speed in large repos
- TypeScript `project references` enable incremental compilation across packages

### Follow-up Prompts
- How does Turborepo's task graph differ from Nx's project graph, and when would you choose one over the other?
- How do you handle breaking changes to a shared internal package when multiple consuming packages have different requirements?
- What is `changesets` and how does it help manage versioning and changelogs in a monorepo?

### Difficulty: advanced
### Tags: monorepo, Turborepo, Nx, pnpm workspaces, build orchestration, caching, CI, TypeScript references

---

## Q9: Explain tree shaking and code splitting in build optimization.

### Question
What are tree shaking and code splitting? How do modern bundlers implement them, and what code patterns prevent tree shaking from working correctly?

### Model Answer
Tree shaking and code splitting are two complementary build optimization techniques that reduce the amount of JavaScript a browser must download and parse.

**Tree Shaking:**

Tree shaking is the process of eliminating dead code — exports that are imported nowhere in the application. It is only possible with ES Modules because ESM `import`/`export` statements are static (they cannot be dynamic at runtime), allowing bundlers to build a complete dependency graph at build time.

Bundlers (webpack, Rollup, esbuild) analyze the module graph, starting from entry points, and mark all reachable code. Unreachable exports are not included in the final bundle.

```javascript
// utils.js
export function used() { return 'needed'; }
export function unused() { return 'not needed'; }

// app.js
import { used } from './utils'; // only 'used' is imported
// 'unused' will be tree-shaken out of the bundle
```

**Patterns that prevent tree shaking:**

1. **Side effects**: If a module has side effects (modifies globals, logs, patches prototypes on import), bundlers cannot safely remove any part of it. Declare side-effect-free packages in `package.json`:
```json
{ "sideEffects": false }
// or list specific side-effect files:
{ "sideEffects": ["./src/polyfills.js"] }
```

2. **CommonJS `require()`**: Dynamic `require()` prevents static analysis. Tree shaking only works reliably with ESM.

3. **Dynamic property access**: `import * as utils from './utils'; utils[dynamic]()` — bundler cannot determine which exports are used.

4. **Class methods**: Bundlers often cannot determine if a class method is unused when classes are involved — methods may be called via dynamic dispatch.

**Code Splitting:**

Code splitting divides the bundle into multiple chunks that are loaded on demand. Instead of one large bundle that the browser must download before any JS executes, the critical path is minimal and additional chunks are loaded as needed.

Dynamic `import()` is the mechanism:
```javascript
// Static import — always in the main bundle
import { render } from './render';

// Dynamic import — creates a separate chunk, loaded on demand
const { Chart } = await import('./chart-library');
```

Route-based splitting is the most impactful pattern — each route (page) gets its own chunk, loaded when the user navigates to it. All major meta-frameworks (Next.js, Nuxt, SvelteKit) do this automatically.

**`React.lazy` and `Suspense`** implement component-level code splitting:
```javascript
const HeavyChart = React.lazy(() => import('./HeavyChart'));
// HeavyChart's code is only downloaded when it is first rendered
```

**Preloading and prefetching**: Use `<link rel="prefetch">` or webpack's `/* webpackPrefetch: true */` magic comment to download chunks during idle time, before the user navigates to them.

### Key Points
- Tree shaking eliminates unused exports; it requires ESM static imports and `sideEffects: false` in package.json
- CommonJS `require()` and dynamic property access prevent tree shaking — always use named ESM exports for shakeable libraries
- Code splitting divides the bundle into on-demand chunks using dynamic `import()`
- Route-based splitting (automatic in Next.js/Nuxt/SvelteKit) is the highest-impact code splitting strategy
- Combine tree shaking + code splitting + prefetching for optimal bundle size and perceived performance

### Follow-up Prompts
- How do you analyze a webpack bundle to find what is contributing to its size (e.g., webpack-bundle-analyzer)?
- What is the difference between prefetch and preload link hints, and when would you use each?
- How does Rollup's approach to tree shaking differ from webpack's, and why is Rollup preferred for library builds?

### Difficulty: advanced
### Tags: tree shaking, code splitting, webpack, Rollup, ESM, bundle optimization, dynamic import, React.lazy

---

## Q10: How do you prevent XSS and CSRF attacks in JavaScript applications?

### Question
Explain Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) attacks. Describe the attack vectors specific to JavaScript applications and the defenses you implement at the application level.

### Model Answer
XSS and CSRF are two of the most common web security vulnerabilities. As applications move more logic to the client side, JavaScript plays both a role in the attack surface and in the defense.

**Cross-Site Scripting (XSS):**

XSS occurs when an attacker injects malicious scripts into a web page that are then executed in other users' browsers. There are three types:

- **Reflected XSS**: malicious input from the URL/request is reflected in the response
- **Stored XSS**: malicious content is saved in the database and served to all users
- **DOM-based XSS**: the attack occurs entirely in client-side JavaScript (no server involvement)

**JavaScript-specific XSS attack vectors:**

```javascript
// DANGEROUS: setting innerHTML with user content
element.innerHTML = userInput; // if userInput = '<script>stealCookies()</script>'

// DANGEROUS: eval with user content
eval(userInput);

// DANGEROUS: setTimeout/setInterval with string
setTimeout(userCode, 1000);

// DANGEROUS: template injection
document.write(`<div>${userInput}</div>`);
```

**Defenses:**

1. **Use textContent instead of innerHTML** for plain text:
```javascript
element.textContent = userInput; // safe — never interpreted as HTML
```

2. **Sanitize HTML when you must render it** — use a library like DOMPurify:
```javascript
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userHtml);
```

3. **Content Security Policy (CSP)**: HTTP header that restricts what scripts can execute. A strict CSP (with nonces) prevents inline scripts and limits sources:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'
```

4. **Never use `eval`, `new Function()`, or `setTimeout(string)`** with user input.

5. **HttpOnly cookies**: Set authentication cookies with `HttpOnly` flag so JavaScript cannot read them — limits the damage of XSS.

**Cross-Site Request Forgery (CSRF):**

CSRF tricks a logged-in user's browser into making unwanted requests to your server. If your API uses cookies for auth, a malicious site can trigger state-changing requests (e.g., fund transfers, email changes) by embedding an image, form, or fetch request that the browser sends with the user's cookies.

**Defenses:**

1. **CSRF tokens**: Generate a unique, unpredictable token per session. Include it in forms and AJAX headers. The server validates the token on every state-changing request:
```javascript
// Include CSRF token in fetch requests
fetch('/api/transfer', {
  method: 'POST',
  headers: { 'X-CSRF-Token': getCsrfToken() },
  body: JSON.stringify(data)
});
```

2. **SameSite cookie attribute**: Set `SameSite=Strict` or `SameSite=Lax` to prevent cookies from being sent on cross-origin requests. This is the modern primary defense:
```
Set-Cookie: session=abc; SameSite=Strict; Secure; HttpOnly
```

3. **Check Origin/Referer headers** on the server for sensitive operations.

4. **Use Authorization header instead of cookies** for API tokens (Bearer tokens in the Authorization header are not automatically sent cross-origin, unlike cookies).

### Key Points
- XSS injects malicious scripts via unsafe HTML rendering; use `textContent` and DOMPurify, never `innerHTML` with user input
- CSP headers add a defense-in-depth layer that prevents unauthorized script execution even if XSS is introduced
- CSRF exploits cookie-based authentication by tricking the browser into making unauthorized requests
- `SameSite=Strict` or `SameSite=Lax` cookies are the primary modern CSRF defense
- Using `Authorization: Bearer` headers for APIs (instead of cookies) eliminates CSRF risk for those endpoints

### Follow-up Prompts
- How do you implement a nonce-based CSP that works with a React app that uses inline styles?
- What is the difference between CORS and CSRF protection, and how do they interact?
- How would you audit an existing codebase for XSS vulnerabilities systematically?

### Difficulty: advanced
### Tags: XSS, CSRF, security, CSP, DOMPurify, SameSite cookies, HttpOnly, injection attacks

---
