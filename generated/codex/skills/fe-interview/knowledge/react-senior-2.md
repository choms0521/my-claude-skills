# React - Senior Interview Questions (Part 2)
### Language: en

## Q11: What is the React Compiler (React Forget) and how does it change the memoization story?

### Question
Explain the React Compiler (previously called React Forget). What problem does it solve, how does it work at a high level, and what does it mean for the future of useMemo, useCallback, and React.memo?

### Model Answer
The React Compiler is an ahead-of-time compiler that automatically applies memoization to React components and hooks. It was developed under the internal codename "React Forget" and was open-sourced and released as part of the React 19 ecosystem. Its primary goal is to eliminate the need for manual memoization — removing the burden of writing `useMemo`, `useCallback`, and `React.memo` from application developers.

The core problem it solves is the friction and error-proneness of manual memoization. Correctly applying `useMemo` and `useCallback` requires understanding React's rendering model deeply, correctly specifying dependency arrays, and knowing which computations are expensive enough to warrant caching. Get a dependency wrong and you get stale data; over-memoize and you add unnecessary complexity without performance gains. Even experienced React developers frequently make mistakes. The React Compiler automates this analysis at build time.

At a high level, the compiler performs static analysis of your component and hook source code. It builds a data-flow graph of how values relate to each other — which props, state values, and derived values depend on which inputs. Using this graph, it identifies which values and computations are "stable" (won't change between renders unless their inputs change) and automatically wraps them in the equivalent of `useMemo` or `useCallback`. The output is standard JavaScript — the compiler transforms your source into code that uses React's existing primitives, so no new runtime is needed.

The compiler enforces the Rules of React strictly. Components must be pure (no side effects during render), hooks must be called unconditionally, and state must not be mutated. Code that violates these rules cannot be safely optimized and the compiler will either skip that component or emit an error. This is a forcing function that makes the Rules of React more consequential — previously they were guidelines, now they are a hard requirement for compiler eligibility.

For new codebases using the compiler, `useMemo`, `useCallback`, and `React.memo` are largely unnecessary. The compiler makes them redundant. For existing codebases, a gradual migration is possible — the compiler can be enabled per directory or per file. The broader implication is that React's performance model shifts from "opt-in memoization" to "automatic memoization with opt-out for special cases," which significantly lowers the expertise bar needed to write performant React applications.

### Key Points
- React Compiler automatically applies memoization at build time, eliminating manual useMemo/useCallback/React.memo
- Works via static data-flow analysis — identifies stable values and wraps them at compile time
- Outputs standard JavaScript using existing React primitives (no new runtime overhead)
- Strictly enforces Rules of React — violating components are skipped or flagged
- Ships with React 19; signals a shift from opt-in to automatic memoization in React

### Follow-up Prompts
- How does the React Compiler handle components that violate the Rules of React?
- Are there cases where manual useMemo is still necessary even with the React Compiler?
- How would you incrementally adopt the React Compiler in a large existing codebase?

### Difficulty: advanced
### Tags: react-compiler, react-forget, memoization, react-19, performance

---

## Q12: How does streaming SSR with Suspense work in React 18?

### Question
Explain how React 18's streaming SSR works in combination with Suspense. What problem does it solve compared to traditional SSR, and how does it achieve this technically?

### Model Answer
Traditional SSR (Server-Side Rendering) has an "all-or-nothing" waterfall problem. The server must fetch all data needed for the entire page before it can render any HTML. Then the entire HTML must be sent to the client before the browser can start parsing. Then all JavaScript must be downloaded and parsed before hydration can begin. Finally, hydration must complete for the entire page before any component becomes interactive. Each phase must wait for the slowest part of the page.

React 18's streaming SSR with Suspense breaks this waterfall by sending HTML in chunks (streaming) as it becomes ready. You wrap slow parts of your component tree in `<Suspense fallback={<Spinner />}>`. The server renders everything it can immediately — the shell of the page including fast-loading parts — and streams that HTML to the browser. Slow parts (wrapped in Suspense) initially render as their fallback. When the slow component's data is ready, React streams additional HTML chunks containing the real content, along with inline `<script>` tags that instruct the browser to replace the fallback with the real content in place.

This enables three key improvements over traditional SSR. First, streaming HTML: the browser receives and renders the fast parts of the page immediately without waiting for slow parts. Second, selective hydration: React can hydrate fast parts of the page before slow parts have even arrived. The HTML is ready, so React hydrates components as their chunks stream in, rather than waiting for the entire page. Third, prioritized hydration: if the user interacts with a part of the page that has not yet been hydrated, React prioritizes hydrating that part first — the user's intent signals which components are most urgent.

Implementation requires a streaming-capable Node.js server. You use `renderToPipeableStream` (Node.js streams) or `renderToReadableStream` (Web Streams, Deno/Edge). The framework handles the streaming plumbing. Next.js App Router implements this automatically — any `async` server component that awaits data is implicitly wrapped in Suspense-compatible streaming. You explicitly add `<Suspense>` boundaries to control the fallback UI for each async section.

The key constraint is that Suspense for data fetching (as opposed to lazy-loaded components) requires your data fetching layer to support the Suspense protocol — throwing a Promise that React can catch and await. TanStack Query, SWR with Suspense mode, and Next.js's built-in fetch caching all support this. You cannot make an arbitrary `useEffect`-based fetch work with Suspense boundaries.

### Key Points
- Traditional SSR has all-or-nothing waterfall: fetch all → render all → send all → hydrate all
- Streaming SSR sends HTML chunks as they're ready; Suspense fallbacks replaced by real content when data arrives
- Enables three improvements: streaming HTML early, selective hydration, user-interaction-prioritized hydration
- Requires `renderToPipeableStream`/`renderToReadableStream` instead of `renderToString`
- Data fetching must use the Suspense protocol (throw a Promise) — useEffect-based fetching is incompatible

### Follow-up Prompts
- What is the difference between `renderToString` and `renderToPipeableStream`?
- How does React know which part of the streamed HTML corresponds to which Suspense boundary?
- What happens to a user's interaction on a non-yet-hydrated part of the page?

### Difficulty: advanced
### Tags: streaming-ssr, suspense, react-18, server-rendering, hydration

---

## Q13: What is Partial Prerendering (PPR) and how does it relate to React?

### Question
Explain Partial Prerendering. What is it, how does it combine static and dynamic rendering, and how does it use React's Suspense model?

### Model Answer
Partial Prerendering (PPR) is a rendering strategy introduced experimentally in Next.js 14 that combines static prerendering with dynamic streaming in a single request. It uses React's Suspense model as the boundary between static and dynamic content. The fundamental idea is that most pages have a static "shell" — the layout, navigation, and non-personalized content — and dynamic "holes" — personalized content, real-time data, or user-specific information. PPR prebuilds the static shell at build time and streams the dynamic holes at request time.

When a PPR-enabled page is requested, the server immediately responds with the prebuilt static HTML shell. This response time is essentially zero — no server computation required, equivalent to serving a static file from a CDN. The dynamic holes are represented by their Suspense fallbacks in the initial HTML. Simultaneously, the server begins executing the dynamic components and streams their real content to the browser as it becomes available. From the user's perspective, they see the page shell almost instantly, then watch the dynamic parts fill in.

PPR uses `<Suspense>` as the literal syntax for declaring PPR boundaries. Components outside any Suspense boundary are prerendered statically. Components inside a Suspense boundary are candidates for dynamic rendering. The static/dynamic split is determined at build time by analyzing which components access dynamic data sources — cookies, headers, or uncached fetches. This analysis is automatic; you do not manually mark components as static or dynamic beyond the Suspense structure.

Architecturally, PPR represents the convergence of static site generation (SSG), server-side rendering (SSR), and streaming into a single model. The static shell gets CDN-level performance for the initial bytes. The dynamic parts get fresh data on every request. Neither approach requires choosing between freshness and performance — you get both within the same page.

The React pieces enabling this are `<Suspense>` for declaring boundaries and streaming SSR (`renderToPipeableStream`) for sending the static shell immediately and then streaming dynamic content. The framework (Next.js) implements the infrastructure: build-time static analysis, CDN caching of the shell, and the streaming runtime. PPR is not a React feature per se but a framework-level architecture built on React primitives.

### Key Points
- Combines static prerendering (build time) and dynamic streaming (request time) on the same page
- Static shell served instantly from CDN; dynamic Suspense boundaries streamed as data resolves
- Uses `<Suspense>` as the literal PPR boundary — components inside are dynamic, outside are static
- Build-time analysis determines which components need dynamic rendering based on data sources used
- Not a React feature — a Next.js architecture built on React's Suspense and streaming SSR primitives

### Follow-up Prompts
- How does PPR differ from ISR (Incremental Static Regeneration)?
- What happens if a dynamic component inside a PPR boundary throws an error?
- How would you migrate a Next.js page from full SSR to PPR?

### Difficulty: advanced
### Tags: partial-prerendering, ppr, next-js, static-rendering, suspense

---

## Q14: What is React Native's New Architecture and what problems does it solve?

### Question
Explain React Native's New Architecture. What are JSI, Fabric, and TurboModules? What problems does the new architecture solve compared to the old bridge-based architecture?

### Model Answer
React Native's original "bridge" architecture had a fundamental limitation: communication between JavaScript and native code was asynchronous, serialized (JSON), and batched. Every interaction between JS and native — calling a native function, updating the UI, handling a touch event — went through this bridge. The bridge serialized function arguments to JSON, passed them across the thread boundary, and deserialized them on the other side. This created latency and prevented synchronous access to native APIs.

The New Architecture addresses this with three interconnected components. JSI (JavaScript Interface) is the foundational change — it replaces the JSON bridge with a C++ layer that allows JavaScript to hold references to native C++ objects and call their methods directly, synchronously, without serialization. JSI is not specific to React Native; it is an interface for embedding JavaScript engines (Hermes, V8, JavaScriptCore) that allows bidirectional synchronous communication.

TurboModules is the new native modules system built on JSI. Previously, all native modules were initialized eagerly at startup even if they were never used. TurboModules are loaded lazily — a module is initialized only when it is first accessed. JavaScript can call native module methods synchronously when needed (though async is still the default for network calls and other inherently async operations). This improves startup time and eliminates the performance cost of unused modules.

Fabric is the new rendering engine. Previously, the bridge serialized UI updates as JSON and the shadow tree (layout calculation) ran on a separate thread. Fabric uses JSI to allow synchronous communication between JS and the native UI thread. The shadow tree is now C++ code shared across iOS and Android, and it can be synchronized with the JavaScript thread. This enables features that were previously impossible: synchronous layout measurement, direct manipulation of native views without the bridge, and better integration with concurrent React features.

The combined result of these changes is that React Native can now use React 18's concurrent features properly. Suspense, transitions, and concurrent rendering require the ability to interrupt and resume rendering, which requires tighter synchronization between JS and native than the old bridge allowed. The New Architecture also improves the experience of integrating React Native with existing native apps, since JSI modules can be called from both JS and native code directly.

### Key Points
- Old architecture: async JSON bridge between JS and native — creates latency, no synchronous access
- JSI: C++ interface allowing synchronous, direct JS-to-native calls without serialization
- TurboModules: lazy-loaded native modules via JSI — improves startup time, enables synchronous calls
- Fabric: new C++ rendering engine — shared shadow tree, synchronous layout, concurrent React support
- New Architecture enables React 18 concurrent features in React Native

### Follow-up Prompts
- Why was the old bridge architecture's serialization a fundamental limitation rather than just an optimization issue?
- How does Fabric's synchronous layout enable features like measuring native components during render?
- What is Hermes and how does it relate to the New Architecture?

### Difficulty: advanced
### Tags: react-native, new-architecture, jsi, fabric, turbo-modules

---

## Q15: What is the RSC payload format and how does React Server Components transfer data?

### Question
Explain the React Server Components (RSC) wire format/payload. How does React transfer server-rendered component trees to the client, and why is it different from HTML or JSON?

### Model Answer
React Server Components use a custom streaming protocol — sometimes called the "RSC payload" or "React Flight" protocol — to transfer the server-rendered component tree to the client. This is distinct from both HTML (which SSR produces) and JSON (which REST APIs return). Understanding this format reveals fundamental design choices about how RSC handles streaming, references, and client/server component boundaries.

The RSC payload is a line-delimited text format where each line is a JSON-like entry with a type identifier. Component trees are serialized as JavaScript module references and component output trees. A server component that renders `<div className="foo"><ClientComponent data={obj} /></div>` produces an entry describing this tree structure. The interesting part is how client components are handled: they appear as references — module paths and exported names — plus serialized props. The client receives enough information to know which JavaScript module to load and what props to pass, without needing to re-execute the server component.

Streaming is built into the protocol. Because server components can be async (awaiting data), different parts of the tree complete at different times. Each completed subtree is sent as a new entry in the stream. The client runtime processes entries as they arrive, updating a partial tree and triggering re-renders as new data comes in. This is why React can show Suspense fallbacks and replace them with real content progressively — the protocol supports incremental delivery.

Lazy references allow the protocol to handle module imports across the server/client boundary. When a server component renders a client component, the payload includes a reference like `{$$typeof: Symbol(react.client.reference), $$id: 'path/to/Component.js#ComponentName'}`. The client React runtime looks up this reference in its module manifest and dynamically imports the module if needed. This is how code splitting integrates with RSC — client components are only sent to the browser if they appear in the rendered tree.

Props passed from server to client components must be serializable using this protocol. Primitives, plain objects, arrays, Dates, BigInts, and React elements (including server-rendered ones) are supported. Functions, class instances, and closures are not — they cannot cross the server/client boundary. This constraint is fundamental to the RSC model and is why you cannot pass event handlers directly from server components to client components.

### Key Points
- RSC payload (React Flight) is a custom line-delimited streaming protocol, not HTML or JSON
- Encodes component trees as module references + props for client components, and full tree output for server components
- Supports streaming — each completed async subtree is sent as a new entry, enabling progressive rendering
- Client components appear as lazy references (module path + export name); props must be serializable
- Functions and closures cannot cross the server/client boundary — a fundamental architectural constraint

### Follow-up Prompts
- Why can RSC pass React elements as props to client components but cannot pass functions?
- How does the RSC payload interact with HTTP caching compared to traditional SSR HTML?
- What is React Flight and how does it relate to RSC's streaming capabilities?

### Difficulty: advanced
### Tags: rsc, react-server-components, rsc-payload, react-flight, serialization

---

## Q16: What is Islands Architecture and how does it relate to React?

### Question
Explain Islands Architecture. What problem does it solve with traditional React SSR/SPA, and how do frameworks like Astro implement it?

### Model Answer
Islands Architecture is a rendering strategy where a server-rendered HTML page contains isolated, independently hydrated interactive regions called "islands." The surrounding static content — text, images, layout — is never hydrated and never requires JavaScript. Only the interactive portions (islands) ship JavaScript and hydrate client-side. This is a fundamentally different model from traditional React SPAs or even standard SSR, where the entire page is hydrated as a single React tree.

The problem it solves is JavaScript payload bloat in content-heavy sites. A traditional React SSR page renders HTML on the server (good for initial load), but then ships the entire React runtime plus all component code to the client for hydration (bad — often hundreds of kilobytes of JS). For a blog post with one interactive "share" button, the entire post's React components are hydrated even though 99% of the page is static content that does not need it. Users pay the JS cost for interactivity they may never use.

In Islands Architecture, each island is an independently hydrated component with its own root. Static HTML surrounds the islands without any JavaScript attached. Astro implements this via its component model: plain `.astro` files are templates that render only on the server to static HTML. To make a component interactive, you use a framework integration directive like `<ReactComponent client:visible />`. The `client:visible` directive tells Astro to ship the JavaScript for `ReactComponent` and hydrate it only when it enters the viewport (using IntersectionObserver). Other directives include `client:load` (hydrate immediately), `client:idle` (hydrate during idle time), and `client:only` (skip SSR, render client-side only).

The isolation between islands is a key architectural property. Islands do not share a React root, so they do not share React context or state. Each island manages its own state independently. Cross-island communication must use non-React mechanisms: browser events, URL parameters, or external stores like nanostores or Zustand stores (reading from a shared module). This is a genuine constraint that makes Islands Architecture unsuitable for highly interconnected UIs where many components share state.

React Server Components can be seen as a convergence of Islands Architecture ideas into React's model. RSC's "client components" are conceptually islands — they have JavaScript, they hydrate, they are interactive. "Server components" are the surrounding static content. The key difference is that RSC maintains a unified React component tree model with context, composition, and shared state, whereas traditional Islands Architecture sacrifices these for simpler isolation.

### Key Points
- Islands: independently hydrated interactive regions in otherwise static server-rendered HTML
- Eliminates JS hydration cost for static content — only interactive islands ship and run JavaScript
- Islands cannot share React context or state — cross-island communication requires external mechanisms
- Astro implements islands with `client:` directives that control when/if a component hydrates
- React Server Components converge Islands ideas into React's model while preserving the component tree

### Follow-up Prompts
- How would you implement cross-island state sharing in an Astro application?
- What is the difference between `client:load` and `client:visible` in Astro, and when would you use each?
- How does Islands Architecture compare to RSC's model of server vs. client components?

### Difficulty: advanced
### Tags: islands-architecture, astro, ssr, hydration, performance

---

## Q17: What is resumability (as in Qwik) and how does it compare to React's hydration model?

### Question
Explain the concept of resumability as implemented in Qwik. How does it fundamentally differ from React's hydration approach, and what are the trade-offs?

### Model Answer
Resumability is an alternative to hydration invented by Miško Hevery (creator of AngularJS) and implemented in the Qwik framework. The core insight is that hydration is fundamentally a replay of work already done on the server — the client re-executes component functions to reconstruct event listeners, state, and the component tree, even though the server already did this. Resumability eliminates this replay by serializing all the necessary state into the HTML so the client can resume exactly where the server left off, without re-executing any component code upfront.

React's hydration works by sending a complete JavaScript bundle to the client, executing it, constructing the component tree in memory (using the server-rendered HTML as a reference), attaching event listeners, and marking the app as interactive. The amount of JavaScript executed scales with the size of your component tree. A page with 500 components executes all 500 component functions during hydration before the page is interactive, even if the user only interacts with one component.

Qwik serializes three things into the HTML: the application state (all component state values, encoded in `<script type="qwik/json">` tags), the component hierarchy and scope information (which component owns which state), and listener locations (which DOM elements have which event handlers, referencing lazy-loadable functions). The client starts with no JavaScript executed. When the user first interacts — say, clicking a button — Qwik loads only the tiny event handler for that specific button, executes it, and updates the DOM. No other component code runs until needed.

This achieves O(1) startup time regardless of application size — the initial JavaScript executed is essentially zero, just a small Qwik loader. React's startup time is O(n) where n is the size of the hydrated component tree. For very large applications, this difference is significant. Qwik achieves "instant startup" that gets better benchmarks on tools like Lighthouse even for large applications.

The trade-offs are significant. Serializing all state into HTML increases HTML payload size. The serialization format must handle circular references and complex JavaScript objects — Qwik uses a custom serializer. First-interaction latency may actually be higher than React for complex interactions, because Qwik must fetch and execute handler code lazily. The programming model is different — components use `component$()` and event handlers use `$()` syntax to mark lazy-loadable boundaries. This is a framework-level concept that requires learning Qwik's specific patterns rather than standard JavaScript closures.

React's direction with RSC and the React Compiler is a pragmatic middle ground: reduce the client JavaScript by keeping more on the server (RSC) and reduce hydration cost with better tooling. True resumability as Qwik implements it would require a fundamental rethinking of React's execution model.

### Key Points
- Resumability serializes all state, hierarchy, and listener locations into HTML — client resumes without re-executing component code
- React hydration re-executes all component code on the client (O(n) startup), Qwik has O(1) startup regardless of app size
- Qwik loads handler code lazily on first user interaction — no JS runs upfront
- Trade-offs: larger HTML payload, different programming model (`component$`, `$()` syntax), higher first-interaction latency for complex handlers
- React's RSC + Compiler approach reduces the problem pragmatically rather than solving it architecturally

### Follow-up Prompts
- What is the JavaScript loading cost of a Qwik application vs. a React application after the user has been on the page for 5 minutes?
- How does Qwik handle routing and navigation between pages differently from React?
- Could React ever implement true resumability without breaking backward compatibility?

### Difficulty: advanced
### Tags: resumability, qwik, hydration, performance, framework-comparison

---

## Q18: How do you use React DevTools Profiler for deep performance analysis?

### Question
Explain how to use the React DevTools Profiler for in-depth performance analysis. What metrics does it expose, how do you interpret a flame graph, and what are the most actionable things you can find?

### Model Answer
The React DevTools Profiler records rendering performance data for your React application. You open it in the browser's DevTools under the "Profiler" tab (after installing the React DevTools extension), press "Record," interact with your app, and stop recording. The profiler shows exactly which components rendered, how long each render took, and why each component rendered.

The flame graph is the primary view. Each bar represents a component, and the width corresponds to how long that component and its descendants took to render. Yellow/orange bars indicate relatively expensive renders; grey indicates a component did not render during this commit. The commit selector at the top lets you step through individual renders (commits) — each commit is one synchronous batch of state updates that React applied to the DOM.

The most critical piece of information in each commit is the "Why did this component render?" annotation. When you click a component, the profiler shows the cause: props changed (with which props), state changed (with which state), context changed, or the component's parent rendered and the component did not have `React.memo`. This directly tells you where to apply memoization. A component re-rendering because its parent rendered but its props did not change is the primary target for `React.memo`.

The "Ranked" chart shows components sorted by render duration, making it easy to find the most expensive component in a commit. This is where you identify which components to optimize first — focus on the largest bars. A component that renders in 50ms repeatedly is more worth optimizing than one that renders in 0.5ms a hundred times.

The "Timeline" view (available in React 18) shows when transitions, Suspense boundaries, and concurrent features activate. You can see when a transition started, when it completed, and whether it was interrupted. This is essential for debugging `useTransition` and `useDeferredValue` usage.

Actionable patterns to look for: components at the top of the tree rendering frequently with unchanged props (add `React.memo`), expensive computations inside render (move to `useMemo`), context consumers re-rendering when only unrelated context values changed (split context), list items re-rendering entirely when only one item changes (add keys and `React.memo` to list item component), and components rendering far more times than expected due to object/function prop identity issues (stabilize with `useMemo`/`useCallback` or restructure).

### Key Points
- Flame graph: bar width = render duration; yellow = expensive; clicking shows "why did this render"
- "Why did this render" is the most actionable information — directly identifies memoization targets
- Ranked chart: sorts components by render duration — prioritize largest bars for optimization
- Timeline view (React 18): shows concurrent features, transitions, Suspense boundary states
- Key patterns: prop-identical re-renders (add React.memo), context churn (split context), list re-renders (memo + stable keys)

### Follow-up Prompts
- How do you identify a context that is causing too many re-renders using the Profiler?
- What does it mean when a component shows "rendered by parent" in the Profiler?
- How would you use the Profiler to measure the impact of adding React.memo to a component?

### Difficulty: advanced
### Tags: react-devtools, profiler, performance, memoization, debugging

---

## Q19: How do you build a custom React renderer?

### Question
Explain what a custom React renderer is, how you build one using `react-reconciler`, and give examples of real-world custom renderers.

### Model Answer
A custom React renderer is a target-agnostic implementation of React's rendering backend that outputs to something other than the DOM. React's architecture separates the reconciler (the algorithm that computes what changed and what needs to be created/updated/deleted) from the host environment implementation (the code that actually creates DOM nodes, updates properties, etc.). The `react-reconciler` package exposes the reconciler as a library that you can connect to any output target by implementing a "host config" — a set of functions that tell React how to create, update, and manage elements in your target environment.

The host config is the core of a custom renderer. You implement functions like `createInstance` (create a new element of a given type with given props), `appendInitialChild`/`appendChild`/`insertBefore`/`removeChild` (manage the element hierarchy), `commitUpdate` (apply prop changes to an existing element), `createTextInstance` (create a text node), and many others. The reconciler calls these functions during its work phases — creation, updates, and deletions — and you implement what actually happens in your environment.

To create a renderer: `const MyRenderer = ReactReconciler(hostConfig); const root = MyRenderer.createContainer(container, ...); MyRenderer.updateContainer(<App />, root, null, null)`. The `container` is your target's root object — a canvas context, a PDF document object, a terminal screen buffer, or anything your output environment uses.

Real-world custom renderers demonstrate the breadth of this approach. `react-three-fiber` is a React renderer for Three.js — JSX elements like `<mesh>`, `<boxGeometry>`, and `<meshStandardMaterial>` create and configure Three.js objects in a scene graph. `react-pdf` renders React components to PDF documents using PDFKit. `ink` renders React components to terminal output (text-based UIs in the command line). `react-test-renderer` (part of React itself) is a custom renderer that outputs a JSON tree — used for snapshot testing and as a simpler environment than the DOM.

Building a custom renderer requires understanding React's fiber architecture at a conceptual level. React works in two phases: the "render phase" (pure computation, can be interrupted in concurrent mode) where it calls `createInstance` and prepares changes, and the "commit phase" (synchronous, cannot be interrupted) where it calls `commitUpdate`, `appendChild`, etc. to apply changes to the host environment. Your host config functions must be categorized correctly as belonging to the render or commit phase.

Custom renderers are how React achieves "learn once, write anywhere" — the same React programming model (components, hooks, state, context, Suspense) works across web, mobile (React Native), 3D (react-three-fiber), terminal (ink), and PDF (react-pdf) because each has a custom renderer implementing the host config for its environment.

### Key Points
- Custom renderers connect React's reconciler to any output target by implementing a "host config" of lifecycle functions
- `react-reconciler` package exposes the reconciler; you implement `createInstance`, `commitUpdate`, `appendChild`, etc.
- Render phase (can interrupt) vs. commit phase (synchronous) — host config functions belong to one of these phases
- Real examples: react-three-fiber (Three.js), react-pdf, ink (terminal), react-test-renderer
- Enables "learn once, write anywhere" — same React mental model across all target environments

### Follow-up Prompts
- What is the difference between the render phase and commit phase in React's reconciler, and why does it matter for custom renderers?
- How does react-three-fiber map React's JSX elements to Three.js objects?
- What is the `isPrimaryRenderer` flag in the host config and when would you set it to false?

### Difficulty: advanced
### Tags: custom-renderer, react-reconciler, fiber, react-three-fiber, ink

---

## Q20: What is the signals vs. hooks debate, and what are the architectural implications?

### Question
Explain the signals model (as in Solid.js, Angular, Preact Signals) versus React's hooks model. What are the architectural differences, trade-offs, and what does this debate mean for React's future?

### Model Answer
Signals are a fine-grained reactivity primitive where each piece of state is an observable value (a "signal"), and computations that read a signal automatically subscribe to it. When a signal updates, only the specific computations that read that signal re-run — not the entire component. This is fundamentally different from React's model where state is owned by components and any state change triggers a re-render of that component and potentially its entire subtree.

In React, re-renders are the unit of update. When `setCount(count + 1)` fires, React re-renders the entire component function. React then diffs the new output against the previous output and commits only the real DOM changes. Memoization (`React.memo`, `useMemo`, `useCallback`) reduces unnecessary re-renders by helping React skip subtrees when inputs have not changed. But the re-render (component function call) still happens unless memoization explicitly prevents it.

In a signals-based system like Solid.js or Preact Signals, the component function runs only once — during initial mount. After that, only the fine-grained reactive computations inside the JSX (template expressions) re-run when their specific signals change. `<span>{count()}</span>` — when `count` signal updates, only this specific DOM node updates, without re-running the component function at all. This eliminates the entire class of "unnecessary re-render" performance problems that React developers fight against.

The Solid.js model achieves this by compiling JSX into fine-grained DOM operations rather than a virtual DOM. There is no VDOM diffing — changes go directly to the DOM. Solid's performance benchmarks are consistently better than React's because there is simply less work: no virtual DOM creation, no diffing, no reconciliation for updates. Only the minimal DOM mutations happen.

Preact Signals take a pragmatic middle path: they bring signals to React's ecosystem. `@preact/signals-react` integrates signals with React's existing component model. Signal reads inside JSX are automatically tracked and cause fine-grained DOM updates, bypassing React's normal re-render cycle. This is achieved through some React internals manipulation that is not officially supported — it is a pragmatic approach that works but relies on React implementation details.

React's response is the React Compiler: rather than switching to fine-grained reactivity at the language level, the compiler makes React's existing model (virtual DOM + memoization) dramatically more efficient by automating memoization. The architectural debate is essentially "change the reactivity model" (signals) vs. "make the current model fast enough through tooling" (React Compiler). React has committed to the latter, betting that the existing model's simplicity and ecosystem are worth preserving, and that compilation can close the performance gap.

### Key Points
- Signals: each state value is observable; only computations reading a changed signal re-run (no component re-renders)
- React hooks: state change triggers component re-render; VDOM diff determines actual DOM changes
- Solid.js compiles JSX to fine-grained DOM operations — no VDOM, no diffing, components run once
- Preact Signals: brings signals to React but requires React internals manipulation (unofficial)
- React's answer is the React Compiler: automate memoization to make re-render-based model efficient enough

### Follow-up Prompts
- Why does Solid.js's component function run only once, while React's runs on every state change?
- What are the debugging trade-offs between signals-based reactivity and React's re-render model?
- How does Angular's adoption of signals affect the broader JavaScript ecosystem's view of the signals vs. hooks debate?

### Difficulty: advanced
### Tags: signals, hooks, solid-js, reactivity, react-compiler, preact-signals

---
