# Next.js - Mid Interview Questions
### Language: en

## Q1: App Router vs Pages Router

### Question
What are the key differences between Next.js App Router and Pages Router? When would you choose one over the other?

### Model Answer
The Pages Router has been the traditional routing mechanism in Next.js since its early versions. It uses a file-based system where files inside the `pages/` directory automatically become routes. Each page component is a React component that can export data-fetching functions like `getStaticProps`, `getServerSideProps`, or `getStaticPaths`. This model is straightforward and well-understood by the community.

The App Router, introduced in Next.js 13 and stabilized in Next.js 14, represents a paradigm shift. It lives in the `app/` directory and is built on top of React Server Components (RSC). Routes are defined using folder structures with special files like `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx`. This colocation of related files makes the codebase more organized.

The most fundamental difference is the component model. In the App Router, components are Server Components by default, meaning they render on the server and send HTML to the client with no JavaScript hydration overhead. You explicitly opt into client-side interactivity by adding `"use client"` at the top of a file. The Pages Router, by contrast, uses traditional React components that hydrate fully on the client.

Data fetching also differs substantially. The App Router encourages fetching data directly inside Server Components using the extended `fetch` API with caching options. The Pages Router relies on special lifecycle functions that are tightly coupled to the page component. The App Router's approach is more composable because any Server Component in the tree can fetch its own data.

For new projects, the App Router is generally recommended as it is the future direction of Next.js and unlocks features like streaming, Suspense boundaries, and partial prerendering. The Pages Router remains fully supported and is preferable when migrating existing codebases incrementally, when the team needs more time to learn RSC patterns, or when third-party libraries have not yet added App Router support.

### Key Points
- App Router uses React Server Components by default; Pages Router uses traditional client-hydrated components
- App Router organizes routes via folder structures with special files; Pages Router maps files directly to routes
- Data fetching in App Router is done inside components using extended fetch; Pages Router uses `getServerSideProps`/`getStaticProps`
- Both routers can coexist in the same Next.js project during migration
- App Router unlocks streaming, Suspense, and partial prerendering

### Follow-up Prompts
- How do layouts work differently between App Router and Pages Router?
- Can you mix App Router and Pages Router in a single project, and what are the caveats?
- What migration strategy would you recommend for moving a large Pages Router app to App Router?

### Difficulty: intermediate
### Tags: nextjs, app-router, pages-router, routing, react-server-components

---

## Q2: File-Based Routing in the App Router

### Question
Explain the file-based routing conventions in Next.js App Router. What are the special files and what do they do?

### Model Answer
The App Router uses a folder-based convention where each folder represents a route segment. A route is only publicly accessible when a `page.tsx` (or `page.js`) file exists in that folder. This separation between the route segment and the publicly accessible page allows you to colocate components, hooks, utilities, and tests alongside routes without accidentally creating public endpoints.

The `layout.tsx` file defines UI that is shared across a route and its children. Unlike Pages Router's `_app.tsx`, layouts in the App Router are nested — each segment can have its own layout, and they wrap child layouts automatically. Layouts persist across navigations by default, preserving state and avoiding unnecessary re-renders.

The `loading.tsx` file uses React Suspense under the hood to show a loading skeleton or spinner while the page or a nested segment is streaming in. When Next.js encounters a `loading.tsx`, it wraps the corresponding `page.tsx` in a `<Suspense>` boundary automatically.

The `error.tsx` file must be a Client Component (because it uses React's error boundary pattern) and catches runtime errors in the segment. It receives an `error` object and a `reset` function to retry rendering. There is also a special `global-error.tsx` that handles errors in the root layout.

Other notable special files include `not-found.tsx` for 404 states, `route.ts` for API route handlers, `template.tsx` (similar to layout but creates a fresh instance on each navigation), and `default.tsx` for parallel route fallbacks. Dynamic segments use bracket notation — `[id]` for dynamic parameters, `[...slug]` for catch-all routes, and `[[...slug]]` for optional catch-all routes. Route groups using `(groupName)` organize routes without affecting the URL structure.

### Key Points
- `page.tsx` makes a route publicly accessible; its absence means the folder is just a layout/organization container
- `layout.tsx` wraps child routes and persists across navigations, enabling shared UI without re-mounting
- `loading.tsx` automatically wraps `page.tsx` in a Suspense boundary for streaming
- `error.tsx` must be a Client Component and acts as an error boundary for its segment
- Dynamic segments use `[param]`, catch-all uses `[...slug]`, optional catch-all uses `[[...slug]]`

### Follow-up Prompts
- What is the difference between `layout.tsx` and `template.tsx`?
- How do route groups `(groupName)` affect the URL and what are practical use cases?
- How would you implement per-segment error handling without the error file convention?

### Difficulty: intermediate
### Tags: nextjs, app-router, file-based-routing, layouts, special-files

---

## Q3: Server Components vs Client Components

### Question
What is the difference between React Server Components and Client Components in Next.js? How do you decide which to use?

### Model Answer
React Server Components (RSC) are components that render exclusively on the server. They never ship their component code to the browser — only the rendered HTML output and serialized props are sent. This means they can safely access server-side resources like databases, file systems, and environment variables without exposing them to the client. They also have zero impact on the JavaScript bundle size.

Client Components are the traditional React components that execute in the browser. They are created by adding `"use client"` at the top of a file. This directive marks that file and all of its imports as part of the client boundary. Client Components support React hooks (`useState`, `useEffect`, `useCallback`, etc.), browser APIs, and event listeners — all of which are unavailable in Server Components.

The key mental model is the component tree split: the server renders the tree down to the client boundary, serializes the result, and sends it to the browser. The client picks up from the boundary and hydrates those components. Server Components can import and render Client Components, but Client Components cannot directly render Server Components (though they can receive them as props via the `children` pattern).

The decision heuristic is: default to Server Components and only add `"use client"` when you need interactivity, state, effects, or browser APIs. Common candidates for Client Components include interactive forms, modals, dropdowns, drag-and-drop, real-time subscriptions, and any component using hooks. Components that fetch data, display static content, or perform server-side logic should remain as Server Components.

A practical pattern is to push the client boundary as far down the tree as possible. Instead of making an entire page a Client Component because one button needs `onClick`, extract that button into its own small Client Component while keeping the surrounding page as a Server Component. This maximizes server rendering benefits and minimizes client JavaScript.

### Key Points
- Server Components render only on the server; their code never reaches the browser, reducing bundle size
- Client Components use `"use client"` directive and support hooks, event handlers, and browser APIs
- Server Components can render Client Components, but not vice versa (unless passed as children/props)
- Default to Server Components; opt into Client Components only when interactivity or browser APIs are needed
- Push `"use client"` boundaries as far down the component tree as possible

### Follow-up Prompts
- How do you pass data from a Server Component to a Client Component, and what types can be serialized?
- What is the "use server" directive and how does it differ from Server Components?
- Can a Server Component use a Context API, and how do you handle shared state across the tree?

### Difficulty: intermediate
### Tags: nextjs, react-server-components, client-components, rendering, performance

---

## Q4: Data Fetching - RSC fetch vs getServerSideProps

### Question
How does data fetching in React Server Components compare to `getServerSideProps` in the Pages Router? What are the advantages of the new approach?

### Model Answer
In the Pages Router, `getServerSideProps` is a special async function exported from a page file that runs on the server for every request. It receives the request context and must return a `props` object, which is passed to the page component. Data fetching is tightly coupled to the page level — you cannot fetch data in deeply nested components without prop drilling or using a client-side data library like React Query.

In the App Router with React Server Components, any `async` Server Component can fetch data directly using the extended `fetch` API or any server-side data source. This means data fetching can happen at any level of the component tree, colocated with the component that actually needs the data. There is no more prop drilling just to get data from the page level to a deeply nested component.

Next.js extends the native `fetch` API with additional caching options. By default, `fetch` results are cached (equivalent to `{ cache: 'force-cache' }`). For dynamic data that should be fetched fresh on every request, you pass `{ cache: 'no-store' }`. For ISR-style revalidation, you use `{ next: { revalidate: 3600 } }` to specify a time-based cache duration in seconds.

Parallel data fetching is simpler in the App Router because each Server Component fetches its own data and React can start rendering the tree as data arrives via streaming. In the Pages Router, all data for a page had to be assembled in `getServerSideProps` before any rendering could begin, creating a waterfall at the page level.

Another advantage is composability — you can abstract data-fetching logic into server-side utility functions or even dedicated "data layer" Server Components, keeping concerns separated. The fetch deduplication feature in Next.js also automatically deduplicates identical fetch requests made during a single render pass, so multiple components requesting the same resource do not result in multiple network calls.

### Key Points
- RSC data fetching is colocated with components; `getServerSideProps` is page-level only
- Next.js extends `fetch` with `cache: 'no-store'`, `cache: 'force-cache'`, and `next.revalidate` options
- Automatic fetch deduplication prevents duplicate requests for the same URL in a single render
- Streaming allows partial page rendering to start before all data is available
- No prop drilling needed — each component fetches exactly what it needs

### Follow-up Prompts
- How does Next.js handle fetch deduplication across Server Components?
- What happens when you use `async/await` in a Server Component that fetches two resources — is it sequential or parallel?
- How do you share fetched data between sibling Server Components without fetching it twice?

### Difficulty: intermediate
### Tags: nextjs, data-fetching, rsc, getserversideprops, caching, fetch

---

## Q5: Middleware in Next.js

### Question
What is Next.js Middleware, how does it work, and what are its common use cases?

### Model Answer
Next.js Middleware is a function that runs before a request is processed by the server. It executes at the network edge (before the route handler or page is reached) and can inspect the request, modify the response, redirect, rewrite the URL, or set headers. Middleware is defined in a `middleware.ts` file at the root of the project (or inside `src/` if using that structure).

The middleware function receives a `NextRequest` object and must return a `NextResponse`. You can call `NextResponse.next()` to continue to the next handler, `NextResponse.redirect()` to send the user to a different URL, or `NextResponse.rewrite()` to serve a different URL while keeping the original URL in the browser. You can also return a `Response` directly to short-circuit the request.

Middleware runs on the Edge Runtime by default, which means it has access to a subset of Node.js APIs — primarily Web APIs like `URL`, `Headers`, `Request`, and `Response`. This constraint exists because edge workers need to be lightweight and fast. You cannot use Node.js-specific modules like `fs` or `path` in middleware.

The `config` export with a `matcher` array controls which routes the middleware applies to. Without a matcher, middleware runs on every route including static assets, which can harm performance. Typical matchers use glob patterns like `'/dashboard/:path*'` or use a regex to exclude static files explicitly.

Common use cases include authentication and authorization (checking session cookies and redirecting unauthenticated users), A/B testing (rewriting requests to different page variants based on a cookie), internationalization (detecting locale from Accept-Language headers and redirecting to locale-prefixed routes), and bot detection or rate limiting at the edge before requests reach the origin server.

### Key Points
- Middleware runs at the edge before route handlers, enabling request inspection and transformation
- Defined in a single `middleware.ts` file; uses `config.matcher` to scope which routes it applies to
- Runs on Edge Runtime — Web APIs only, no Node.js-specific modules
- Can redirect, rewrite, modify headers, or short-circuit the request entirely
- Common uses: auth guards, A/B testing, i18n routing, bot filtering

### Follow-up Prompts
- What are the limitations of running logic in Middleware versus a Server Component or Route Handler?
- How would you implement authentication in Middleware without having access to a database from the Edge Runtime?
- How does middleware interact with App Router layouts and Server Components?

### Difficulty: intermediate
### Tags: nextjs, middleware, edge-runtime, authentication, routing

---

## Q6: Route Handlers (API Routes)

### Question
How do Route Handlers work in Next.js App Router, and how do they differ from Pages Router API routes?

### Model Answer
In the Pages Router, API routes are defined as files inside `pages/api/`. Each file exports a default handler function that receives `(req, res)` arguments — a Node.js-style IncomingMessage and ServerResponse. This pattern is familiar to Express.js developers but is tied to the Node.js request/response model.

In the App Router, Route Handlers are defined in `route.ts` files within the `app/` directory. Instead of a default export, you export named functions corresponding to HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`. These functions receive a standard Web API `Request` object and must return a `Response` object. This aligns with the WinterCG standard and makes handlers portable across different runtimes.

Route Handlers support the same dynamic segments as pages — `app/api/users/[id]/route.ts` handles requests for `/api/users/:id`. The dynamic parameter is passed as the second argument to the handler function as `{ params: { id: string } }`. Route Handlers can also use `NextRequest` and `NextResponse` from `next/server` for access to additional Next.js features like cookie manipulation and geo data.

Caching behavior is one notable difference. `GET` Route Handlers are cached by default when they do not use dynamic functions (like reading request headers or cookies). You can opt out of caching with `export const dynamic = 'force-dynamic'` or by using `request.headers` inside the handler, which signals dynamic behavior.

Route Handlers are suitable for webhooks, form submissions, server-sent events, and any scenario where you need a proper HTTP endpoint. However, for data mutations within the same Next.js application, Server Actions are often a better choice because they integrate directly with React and do not require a separate API call from the client.

### Key Points
- Route Handlers use named exports (`GET`, `POST`, etc.) with Web API `Request`/`Response` objects
- Defined in `route.ts` files inside the `app/` directory; support dynamic segments
- `GET` handlers are cached by default; use `export const dynamic = 'force-dynamic'` to opt out
- Second argument provides route params: `{ params: { id: string } }`
- Server Actions may be preferable to Route Handlers for internal data mutations

### Follow-up Prompts
- How would you add CORS headers to a Route Handler?
- What is the difference between a Route Handler and a Server Action for handling form submissions?
- How do you stream a response from a Route Handler using the Web Streams API?

### Difficulty: intermediate
### Tags: nextjs, route-handlers, api-routes, app-router, http

---

## Q7: next/image Optimization

### Question
How does the `next/image` component work, and what optimizations does it provide over a standard `<img>` tag?

### Model Answer
The `next/image` component is a drop-in replacement for the HTML `<img>` element that provides automatic image optimization. When a browser requests an image through `next/image`, Next.js intercepts the request and serves a resized, compressed, and format-converted version of the image tailored to the requesting device's viewport and pixel density.

Format optimization is automatic — Next.js converts images to WebP or AVIF (when supported by the browser) regardless of the original format. This typically results in 25-35% smaller file sizes compared to JPEG or PNG at equivalent quality. The format negotiation happens via content negotiation using the `Accept` request header.

The component enforces explicit `width` and `height` props (or `fill` mode) to reserve layout space before the image loads, preventing Cumulative Layout Shift (CLS). This is a Core Web Vital that affects SEO and user experience. In `fill` mode, the image expands to fill its parent container, which must have `position: relative` and defined dimensions.

Lazy loading is the default behavior — images not in the viewport are not loaded until the user scrolls close to them. For images that are immediately visible (above the fold), you should add `priority` prop to disable lazy loading and instead inject a `<link rel="preload">` tag, improving Largest Contentful Paint (LCP). Only one or two images per page should use `priority`.

The `sizes` prop is important for responsive images. It maps media conditions to the expected image display width (e.g., `"(max-width: 768px) 100vw, 50vw"`), allowing the browser to download the smallest adequate version. Without `sizes`, the browser may download a larger image than necessary. Remote images require domain configuration in `next.config.js` under `images.remotePatterns` to prevent abuse of the optimization endpoint.

### Key Points
- Automatically converts images to WebP/AVIF for smaller file sizes without manual conversion
- Requires `width`/`height` or `fill` to prevent CLS by reserving layout space
- Lazy loads by default; use `priority` for above-the-fold images to improve LCP
- The `sizes` prop enables responsive image delivery by describing the expected display width
- Remote images must be allowlisted in `next.config.js` via `images.remotePatterns`

### Follow-up Prompts
- What is the difference between using `fill` and explicit `width`/`height` props, and when would you use each?
- How does Next.js cache optimized images, and what happens when the source image changes?
- How would you handle images from a third-party CDN that you want to optimize with `next/image`?

### Difficulty: intermediate
### Tags: nextjs, next-image, performance, web-vitals, cls, lcp

---

## Q8: next/font

### Question
What is `next/font` and how does it optimize font loading in Next.js applications?

### Model Answer
`next/font` is Next.js's built-in font optimization system that automatically handles font loading, self-hosting, and CSS generation. It was introduced in Next.js 13 to solve the common performance problem of fonts causing layout shift and additional network requests to external font services like Google Fonts.

The primary feature is automatic self-hosting. When you use `next/font/google`, Next.js downloads the font files at build time and serves them from your own domain instead of from `fonts.googleapis.com`. This eliminates a cross-origin network request, which can add 100-300ms of latency in some regions, and it removes the privacy concerns of sending user requests to Google.

Font declarations are defined in layout or component files and generate CSS custom properties or class names. For example, calling `const inter = Inter({ subsets: ['latin'] })` returns an object with `className` and `style` properties that you apply to your root element. This approach ensures the font CSS is injected at the correct point in the document with zero runtime JavaScript.

`next/font` automatically generates a `font-display: swap` (or your chosen display strategy) CSS declaration and calculates a fallback font metric override. The fallback font is mathematically adjusted in terms of `ascent-override`, `descent-override`, and `line-gap-override` to match the geometry of the actual web font as closely as possible. This dramatically reduces Cumulative Layout Shift caused by the font swap, since the fallback and the actual font occupy nearly the same space.

For custom fonts not on Google Fonts, you use `next/font/local` with a `src` pointing to the font file in your project. The same optimizations apply — self-hosting, subsetting, display strategy, and metric adjustments. Multiple fonts can be combined using CSS variables, allowing Tailwind CSS integration via `fontFamily` configuration.

### Key Points
- Automatically self-hosts Google Fonts at build time, eliminating cross-origin requests to Google
- Zero runtime JavaScript — font CSS is statically generated and injected at build time
- Generates fallback font metric overrides to minimize CLS during the font swap
- Supports both `next/font/google` for Google Fonts and `next/font/local` for custom font files
- Returns `className` and `style` properties for easy integration; supports CSS variable mode for Tailwind

### Follow-up Prompts
- How would you use multiple fonts in a Next.js project with `next/font` and Tailwind CSS?
- What is the `font-display` strategy and when would you choose `optional` over `swap`?
- How does `next/font` handle font subsetting, and why does it matter for performance?

### Difficulty: intermediate
### Tags: nextjs, next-font, performance, web-fonts, cls, google-fonts

---

## Q9: Incremental Static Regeneration (ISR)

### Question
What is Incremental Static Regeneration in Next.js, how does it work, and when should you use it?

### Model Answer
Incremental Static Regeneration (ISR) allows Next.js to generate and update static pages after the initial build, without requiring a full site rebuild. It bridges the gap between fully static sites (which need a rebuild for every content change) and fully server-side rendered sites (which generate a fresh response for every request). With ISR, you get the performance of static pages with the freshness of server-rendered content.

In the Pages Router, ISR is enabled by returning a `revalidate` number from `getStaticProps`. This number represents the minimum number of seconds before Next.js attempts to regenerate the page. In the App Router, the equivalent is using `fetch` with `{ next: { revalidate: N } }` inside a Server Component, or exporting `export const revalidate = N` at the segment level.

The revalidation mechanism follows a stale-while-revalidate pattern. When a request comes in for a stale page (one that has exceeded its revalidate window), Next.js serves the stale cached version immediately (for fast response) and simultaneously triggers a background regeneration. The next request will receive the freshly regenerated page. This means the content may be up to `revalidate` seconds old for most users, but nobody waits for regeneration.

On-demand revalidation is an alternative to time-based ISR. It allows you to revalidate specific pages or cache tags programmatically by calling `revalidatePath()` or `revalidateTag()` from a Server Action or Route Handler. This is useful for content-managed sites where you want to rebuild a page immediately when content changes in a CMS, rather than waiting for a timer.

ISR is ideal for content that changes infrequently but does change — e-commerce product pages, blog posts, marketing landing pages, documentation pages. For real-time data (stock prices, live sports scores), full dynamic rendering is more appropriate. For truly static content that never changes, plain static generation without revalidation is the right choice.

### Key Points
- ISR generates static pages at build time and regenerates them in the background after a revalidate window
- Follows stale-while-revalidate: serves cached content immediately, then regenerates in the background
- Configured via `revalidate` in `getStaticProps` (Pages Router) or `fetch` options / segment config (App Router)
- On-demand revalidation via `revalidatePath()` and `revalidateTag()` triggers immediate rebuilds
- Best for content that changes occasionally (blogs, product pages); not suited for real-time data

### Follow-up Prompts
- What happens if a regeneration fails? Does the old cached page continue to be served?
- How does `revalidateTag()` work and how do you associate a fetch request with a tag?
- How does ISR behavior differ between Vercel deployment and self-hosted Next.js?

### Difficulty: intermediate
### Tags: nextjs, isr, static-generation, caching, revalidation, performance

---

## Q10: next/link and Prefetching

### Question
How does `next/link` work in Next.js, and how does its prefetching behavior improve navigation performance?

### Model Answer
The `next/link` component is Next.js's client-side navigation component. When a user clicks a `<Link>`, Next.js intercepts the navigation and performs a client-side route transition instead of a full page reload. This preserves React state, avoids re-downloading shared layouts and scripts, and makes navigation feel instant.

Prefetching is the standout feature of `next/link`. When a `<Link>` becomes visible in the viewport (detected via `IntersectionObserver`), Next.js automatically prefetches the linked route's code and data in the background. By the time the user clicks, the destination page is already loaded in memory, making the transition nearly instantaneous.

The prefetching behavior differs between the App Router and Pages Router. In the Pages Router, prefetching downloads the JavaScript bundle for the linked page. In the App Router, prefetching downloads the portion of the route that is shared (layouts) and precomputes data for the page segment that uses static or ISR content. Dynamically rendered pages have their shared layouts prefetched but not their dynamic data.

You can control prefetching with the `prefetch` prop. Setting `prefetch={false}` disables prefetching for a specific link, which is useful for links to heavy pages that the user is unlikely to visit, or in situations where you want to conserve bandwidth. In the App Router, `prefetch={true}` forces full prefetching including the page's loading UI, while the default behavior prefetches only the shared layout portion.

In Next.js 13+, the `<Link>` component no longer requires a nested `<a>` tag — it renders an anchor element directly. The `replace` prop replaces the current history entry instead of pushing a new one, which is useful for pagination or filter navigation. The `scroll` prop controls whether the page scrolls to the top after navigation; setting `scroll={false}` maintains the scroll position.

### Key Points
- `<Link>` enables client-side navigation, preserving React state and avoiding full page reloads
- Prefetches linked routes automatically when they enter the viewport using `IntersectionObserver`
- App Router prefetches shared layouts by default; Pages Router prefetches the full JS bundle
- `prefetch={false}` disables prefetching per link; `prefetch={true}` in App Router forces full prefetch
- `replace` prop controls history stack behavior; `scroll={false}` preserves scroll position

### Follow-up Prompts
- How does Next.js know when to prefetch and when to avoid it (e.g., on slow connections)?
- What is the difference between `router.push()` and a `<Link>` click in terms of what gets prefetched?
- How would you programmatically prefetch a route without rendering a visible `<Link>`?

### Difficulty: intermediate
### Tags: nextjs, next-link, prefetching, navigation, performance, client-side-routing

---
