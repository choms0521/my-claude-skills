# Performance - Senior Interview Questions
### Language: en

## Q1: How do you establish and enforce performance budgets?

### Question
What are performance budgets, how do you define meaningful thresholds, and how do you integrate budget enforcement into a CI/CD pipeline to prevent regressions?

### Model Answer
A performance budget is a set of limits on metrics that directly impact user experience — if the application exceeds these limits, a build fails or an alert fires. Budgets shift performance from a periodic concern into a continuous, enforceable engineering constraint.

**Defining meaningful budgets** requires grounding thresholds in real-world data. Start with field data from the Chrome UX Report (CrUX) or your existing RUM data to understand your 75th-percentile user experience. Common budget types include: timing budgets (LCP < 2.5s, INP < 200ms, TTI < 3.5s), quantity budgets (total JS < 300 KB gzipped, total images < 500 KB, total requests < 50), and rule-based budgets (Lighthouse performance score > 90). Google recommends budgeting against the 75th percentile, not median, because you want to protect even slower users.

**Tooling for enforcement:** `size-limit` (npm) is the most developer-friendly tool — it measures the actual download and parse cost of your JS and fails the CI step if limits are exceeded. Configure it in `package.json` or `.size-limit.json`. Lighthouse CI (`@lsci/cli`) runs Lighthouse headlessly in CI and can fail based on any Lighthouse audit including CWV timings. `bundlesize` is a simpler alternative for raw file size limits. `webpack-bundle-analyzer` can be used with custom scripts to assert on chunk sizes.

**CI/CD integration pattern:** In a GitHub Actions workflow, run `size-limit` on every PR. Post the results as a PR comment (using `size-limit/pr-feedback` action) showing the diff in bundle size between base and head. Gate merging on budget pass. For Lighthouse CI, deploy a preview deployment first, then run `lhci autorun` against it. Store Lighthouse CI reports in LHCI server or Google Cloud Storage for historical trending.

**Budget governance:** Budgets that are too strict create constant exceptions and lose meaning; too loose and they catch nothing. The right approach is to set budgets at 10-20% above your current metrics so there is headroom for legitimate growth, then tighten them over time. Pair budgets with a performance backlog so any budget breach generates a ticket rather than just a failed build in isolation.

### Key Points
- Budgets should be grounded in field data (CrUX, RUM) at the 75th percentile
- `size-limit` is the most practical tool for JS bundle size budgets in CI
- Lighthouse CI enables timing-based budgets (LCP, TTI) by running against preview deployments
- Post budget results as PR comments to create visibility without blocking trivially
- Set budgets at 10-20% above current metrics and tighten over time

### Follow-up Prompts
- How do you handle a situation where a critical feature genuinely requires exceeding the performance budget?
- How would you set up LHCI server to track Lighthouse scores over time and alert on regressions?
- What is the relationship between performance budgets and SLOs (Service Level Objectives)?

### Difficulty: advanced
### Tags: performance-budget, CI-CD, size-limit, Lighthouse-CI, regression-prevention

---

## Q2: Explain the browser rendering pipeline — layout, paint, and composite.

### Question
Walk through the full browser rendering pipeline from JavaScript execution to pixels on screen. Explain what triggers layout (reflow), paint, and composite, and how you write CSS and JavaScript that avoids expensive pipeline stages.

### Model Answer
Understanding the rendering pipeline is essential for diagnosing and fixing frame-rate issues. The pipeline has several stages, and triggering earlier stages is progressively more expensive.

**The full pipeline:** JavaScript → Style → Layout → Paint → Composite. Not every frame must go through all stages — this is the key optimization insight.

**Style calculation** happens when CSS rules are matched to DOM elements and computed styles are determined. Large, complex selectors and frequent class changes are expensive here. Prefer simple class-based changes over inline style modifications of many properties.

**Layout (Reflow)** recalculates the geometry of every element affected by a change. It is expensive because a single element's size change can affect its siblings, parents, and children. Anything that reads or writes a geometric property triggers layout: `offsetWidth`, `offsetHeight`, `getBoundingClientRect()`, `scrollTop`, `clientHeight`, and writing `width`, `height`, `margin`, `padding`, `top`, `left`. Layout thrashing occurs when you alternately read and write layout properties in a loop — the browser must flush and recalculate layout on every read. Fix by batching reads first, then writes (or use `FastDOM`).

**Paint** fills in the pixels for elements — colors, borders, box shadows, text. It is cheaper than layout but still significant. Expensive paint properties include `box-shadow`, `filter`, `border-radius` on large elements, and background gradients. The browser paints into layers.

**Composite** happens on the GPU thread. It takes the painted layers and assembles them into the final frame. This is the cheapest stage. Properties that only trigger composite and skip layout and paint: `transform` and `opacity`. This is why you animate with `transform: translateX()` instead of `left`, and `opacity` instead of `display`.

**`will-change`** hints to the browser that an element will be animated, promoting it to its own compositor layer in advance. Use it sparingly — each layer consumes GPU memory. Apply it only to elements that actually animate: `will-change: transform`. Remove it when animation completes.

**Forced synchronous layout** is the performance anti-pattern of reading a layout property after writing styles in the same frame. The browser must synchronously complete layout before returning the value. Always read before write within a frame.

### Key Points
- The pipeline: JavaScript → Style → Layout → Paint → Composite; triggering earlier stages is more expensive
- `transform` and `opacity` only trigger composite, skipping layout and paint — always animate these
- Layout thrashing (read-write-read-write in a loop) forces multiple synchronous layouts; batch reads then writes
- `will-change: transform` promotes an element to its own layer, but overuse wastes GPU memory
- Use Chrome DevTools Performance panel to identify which pipeline stages are consuming frame budget

### Follow-up Prompts
- How does the browser decide which elements get their own compositor layer?
- What is the difference between `contain: layout` and `contain: strict`, and how do they optimize rendering?
- How would you diagnose a "jank" problem — a page that drops frames during scrolling — using DevTools?

### Difficulty: advanced
### Tags: rendering-pipeline, layout, paint, composite, will-change, performance

---

## Q3: When and how do you use Web Workers and SharedArrayBuffer?

### Question
Explain when to move work off the main thread using Web Workers, how communication works, what SharedArrayBuffer enables, and the security requirements around it. Describe real-world use cases.

### Model Answer
The browser's main thread handles JavaScript execution, layout, paint, user input, and animations — all competing for the same 16ms frame budget. Heavy computation on the main thread causes jank. Web Workers allow computationally intensive work to run on separate OS threads.

**Web Worker basics:** A worker is created with `new Worker('worker.js')`. The worker runs in a completely separate global scope — no DOM access, no `window`. Communication happens via `postMessage()` and `onmessage`, which serialize data using the structured clone algorithm. The main thread posts a task, the worker processes it, and posts the result back. The key limitation is that data is copied (serialized and deserialized), which has cost for large payloads.

**Transferable objects** solve the copy cost for large binary data. `ArrayBuffer`, `ImageBitmap`, and `MessagePort` can be transferred rather than copied — the buffer is moved to the worker, and the main thread loses access. This is zero-copy: `postMessage(arrayBuffer, [arrayBuffer])`. After transfer, `arrayBuffer.byteLength === 0` on the sender.

**SharedArrayBuffer (SAB)** allows truly shared memory between the main thread and workers — multiple threads read and write the same memory without copying. This enables high-performance patterns like WebAssembly threads and lock-free data structures using `Atomics`. However, SAB was disabled in 2018 after Spectre/Meltdown and was re-enabled only with strict security requirements: the page must be served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. These headers isolate the browsing context, preventing Spectre-style timing attacks.

**Real-world use cases:** Image processing (resizing, filtering, color manipulation) — pass `ImageData` to a worker; heavy data transformations (parsing large JSON, CSV processing, sorting 100K+ records); WebAssembly-heavy computation (physics engines, video encoding); Partytown (moves third-party scripts like analytics into a worker, freeing the main thread); PDF generation; and cryptographic operations.

**Comlink** (by Google Chrome Labs) is a library that wraps the postMessage API with a Proxy-based RPC interface, making workers feel like async function calls rather than message passing. It significantly reduces the boilerplate of worker communication.

### Key Points
- Web Workers run JavaScript on a separate thread, preventing main thread blocking
- Data is copied via structured clone by default; use Transferable objects for large ArrayBuffers to avoid copy cost
- SharedArrayBuffer enables true shared memory but requires COOP/COEP security headers
- `Atomics` provides thread-safe operations (wait, notify, compare-and-swap) on SharedArrayBuffer
- Use Comlink to simplify worker communication with a Proxy-based RPC API

### Follow-up Prompts
- How would you architect a Web Worker pool to handle multiple concurrent tasks without spinning up unlimited workers?
- What are the constraints of using WebAssembly threads, and how do they relate to SharedArrayBuffer?
- How does Partytown use Web Workers to isolate third-party scripts, and what are its limitations?

### Difficulty: advanced
### Tags: web-workers, SharedArrayBuffer, Atomics, Comlink, main-thread, off-main-thread

---

## Q4: How does streaming SSR improve performance, and how does React 18 implement it?

### Question
Explain traditional SSR's performance limitations, how streaming SSR addresses them, and how React 18's Suspense-based streaming works technically. Discuss trade-offs and when to use it.

### Model Answer
Traditional server-side rendering generates the full HTML string on the server before sending anything to the client. This means the user waits for the slowest data dependency before seeing any content — if the server takes 2 seconds to fetch all data, the user sees a blank page for 2 seconds despite potentially fast page sections.

**The waterfall problem in traditional SSR:** The server must: (1) fetch all data, (2) render the full React tree to HTML, (3) send the HTML, (4) load JS, (5) hydrate the full tree. Each step is sequential. The Time to First Byte (TTFB) is delayed by the slowest data fetch. Additionally, hydration blocks the main thread for large trees.

**Streaming SSR** uses HTTP chunked transfer encoding to send HTML incrementally as it becomes available. The server sends the shell (navigation, skeleton, fast content) immediately, then streams additional HTML chunks as slower data resolves. The browser starts parsing and rendering HTML before the full response arrives, dramatically improving TTFB and First Contentful Paint.

**React 18's implementation** uses `renderToPipeableStream` (Node.js) or `renderToReadableStream` (Edge/Deno) on the server. Components wrapped in `<Suspense>` that are waiting for data emit a placeholder (`<div id="placeholder">`) in the initial shell. When the data resolves, React streams an additional `<script>` tag that inserts the real HTML and swaps out the placeholder, all without a client-side re-render. This is called "out-of-order streaming."

**Selective hydration** complements streaming: React 18 hydrates components incrementally as their chunks arrive, and it prioritizes hydrating components that the user is interacting with (even before their chunk arrives if possible). This means the page becomes interactive progressively rather than waiting for full hydration.

**Trade-offs:** Streaming SSR works best with data-fetching patterns that can be co-located with components (RSC, Relay, or fetch in Server Components). It requires the server to support streaming responses (not all serverless platforms do — some buffer the entire response). Error handling is more complex since part of the HTML has already been sent when an error occurs in a later chunk.

**When to use it:** For pages with heterogeneous data fetching speeds — fast content (header, layout) combined with slow content (personalized feed, user data). Next.js App Router uses streaming SSR by default with Server Components and Suspense.

### Key Points
- Traditional SSR delays TTFB until all data is fetched; streaming sends the shell immediately
- React 18's `renderToPipeableStream` enables out-of-order streaming: fast sections arrive first, slow sections are swapped in
- `<Suspense>` boundaries are the server streaming boundaries — each resolves independently
- Selective hydration prioritizes hydrating elements the user is interacting with
- Streaming requires server/hosting support for chunked transfer encoding (not all serverless platforms buffer)

### Follow-up Prompts
- How do React Server Components differ from traditional SSR, and how do they compose with streaming?
- How does Next.js App Router implement streaming, and what is the role of `loading.js`?
- How would you handle errors that occur in a streamed Suspense boundary after the initial shell is sent?

### Difficulty: advanced
### Tags: streaming-SSR, React-18, Suspense, selective-hydration, TTFB, server-rendering

---

## Q5: How do edge computing and CDN workers improve frontend performance?

### Question
Explain how edge computing (Cloudflare Workers, Vercel Edge Functions) enables performance optimizations that are not possible with traditional CDN caching. Describe specific use cases and limitations.

### Model Answer
Traditional CDNs cache static assets at edge nodes globally, but all dynamic requests still travel to the origin server. Edge computing runs JavaScript code at CDN edge nodes, enabling dynamic computation at the same geographic proximity as static assets — typically within 50ms of any user globally.

**What edge computing enables beyond static caching:**

**Personalized responses without origin roundtrips:** A/B testing logic, feature flag evaluation, and user-specific redirects can run at the edge by reading cookies or JWT claims, without a roundtrip to origin. This eliminates the "server latency tax" on personalization.

**HTML streaming and transformation:** Edge workers can modify the HTML stream in flight. Cloudflare Workers' `HTMLRewriter` API lets you parse and transform HTML using CSS selector-like rules as it streams through the edge node. Use cases: inject user-specific data into SSR HTML, replace static URLs, add analytics scripts, or rewrite responses from legacy backends.

**Geolocation-based logic:** Edge workers have access to request geolocation metadata (`cf.country`, `cf.city`). You can serve region-specific content, enforce GDPR-compliant consent flows, or redirect to localized URLs without an origin request.

**Authentication at the edge:** Validate JWTs or session cookies at the edge and reject unauthorized requests before they reach the origin, reducing origin load and improving security.

**Cache API and KV storage:** Edge workers can read/write to distributed key-value stores (Cloudflare KV, Deno KV) to cache dynamic data at the edge. This enables edge-side rendering: compute personalized HTML at the edge, cache it for subsequent identical requests.

**Limitations:** Edge runtimes are constrained environments — they run a V8 isolate (not a full Node.js environment). Many Node.js APIs are unavailable (`fs`, `net`, `crypto` modules differ). CPU time limits are strict (1-50ms). Large npm packages may not work. Cold starts are fast (~0ms for isolates vs ~100ms for Lambda) but bundle size limits apply (~1-5 MB). Database connections need edge-compatible protocols (HTTP-based: PlanetScale, Turso, Neon serverless driver).

**Real-world patterns:** Next.js Edge Middleware runs before routing; Vercel's Edge Config enables near-zero latency feature flags; Cloudflare Workers enable full SSR at the edge with D1 (SQLite) and KV.

### Key Points
- Edge workers run JavaScript at CDN nodes globally, enabling dynamic logic with ~50ms latency to any user
- Enables personalization, A/B testing, and auth without origin roundtrips
- Cloudflare `HTMLRewriter` enables streaming HTML transformation at the edge
- Constrained runtime: no full Node.js, CPU time limits, restricted APIs, limited bundle size
- Edge KV stores enable caching dynamic/personalized content at edge nodes

### Follow-up Prompts
- How would you implement A/B testing at the edge without causing CLS or hydration mismatches?
- What is the cold start difference between edge isolates and serverless Lambda functions, and why does it matter for performance?
- How would you architect a multi-region database strategy to support edge-rendered content?

### Difficulty: advanced
### Tags: edge-computing, CDN-workers, Cloudflare-Workers, Vercel-Edge, performance, personalization

---

## Q6: How do you detect and fix memory leaks in a web application?

### Question
Describe the common causes of memory leaks in browser JavaScript, how to diagnose them using DevTools, and the patterns used to prevent them in React applications and vanilla JavaScript.

### Model Answer
Memory leaks in web applications cause progressive degradation — the longer a user has the page open, the slower it becomes. In single-page applications where users may stay on one page for hours, leaks are particularly damaging.

**Common causes of memory leaks:**

**Detached DOM nodes:** A DOM element is removed from the document but still referenced by JavaScript (event listeners, closures, or data structures). The element cannot be garbage collected. Detached node leaks appear in DevTools heap snapshots as "Detached HTMLElement" nodes.

**Event listeners not removed:** Adding event listeners to the `window`, `document`, or external DOM elements inside components without removing them when the component unmounts. The listener holds a reference to the component's closure, preventing GC. In React, always return a cleanup function from `useEffect`.

**Closures capturing large objects:** A closure that captures a large object (or the entire module scope) via its lexical environment. The large object lives as long as the closure is reachable. Particularly common with setInterval callbacks.

**setInterval not cleared:** `setInterval` callbacks continue firing after navigation in SPAs. The callback references component state and prevents GC.

**Observers not disconnected:** `IntersectionObserver`, `ResizeObserver`, `MutationObserver` instances that are not disconnected when their target elements are removed.

**Diagnosis with Chrome DevTools:**
1. Open DevTools → Memory panel
2. Take a baseline heap snapshot
3. Perform the suspected leaking action (navigate, interact)
4. Force garbage collection (GC icon in Memory panel)
5. Take a second snapshot
6. Switch to "Comparison" view — look for objects with positive "# Delta" (more instances than before)
7. Expand retained paths to find what is holding the reference

**Allocation timeline:** Record an allocation timeline while interacting. Blue bars that don't disappear after GC indicate retained allocations.

**React-specific patterns:** Use `useEffect` cleanup for all subscriptions. Use `AbortController` to cancel fetch requests on unmount. Use `WeakMap` and `WeakRef` for caches that should not prevent GC. Use `useCallback` and `useMemo` carefully — memoized values themselves can retain large objects.

### Key Points
- Detached DOM nodes, uncleaned event listeners, and uncleaned intervals are the most common leak sources
- Always return cleanup from `useEffect` — clear timers, remove listeners, disconnect observers, abort fetches
- Use DevTools Memory panel heap snapshots with Comparison view to identify growing object counts
- `WeakMap` and `WeakSet` hold weak references that don't prevent GC — use for caches keyed by objects
- After SPA navigation, stale closures from previous routes can hold entire component trees in memory

### Follow-up Prompts
- How do you use `FinalizationRegistry` and `WeakRef` to detect when objects have been garbage collected?
- How would you track memory usage over time in production using the Performance API?
- How does React 18's `StrictMode` double-invocation of effects help surface memory leaks in development?

### Difficulty: advanced
### Tags: memory-leaks, heap-snapshot, garbage-collection, useEffect, DevTools

---

## Q7: How do you profile and optimize runtime JavaScript performance?

### Question
Walk through the process of diagnosing slow runtime JavaScript performance using Chrome DevTools. Describe how to read a flame chart, identify long tasks, and apply targeted optimizations.

### Model Answer
Runtime performance problems manifest as janky scrolling, sluggish interactions, or delayed UI updates. The Chrome DevTools Performance panel is the primary diagnostic tool.

**Recording a performance profile:** Open DevTools → Performance → click Record → perform the sluggish interaction → stop recording. Use CPU throttling (4x or 6x slowdown) to simulate lower-end devices and surface problems that only appear on mobile hardware. Use the "hardware concurrency" setting to simulate fewer CPU cores.

**Reading the flame chart:** The flame chart shows the call stack over time. Time flows left to right; call depth flows top to bottom (callers above, callees below). Each bar represents a function call; the width is the time spent. Look for wide bars — those are expensive functions. Long tasks are highlighted in red at the top of the Main thread lane and appear in the "Long Tasks" section (any task > 50ms, which blocks the main thread for that duration).

**Key sections in the Performance panel:**
- **Main thread:** Your JavaScript, style recalculation, layout, paint. This is where most problems live.
- **Timings:** User timing marks (`performance.mark()`) that you've added to your code.
- **Network:** Resource loading timeline.
- **Frames:** Frame rate over time; dips below 60fps appear as red bars.

**Identifying problem patterns:**
- **Long tasks:** Look for tasks > 50ms. Click to see the full call stack. The "Bottom-Up" tab aggregates total self-time across all calls to a function.
- **Forced synchronous layout:** Marked as "Forced reflow" in the flame chart, in purple. The Details panel will show the JavaScript that triggered it.
- **Style invalidation:** Repeated style calculation triggered by class changes in loops.

**Optimization techniques after identification:**
- Break long tasks using `setTimeout(fn, 0)` or `scheduler.yield()` (Chrome 115+) to yield control back to the browser between chunks.
- Move computation to a Web Worker.
- Memoize expensive pure computations (`useMemo`, manual memoization).
- Use `requestIdleCallback` for low-priority work.
- Reduce DOM operations by batching updates with DocumentFragment or virtual DOM.

**User Timing API for production profiling:** Add `performance.mark('operation-start')` and `performance.measure('operation', 'start', 'end')` around suspicious code. These appear in the Performance panel and are queryable via `performance.getEntriesByType('measure')`.

### Key Points
- Use CPU throttling (4-6x) in DevTools to simulate mobile performance where problems are more visible
- Long tasks (> 50ms) block the main thread — they are the primary cause of poor INP
- Flame chart width = time; Bottom-Up tab reveals which function has the highest cumulative self-time
- "Forced reflow" warnings indicate layout thrashing — alternating reads and writes of geometry properties
- `scheduler.yield()` is the modern way to break long tasks and yield to the browser between chunks

### Follow-up Prompts
- How do `PerformanceObserver` and the Long Tasks API work together to monitor long tasks in production?
- What is the difference between `self time` and `total time` in the Bottom-Up tab, and which do you optimize first?
- How would you use `performance.measure()` to create a production performance monitoring system?

### Difficulty: advanced
### Tags: runtime-performance, DevTools, flame-chart, long-tasks, profiling, scheduler

---

## Q8: How do you optimize animations for 60fps performance?

### Question
Explain the performance model for browser animations, how `requestAnimationFrame`, `will-change`, and CSS transforms work together for smooth animations, and what patterns cause dropped frames.

### Model Answer
Smooth animation requires painting 60 frames per second — a budget of approximately 16.67ms per frame. The browser must complete all JavaScript, style, layout, paint, and composite work within this window. Understanding which pipeline stages are triggered is essential.

**The compositor thread:** The browser has two rendering threads — the main thread and the compositor thread. The compositor thread handles scrolling and compositing already-painted layers without involving the main thread at all. Animations that only drive compositor-thread properties can run at 60fps even if the main thread is busy. The key properties are `transform` and `opacity`.

**CSS animations vs JavaScript animations:** CSS animations and transitions using `transform` and `opacity` run on the compositor thread — they are immune to main thread jank. CSS animations using `left`, `top`, `width`, `height`, `background-color` trigger layout or paint on every frame, competing with the main thread budget. JavaScript animations using `requestAnimationFrame` give you frame-accurate timing but run on the main thread.

**`requestAnimationFrame` (rAF):** rAF schedules a callback before the next paint. Unlike `setTimeout`, it is synchronized with the display refresh rate and is paused when the tab is not visible (saving battery). Use rAF for JavaScript-driven animations: calculate the next state based on elapsed time (`deltaTime = timestamp - lastTimestamp`), apply it, and schedule the next frame. Always use time-based (not frame-based) animation values so animations run at the correct speed regardless of frame rate.

**`will-change`:** Hinting `will-change: transform` promotes the element to its own compositor layer before animation begins, avoiding a layer promotion during the animation (which itself causes a paint). However, each compositor layer consumes GPU memory proportional to its size. Apply `will-change` just before the animation starts (e.g., on hover/focus) and remove it after: `element.style.willChange = 'transform'; element.addEventListener('animationend', () => { element.style.willChange = 'auto'; })`. Do not apply `will-change` globally or to many elements simultaneously.

**WAAPI (Web Animations API):** `element.animate([from, to], options)` provides a native JavaScript animation API that runs on the compositor thread for supported properties, offers playback control (pause, reverse, seek), and has better DevTools integration than rAF loops.

**Anti-patterns:** Animating `box-shadow` (expensive paint), animating many properties simultaneously on many elements, using `setInterval` for animation (not frame-synchronized), animating layout properties (`margin`, `padding`, `width`), and applying `will-change` to every element on the page.

### Key Points
- `transform` and `opacity` animate on the compositor thread — always prefer these for smooth animations
- `requestAnimationFrame` synchronizes JavaScript animation to the display refresh rate
- Use time-based animation values (deltaTime) not frame-based values for consistent speed
- `will-change` should be applied transiently, just before animation, and removed after — it consumes GPU memory
- Web Animations API (WAAPI) is the modern alternative to rAF loops with better platform integration

### Follow-up Prompts
- How would you implement a physics-based spring animation using `requestAnimationFrame`?
- How does `OffscreenCanvas` allow canvas animations to run off the main thread?
- How do you diagnose whether a dropped frame was caused by a main-thread long task or a compositor overload?

### Difficulty: advanced
### Tags: animation-performance, requestAnimationFrame, will-change, compositor, CSS-animations

---

## Q9: Explain prefetch, preload, and preconnect — when to use each.

### Question
Describe the resource hints `<link rel="preload">`, `<link rel="prefetch">`, `<link rel="preconnect">`, and `<link rel="dns-prefetch">`. How does the browser treat each, what are the priority implications, and when is each appropriate?

### Model Answer
Resource hints are declarative browser instructions that allow you to optimize resource loading by informing the browser of resources it will need before it would otherwise discover them.

**`rel="preload"`** instructs the browser to fetch a resource at high priority as soon as possible, for use in the current navigation. It does not execute or apply the resource — it only fetches and caches it in the HTTP cache. You must specify the `as` attribute to set the correct request priority and headers: `<link rel="preload" href="critical.css" as="style">`. Valid `as` values include `script`, `style`, `font`, `image`, `fetch`, `document`. Fonts require `crossorigin` attribute even for same-origin fonts. Preload is for resources the current page definitely needs but the browser would discover late — LCP images, fonts, critical scripts.

**Misuse of preload** is a common mistake: preloading too many resources can compete with critical-path resources and actually slow down the page. Preload has a 3-second warning in DevTools if the preloaded resource is not used within 3 seconds — this indicates a wasteful preload.

**`rel="prefetch"`** fetches a resource at the lowest priority, in the background, for use in a future navigation. It is not guaranteed — the browser may ignore it under network pressure. It stores the resource in the HTTP cache for subsequent use. Use prefetch for resources needed on the next page the user is likely to visit: the next article in a series, the result page after a search. Next.js `<Link>` automatically prefetches linked route chunks when they appear in the viewport.

**`rel="preconnect"`** establishes a TCP connection, TLS handshake, and DNS lookup to an origin in advance. It does not fetch any resource — it only opens the connection. Use it for third-party origins where you know resources will be requested but cannot preload the specific URLs: `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`. Establishing a connection takes 100-500ms; preconnect eliminates this latency from the critical path. Limit to 2-3 critical origins — each connection consumes browser resources.

**`rel="dns-prefetch"`** performs only the DNS lookup without establishing a TCP connection. It is a lighter version of preconnect, appropriate for origins that are non-critical or where a full preconnect would be wasteful. Supported in older browsers where preconnect is not available — use both together: `<link rel="dns-prefetch" href="//example.com">` as a fallback.

**`rel="modulepreload"`** is the module-specific variant of preload for ES modules — it fetches, parses, and compiles the module (and its static imports) in advance.

### Key Points
- `preload`: high priority, current navigation, use for LCP image/font/critical script
- `prefetch`: low priority, future navigation, use for next-page routes and chunks
- `preconnect`: establishes TCP/TLS connection without fetching; limit to 2-3 critical third-party origins
- `dns-prefetch`: DNS only; lighter than preconnect; use as fallback for non-critical origins
- Always include `as` attribute with preload to ensure correct priority and CORS treatment

### Follow-up Prompts
- How does Next.js implement automatic prefetching in the `<Link>` component using Intersection Observer?
- What happens if you preload a font without the `crossorigin` attribute — why does this cause a double fetch?
- How would you use the `Priority Hints` API (`fetchpriority="high"`) on an LCP image instead of preload?

### Difficulty: advanced
### Tags: preload, prefetch, preconnect, resource-hints, performance, LCP

---

## Q10: How do you implement real-user monitoring (RUM) and synthetic performance monitoring?

### Question
Explain the difference between RUM and synthetic monitoring, how to implement RUM using the Performance API, and how to design a complete performance observability strategy combining both approaches.

### Model Answer
Performance monitoring has two complementary forms: synthetic monitoring (controlled lab testing) and real-user monitoring (field data from actual users). A complete observability strategy uses both, as each reveals different classes of problems.

**Synthetic monitoring** runs scripted browser sessions against your site from controlled environments on a schedule. Tools include Lighthouse CI (headless Chrome), WebPageTest (multi-location, real browsers), Calibre, SpeedCurve, and Datadog Synthetic Monitoring. Benefits: consistent baselines, deployable in CI/CD for regression detection, reproducible conditions, ability to test before-launch. Limitations: does not capture real device diversity, real network conditions, or real user interaction patterns.

**Real User Monitoring (RUM)** collects performance data from actual user sessions in production. The browser's Performance API is the foundation. Key APIs:

`PerformanceObserver` is the primary RUM tool — it observes performance entries as they are generated without polling:
```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'largest-contentful-paint') {
      sendToAnalytics({ lcp: entry.startTime });
    }
  }
});
observer.observe({ type: 'largest-contentful-paint', buffered: true });
```

**Core Web Vitals collection via `web-vitals` library** (Google's official library) handles the complexity of correctly measuring LCP, INP, CLS, FCP, and TTFB with proper attribution: `import { onLCP, onINP, onCLS } from 'web-vitals'`. The library correctly handles edge cases like back-forward cache restores.

**Key performance entries to collect:** LCP (`largest-contentful-paint`), INP via `event` entries, CLS via `layout-shift`, navigation timing (`navigation`), resource timing (`resource` — to find slow third-party resources), long tasks (`longtask`).

**Reporting strategy:** Batch metrics and send them using `navigator.sendBeacon()` at page unload — sendBeacon is non-blocking and guaranteed to complete even during page unload. Include contextual metadata: user agent, connection type (`navigator.connection.effectiveType`), device memory (`navigator.deviceMemory`), URL, page template.

**Combining RUM + synthetic:** Use synthetic monitoring in CI for deployment gates (no LCP regression beyond 10%). Use RUM for production alerting (p75 LCP > 3s for more than 5% of sessions triggers PagerDuty). Use RUM segmentation to identify which pages, devices, or geographies are underperforming. Use synthetic to diagnose and reproduce issues identified by RUM.

**Commercial RUM tools:** Datadog RUM, Sentry Performance, New Relic Browser, SpeedCurve, Raygun — they provide dashboards, alerting, and session replay without building the pipeline yourself.

### Key Points
- RUM captures real user experience across device/network diversity; synthetic provides controlled regression detection
- Use the `web-vitals` npm library for correct CWV measurement including edge cases
- `PerformanceObserver` with `buffered: true` captures entries that occurred before the observer was registered
- Report metrics with `navigator.sendBeacon()` at page unload — it is guaranteed non-blocking and reliable
- Segment RUM data by device category, connection type, and geography to find underserved user groups

### Follow-up Prompts
- How would you attribute an LCP regression to a specific resource using the `element` and `url` fields in the LCP entry?
- How do you measure INP in production, given it requires observing all interactions throughout the session?
- How would you implement a custom performance mark/measure strategy for tracking business-critical flows?

### Difficulty: advanced
### Tags: RUM, synthetic-monitoring, PerformanceObserver, web-vitals, performance-observability

---
