# Performance - Mid Interview Questions
### Language: en

## Q1: What are Core Web Vitals and why do they matter?

### Question
Explain the three Core Web Vitals metrics — LCP, FID/INP, and CLS. How are they measured, what are the "good" thresholds, and how would you improve a site that is failing each one?

### Model Answer
Core Web Vitals are a set of standardized metrics Google uses to quantify real-world user experience on the web. They focus on three dimensions: loading performance, interactivity, and visual stability.

**Largest Contentful Paint (LCP)** measures how long it takes for the largest image or text block visible in the viewport to fully render. The good threshold is under 2.5 seconds. LCP commonly targets hero images, large banners, or above-the-fold text. To improve LCP you should eliminate render-blocking resources, preload the LCP image with `<link rel="preload">`, serve images in modern formats (WebP/AVIF), use a CDN to reduce TTFB, and ensure the LCP element is not lazy-loaded.

**First Input Delay (FID) / Interaction to Next Paint (INP)** measures responsiveness. FID captured the delay of the very first interaction; INP (which replaced FID in 2024) measures the worst interaction delay throughout the entire page visit. The good threshold for INP is under 200 ms. The main culprit is long tasks on the main thread. Fixes include breaking up long JavaScript tasks with `setTimeout` or `scheduler.yield()`, deferring non-critical scripts, and moving heavy work to Web Workers.

**Cumulative Layout Shift (CLS)** measures visual stability — how much unexpected layout movement occurs. A good CLS score is under 0.1. Common causes are images without explicit width/height attributes, dynamically injected content above existing content, and web fonts causing FOIT/FOUT. Fixes include always specifying image dimensions, reserving space for ads and embeds, and using `font-display: optional` or preloading fonts.

These metrics matter because Google uses them as ranking signals and because they directly correlate with user satisfaction, bounce rate, and conversion rate. Teams should monitor them via field data (Chrome UX Report, RUM tools) rather than relying solely on lab tools like Lighthouse.

### Key Points
- LCP < 2.5s (loading), INP < 200ms (interactivity), CLS < 0.1 (stability)
- FID was deprecated in 2024 and replaced by INP, which is a more comprehensive interactivity metric
- Field data (real users) is more authoritative than lab data for Core Web Vitals
- LCP image should never be lazy-loaded; it should be eagerly fetched and optionally preloaded
- CLS is fixed by reserving space for dynamic content and providing image dimensions

### Follow-up Prompts
- How would you set up a RUM (Real User Monitoring) pipeline to track Core Web Vitals in production?
- A page has good Lighthouse scores in the lab but poor CWV in the field — what could explain the discrepancy?
- How does server-side rendering affect each of the three Core Web Vitals?

### Difficulty: intermediate
### Tags: core-web-vitals, LCP, INP, CLS, performance-metrics

---

## Q2: How do you implement effective lazy loading strategies?

### Question
Describe the different approaches to lazy loading in a web application — images, components, routes, and data. When should you use each approach, and what are the trade-offs?

### Model Answer
Lazy loading is a performance pattern that defers loading of non-critical resources until they are actually needed, reducing initial page load time and saving bandwidth.

**Image lazy loading** is the most common form. The native approach uses the `loading="lazy"` attribute on `<img>` and `<iframe>` elements, which is supported in all modern browsers. The browser delays fetching the image until it approaches the viewport based on an internal threshold. For more control, the Intersection Observer API lets you trigger loads at a custom distance (e.g., 200px before the element enters the viewport). You should never lazy-load the LCP image, as that directly harms your most important loading metric.

**Route-based code splitting** is the standard lazy loading strategy in SPAs. In React, `React.lazy()` combined with `Suspense` lets you split each route into a separate chunk that is only fetched when the user navigates to it. Webpack, Vite, and Rollup all support dynamic `import()` which is the underlying mechanism. This is the highest-leverage lazy loading technique because route bundles are typically large.

**Component-level lazy loading** is useful for heavy components that are conditionally rendered — modals, rich text editors, chart libraries, or map components. The same `React.lazy()` / dynamic import pattern applies. The trade-off is a potential loading flash when the component first appears, which you mitigate with a `Suspense` fallback skeleton.

**Data lazy loading** refers to deferring API calls until the user needs the data — for example, fetching tab content only when a tab is clicked, or using infinite scroll to load list items progressively. This reduces initial API payload and can significantly improve perceived performance.

The key trade-off is always between initial load time and subsequent interaction latency. Aggressive lazy loading speeds up first load but can introduce noticeable delays on subsequent interactions. Prefetching (loading data/routes in the background while the user is idle) is the technique used to recover that latency.

### Key Points
- Native `loading="lazy"` is sufficient for most image lazy loading; Intersection Observer gives more control
- Never lazy-load the LCP image — it will directly harm LCP
- Route-level code splitting offers the biggest bundle size wins in SPAs
- Component lazy loading is best for heavy, conditionally rendered UI (modals, editors, maps)
- Combine lazy loading with prefetching to avoid interaction latency

### Follow-up Prompts
- How would you implement a lazy-loaded image gallery with a blur-up placeholder effect?
- What is the difference between `React.lazy()` and a dynamic import used directly in a component?
- How do you prefetch the next route's chunk in React Router or Next.js?

### Difficulty: intermediate
### Tags: lazy-loading, code-splitting, images, routes, intersection-observer

---

## Q3: How do you approach image optimization on the web?

### Question
Walk through a comprehensive image optimization strategy covering format selection (WebP, AVIF), responsive images with `srcset`, compression, and delivery. How do you decide what to use when?

### Model Answer
Images are typically the largest assets on a webpage and often account for 50-70% of page weight. A comprehensive image optimization strategy addresses format, size, compression, and delivery.

**Format selection** should follow the hierarchy: AVIF > WebP > JPEG/PNG. AVIF offers the best compression (30-50% smaller than WebP at equivalent quality) but has slightly less universal browser support and slower encoding times. WebP is the practical default — it's supported in all modern browsers and delivers 25-35% better compression than JPEG. Use the `<picture>` element with multiple `<source>` elements to serve AVIF to supporting browsers and fall back to WebP or JPEG. PNG should only be used for images requiring transparency where WebP is not available, since modern WebP supports transparency.

**Responsive images with `srcset` and `sizes`** solve the problem of serving appropriately sized images for each screen. The `srcset` attribute lists multiple image URLs with width descriptors (`w`). The `sizes` attribute tells the browser what display width the image will occupy at different viewport sizes. The browser then selects the most appropriate source. For example: `<img srcset="img-400.webp 400w, img-800.webp 800w, img-1200.webp 1200w" sizes="(max-width: 600px) 100vw, 50vw">`.

**Compression settings** matter significantly. For JPEG, quality 75-85 is the sweet spot for most photography. For WebP, quality 80 often matches JPEG quality 90 at smaller file size. Use tools like Squoosh, Sharp, or ImageMagick for batch processing. Enable progressive JPEG encoding so images render progressively rather than top-to-bottom.

**Delivery optimization** includes using a CDN with image transformation capabilities (Cloudinary, Imgix, Cloudflare Images), setting aggressive cache headers (`Cache-Control: public, max-age=31536000, immutable` with content-hashed URLs), and using HTTP/2 or HTTP/3 to parallelize requests.

**Intrinsic dimensions** (`width` and `height` attributes) should always be set to prevent CLS — the browser can calculate the aspect ratio and reserve space before the image loads.

### Key Points
- AVIF > WebP > JPEG for compression efficiency; use `<picture>` for progressive enhancement
- Always set `width` and `height` attributes to prevent CLS
- Use `srcset` + `sizes` for responsive images — never serve a 2000px image to a 400px viewport
- CDN image transformation services automate format conversion and resizing at the edge
- Never lazy-load the LCP image

### Follow-up Prompts
- How would you implement automatic image optimization in a Next.js application?
- What is the difference between `srcset` with `w` descriptors versus `x` descriptors?
- How do you handle art direction — showing a different crop of an image on mobile versus desktop?

### Difficulty: intermediate
### Tags: image-optimization, WebP, AVIF, srcset, responsive-images, CDN

---

## Q4: How do you analyze and reduce JavaScript bundle size?

### Question
Describe your process for auditing a JavaScript bundle that has grown too large. What tools do you use, what patterns cause bundle bloat, and what techniques do you apply to reduce it?

### Model Answer
Bundle bloat is one of the most common performance problems in mature JavaScript applications. The analysis and reduction process follows a systematic investigation pattern.

**Analysis tooling** starts with bundle analyzer tools. Webpack Bundle Analyzer and `rollup-plugin-visualizer` generate interactive treemap visualizations of the bundle showing each module's size contribution. For production builds, use `source-map-explorer` to analyze the actual deployed bundle from its source map. These tools immediately surface the biggest offenders — often a single large library imported where a smaller alternative exists.

**Common causes of bundle bloat** include: (1) importing entire libraries when only a few functions are needed (e.g., `import _ from 'lodash'` instead of `import debounce from 'lodash/debounce'`), (2) polyfills included for modern browsers, (3) duplicate dependencies caused by mismatched version requirements in `node_modules`, (4) large icon libraries imported wholesale, (5) development-only code not properly tree-shaken, and (6) locale data for internationalization libraries like moment.js or date-fns.

**Reduction techniques** — Tree shaking: ensure libraries use ES module syntax (`import`/`export`) and mark the package as side-effect-free in `package.json` with `"sideEffects": false`. Code splitting: use dynamic `import()` for routes and heavy components. Replace heavy libraries: use `date-fns` instead of `moment.js`, use native `fetch` instead of `axios`, use `nanoid` instead of `uuid`. Use bundle-size tracking tools like `bundlesize`, `size-limit`, or Lighthouse CI in your CI pipeline to prevent regressions. Enable compression: gzip or Brotli compression on the server; Brotli typically achieves 15-20% better compression than gzip.

**Duplicate dependency detection** uses `webpack-bundle-analyzer` or `npm ls <package>` to find packages appearing multiple times. Resolving them in webpack's `resolve.alias` or using `yarn resolutions` / `npm overrides` in `package.json` can eliminate duplicates.

### Key Points
- Use bundle analyzer tools (webpack-bundle-analyzer, rollup-plugin-visualizer) to identify the largest modules
- Tree shaking requires ES module syntax and `"sideEffects": false` in package.json
- Replace heavy libraries with lighter alternatives (moment→date-fns, lodash→lodash-es or native)
- Integrate size-limit or bundlesize in CI to prevent size regressions
- Brotli compression further reduces transfer size by 15-20% over gzip

### Follow-up Prompts
- How does tree shaking work at a technical level, and what prevents it from working correctly?
- How would you set up a CI check that fails the build if the bundle exceeds a size budget?
- What is module federation and how does it affect bundle analysis?

### Difficulty: intermediate
### Tags: bundle-size, webpack, tree-shaking, code-splitting, performance

---

## Q5: Explain HTTP caching strategies and how you would apply them to a web application.

### Question
Describe the HTTP caching model including Cache-Control directives, ETags, and cache busting. How would you design a caching strategy for a web application's static assets and API responses?

### Model Answer
HTTP caching is a fundamental performance mechanism that allows browsers, CDNs, and proxy servers to reuse previously fetched resources, eliminating unnecessary network requests.

**The Cache-Control header** is the primary caching directive. Key values: `max-age=<seconds>` sets how long the resource is considered fresh; `public` allows shared caches (CDNs) to cache the response; `private` restricts caching to the browser only; `no-cache` means the cache must revalidate with the server before using the stored response (it does store it); `no-store` prevents caching entirely; `immutable` tells the browser the resource will never change during its max-age period (eliminates conditional revalidation requests on reload).

**Static assets with content hashing** is the gold standard strategy. Build tools (Webpack, Vite) append a content hash to filenames (e.g., `main.a3f9b2.js`). These files can be served with `Cache-Control: public, max-age=31536000, immutable` — effectively infinite caching. When the content changes, the hash changes, producing a new URL that bypasses the cache automatically. The HTML file that references these assets must use `Cache-Control: no-cache` so users always get the latest version with updated asset references.

**API responses** require more nuanced strategies. For frequently changing data, use `Cache-Control: no-cache` with ETags or `Last-Modified` headers to enable conditional requests. The browser sends `If-None-Match` or `If-Modified-Since` on subsequent requests; if unchanged, the server returns 304 Not Modified with no body, saving bandwidth. For stable reference data, use `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` — this serves stale content immediately while revalidating in the background.

**Service Worker caching** adds a programmable cache layer. With strategies like Cache-First (return from cache, fall back to network) for offline support, or Stale-While-Revalidate (return cached immediately, update in background), you get fine-grained control that HTTP headers alone cannot provide. Libraries like Workbox abstract these strategies.

### Key Points
- Content-hashed static assets can use `max-age=31536000, immutable` — change the filename to bust the cache
- HTML must use `no-cache` so users always receive the latest asset references
- ETags and conditional requests (304 responses) save bandwidth for frequently changing resources
- `stale-while-revalidate` improves perceived performance by serving stale content while updating in background
- Service Workers extend caching into programmable territory enabling offline-first apps

### Follow-up Prompts
- What is the difference between `no-cache` and `no-store` in Cache-Control?
- How does a CDN interact with `Cache-Control` headers, and when would you use `s-maxage` vs `max-age`?
- How would you invalidate a CDN cache when you need to immediately update a cached resource?

### Difficulty: intermediate
### Tags: HTTP-cache, Cache-Control, ETags, service-worker, CDN

---

## Q6: How does code splitting work, and what are the different strategies?

### Question
Explain how JavaScript code splitting works technically, what splitting strategies exist (route-based, component-based, vendor splitting), and how to decide the optimal splitting strategy for a given application.

### Model Answer
Code splitting is the technique of dividing a JavaScript bundle into multiple smaller chunks that can be loaded on demand, reducing the initial payload the user must download before the application becomes interactive.

**The technical mechanism** relies on dynamic `import()` — an ECMAScript proposal that returns a Promise resolving to the module. Bundlers (Webpack, Rollup, Vite, esbuild) recognize dynamic imports as split points and emit separate output chunks. The runtime loader handles fetching the chunk when the dynamic import is executed, typically showing a loading state until the chunk resolves.

**Route-based splitting** is the highest-impact strategy and should always be the starting point. Each route's component tree is bundled into its own chunk. In React, this is implemented with `React.lazy()` wrapping a dynamic import, combined with `React.Suspense`. Frameworks like Next.js and Remix do this automatically. The benefit is that a user visiting the home page never downloads code for the settings or admin pages.

**Component-level splitting** targets heavy, conditionally rendered components: modals, rich text editors (TipTap, Quill), chart libraries (Recharts, D3), map components (Leaflet), or PDF viewers. These are good candidates because they are large and not needed immediately. The trade-off is a potential UX flash on first render; mitigate with Suspense fallback skeletons or by prefetching on hover/focus.

**Vendor chunk splitting** separates third-party dependencies (node_modules) from application code. The vendor chunk changes less frequently than application code, enabling better long-term caching. Vite does this automatically; with Webpack you configure `splitChunks.cacheGroups`. However, splitting too many small vendor chunks can increase HTTP request overhead (less of an issue with HTTP/2).

**Deciding the strategy:** Start with route-based splitting, then analyze the bundle with a visualizer. If a specific page bundle is still large, apply component-level splitting. Use vendor splitting for cache efficiency. Measure the impact — splitting too aggressively can cause waterfall requests that hurt TTI despite reducing initial bundle size.

### Key Points
- Dynamic `import()` is the foundation; bundlers recognize it as a split boundary
- Route-based splitting is always the first and highest-impact step
- Component splitting is best for heavy, infrequently used UI (editors, maps, charts)
- Vendor splitting improves cache hit rates since third-party code changes less often
- Aggressive splitting can create request waterfalls; balance with prefetching

### Follow-up Prompts
- How does Webpack's `SplitChunksPlugin` decide where to split vendor code?
- How do you prefetch or preload a code-split chunk before the user navigates to it?
- What is the impact of code splitting on SSR, and how does React 18's streaming help?

### Difficulty: intermediate
### Tags: code-splitting, dynamic-import, React-lazy, webpack, bundle-optimization

---

## Q7: How do you optimize web fonts to eliminate FOIT and FOUT?

### Question
Explain the problems of Flash of Invisible Text (FOIT) and Flash of Unstyled Text (FOUT) in web font loading. What techniques do you use to optimize font loading and eliminate or minimize these issues?

### Model Answer
Web fonts improve typography but introduce a loading challenge: the browser must fetch the font file before it can render text, leading to either a blank text period (FOIT) or a style swap period (FOUT).

**FOIT (Flash of Invisible Text)** occurs when the browser hides text while the font is loading. This is the browser's default behavior in most cases — it waits up to 3 seconds for the font, showing nothing. This is harmful to both user experience and Core Web Vitals (it can affect LCP if the LCP element is text).

**FOUT (Flash of Unstyled Text)** occurs when the browser initially renders text with a fallback system font, then swaps to the custom font once loaded. While less jarring than invisible text, the layout shift during the swap contributes to CLS.

**The `font-display` property** is the primary control mechanism in `@font-face` declarations:
- `font-display: swap` — immediately uses the fallback font, then swaps when loaded (FOUT; good for body text)
- `font-display: optional` — gives the font a very short loading window; if not loaded, the fallback is used and no swap occurs (best for Core Web Vitals; you lose the custom font on slow connections)
- `font-display: fallback` — 100ms invisible text, then fallback, then swap if loaded within 3s
- `font-display: block` — up to 3s invisible text (closest to browser default; avoid)

**Preloading critical fonts** with `<link rel="preload" as="font" type="font/woff2" href="/fonts/body.woff2" crossorigin>` tells the browser to fetch the font at high priority, before it encounters the `@font-face` rule in CSS. Only preload fonts used above the fold.

**Font subsetting** dramatically reduces font file size by including only the characters actually used. Tools like `fonttools` / `pyftsubset` or online tools like Font Squirrel can reduce a 300 KB font to 20 KB by removing unused glyphs. Use Unicode range descriptors in `@font-face` to let the browser download only needed subsets.

**System font stacks and variable fonts** are advanced strategies. System fonts (system-ui, -apple-system) eliminate network requests entirely. Variable fonts consolidate multiple weights/styles into a single file, reducing HTTP requests.

### Key Points
- `font-display: swap` eliminates FOIT but causes FOUT; `font-display: optional` eliminates both at the cost of custom font on slow connections
- Preload above-the-fold fonts with `<link rel="preload">` to start fetching before CSS is parsed
- Use WOFF2 format — it offers the best compression (~30% better than WOFF)
- Subset fonts to include only needed characters; Unicode range allows lazy subset loading
- Variable fonts reduce requests by combining multiple weights/styles into one file

### Follow-up Prompts
- How does the `size-adjust` descriptor in `@font-face` help reduce CLS during font swap?
- How would you implement a font loading strategy that shows the custom font on repeat visits but avoids FOUT on first visit?
- What is the `font-display: optional` trade-off and when is it the right choice?

### Difficulty: intermediate
### Tags: web-fonts, FOIT, FOUT, font-display, font-loading, CLS

---

## Q8: What are render-blocking resources and how do you eliminate them?

### Question
Explain what render-blocking resources are, why they block rendering, and the techniques to eliminate or defer them. Cover both CSS and JavaScript blocking.

### Model Answer
Render-blocking resources are files that the browser must download and process before it can paint anything to the screen. They directly delay First Contentful Paint and LCP, making the page feel slow even if network conditions are good.

**Why resources block rendering:** The browser's rendering pipeline requires the CSSOM (CSS Object Model) to be complete before it can construct the render tree and paint. Therefore, any CSS file in the `<head>` blocks rendering until it is fully downloaded and parsed. JavaScript in the `<head>` without `async` or `defer` blocks both HTML parsing and rendering because scripts can access and modify the DOM and CSSOM.

**Eliminating CSS render-blocking:** The primary technique is inlining critical CSS — the styles needed to render the above-the-fold content — directly in a `<style>` tag in the `<head>`. The rest of the CSS is loaded asynchronously: `<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">`. The `media="print"` trick loads the stylesheet without blocking rendering; the `onload` handler swaps it to `all`. Tools like `critical` (npm) automate extraction of critical CSS.

**Media queries for conditional CSS:** Link elements with `media` attributes (e.g., `media="(max-width: 768px)"`) only block rendering on matching viewports, reducing blocking on non-matching devices. However, the browser still downloads all stylesheets.

**Eliminating JavaScript render-blocking:** Use `async` or `defer` attributes on script tags. `defer` downloads the script in parallel with HTML parsing and executes it after HTML parsing is complete but before DOMContentLoaded — this preserves execution order. `async` downloads in parallel and executes immediately when downloaded, interrupting HTML parsing — execution order is not guaranteed, suitable for independent scripts like analytics. Scripts at the bottom of `<body>` achieve similar effect to `defer` but delay discovery. `type="module"` scripts are implicitly deferred.

**Third-party scripts** are a major source of render blocking. Audit them with WebPageTest or Chrome DevTools Coverage tab. Use `async` on Google Analytics, tag managers, and similar scripts. Consider loading them via Partytown (moves third-party scripts to a Web Worker) for maximum isolation.

### Key Points
- CSS in `<head>` blocks rendering until downloaded and parsed — inline critical CSS and async-load the rest
- `<script>` without `async`/`defer` blocks HTML parsing AND rendering
- `defer` preserves script execution order; `async` does not — choose based on dependencies
- Extract critical (above-fold) CSS and inline it to eliminate CSS render-blocking entirely
- Audit render-blocking resources in Lighthouse's "Eliminate render-blocking resources" audit

### Follow-up Prompts
- How does the browser's preload scanner mitigate some render-blocking effects?
- What is the trade-off between inlining critical CSS and long-term cacheability?
- How would you use the Coverage tab in Chrome DevTools to identify unused CSS?

### Difficulty: intermediate
### Tags: render-blocking, critical-CSS, async-defer, performance, FCP

---

## Q9: What is the difference between debounce and throttle, and when do you use each?

### Question
Explain the concepts of debounce and throttle, how they differ technically, implement each from scratch, and describe the scenarios where each is the appropriate choice.

### Model Answer
Debounce and throttle are both rate-limiting techniques for functions that would otherwise be called too frequently, but they handle timing differently and solve different problems.

**Debounce** delays execution until a specified amount of time has passed since the last invocation. If the function is called again within the delay period, the timer resets. The function fires only once, after the invocations stop.

```javascript
function debounce(fn, delay) {
  let timerId;
  return function(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

**Throttle** ensures the function is called at most once per specified time interval. Unlike debounce, it fires at regular intervals during continuous invocation — the first call fires immediately, subsequent calls during the interval are suppressed, and the cycle repeats.

```javascript
function throttle(fn, interval) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}
```

**When to use debounce:** Search input autocomplete — you want to fire the API request only after the user stops typing (300-500ms delay). Form validation on blur-like events. Window resize handlers where you only care about the final size. Saving draft content — fire only when the user pauses.

**When to use throttle:** Scroll event handlers that update a sticky header or progress bar — you want consistent updates during scrolling, not just at the end. Mousemove handlers (e.g., parallax effects, drag-and-drop). Infinite scroll — check position at most every 200ms. API calls triggered by real-time input like a slider.

**Leading vs trailing edge:** Both debounce and throttle can fire on the leading edge (immediately on first call), trailing edge (after delay), or both. Lodash's `_.debounce` and `_.throttle` accept an `options` object for this. Leading-edge debounce is useful for button click handlers to give immediate feedback while preventing double-submission.

### Key Points
- Debounce waits for silence — fires once after invocations stop; best for search inputs, resize final state
- Throttle fires at a regular cadence during continuous invocation; best for scroll, mousemove, real-time updates
- Leading-edge variants fire immediately and then impose a cooldown
- Both are available in Lodash but the implementations are a few lines of vanilla JS
- Incorrect use of debounce on scroll can make UI feel laggy; throttle is almost always correct for scroll

### Follow-up Prompts
- How would you implement a debounce that supports cancellation?
- What is the React-specific concern when using debounce or throttle inside a component, and how do you solve it with `useCallback` or `useRef`?
- How does `requestAnimationFrame` relate to throttle for animation-driven scroll handlers?

### Difficulty: intermediate
### Tags: debounce, throttle, performance, event-handling, JavaScript

---

## Q10: What is virtual scrolling and how do you implement it?

### Question
Explain the problem that virtual scrolling solves, describe how it works technically, and outline the key implementation challenges. When should you use virtual scrolling versus pagination?

### Model Answer
Virtual scrolling (also called windowing or list virtualization) is a technique for efficiently rendering large lists by only rendering the items currently visible in the viewport, plus a small buffer, rather than rendering all items in the DOM.

**The problem:** Rendering 10,000 list items creates 10,000 DOM nodes. Each DOM node consumes memory and contributes to layout calculations. Scrolling a list with tens of thousands of items causes significant frame drops because the browser must handle layout, paint, and compositing for all those nodes on every scroll event.

**How it works technically:** The virtual scroller maintains the full scroll height by wrapping items in a container with an explicit height equal to `totalItems * itemHeight`. Only the items whose positions overlap with the current viewport + buffer zone are actually rendered. As the user scrolls, the rendered window shifts — items scrolling out of view are removed from the DOM, and items scrolling into view are added. The rendered items are absolutely or transform-positioned to their correct visual positions.

**Implementation outline:**
1. Calculate container height: `totalHeight = itemCount * itemHeight`
2. Calculate visible range: `startIndex = Math.floor(scrollTop / itemHeight)`, `endIndex = Math.ceil((scrollTop + viewportHeight) / itemHeight)`
3. Apply a buffer: extend `startIndex` and `endIndex` by 3-5 items to prevent empty frames during fast scrolling
4. Render only `items[startIndex..endIndex]` with absolute positioning: `top = index * itemHeight`
5. Listen to scroll events (throttled with rAF) to recalculate and re-render the visible window

**Variable height items** are significantly more complex. You must either pre-measure all items (expensive), use estimated heights with post-render measurement correction, or use a binary search on a running height sum. Libraries like `@tanstack/react-virtual` and `react-window` / `react-virtuoso` handle variable heights gracefully.

**Virtual scrolling vs pagination:** Use virtual scrolling for lists that users scroll continuously (social feeds, logs, file explorers) where discrete page jumps would be jarring. Use pagination for structured data tables where users want to jump to specific pages, or for SEO-critical content (search results). Infinite scroll (load-more on reaching bottom) is a hybrid approach that appends items without true virtualization — it works for moderate list sizes but eventually degrades.

### Key Points
- Virtual scrolling renders only visible items, reducing DOM nodes from thousands to ~20-50
- Requires explicit item heights (or height estimation) to calculate scroll positions
- Buffer zones (overscan) prevent flicker during fast scrolling
- Variable-height virtualization is complex; use battle-tested libraries (react-window, @tanstack/virtual, react-virtuoso)
- Choose virtual scrolling for continuous scroll UX; pagination for structured navigation

### Follow-up Prompts
- How would you handle keyboard navigation (arrow keys, Page Down) in a virtualized list?
- How does `@tanstack/react-virtual` differ from `react-window` in its approach to variable-height items?
- How do you implement virtual scrolling in a grid layout (two-dimensional virtualization)?

### Difficulty: intermediate
### Tags: virtual-scrolling, windowing, performance, react-window, large-lists

---
