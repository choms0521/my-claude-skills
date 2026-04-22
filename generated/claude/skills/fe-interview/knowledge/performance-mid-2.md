# Performance - Mid Interview Questions (Part 2)
### Language: en

## Q11: What is Layout Thrashing and How Do You Prevent It?

### Question
Explain layout thrashing (also called forced synchronous layouts), why it degrades performance, and what techniques you use to prevent it.

### Model Answer
Layout thrashing occurs when JavaScript repeatedly forces the browser to recalculate layout synchronously by alternating between reading and writing DOM properties within the same frame. When you read a layout property (like `offsetWidth`, `scrollTop`, or `getBoundingClientRect()`), the browser must first apply any pending style changes and recompute layout to return an accurate value. If you then immediately write a DOM property that invalidates layout, and then read again, the browser is forced to recalculate layout again — sometimes dozens of times in a single frame.

A classic example is reading `element.offsetHeight` inside a loop after setting `element.style.height`. Each iteration forces a full layout recalculation, which can easily cause a 60fps animation to drop to single digits. The DevTools Performance panel will flag these as "Forced reflow" warnings shown in red, making them diagnosable.

The primary prevention technique is to batch reads and writes separately. Read all layout properties in one pass, store the values in variables, then perform all writes in a second pass. This way the browser only needs to recalculate layout once. Libraries like `fastdom` automate this pattern by queuing reads and writes and flushing them in the correct order within `requestAnimationFrame`.

Using `requestAnimationFrame` is another key strategy. By scheduling DOM writes inside `rAF`, you ensure they happen at the beginning of the next frame after the browser has already committed the previous layout. This natural separation prevents forced reflows. The `will-change` CSS property can also help by informing the browser to promote elements to their own compositor layer, reducing the scope of layout recalculations.

For animations specifically, prefer CSS animations and transitions or the Web Animations API over JavaScript-driven animations that touch layout properties. Using `transform` and `opacity` instead of `top`/`left`/`width`/`height` keeps animations entirely on the compositor thread, entirely bypassing layout.

### Key Points
- Layout thrashing is caused by interleaving DOM reads and writes that force synchronous layout recalculation
- Batch all DOM reads before any DOM writes to minimize layout recalculations to once per frame
- Use `requestAnimationFrame` to schedule writes at frame boundaries
- Prefer `transform`/`opacity` for animations to avoid triggering layout entirely
- DevTools Performance panel flags forced reflows in red for diagnosis

### Follow-up Prompts
- Can you show a concrete before/after code example of fixing layout thrashing in a list animation?
- How does `fastdom` work internally and when would you choose it over manual batching?
- What is the difference between layout, paint, and composite — and which CSS properties trigger which?

### Difficulty: intermediate
### Tags: performance, layout, reflow, DOM, animation, browser-rendering

---

## Q12: When and How Would You Use requestIdleCallback?

### Question
Describe the `requestIdleCallback` API, when it is appropriate to use it, and what its limitations are compared to `requestAnimationFrame`.

### Model Answer
`requestIdleCallback` (rIC) is a browser API that schedules work to run during periods when the browser's main thread is idle — meaning there are no pending user interactions, animations, or other high-priority tasks queued. The callback receives an `IdleDeadline` object with a `timeRemaining()` method (returns milliseconds left in the idle period) and a `didTimeout` boolean that indicates whether the callback was invoked because the optional timeout elapsed rather than because the browser was truly idle.

The canonical use case is non-critical background work: prefetching data that may be needed later, analytics event batching, precomputing search indexes, or logging. These are tasks that improve user experience if done proactively but would harm it if they delayed interactions or animations. Without rIC, developers often use `setTimeout(fn, 0)` or `requestAnimationFrame` for such work, but neither reliably yields to genuinely idle periods.

The idle period itself has nuances. Idle callbacks during user inactivity can last up to 50ms (to keep latency within RAIL's 100ms response budget). However, during animation frames, idle time may be near zero. Always check `deadline.timeRemaining() > 0` before doing work, and break work into chunks: process one item, check remaining time, continue if available, otherwise reschedule with another `requestIdleCallback`. The `timeout` option lets you set a deadline after which the browser will invoke the callback even if not idle, preventing indefinite deferral.

The key limitations are reliability and lack of guaranteed timing. rIC is not available in all environments (notably Web Workers and older browsers), and Safari only added it relatively recently. You should never use rIC for anything that must complete within a specific timeframe. Animation work belongs in `requestAnimationFrame`, and immediate user-response work belongs inline or in microtasks (Promise/queueMicrotask). rIC is explicitly for "fire and forget" best-effort tasks.

In modern frontends, React's concurrent mode uses a similar scheduler-based approach (via `scheduler` package) that polyfills rIC-like behavior with `MessageChannel` for wider compatibility. Understanding rIC helps developers reason about React's cooperative multitasking model and build their own performant background tasks.

### Key Points
- `requestIdleCallback` schedules non-critical work during genuine browser idle time, not just "after the current task"
- Always check `deadline.timeRemaining()` and chunk work to avoid overrunning the idle window
- Use the `timeout` option to prevent indefinitely deferred work
- Do not use rIC for animation (use rAF) or immediate user response (use inline/microtasks)
- React's scheduler package implements similar cooperative scheduling for broader compatibility

### Follow-up Prompts
- How would you implement a polyfill for `requestIdleCallback` using `requestAnimationFrame` and `setTimeout`?
- What is the relationship between `requestIdleCallback` and React's concurrent features?
- How would you batch and send analytics events using `requestIdleCallback` without losing events on page unload?

### Difficulty: intermediate
### Tags: performance, requestIdleCallback, scheduling, main-thread, browser-APIs

---

## Q13: How Does Intersection Observer Improve Performance?

### Question
Explain the Intersection Observer API, how it differs from scroll event listeners, and describe three concrete use cases where it improves performance.

### Model Answer
The Intersection Observer API provides an asynchronous mechanism to observe when a target element enters, exits, or partially intersects the browser viewport (or a specified ancestor element). Unlike scroll event listeners, Intersection Observer callbacks run off the main thread's event loop and are batched and delivered as a group after the browser has finished painting, making them inherently non-blocking. The browser's rendering engine handles the intersection geometry calculation at a native level, which is far more efficient than calculating `getBoundingClientRect()` on every scroll event.

The performance difference is significant. A naive scroll event listener fires dozens of times per second during scrolling. Each invocation that reads layout properties (to determine element visibility) causes synchronous layout recalculation. Debouncing helps but introduces latency. Intersection Observer callbacks are not tied to scroll events at all — they fire only when intersection state actually changes, and the callback receives pre-computed `IntersectionObserverEntry` objects without triggering layout.

The first major use case is lazy loading images. Instead of loading all `<img>` tags on page load, you observe each image element and swap `data-src` into `src` only when it enters the viewport (or a margin before it with `rootMargin`). This dramatically reduces initial page weight and Time to Interactive. The native `loading="lazy"` attribute uses a similar mechanism internally.

The second use case is infinite scrolling. Rather than attaching a scroll listener to detect when the user nears the bottom of a list, you observe a sentinel element placed after the last item. When it becomes visible, you fetch the next page. This approach is more reliable across devices, works correctly when content height changes, and avoids the scroll listener performance trap.

The third use case is analytics visibility tracking — measuring how long users actually see content (viewability metrics). You can record when an ad or article section enters the viewport and when it leaves, accumulating exposure time. This would be extremely expensive with scroll events but is trivially cheap with Intersection Observer since callbacks only fire on state changes, not continuous scrolling.

### Key Points
- Intersection Observer calculates intersection geometry natively, avoiding scroll event overhead and layout thrashing
- Callbacks are batched and delivered asynchronously, never blocking the main thread
- Core use cases: lazy loading, infinite scroll, and viewability/analytics tracking
- `rootMargin` lets you trigger observations before elements enter the viewport for preloading
- `threshold` array allows fine-grained tracking of how much of an element is visible

### Follow-up Prompts
- How would you implement a lazy-loading image component using Intersection Observer and React?
- What is the `rootMargin` property and how would you use it to pre-load images before they scroll into view?
- How does Intersection Observer compare to the newer `IntersectionObserver v2` with `isVisible`?

### Difficulty: intermediate
### Tags: performance, IntersectionObserver, lazy-loading, scroll, browser-APIs

---

## Q14: What is Paint Holding and How Does It Affect Navigation Performance?

### Question
Describe the browser's paint holding behavior, when it applies, and how it interacts with performance strategies like back-forward cache and prerendering.

### Model Answer
Paint holding is a browser optimization (implemented in Chrome 86+) where the browser continues to display the previous page's content ("holds" the last paint) while loading a new page, instead of immediately showing a white blank screen. Historically, when navigation began, the browser would immediately clear the current page and show a white/blank viewport while the new page loaded. This flash of blank content made even fast navigations feel janky. Paint holding eliminates this visual discontinuity by keeping the old page visible until the new page has enough content painted to replace it.

The mechanics work by delaying the display of the new content until the first paint of the new document. The browser keeps the compositor rendering the previous page's final frame as a texture while the new document parses HTML, loads critical CSS, and completes its first paint. Once the new page's first meaningful content is ready, the swap happens. This is particularly impactful for same-origin navigations where the browser can be confident about security boundaries.

Paint holding interacts closely with the back-forward cache (bfcache). When users navigate back with the browser button, bfcache restores a fully paused JavaScript execution environment from memory, allowing instant navigation. Paint holding handles the case where bfcache is not available (cross-origin navigations, pages that opt out via `Cache-Control: no-store`, etc.) by at least smoothing the visual transition. You can detect bfcache restores via `pageshow` events with `event.persisted === true` and handle state reset if needed.

From a developer perspective, paint holding makes performance metrics like First Contentful Paint more critical because the old page stays visible until FCP. If your new page's FCP is slow, users see a frozen old page, which can be confusing. This means reducing render-blocking resources, inlining critical CSS, and ensuring fast server response times directly improve the perceived transition experience.

Understanding paint holding also clarifies why the Navigation Timing API's `fetchStart` vs `responseStart` vs `domContentLoadedEventEnd` timestamps matter. Profiling navigation performance requires understanding which phases of loading users actually perceive, and paint holding changes the perceptual model: the visible "load" starts at FCP, not at `fetchStart`.

### Key Points
- Paint holding keeps the previous page visible during navigation instead of flashing a blank screen
- Applies to same-origin navigations in Chrome 86+ and improves perceived transition speed
- Interacts with bfcache: bfcache is preferred when available; paint holding handles the fallback case
- Slow FCP under paint holding makes navigations feel frozen rather than fast — FCP optimization is critical
- The `pageshow` event's `persisted` property detects bfcache restores for state management

### Follow-up Prompts
- How would you detect and handle a back-forward cache restore in a single-page application?
- What causes a page to be ineligible for bfcache, and how would you audit for and fix these issues?
- How does paint holding affect Core Web Vitals measurement, specifically FCP and LCP?

### Difficulty: intermediate
### Tags: performance, paint-holding, bfcache, navigation, FCP, browser-rendering

---

## Q15: How Does the fetchpriority Attribute Enable Resource Prioritization?

### Question
Explain the `fetchpriority` attribute, how it interacts with the browser's resource loading queue, and provide examples of when you would use `high`, `low`, and `auto`.

### Model Answer
The `fetchpriority` attribute (part of the Priority Hints specification) allows developers to explicitly communicate the relative importance of a resource to the browser's fetch scheduler. Browsers already use heuristic priority systems to order resource downloads — scripts block parsing by default, images are lower priority, CSS is high priority — but these heuristics cannot always infer developer intent. `fetchpriority` provides a declarative escape hatch to override or confirm these defaults.

The attribute accepts three values. `high` signals that this resource is more important than the browser's default priority for its type. `low` signals it is less important. `auto` (the default) lets the browser use its heuristic. The attribute is available on `<img>`, `<link>`, `<script>`, `<iframe>`, and the `fetch()` API options object via `priority`.

A common high-value use case for `high` is the Largest Contentful Paint image. The LCP element — typically a hero banner, product image, or article illustration — is the most performance-critical resource on many pages, but the browser cannot know this in advance. Adding `fetchpriority="high"` to this image tells the browser to download it as soon as possible, competing with CSS and fonts rather than waiting in the image queue. Google's research showed this can improve LCP by 30% or more on pages where the LCP image was previously deprioritized.

The `low` value is useful for images below the fold that lazy loading hasn't deferred (perhaps because JavaScript is required for lazy loading to initialize, and you want to avoid FOIC). It is also appropriate for preloaded fonts that are fallback fonts — important to have eventually but not blocking text display. Similarly, using `fetchpriority="low"` on `<link rel="preload">` for non-critical resources tells the browser to fetch them during idle time without contending with critical path resources.

In the `fetch()` API, `priority: 'high'` is useful for API calls that directly gate the display of above-the-fold content, while `priority: 'low'` is appropriate for prefetching data for pages the user might navigate to next. This gives fine-grained control over XHR/fetch scheduling without the bluntness of `async` vs `defer` for scripts.

### Key Points
- `fetchpriority` lets developers override browser heuristics for resource download order with `high`, `low`, or `auto`
- Available on `<img>`, `<link>`, `<script>`, `<iframe>`, and `fetch()` API
- Most impactful use case: `fetchpriority="high"` on the LCP image to significantly improve LCP scores
- `fetchpriority="low"` on below-fold preloads prevents them from competing with critical path resources
- Priority Hints is now widely supported in Chromium browsers and has a polyfillable degradation (attribute is safely ignored)

### Follow-up Prompts
- How does `fetchpriority` interact with `<link rel="preload">`? Can a preloaded resource have low priority?
- If you have both `fetchpriority="high"` on an image and `loading="lazy"`, what happens?
- How would you use DevTools to verify that `fetchpriority` is actually changing the download order?

### Difficulty: intermediate
### Tags: performance, fetchpriority, resource-hints, LCP, Core-Web-Vitals, priority-hints

---

## Q16: What Are the Key Performance Differences Between HTTP/2 and HTTP/3?

### Question
Compare HTTP/2 and HTTP/3 from a frontend performance perspective, including multiplexing, head-of-line blocking, and connection establishment.

### Model Answer
HTTP/2 was a major improvement over HTTP/1.1, primarily by introducing multiplexing over a single TCP connection. In HTTP/1.1, browsers opened multiple parallel TCP connections (typically 6 per origin) to work around the one-request-per-connection limitation. HTTP/2 allows multiple requests and responses to be interleaved over a single connection using a binary framing layer, eliminating the need for multiple connections and removing per-connection overhead. It also introduced header compression (HPACK) and server push.

However, HTTP/2 still has a fundamental limitation: it runs over TCP, which has its own head-of-line blocking. When a TCP packet is lost in transit, all HTTP/2 streams multiplexed over that connection stall until the lost packet is retransmitted and acknowledged. This is TCP-level HOL blocking, as opposed to HTTP-level HOL blocking which HTTP/2 solved. On high-loss networks (mobile connections, weak Wi-Fi), HTTP/2 can actually perform worse than HTTP/1.1 with multiple connections because a single packet loss blocks all streams rather than just one connection.

HTTP/3 solves this by replacing TCP with QUIC (Quick UDP Internet Connections). QUIC runs over UDP and implements connection management, reliability, congestion control, and stream multiplexing in user space. The critical difference is that QUIC streams are independently tracked, so packet loss in one stream does not block other streams. This makes HTTP/3 significantly more resilient on unreliable networks, which represent a large portion of real-world mobile usage.

Connection establishment is another area where HTTP/3 excels. A typical HTTPS/TCP connection requires a TCP handshake (1 round trip) plus a TLS 1.3 handshake (1 round trip) for 2 RTTs before the first byte of request data can be sent. QUIC combines transport and cryptographic handshakes, achieving a 1-RTT connection by default, and 0-RTT for reconnecting clients who have prior session state. This is measurable in TTFB improvements, especially on high-latency connections.

From a practical frontend perspective: most major CDNs (Cloudflare, Fastly, Akamai, AWS CloudFront) support HTTP/3 with QUIC. Static asset servers should enable it. However, the benefits are most pronounced on mobile or lossy networks — on reliable wired connections, HTTP/2 is already excellent. You can verify HTTP/3 usage via DevTools Network tab (Protocol column) or via `curl --http3`.

### Key Points
- HTTP/2 solves HTTP-level HOL blocking with multiplexing but still suffers TCP-level HOL blocking on packet loss
- HTTP/3 uses QUIC over UDP to eliminate HOL blocking at the transport layer, benefiting lossy networks significantly
- HTTP/3 reduces connection establishment cost to 1 RTT (vs 2 RTT for HTTP/2 over TLS 1.3) with 0-RTT for reconnects
- Benefits are most measurable on mobile and high-latency or high-loss networks
- Most major CDNs support HTTP/3; enable it via CDN configuration for static assets

### Follow-up Prompts
- How does server push in HTTP/2 compare to `<link rel="preload">`, and why did server push largely fail in practice?
- What changed about domain sharding and bundling strategies when HTTP/2 became widespread?
- How would you configure a Next.js application deployed on Vercel to take advantage of HTTP/3?

### Difficulty: intermediate
### Tags: performance, HTTP2, HTTP3, QUIC, networking, multiplexing, HOL-blocking

---

## Q17: When Should You Choose Brotli Over Gzip for Compression?

### Question
Compare Brotli and Gzip compression algorithms from a web performance perspective, including compression ratios, CPU cost, browser support, and deployment considerations.

### Model Answer
Brotli is a compression algorithm developed by Google specifically for web content, while Gzip (based on DEFLATE) has been the web standard for decades. Both compress text-based resources like HTML, CSS, and JavaScript to reduce transfer size over the network. The fundamental question for frontend engineers is when to use each and how to configure servers/CDNs appropriately.

Brotli consistently achieves better compression ratios than Gzip, typically 20-26% smaller for JavaScript files and slightly less for HTML. This translates directly to smaller files over the wire, reducing transfer time and improving metrics like FCP and LCP for network-constrained users. The improvement is more pronounced on large files (bundled JS is an ideal case) and less on very small files where compression overhead dominates.

The tradeoff is CPU cost. Brotli's maximum compression level (11) is significantly more CPU-intensive than Gzip's equivalent, making real-time on-the-fly compression at Brotli level 11 impractical on high-traffic servers. The practical resolution is to pre-compress static assets at build time using Brotli level 11 and serve the pre-compressed files directly with the `Content-Encoding: br` header when the client sends `Accept-Encoding: br`. For dynamic responses that cannot be pre-compressed, Brotli level 4-6 is used as a compromise between ratio and CPU cost, often matching Gzip in speed with better ratios.

Browser support is effectively universal for Brotli: all modern browsers send `Accept-Encoding: br, gzip, deflate` in request headers. Clients that do not support Brotli (very old browsers, some non-browser HTTP clients like curl without the `--compressed` flag explicitly) receive Gzip as a fallback, so content negotiation via the `Accept-Encoding` header provides safe degradation.

Deployment is straightforward with modern CDNs. Cloudflare, Fastly, and CloudFront will automatically serve Brotli-compressed versions of assets when available and requested. For nginx, you configure `brotli_static on` to serve pre-compressed `.br` files, similar to `gzip_static on` for pre-compressed `.gz` files. Build tools like Vite and webpack have Brotli compression plugins (`vite-plugin-compression`, `compression-webpack-plugin`) that generate `.br` and `.gz` versions during the build.

### Key Points
- Brotli achieves 20-26% better compression ratios than Gzip for JavaScript, reducing transfer size
- High Brotli compression levels are CPU-intensive — pre-compress static assets at build time to avoid runtime overhead
- Browser support is universal; content negotiation via `Accept-Encoding` header provides safe Gzip fallback
- Configure CDN or nginx to serve pre-compressed `.br` files; use build plugins to generate them during CI/CD
- For dynamic content, Brotli level 4-6 balances ratio and CPU cost well

### Follow-up Prompts
- How would you add Brotli pre-compression to a Vite build pipeline and configure nginx to serve `.br` files?
- Does Brotli help with already-compressed formats like images, video, or WOFF2 fonts?
- How do you verify that Brotli is actually being served and not Gzip in production?

### Difficulty: intermediate
### Tags: performance, brotli, gzip, compression, networking, CDN, static-assets

---

## Q18: What is Speculative Loading and How Does the Speculation Rules API Work?

### Question
Explain speculative loading techniques including prefetch and prerender, and describe how the modern Speculation Rules API differs from the legacy `<link rel="prefetch">` and `<link rel="prerender">`.

### Model Answer
Speculative loading is the practice of fetching or pre-executing resources for pages the user is likely to navigate to next, before they actually click. The goal is to make future navigations feel instant because the browser has already done the network and rendering work. The two main strategies are prefetch (fetch and cache the response) and prerender (fetch, parse, execute JavaScript, and render the page in a background browsing context).

The legacy approach used `<link rel="prefetch" href="/next-page">` and `<link rel="prerender" href="/next-page">`. These were declarative hints, but `prerender` had poor browser adoption (Chrome dropped it for some time), and `prefetch` only retrieved the HTML document without its subresources. Both were static and could not react dynamically to user behavior. Additionally, triggering prerender incorrectly — for pages the user doesn't navigate to — wastes significant CPU and memory, and can cause incorrect analytics events.

The Speculation Rules API (Chrome 109+) is a JSON-based declarative system embedded in a `<script type="speculationrules">` tag that provides fine-grained control over speculation. It supports two actions: `prefetch` and `prerender`. Rules can specify URL patterns with `href_matches`, eagerness levels (`immediate`, `eager`, `moderate`, `conservative`), and conditions. The `moderate` eagerness triggers prerender when the user hovers over a link for ~200ms; `conservative` triggers on mousedown/touchstart; `immediate` triggers as soon as the rule is processed.

The key improvements over legacy hints are: subresource fetching (prefetch fetches the page's subresources, not just HTML), proper back/forward cache integration, controlled eagerness to reduce waste, and JavaScript access via `document.prerenderingchange` and `document.prerendering` to detect and defer side effects like analytics until the prerendered page is activated. Prerendered pages execute JavaScript in a suspended state for side-effectful APIs (geolocation, notifications, etc.) until activation.

Libraries like `quicklink` (automates prefetching links in viewport) and Next.js's `<Link>` component (prefetches on hover in production) implement similar strategies programmatically. The Speculation Rules API is now the recommended native approach for Chrome, and services like Cloudflare's Speculation Rules or Google's Automatic Speculation Rules inject these rules automatically based on analytics data.

### Key Points
- Speculative loading prefetches or prerenders likely next pages to make navigation feel instant
- The Speculation Rules API replaces legacy `<link rel="prerender">` with a JSON-based system in `<script type="speculationrules">`
- Eagerness levels (`immediate`/`eager`/`moderate`/`conservative`) control when speculation triggers, reducing waste
- Prerendered pages defer side effects (analytics, geolocation) until page activation via `document.prerenderingchange`
- Next.js `<Link>` and `quicklink` implement programmatic speculation for broader browser support

### Follow-up Prompts
- How would you ensure analytics events (like page views) are not double-fired when a prerendered page is activated?
- How would you implement Speculation Rules that only prerender pages the user has a high probability of visiting based on scroll position?
- What are the memory and CPU costs of prerender, and how would you budget for it in a mobile-first application?

### Difficulty: intermediate
### Tags: performance, speculative-loading, prefetch, prerender, speculation-rules, navigation

---

## Q19: How Do You Use the Navigation Timing API to Measure Real User Performance?

### Question
Describe the Navigation Timing API, the key metrics it exposes, and how you would use it to build a real user monitoring (RUM) solution.

### Model Answer
The Navigation Timing API (Level 2 via `PerformanceNavigationTiming`) provides high-resolution timestamps for every phase of a page load, from the moment the user initiates navigation to when the page becomes fully interactive. Unlike synthetic monitoring (Lighthouse, WebPageTest), Navigation Timing captures real user experience across all devices, networks, and conditions — making it the foundation of Real User Monitoring.

The key timestamps are accessible via `performance.getEntriesByType('navigation')[0]` and represent a timeline: `startTime` (0, navigation start) → `fetchStart` (when the browser begins fetching, after redirect checks) → `domainLookupStart/End` (DNS resolution) → `connectStart/End` (TCP handshake) → `secureConnectionStart/End` (TLS handshake) → `requestStart` (first byte sent to server) → `responseStart` (first byte received, TTFB) → `responseEnd` (last byte received) → `domInteractive` (DOM parsing complete, synchronous scripts run) → `domContentLoadedEventEnd` (DOMContentLoaded fired) → `loadEventEnd` (load event fired).

From these, you derive actionable metrics: DNS lookup time (`domainLookupEnd - domainLookupStart`), TCP connection time (`connectEnd - connectStart`), TTFB (`responseStart - requestStart`), DOM processing time (`domInteractive - responseStart`), and total page load time (`loadEventEnd - startTime`). TTFB is particularly important as it reflects server response time, CDN caching effectiveness, and geographic latency.

For a RUM implementation, you would capture these metrics after the `load` event (to ensure all timestamps are populated), serialize them, and send them to an analytics endpoint using a `sendBeacon` call (which survives page unload) or a fetch with `keepalive: true`. You should also capture contextual metadata: URL, device type (via User Agent or Client Hints), connection type (`navigator.connection.effectiveType`), and whether the navigation was a soft navigation (SPA route change, which requires the `PerformanceObserver` with soft navigation type) vs. hard navigation.

Complement Navigation Timing with `PerformancePaintTiming` (`paint` entries for FP and FCP), `LargestContentfulPaint`, `LayoutShift`, `FirstInput`, and `ResourceTiming` for subresource analysis. Together these cover all Core Web Vitals. Tools like the `web-vitals` library (from Google) abstract this into a convenient API, making it the de facto standard for capturing CWV in RUM implementations.

### Key Points
- Navigation Timing Level 2 (`PerformanceNavigationTiming`) provides timestamps for every phase of a hard navigation
- Key derived metrics: DNS time, TCP time, TTFB, DOM processing time, total load time
- Send RUM data using `sendBeacon` or `fetch` with `keepalive: true` to survive page unload
- Complement with paint timing, LCP, CLS, FID/INP, and resource timing for full Core Web Vitals coverage
- The `web-vitals` library from Google provides a convenient abstraction for capturing all CWV metrics

### Follow-up Prompts
- How would you measure soft navigation performance in a React single-page application where there are no hard page loads?
- What does a high TTFB indicate and what are the possible root causes on the frontend vs. backend?
- How would you aggregate and visualize Navigation Timing data for a large application with millions of users?

### Difficulty: intermediate
### Tags: performance, navigation-timing, RUM, monitoring, Core-Web-Vitals, performance-API

---

## Q20: What is the True Cost of JavaScript Execution and How Do You Reduce It?

### Question
Explain the full execution pipeline for JavaScript in the browser, how it impacts page performance beyond just file size, and what strategies reduce JavaScript execution cost.

### Model Answer
The performance cost of JavaScript is often misunderstood as purely a download problem — smaller bundles are faster. In reality, transfer size is only one component. JavaScript has a multi-stage cost: download (network), parse (tokenizing and building AST), compile (converting to bytecode or machine code), and execute (running the code). On low-end mobile devices, parse and compile can take longer than the download itself, even from cache. Google's research showed that 170KB of JavaScript took ~3x longer to process than 170KB of JPEG on median mobile hardware, because images only need decoding while JS requires full compilation and execution.

Parsing has two phases: eager parsing (for code that will execute immediately) and lazy parsing (deferring parsing of function bodies until they are called). Modern V8 uses a pre-parser to identify function boundaries quickly. However, Immediately Invoked Function Expressions (IIFEs) and certain patterns force eager parsing of their contents. This is why tools like `optimize-js` (now mostly obsolete with V8 improvements) historically wrapped IIFEs in parentheses to hint at eager parse. Today, the key insight is to avoid large module-level IIFE patterns that force parsing at startup.

Code splitting is the primary strategy for reducing execution cost at startup. Rather than sending one large bundle, you split code into chunks that load on demand. With React and webpack/Vite, `React.lazy` and dynamic `import()` let you split at route boundaries. Users pay only the parse/compile/execute cost of code for the current route, deferring other routes until needed. Ideal targets for splitting: route components, heavy third-party libraries (charts, rich text editors), and features used by only a subset of users.

Tree shaking eliminates dead code by removing exports that are never imported anywhere in the dependency graph. This requires ES module syntax (static `import`/`export`) and proper `sideEffects: false` annotations in `package.json`. Bundlers like webpack and Rollup (and Vite, which uses Rollup) statically analyze the import graph and exclude unreachable code. Third-party libraries that are not tree-shakeable (CommonJS modules) must often be replaced with ESM alternatives or imported more selectively.

Worker threads offload CPU-intensive execution off the main thread entirely. Heavy computations — sorting large datasets, image processing, cryptographic operations, compiling user-provided code — block the main thread and cause input latency if run inline. `Web Workers` run in a separate thread and communicate via `postMessage`. Libraries like Comlink make Web Worker usage ergonomic by hiding the message-passing boilerplate behind a proxy API. This is particularly important for INP (Interaction to Next Paint), Chrome's replacement for FID, which measures responsiveness.

### Key Points
- JavaScript's full cost includes download, parse, compile, and execute — on low-end mobile, parse/compile can dominate
- Code splitting via dynamic `import()` and `React.lazy` reduces startup execution cost to only what the current route needs
- Tree shaking eliminates dead code and requires ES module syntax with `sideEffects: false` annotations
- Web Workers offload CPU-intensive execution off the main thread, protecting input responsiveness (INP)
- Profiling with DevTools Coverage tab and Performance panel identifies unused code and long tasks

### Follow-up Prompts
- How does V8's bytecode caching work and how do you ensure your assets benefit from it?
- Walk me through setting up route-based code splitting in a React application with React Router and Vite.
- How does WebAssembly compare to JavaScript for CPU-intensive tasks and when would you choose one over the other?

### Difficulty: intermediate
### Tags: performance, JavaScript, parse, compile, code-splitting, tree-shaking, web-workers, execution-cost

---
