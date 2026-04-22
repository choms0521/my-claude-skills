# JavaScript - Senior Interview Questions (Part 2)
### Language: en

## Q11: What is the Temporal API and how does it improve upon the `Date` object?

### Question
Explain the JavaScript Temporal API proposal. What problems does it solve with the legacy `Date` object, and what are its core concepts?

### Model Answer
The `Date` object has been one of JavaScript's most notorious pain points since the language's inception. It is mutable (methods like `setMonth` modify the object in place), has counterintuitive month indexing (January is 0), conflates local time and UTC in confusing ways, has no native support for time zones beyond UTC and the local system zone, and provides no way to represent date-only or time-only values. Libraries like Moment.js, date-fns, and Luxon exist primarily to paper over these deficiencies.

The Temporal API (Stage 3 proposal as of 2025) is a complete redesign. It introduces a family of immutable, strongly-typed objects for different date and time concepts. `Temporal.PlainDate` represents a calendar date without time or time zone (e.g., `2025-04-10`). `Temporal.PlainTime` represents a wall-clock time without a date. `Temporal.PlainDateTime` combines both. `Temporal.ZonedDateTime` is a full absolute moment with an explicit time zone. `Temporal.Instant` is an absolute timestamp with no time zone semantics (analogous to a Unix epoch moment).

All Temporal objects are immutable — "modifying" them produces a new object via `.with({ month: 4 })` or arithmetic methods like `.add({ days: 7 })`. Duration arithmetic is explicit and typed with `Temporal.Duration`. Time zone handling is first-class: you explicitly name time zones (e.g., `"America/New_York"`) rather than relying on the host system's zone.

Calendar system support is built in. Temporal can work with non-Gregorian calendars (Hebrew, Japanese, Islamic, etc.) through its calendar parameter. Disambiguation for ambiguous local times (during DST transitions) is explicit rather than silently defaulting.

The API also provides `Temporal.Now` for getting current values in various forms, and `Temporal.PlainMonthDay` / `Temporal.PlainYearMonth` for partial date representations. The design priority is correctness and explicitness over the convenience shortcuts that caused `Date`'s problems.

### Key Points
- `Date` is mutable, has 0-indexed months, poor time zone support, and no date/time-only types
- Temporal introduces a family of immutable types: `PlainDate`, `PlainTime`, `PlainDateTime`, `ZonedDateTime`, `Instant`
- All Temporal objects are immutable — arithmetic produces new objects
- Time zones are explicit and named (IANA time zone database), not implicit system-local
- Non-Gregorian calendar systems are first-class with the calendar parameter

### Follow-up Prompts
- How would you convert a `Temporal.ZonedDateTime` to a different time zone without changing the absolute instant?
- What is the difference between `Temporal.Instant` and `Temporal.PlainDateTime`?
- How does Temporal handle the ambiguous "fall-back" hour during daylight saving time transitions?

### Difficulty: advanced
### Tags: Temporal API, Date, time zones, immutability, proposal, TC39

---

## Q12: What are Import Maps and how do they work in the browser?

### Question
Explain Import Maps. What problem do they solve, how are they specified, and what are their limitations and use cases?

### Model Answer
Import Maps are a browser feature (now baseline in all modern browsers) that allows you to control how JavaScript module specifiers are resolved — without a bundler. Before Import Maps, bare module specifiers like `import React from 'react'` only worked in Node.js (with `node_modules`) or after bundler transformation. In the browser, you needed full paths or URLs: `import React from '/node_modules/react/index.js'`. Import Maps bridge this gap.

An Import Map is a JSON object declared in a `<script type="importmap">` tag in your HTML. It has an `imports` key mapping module specifiers to URLs, and optionally a `scopes` key for path-specific overrides:

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18",
    "react-dom/client": "https://esm.sh/react-dom@18/client",
    "lodash/": "https://esm.sh/lodash-es/"
  }
}
</script>
```

The trailing slash in `"lodash/"` is a path prefix — any specifier starting with `lodash/` will be resolved relative to that URL. So `import { debounce } from 'lodash/debounce'` resolves to `https://esm.sh/lodash-es/debounce`.

Import Maps enable CDN-based workflows and module development without bundlers. They also serve as a progressive enhancement — you can adopt native ES modules in the browser while still supporting bundled builds for older environments. They are used heavily in Deno and are central to the "unbundled development" philosophy that Vite's dev server also employs (though Vite uses a different mechanism internally).

Limitations: only one `<script type="importmap">` tag is allowed per page (an additional one is a parse error). The importmap must appear before any module scripts in the document. Import Maps do not support dynamic import source rewriting for `import()` calls in all browsers consistently. They also require CORS-enabled CDN URLs for cross-origin modules.

The `scopes` mechanism allows context-sensitive resolution — different parts of your application can use different versions of a dependency — which is Import Maps' answer to the `node_modules` nested deduplication problem.

### Key Points
- Import Maps map bare module specifiers to URLs, enabling `import 'react'` in the browser without bundlers
- Declared via `<script type="importmap">` containing a JSON object with `imports` and optional `scopes`
- Trailing slash mappings act as path prefixes for entire module namespaces
- Only one importmap tag is allowed per page and must appear before any module scripts
- `scopes` enables different parts of an app to resolve the same specifier to different versions

### Follow-up Prompts
- How would you use Import Maps to run two different versions of a library in the same page for gradual migration?
- How does Vite's development server differ from Import Maps in how it handles bare specifier resolution?
- What is the `integrity` field in Import Maps and why is it important for security?

### Difficulty: advanced
### Tags: Import Maps, ES modules, browser, bundler, module resolution, CDN

---

## Q13: What is Module Federation and what architecture problems does it solve?

### Question
Explain Webpack Module Federation (and its ecosystem equivalents). What problem does it solve, how does it work at runtime, and what are its trade-offs?

### Model Answer
Module Federation is a Webpack 5 feature (with equivalents in Vite, Rollup, and Rspack) that allows separately compiled and deployed JavaScript bundles to share code at runtime — dynamically loading modules from remote applications as if they were local. It is the primary technical enabler for micro-frontend architectures.

The core problem it solves: before Module Federation, multiple front-end applications sharing code required either a monorepo (all compiled together, losing independent deployability) or npm packages (shared but requiring republish and redeploy cycles to update). Module Federation allows Application A to expose modules that Application B can consume at runtime, with each application independently deployed and versioned.

At runtime, each federated application exposes a `remoteEntry.js` manifest file that describes what it shares and the URLs to fetch those modules. When the host application (shell) loads a remote module, the browser fetches the remote entry, resolves the module graph, and downloads only what is not already available (shared dependencies like React are deduplicated using semantic versioning negotiation).

The Webpack configuration uses `ModuleFederationPlugin` with three key concepts: `exposes` (what this app makes available to others), `remotes` (which remote apps to consume from and their entry URLs), and `shared` (libraries to share to avoid duplicate instances — critical for React since multiple copies cause hook violations).

Trade-offs: runtime failures if a remote is down or its API changes (versioning discipline is essential). Type safety across federation boundaries requires extra tooling (like `@module-federation/typescript`). Network waterfalls for deeply nested remotes. Debugging is harder because module origins span multiple repositories. Initial bundle analysis tools don't work across federated boundaries.

Vite's `@originjs/vite-plugin-federation` and the native Vite Plugin Federation bring similar capabilities to the Vite ecosystem. The underlying mental model — remote module registries consumed at runtime — is converging across build tools, and the Import Maps specification provides a browser-native analog for simpler use cases.

### Key Points
- Module Federation allows independently deployed applications to share code at runtime via dynamically loaded remote entries
- Each federated app exposes a `remoteEntry.js` describing its public modules and shares configuration
- Shared dependency negotiation (via semantic versioning) prevents duplicate React instances and other singleton violations
- Key trade-offs: runtime failure risk, version discipline requirements, and cross-boundary type safety challenges
- Vite, Rspack, and Rollup all have Module Federation equivalents; the pattern is build-tool-agnostic

### Follow-up Prompts
- How would you handle a situation where a remote Module Federation app is unavailable — what fallback strategies exist?
- Why must React be listed as a singleton in the shared configuration, and what happens if it is not?
- How does Module Federation differ from a simple CDN-hosted shared library approach?

### Difficulty: advanced
### Tags: Module Federation, micro-frontends, Webpack 5, runtime sharing, architecture

---

## Q14: How do `Atomics` and `SharedArrayBuffer` enable concurrency in JavaScript?

### Question
Explain `SharedArrayBuffer` and the `Atomics` API. What concurrency problems do they solve, and what restrictions exist around their use?

### Model Answer
JavaScript's concurrency model is traditionally single-threaded with message-passing between workers (via `postMessage`). When data is passed between the main thread and Web Workers, it is either copied (structured clone) or transferred (ownership moved). `SharedArrayBuffer` introduces a third option: a memory buffer that is genuinely shared — both threads read and write the exact same memory region simultaneously with no copying.

`SharedArrayBuffer` creates a raw binary buffer backed by shared memory. Both the main thread and workers can create `TypedArray` views over it (like `Int32Array`) and read or write values. This enables true zero-copy data sharing, which is critical for performance in applications like game engines, audio/video processing, and WebAssembly-heavy workloads.

The problem: concurrent writes to shared memory without coordination produce data races — one thread reads a value mid-write from another thread, getting a corrupt or unexpected result. `Atomics` solves this by providing a set of operations that are guaranteed to be atomic (indivisible, never partially visible to another thread).

`Atomics.add`, `Atomics.sub`, `Atomics.and`, `Atomics.or`, `Atomics.xor` perform read-modify-write operations atomically. `Atomics.compareExchange` implements compare-and-swap (CAS), the foundation of lock-free algorithms. `Atomics.load` and `Atomics.store` provide sequentially consistent reads and writes.

`Atomics.wait` and `Atomics.notify` provide a mutex-like mechanism: a worker can wait on a location in shared memory until another thread notifies it, enabling condition variables and semaphores. `Atomics.wait` is not allowed on the main thread (it would block the event loop), but `Atomics.waitAsync` provides a promise-based alternative.

Due to Spectre/Meltdown exploitation (which used `SharedArrayBuffer` with high-resolution timers to leak memory across origins), `SharedArrayBuffer` requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers on the page to be available. These headers isolate the browsing context, preventing cross-origin memory attacks.

### Key Points
- `SharedArrayBuffer` creates a memory region shared between the main thread and Web Workers without copying
- `Atomics` provides atomic (race-condition-free) operations: arithmetic, compare-and-swap, load/store
- `Atomics.wait`/`notify` implement mutex-like blocking coordination between threads
- `SharedArrayBuffer` requires COOP and COEP security headers due to Spectre-class vulnerabilities
- `Atomics.waitAsync` (promise-based) is the main-thread-safe alternative to the blocking `Atomics.wait`

### Follow-up Prompts
- How would you implement a simple mutex (mutual exclusion lock) using `Atomics.compareExchange`?
- Why is high-resolution timer access relevant to the security restrictions on `SharedArrayBuffer`?
- How do `SharedArrayBuffer` and `Atomics` relate to WebAssembly threading?

### Difficulty: advanced
### Tags: SharedArrayBuffer, Atomics, concurrency, Web Workers, memory, Spectre, COOP, COEP

---

## Q15: How do Web Components work — Shadow DOM, Custom Elements, and HTML Templates?

### Question
Explain the Web Components standard. Cover Custom Elements, Shadow DOM, and HTML Templates, and discuss when you would use Web Components versus a framework like React.

### Model Answer
Web Components is a suite of browser standards — not a framework — that allows you to define reusable, encapsulated HTML elements using native browser APIs. The three main pillars are Custom Elements, Shadow DOM, and HTML Templates.

Custom Elements allow you to define new HTML tags by extending `HTMLElement`. You register them with `customElements.define('my-button', MyButtonClass)`, where `MyButtonClass` is a class extending `HTMLElement`. Once registered, `<my-button>` is a valid element the browser instantiates using your class. Lifecycle callbacks are `connectedCallback` (element added to DOM), `disconnectedCallback` (removed), `attributeChangedCallback` (observed attribute changed), and `adoptedCallback` (moved to a new document). The `observedAttributes` static getter declares which attribute changes to watch.

Shadow DOM provides style and DOM encapsulation. When you call `this.attachShadow({ mode: 'open' })` inside a Custom Element, you get a shadow root — a separate, encapsulated DOM tree. CSS inside the shadow root does not leak out, and CSS from outside does not affect the shadow DOM (except for inherited properties and CSS custom properties/variables which penetrate the shadow boundary by design). This solves the global CSS cascade problem that makes styling large applications hard. `mode: 'open'` allows `element.shadowRoot` access from JavaScript; `mode: 'closed'` hides it.

HTML Templates (`<template>` element) allow defining inert HTML that is not rendered but can be cloned and inserted programmatically. Paired with `<slot>` elements inside Shadow DOM, they enable content projection — letting the user of your component inject their own HTML into designated slots, similar to React's `children` or Vue's `<slot>`.

Web Components versus React: Web Components excel at framework-agnostic, design system components (buttons, inputs, modals) that need to work in any technology stack — React, Vue, Angular, plain HTML. They have no runtime dependency and are browser-native. The trade-off is that state management, reactivity, and data binding are verbose compared to framework equivalents. React (and similar frameworks) offer a superior developer experience for complex application logic, composability, and ecosystem tooling. Many organizations use Web Components for the shared design system layer and React/Vue for application logic.

### Key Points
- Custom Elements extend `HTMLElement` to define new HTML tags with lifecycle callbacks
- Shadow DOM encapsulates CSS and DOM — styles inside do not leak out and external styles (mostly) do not leak in
- CSS custom properties and inherited properties cross the shadow boundary by design
- `<template>` and `<slot>` enable inert HTML definition and content projection
- Web Components are framework-agnostic, making them ideal for shared design systems used across multiple tech stacks

### Follow-up Prompts
- How do you pass complex data (objects, arrays) to a Web Component, given that HTML attributes are strings?
- What are the limitations of Shadow DOM for accessibility — does it prevent screen readers from seeing shadow content?
- How does the `adoptedStyleSheets` API improve CSS handling in Shadow DOM compared to inline `<style>` tags?

### Difficulty: advanced
### Tags: Web Components, Shadow DOM, Custom Elements, HTML Template, encapsulation, design system

---

## Q16: What are the architectural differences between WebRTC, WebSockets, and Server-Sent Events?

### Question
Compare WebRTC, WebSockets, and Server-Sent Events (SSE). What are their transport models, appropriate use cases, and key limitations?

### Model Answer
Server-Sent Events (SSE) are the simplest of the three. They use a standard HTTP connection where the server sends a continuous stream of text/event-stream data to the client, but the client cannot send data back on the same connection. SSE is unidirectional (server to client), automatically reconnects if the connection drops, and supports named events and IDs for resuming streams. It is ideal for real-time feeds, live dashboards, notifications, and streaming AI responses — situations where only the server pushes updates. Because SSE is just HTTP/1.1, it works through proxies and firewalls without special handling. The limitation: one direction only, and HTTP/1.1 allows at most 6 connections per origin (HTTP/2 multiplexing removes this constraint).

WebSockets establish a persistent, full-duplex TCP connection via an HTTP upgrade handshake. Once established, both client and server can send messages at any time in either direction with minimal overhead (small binary frame headers). WebSockets are appropriate for real-time bidirectional communication: chat applications, multiplayer games, collaborative editing, live data feeds where the client also sends updates. The server must maintain a stateful connection per client, which has scaling implications (sticky sessions or a message broker like Redis Pub/Sub is needed in multi-server deployments). WebSockets can be blocked by some corporate proxies and firewalls that do not understand the WebSocket protocol.

WebRTC is a fundamentally different category. It enables peer-to-peer (P2P) communication between browsers — audio, video, and arbitrary data — without routing through a server for the media itself. The connection establishment uses signaling (which can be done over WebSockets or any channel) and NAT traversal through STUN/TURN servers. Once the peer connection is established, data flows directly between browsers at low latency. WebRTC supports `RTCDataChannel` for arbitrary binary or text data, not just media. It is the technology behind video calling (Zoom on the web, Google Meet), real-time gaming, and P2P file transfer. The complexity is high: ICE negotiation, TURN server fallbacks for symmetric NAT, codec negotiation, and signaling server implementation are all required.

Choose SSE for server-push streams, WebSockets for bidirectional real-time communication, and WebRTC for low-latency P2P or media communication.

### Key Points
- SSE is unidirectional (server-to-client), HTTP-based, auto-reconnecting — ideal for feeds and notifications
- WebSockets are full-duplex, persistent TCP — ideal for chat, collaborative apps, and bidirectional real-time data
- WebRTC enables peer-to-peer communication (audio, video, data) with STUN/TURN for NAT traversal
- WebSockets require stateful server-side connections and may be blocked by some proxies
- WebRTC has the highest complexity but the lowest latency for media and P2P use cases

### Follow-up Prompts
- Why does WebRTC need both STUN and TURN servers, and what happens if STUN alone is insufficient?
- How would you implement WebSocket connection recovery with exponential backoff in the client?
- When would you choose `RTCDataChannel` over WebSockets for data transfer between two browsers?

### Difficulty: advanced
### Tags: WebRTC, WebSockets, SSE, Server-Sent Events, real-time, P2P, networking

---

## Q17: What is the JavaScript Decorator proposal and how does it work?

### Question
Explain the JavaScript Decorator proposal (Stage 3). What can decorators do, how do they differ from TypeScript experimental decorators, and what are common use cases?

### Model Answer
Decorators are a Stage 3 TC39 proposal that provide a way to annotate and modify classes, class fields, class methods, class accessors, and class auto-accessors using a `@decorator` syntax. They are functions that receive a "target" and a "context" object and can optionally return a replacement value.

The Stage 3 proposal semantics differ significantly from TypeScript's older experimental decorator implementation (which was based on a much earlier stage of the proposal). TypeScript 5.0+ supports the new decorator standard alongside the old one (the old one requires `"experimentalDecorators": true` in tsconfig).

Under the new standard, a method decorator receives the method value and a context object containing `{ kind: 'method', name, addInitializer, ... }`. It can return a new function to replace the method. A field decorator receives `undefined` (fields have no initial value at decoration time) and can return an initializer function to transform the initial value. A class decorator receives the class constructor and can return a new constructor.

Common use cases:

- **Logging/tracing**: wrap methods to log arguments and return values automatically
- **Memoization**: add caching to methods without modifying the method body
- **Bound methods**: replace a method with a version that is auto-bound to the instance, solving the `this` loss problem in event handlers
- **Validation**: intercept field setters to validate values
- **Dependency injection**: Angular's entire DI system is built on decorators (`@Injectable`, `@Component`)
- **ORM mappings**: mapping class properties to database columns (`@Column`, `@PrimaryKey` in TypeORM and MikroORM)

The `addInitializer` context method allows running code during class initialization (after construction) — useful for registration logic. `context.access` provides `get` and `set` functions to access the decorated element from other decorators.

The key philosophical question decorators answer: how do you add cross-cutting behavior (logging, validation, caching) to class-based code without repeating boilerplate in every method and without modifying the methods themselves? Decorators provide the separation of concerns equivalent that aspect-oriented programming (AOP) brings to Java.

### Key Points
- JavaScript Decorators (Stage 3) annotate and modify classes, methods, fields, and accessors via `@decorator` syntax
- The Stage 3 standard differs from TypeScript's `"experimentalDecorators"` which was based on an earlier proposal version
- Decorators are functions receiving a target and a context object; returning a value replaces the target
- Common use cases: logging, memoization, bound methods, validation, DI, ORM column mapping
- `context.addInitializer` runs code during class instantiation; `context.access` provides programmatic get/set

### Follow-up Prompts
- How would you implement a `@memoize` decorator for a class method using the Stage 3 proposal API?
- What is the difference between a class decorator and a method decorator in terms of what they receive and can return?
- Why does Angular use decorators so extensively, and could Angular's DI work without them?

### Difficulty: advanced
### Tags: Decorators, TC39, Stage 3, class, metaprogramming, TypeScript, AOP

---

## Q18: What are Source Maps and how do they work in production debugging?

### Question
Explain JavaScript Source Maps. How are they generated, how do browsers use them, and what are the security and performance considerations for production?

### Model Answer
Source Maps are files (with a `.map` extension) that create a mapping between minified/transpiled/bundled JavaScript (the "generated" code) and the original source files (the "original" code). Without Source Maps, errors in production code reference line 1, column 34521 of a minified bundle — meaningless for debugging. With Source Maps, the browser can translate those positions back to your original TypeScript, JSX, or ES module source.

The Source Map format (version 3 is current) is a JSON file containing a `mappings` field encoded using Base64 VLQ — a compact encoding of the position mappings. Each entry maps a position in the generated file to a position in one of the original source files, and optionally to a symbol name. The generated file references its Source Map via a comment: `//# sourceMappingURL=bundle.js.map` or via the `SourceMap` HTTP response header for server-side scenarios.

Source Maps can be generated by any transformation tool: TypeScript, Babel, Webpack, Rollup, Vite, esbuild, terser. They are produced during the build step and are typically excluded from the production bundle delivery (for security reasons) but hosted separately.

Production strategy considerations: fully public Source Maps expose your original source code to anyone who opens DevTools — a significant intellectual property and security concern. Strategies include: (1) Never deploying `.map` files to the CDN at all, relying only on error monitoring services (Sentry, Datadog) that accept Source Maps as private uploads; (2) Using `hidden` Source Maps (no `sourceMappingURL` comment) and only making them available to your error monitoring tool via authenticated upload; (3) Restricting `.map` file access via server authentication while still exposing them to internal teams.

Error monitoring services use Source Maps server-side to translate production stack traces into readable source locations. You upload the `.map` files alongside each release, tagged to a release version. When an error occurs in production, the service maps the minified stack trace to original source positions before displaying it to developers.

Tools like `source-map` (npm package) and Chrome DevTools can also be used to manually inspect Source Map contents and test mappings.

### Key Points
- Source Maps map minified/bundled code positions back to original source positions for human-readable debugging
- The `.map` file contains a VLQ-encoded `mappings` field referencing original file positions and symbol names
- Generated code references its Source Map via `//# sourceMappingURL=` comment or `SourceMap` HTTP header
- Never expose Source Maps publicly in production — they reveal original source code
- Production best practice: upload Source Maps privately to error monitoring services (Sentry, etc.) for server-side stack trace translation

### Follow-up Prompts
- How would you configure Webpack to generate Source Maps in production without serving them publicly?
- What is the difference between `source-map`, `cheap-module-source-map`, and `eval-source-map` Webpack devtool options?
- How does Sentry use Source Maps to translate production stack traces, and what is a release artifact?

### Difficulty: advanced
### Tags: Source Maps, debugging, production, minification, Webpack, Sentry, stack traces

---

## Q19: How does AST manipulation work, and how would you write a Babel plugin?

### Question
Explain what an Abstract Syntax Tree (AST) is and how Babel uses ASTs. Walk through the structure of a Babel plugin and how you would write one.

### Model Answer
An Abstract Syntax Tree (AST) is a tree representation of the syntactic structure of source code. Each node in the tree represents a construct — a function declaration, a variable assignment, a binary expression, etc. — with child nodes representing sub-constructs. The tree is "abstract" because it omits purely syntactic details like parentheses and semicolons while preserving the logical structure.

Every JavaScript build tool that transforms code — Babel, TypeScript, ESLint, Prettier, esbuild — operates on ASTs. The pipeline is: parse source text into an AST → traverse and transform the AST → generate output source text from the modified AST. This separation is what makes transformations composable and reliable.

Babel's architecture uses three packages: `@babel/parser` (parses JS/JSX/TS to AST), `@babel/traverse` (walks the AST with visitor callbacks), and `@babel/generator` (serializes AST back to code). A Babel plugin is a function that receives the Babel API object and returns an object with a `visitor` property — a map of AST node types to handler functions.

A minimal plugin that replaces all `console.log` calls with `logger.log`:

```javascript
module.exports = function({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        const { callee } = path.node;
        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.object, { name: 'console' }) &&
          t.isIdentifier(callee.property, { name: 'log' })
        ) {
          callee.object = t.identifier('logger');
        }
      }
    }
  };
};
```

The `path` object wraps a node and provides methods to traverse relatives (`path.parent`, `path.get('callee')`), transform (`path.replaceWith(newNode)`, `path.remove()`), and query scope information. The `types` object (`t`) provides factory functions and type-checking utilities (`t.identifier('x')` creates an Identifier node; `t.isIdentifier(node)` checks its type).

Tools like [astexplorer.net](https://astexplorer.net) are invaluable for exploring the AST of any JavaScript code snippet, making plugin development much more approachable. ESLint custom rules, Prettier plugins, Jest codemods, and Codemod scripts all use the same AST manipulation principles.

### Key Points
- An AST represents source code as a structured tree of nodes; each node type corresponds to a language construct
- Babel's pipeline: parse → traverse/transform (via visitor plugins) → generate
- A Babel plugin exports a function returning `{ visitor: { NodeType(path) { ... } } }`
- `path` provides node context, traversal methods, and transformation operations; `types` provides node factories and type checkers
- Use [astexplorer.net](https://astexplorer.net) to interactively explore any code's AST when writing plugins

### Follow-up Prompts
- How would you write a Babel plugin that transforms all `async/await` functions into generator functions?
- What is the difference between `path.replaceWith` and `path.replaceWithMultiple`?
- How do ESLint rules differ from Babel plugins in terms of how they traverse and interact with the AST?

### Difficulty: advanced
### Tags: AST, Babel, plugins, code transformation, parser, traverse, codemod

---

## Q20: How does JavaScript's garbage collection work, and what causes memory leaks?

### Question
Explain JavaScript's garbage collection mechanisms (mark-and-sweep, generational GC). What are the most common sources of memory leaks in web applications, and how do you detect and fix them?

### Model Answer
JavaScript engines use automatic garbage collection — developers do not manually allocate or free memory. The most widely used algorithm is mark-and-sweep. Starting from "GC roots" (global variables, the current call stack, and active closures), the garbage collector marks every object it can reach transitively. Objects that remain unmarked after this traversal are unreachable and are swept (freed). An object is kept alive as long as any live reference points to it.

Modern engines (V8, SpiderMonkey, JavaScriptCore) use generational garbage collection, dividing the heap into the young generation (new-space) and the old generation (old-space). New objects are allocated in young-space. Most objects are short-lived (a React re-render creates thousands of objects that die in milliseconds), so minor GC runs frequently and cheaply in young-space using a semi-space copying collector. Objects that survive multiple minor GC cycles are promoted to old-space. Major GC (full mark-and-sweep) on old-space is infrequent but more expensive.

Common memory leak sources in web applications:

1. **Detached DOM nodes**: A reference to a DOM element is held in JavaScript (e.g., a cache or closure), but the element is removed from the document. The element cannot be GC'd because the JS reference keeps it alive, but it is invisible to the user.

2. **Forgotten event listeners**: `addEventListener` creates a reference from the event target to the callback. If the callback closes over large objects or components, they cannot be freed as long as the listener is attached. Always call `removeEventListener` in cleanup code (React's `useEffect` return, `componentWillUnmount`).

3. **Closures holding large scopes**: A closure inadvertently captures a large array or buffer. As long as the closure is alive (e.g., stored in a module-level variable), the captured data lives too.

4. **Timers and intervals**: A `setInterval` callback references data; if never cleared, both the interval and its closed-over data live forever.

5. **Caches without eviction**: A `Map` or plain object used as a cache grows indefinitely. `WeakMap` is the correct structure when keys are objects and you want automatic eviction when the key object is no longer referenced elsewhere.

Detection: Chrome DevTools Memory panel — take heap snapshots before and after an operation; look for growing retained size. The "Allocation instrumentation on timeline" records allocations over time. `performance.memory` in Chrome (non-standard) shows JS heap size programmatically. Look for "Detached HTMLElement" nodes in snapshots.

### Key Points
- JavaScript uses mark-and-sweep GC: objects reachable from GC roots survive; unreachable objects are freed
- Generational GC splits the heap into young (minor GC, frequent, cheap) and old (major GC, infrequent, expensive) generations
- Common leak sources: detached DOM nodes, forgotten event listeners, uncleaned timers, unbounded caches
- Use `WeakMap`/`WeakSet` for object-keyed caches — they hold weak references and allow automatic GC of keys
- Chrome DevTools Memory panel heap snapshots and allocation timelines are the primary detection tools

### Follow-up Prompts
- How would you find a memory leak in a React application where the heap grows after navigating between routes?
- What is the difference between a memory leak and excessive memory allocation that is properly freed?
- How does `FinalizationRegistry` allow you to observe when an object is garbage collected?

### Difficulty: advanced
### Tags: garbage collection, memory leaks, V8, generational GC, WeakMap, heap, DevTools

---
