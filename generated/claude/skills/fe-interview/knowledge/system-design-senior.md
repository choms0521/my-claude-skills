# System Design - Senior Interview Questions
### Language: en

## Q1: Design a News Feed System

### Question
Design a scalable news feed system (like Twitter/Facebook) from a frontend perspective. Cover data fetching strategy, real-time updates, infinite scroll, caching, and optimistic UI.

### Model Answer
A news feed is one of the most demanding frontend systems — it must handle real-time updates, large data volumes, fast initial load, and smooth scrolling, all simultaneously.

**Data fetching architecture:** The feed uses cursor-based pagination rather than offset pagination. A cursor (opaque token representing a position in the feed) is returned with each response; the next request sends the cursor to fetch the next page. Offset pagination breaks when new items are inserted — the cursor approach is stable. The API returns a fixed page size (e.g., 20 items) with `nextCursor` and `hasMore` fields.

**Initial load strategy:** Fetch the first page server-side (SSR) so the above-the-fold content is in the initial HTML — this eliminates a client-side loading state for the most critical content and improves LCP. Subsequent pages are fetched client-side via infinite scroll.

**Infinite scroll implementation:** Use Intersection Observer on a sentinel element at the bottom of the rendered list. When the sentinel enters the viewport, trigger the next page fetch. Use virtual scrolling (react-window, @tanstack/virtual) for feeds that can grow very long, rendering only the ~20-30 visible items at any time.

**Real-time updates:** New posts arrive via WebSocket or SSE (Server-Sent Events). Rather than immediately prepending them (which causes jarring layout shifts), show a "X new posts" notification banner at the top. When clicked, the new posts are prepended and the user is scrolled to the top. This pattern is used by Twitter. For SSE: `const es = new EventSource('/api/feed/stream')`.

**Caching strategy:** Use React Query or SWR for client-side cache management. Feed pages are cached by cursor key. On background refetch, compare new data to cached data and show the notification badge if there are new items. Use `stale-while-revalidate` semantics — show cached data immediately, refetch in background.

**Optimistic UI for interactions:** Likes, shares, and follows should update instantly in the UI before the server confirms. Use a mutation with rollback: update the local cache immediately, send the API request, and revert on failure with an error toast. React Query's `onMutate` / `onError` / `onSettled` lifecycle supports this pattern cleanly.

**State management:** Normalize the feed data in the client cache (each post stored by ID, feed stores ordered arrays of IDs). This prevents duplicate post data when the same post appears in multiple feeds and makes optimistic updates simple — update the post entity, all references reflect the change.

### Key Points
- Cursor-based pagination is stable under insertions; offset pagination breaks
- Virtual scrolling is essential for long-lived feeds to prevent DOM growth
- Defer showing new real-time posts via a notification banner to prevent layout jumps
- Optimistic updates with rollback improve perceived responsiveness for interactions
- Normalize feed data by ID to avoid duplication and simplify mutations

### Follow-up Prompts
- How would you implement the "X new posts" notification without polling, using WebSockets or SSE?
- How do you handle the case where a post was deleted after it appeared in the user's feed?
- How would you design the feed to support multiple content types (posts, ads, suggested accounts) in a unified stream?

### Difficulty: advanced
### Tags: news-feed, infinite-scroll, real-time, virtual-scrolling, optimistic-UI, system-design

---

## Q2: Design an Auto-Complete Search System

### Question
Design a frontend auto-complete search component that handles debouncing, caching, keyboard navigation, accessibility, and high-frequency typing. Discuss architecture decisions and trade-offs.

### Model Answer
Auto-complete is deceptively complex — it requires fast, accessible, keyboard-navigable suggestions while minimizing API requests and handling race conditions.

**Request management:** Debounce the search input by 200-300ms to avoid firing a request on every keystroke. After debouncing, cancel any in-flight requests that are now stale using `AbortController`. Without cancellation, a slow response from an earlier query can arrive after a faster response from a later query, displaying stale results (the race condition problem). Each keystroke generates a new `AbortController`; the previous controller is aborted before the new request fires.

**Caching:** Implement a client-side cache (simple `Map<string, Result[]>`) keyed by query string. Before firing a network request, check the cache. Cache responses for a short TTL (30-60 seconds for search results, longer for structured data like product categories). This makes backspace-deletion fast — as the user deletes characters, previously seen shorter queries are served from cache instantly.

**Trie-based client-side completion:** For bounded datasets (country names, product categories, user's recent searches), load the complete list once and perform client-side prefix matching using a Trie or simple filter. This eliminates network latency entirely for completion. For unbounded datasets (general search), a server-side index is required.

**Keyboard navigation and accessibility:** The combobox ARIA pattern (`role="combobox"`, `role="listbox"`, `role="option"`) is the correct semantic structure. The input has `aria-expanded`, `aria-autocomplete="list"`, `aria-controls` pointing to the listbox, and `aria-activedescendant` pointing to the currently highlighted option. Arrow keys navigate the list; Enter selects; Escape closes; Tab should close without selecting. Focus must never leave the input during keyboard navigation — `aria-activedescendant` manages this.

**Architecture:** Separate concerns into: (1) `useAutoComplete` hook — manages debounce, fetch, cache, abort, and results state; (2) `AutoCompleteInput` — renders the input with ARIA attributes; (3) `SuggestionList` — renders the virtualized list of suggestions; (4) `useKeyboardNavigation` hook — manages selectedIndex and keyboard event handling.

**Highlighting matched text:** Parse the suggestion string and wrap the portion matching the query in `<mark>` tags. Use a regex with the query escaped for special characters. Screen readers announce `<mark>` content with emphasis, benefiting accessibility.

**Analytics:** Log which suggestion was selected and at what position in the list. Log zero-result queries for search quality improvements.

### Key Points
- `AbortController` is mandatory to prevent stale response race conditions
- Client-side cache with TTL eliminates repeated requests for the same query
- Use the ARIA combobox pattern — `aria-activedescendant` manages focus without moving it from the input
- Debounce at 200-300ms; shorter feels laggy, longer feels slow
- Highlight matching text with `<mark>` for both visual and screen reader benefit

### Follow-up Prompts
- How would you implement fuzzy matching (allowing typos) in client-side auto-complete?
- How would you handle multi-entity results (users, products, articles) in a single unified search dropdown?
- How would you measure and improve the relevance of auto-complete suggestions based on user selection data?

### Difficulty: advanced
### Tags: auto-complete, debounce, AbortController, ARIA, accessibility, caching, system-design

---

## Q3: Design a Real-Time Collaborative Editor

### Question
Design a frontend architecture for a real-time collaborative text editor (like Google Docs). Cover conflict resolution (OT vs CRDT), presence awareness, network reliability, and performance considerations.

### Model Answer
Real-time collaboration is one of the hardest frontend problems, combining distributed systems challenges with demanding UI performance requirements.

**Conflict resolution — OT vs CRDT:** Operational Transformation (OT) is the older approach used by Google Docs. Each operation (insert/delete at position) is transformed relative to concurrent operations from other users before applying. Requires a central server to serialize operations and compute transforms. CRDTs (Conflict-free Replicated Data Types) — specifically Yjs or Automerge — are the modern approach. Operations can be applied in any order and will converge to the same state on all clients without a coordination server. Yjs uses a CRDT called YATA and is the basis for TipTap, Slate, and CodeMirror collaborative extensions. For most teams building a collaborative editor today, using Yjs is the correct choice over implementing OT from scratch.

**Document model:** The document is represented as a Yjs `Y.Text` type which tracks the full history needed for CRDT merging. Each character has a unique logical clock ID. This enables rich-text formatting, cursor position mapping, and undo/redo that is collaboration-aware (each user has their own undo stack).

**Network layer:** Use WebSocket for real-time bidirectional sync (y-websocket provider). For offline support, use IndexedDB persistence (y-indexeddb provider) — changes made offline are buffered and synced when reconnected. The Yjs provider system is pluggable; Liveblocks, PartyKit, and HocusPocus are managed backends built on Yjs.

**Presence and awareness:** Show which users are in the document and where their cursors are. Yjs's `awareness` protocol piggybacks on the WebSocket connection and broadcasts ephemeral state (cursor position, selection, user name, color) to all connected clients. Cursor positions are represented as relative positions (not absolute character offsets) that remain valid as other users insert/delete text.

**Performance:** Collaborative editors render on every remote change. Use `requestAnimationFrame` batching to coalesce multiple rapid remote updates into a single render. For large documents, use a virtual rendering approach (only render visible paragraphs). The CRDT state can grow large over time — Yjs's snapshot mechanism allows compacting history.

**Offline-first UX:** Show connection status clearly. Changes made offline are stored locally and synced on reconnect. Conflicts from concurrent offline edits are resolved automatically by the CRDT. Use an optimistic local-first model: apply all local changes immediately without waiting for server confirmation.

### Key Points
- CRDTs (Yjs, Automerge) are the modern approach — they converge without a coordination server
- Yjs integrates with TipTap, CodeMirror, and ProseMirror via official bindings
- Presence/awareness uses ephemeral state broadcast over the WebSocket connection
- Cursor positions use relative positions (not absolute offsets) to survive concurrent edits
- Offline changes are buffered in IndexedDB and synced on reconnect via y-indexeddb

### Follow-up Prompts
- How does Yjs handle the "interleaving" problem where concurrent insertions at the same position must be ordered consistently?
- How would you implement collaborative undo/redo that only undoes the current user's operations?
- How would you design the version history feature (like Google Docs "See version history") on top of a CRDT?

### Difficulty: advanced
### Tags: collaborative-editing, CRDT, OT, Yjs, real-time, WebSocket, system-design

---

## Q4: Design a Frontend Component Library

### Question
Design the architecture for a reusable UI component library intended for use across multiple products. Cover component API design, styling architecture, accessibility, documentation, versioning, and distribution.

### Model Answer
A component library is infrastructure — it must be reliable, accessible, flexible, and maintainable over years. Its design decisions have long-lasting consequences.

**Component API design principles:** Components should follow the Open/Closed principle — open for extension via composition, closed against modification. Use the "render prop" or "compound component" pattern for complex components (Select, Tabs, Menu) that need flexible internal structure. Expose a `className` or `style` prop (or a `css` prop with a CSS-in-JS system) for customization. Follow WAI-ARIA authoring practices for interactive components — users of the library should get accessibility for free.

**Styling architecture — three main approaches:**
1. CSS Modules: zero runtime cost, scoped styles, no JavaScript dependency. Consumers can override via CSS custom properties. Best for performance-sensitive libraries.
2. CSS-in-JS (styled-components, Emotion): runtime theming, JavaScript-driven dynamic styles, colocated styles. Higher runtime cost; may cause SSR complexity.
3. Zero-runtime CSS-in-JS (Panda CSS, Vanilla Extract): generates CSS at build time, combining static typing with zero runtime overhead. The modern preferred approach for new libraries.

**Design token system:** Define the visual language as tokens (color, spacing, typography, radius, shadow) in a JSON/JS object. Tokens should be platform-agnostic and map to CSS custom properties. Components consume tokens through the theming layer. Token changes propagate to all components without code changes.

**Accessibility:** Every interactive component must implement its ARIA role and keyboard interaction pattern as specified by ARIA Authoring Practices Guide (APG). Use a focus management utility for modal dialogs (focus trap). Test with axe-core in CI. Provide live region announcements for dynamic content. The library should target WCAG 2.1 AA compliance.

**Documentation and Storybook:** Each component has stories covering all variants, states (hover, focus, disabled, error), and accessibility demos. Use Storybook's a11y addon (axe-core integration) to surface accessibility violations in stories. Provide copy-paste usage examples with TypeScript types visible.

**Versioning and distribution:** Use semantic versioning strictly. Ship multiple output formats: ESM for bundlers (tree-shakable), CJS for Node.js tools, UMD for CDN usage. Use `exports` field in `package.json` for subpath exports (`@lib/button`, `@lib/tokens`). Publish changelog with migration guides for breaking changes. Use Changesets for managing versioning in a monorepo.

**Monorepo structure:** Each component as a separate package enables granular versioning and minimizes consumer bundle impact. A shared `@lib/tokens` and `@lib/utils` package is depended on by all component packages.

### Key Points
- Compound component pattern enables flexible composition without prop explosion
- Design tokens (CSS custom properties) are the foundation of theming
- Zero-runtime CSS-in-JS (Vanilla Extract, Panda CSS) is the modern preferred approach
- Every interactive component must implement its full ARIA pattern including keyboard navigation
- Publish ESM output for tree-shaking; use `exports` field in package.json for subpath imports

### Follow-up Prompts
- How would you handle a breaking change in a component API while supporting the old API for a migration period?
- How do you test component accessibility in CI without a real browser using axe-core?
- How would you implement a polymorphic component (`as` prop) in TypeScript with full type safety?

### Difficulty: advanced
### Tags: component-library, design-tokens, accessibility, Storybook, versioning, system-design

---

## Q5: Design an Image Lazy-Loading System

### Question
Design a robust image lazy-loading system from scratch — not just using `loading="lazy"`, but a full custom system handling placeholders, progressive loading, error states, priority queuing, and network adaptation.

### Model Answer
A production-grade image lazy-loading system goes far beyond the native `loading="lazy"` attribute, adding sophisticated UX patterns and performance optimization.

**Core observation mechanism:** Use `IntersectionObserver` with a `rootMargin` of `200px 0px` to start loading images 200px before they enter the viewport, hiding the loading state before the user sees the image. A single shared `IntersectionObserver` instance (not one per image) observes all images for efficiency. When an image enters the threshold, it is disconnected from the observer and its `src` is set.

**Priority queue:** Not all images should load simultaneously — limit concurrent loads (e.g., 4 at a time) to avoid saturating the network. Maintain a queue of pending image loads. When a load completes, dequeue the next item. Assign priority levels: images closer to the viewport get higher priority. Use a min-heap or sorted queue keyed by distance from viewport center.

**Placeholder strategies:**
1. **Low-Quality Image Placeholder (LQIP):** A tiny (10-20px) blurred version of the image, embedded as a base64 data URI in the HTML. Loaded instantly, provides a color preview. Crossfade to full image on load.
2. **BlurHash / ThumbHash:** A compact string encoding of the image's color distribution, decoded client-side to a canvas/CSS gradient placeholder. Smaller than LQIP, better quality than solid color.
3. **Dominant color:** Extract the dominant color server-side, embed as `background-color`. Simplest approach with zero byte cost.
4. **Skeleton pulse:** A CSS animation placeholder that shows the image shape.

**Progressive loading:** For JPEG, use progressive encoding (server-side) — the browser renders a low-quality version first that sharpens as data arrives. For a LQIP approach: render the tiny placeholder at full size with CSS blur, load the full image in a hidden `<img>`, on load event swap the src with a CSS transition.

**Error handling and retry:** On `error` event, show a fallback image or error state. Implement exponential backoff retry (up to 3 attempts) for transient network failures. Log errors to your monitoring system with the image URL for broken link detection.

**Network adaptation:** Read `navigator.connection.effectiveType` — on `'slow-2g'` or `'2g'`, serve lower-resolution images by modifying the URL query parameter. Pause loading of below-fold images entirely on `'slow-2g'`.

**React implementation:** Expose as a `<LazyImage>` component backed by a singleton observer service. The component registers its ref with the service on mount and deregisters on unmount.

### Key Points
- Use a single shared `IntersectionObserver` with `rootMargin` buffer — not one per image
- Priority queue with concurrency limit prevents network saturation on image-heavy pages
- LQIP or BlurHash provides immediate color preview; crossfade to full image on load
- Adapt resolution based on `navigator.connection.effectiveType` for network-aware loading
- Always handle error states with retry logic and monitoring integration

### Follow-up Prompts
- How does BlurHash work algorithmically, and how do you generate it server-side?
- How would you integrate this lazy-loading system with a Next.js `<Image>` component replacement?
- How do you handle images in a virtualized list where DOM nodes are recycled — how do you reset placeholder state?

### Difficulty: advanced
### Tags: lazy-loading, IntersectionObserver, LQIP, BlurHash, progressive-loading, system-design

---

## Q6: Design a Client-Side Router

### Question
Design a client-side routing system for a single-page application from scratch. Cover history management, route matching, nested routes, navigation guards, code splitting, and scroll restoration.

### Model Answer
A client-side router intercepts browser navigation, updates the URL without a full page reload, and renders the appropriate component tree for each route.

**History management:** The History API (`window.history.pushState`, `replaceState`, `popstate` event) is the foundation. `pushState(state, title, url)` navigates to a new URL and pushes a history entry. `replaceState` modifies the current entry without creating a new one. The `popstate` event fires on browser back/forward navigation. The router subscribes to `popstate` and intercepts `<a>` click events (using event delegation on `document`) to call `pushState` instead of triggering a full navigation.

**Route matching:** Routes are defined as path patterns with parameter syntax (`/users/:id`, `/files/*path`). At runtime, the current pathname is tested against patterns using a `matchPath` algorithm. Parameters are extracted: `/users/42` matched against `/users/:id` yields `{ id: '42' }`. For nested routes, the matching algorithm works hierarchically — match the top-level segment, then recursively match remaining segments against child routes. A radix tree (trie) data structure enables O(k) matching where k is path depth.

**Nested routes and outlet pattern:** Parent routes render an `<Outlet>` component — a placeholder where child route components are rendered. The router resolves the full route hierarchy for a URL (e.g., `/dashboard/settings` matches `DashboardLayout` > `SettingsPage`) and passes each component its child outlet. This enables shared layouts without repeating header/sidebar across routes.

**Navigation guards:** Before committing a navigation, run a pipeline of guard functions. Each guard receives the `to` and `from` route and can: allow navigation (return true), redirect (return a new path), or cancel (return false). Use cases: `requireAuth` guard checks session before entering protected routes; `unsavedChanges` guard prompts the user before leaving a form with unsaved data. Implement as an async middleware pipeline.

**Code splitting integration:** Each route lazily imports its component: `const component = () => import('./SettingsPage')`. The router resolves the import Promise before rendering, showing a loading state during chunk download. Preload the next likely route's chunk on `<Link>` hover/focus to eliminate load delay.

**Scroll restoration:** The browser's native scroll restoration (`history.scrollRestoration = 'manual'`) is disabled, and the router manages it. Store scroll positions in the history state object (`history.replaceState({ scrollY: window.scrollY }, ...)`). On navigation, scroll to top for new navigations; restore stored position on back/forward.

**Data loading:** Modern routers (React Router 6.4+, TanStack Router) colocate data fetching with routes via loaders. The router initiates data fetches in parallel with chunk loading as soon as navigation begins, rather than waiting for the component to mount and then fetch.

### Key Points
- History API (`pushState`/`popstate`) is the foundation; intercept `<a>` clicks with event delegation
- Radix trie enables efficient route matching; nested routes use the Outlet pattern for shared layouts
- Navigation guards run as an async middleware pipeline before committing navigation
- Store and restore scroll positions in `history.state` for correct back/forward behavior
- Colocate data loaders with routes to parallelize chunk loading and data fetching

### Follow-up Prompts
- How would you implement route-level data preloading that starts fetching as soon as the user hovers a link?
- How does hash-based routing differ from History API routing, and when would you still use it?
- How would you implement typed routes in TypeScript so that `<Link to="/users/:id">` is type-safe?

### Difficulty: advanced
### Tags: client-side-router, History-API, route-matching, navigation-guards, code-splitting, system-design

---

## Q7: Design a State Management System

### Question
Design a state management system for a large-scale React application. Compare the different paradigms (Redux, Zustand, Jotai, React Query), explain when to use each, and describe the architecture for combining them.

### Model Answer
Modern state management recognizes that "state" is not monolithic — different categories of state have different characteristics and optimal solutions.

**State taxonomy:**
1. **Server state** — data fetched from APIs, has loading/error/stale states, needs cache invalidation, can be shared across components. Best managed by React Query, SWR, or Apollo Client.
2. **Global UI state** — app-wide state like authentication session, theme, modal open/close, notifications. Small amounts of truly global data. Managed by Zustand, Jotai atoms, or React Context.
3. **Local UI state** — component-internal state (form inputs, hover states, accordion open/closed). Managed by `useState` and `useReducer`.
4. **URL state** — filters, search queries, pagination. Managed by the router's search params.

**React Query for server state:** React Query normalizes async data with automatic caching, background refetching, deduplication, and cache invalidation. Each piece of server data is identified by a query key. Components sharing a query key share the same cache entry — one network request serves multiple components. The mental model shift: components are subscribed to data, not responsible for fetching it.

**Zustand for global UI state:** Zustand's minimal API (a single `create` function) and lack of boilerplate make it ideal for app-level state. Stores are split by domain (authStore, uiStore, notificationStore) rather than in a single monolithic store. Zustand supports middleware (immer for immutable updates, persist for localStorage sync, devtools for Redux DevTools).

**Jotai / Recoil for fine-grained atomic state:** When state has complex derived relationships or needs subscription at the atom level without re-rendering unrelated components, atomic state management avoids the entire-store subscription problem. Each atom is independently subscribable.

**Redux — when to use it:** Redux remains appropriate for very complex state with many interdependent slices, teams that benefit from strict unidirectional data flow, or applications requiring time-travel debugging and reproducible state. Redux Toolkit eliminates most of the historical boilerplate. For new projects in 2024+, the combination of React Query + Zustand replaces Redux for most use cases.

**Architecture pattern:** Layer the state solutions:
- URL state → router search params (shareable, linkable)
- Server state → React Query (with queryClient as the cache layer)
- Global UI state → Zustand (auth, theme, notifications)
- Local state → `useState`/`useReducer`

Avoid storing server state in global client state (Redux/Zustand) — it duplicates the cache and creates synchronization problems.

### Key Points
- Categorize state first: server vs global UI vs local vs URL — each category has an optimal solution
- React Query for server state eliminates the need to store API data in Redux/Zustand
- Zustand is the lightweight, low-boilerplate solution for global UI state
- Never duplicate server state in client state stores — it creates stale cache synchronization bugs
- URL state (search params) is underused — it makes state shareable and bookmarkable for free

### Follow-up Prompts
- How would you implement optimistic updates with rollback in React Query's mutation system?
- How does Zustand's `subscribeWithSelector` middleware enable performance-optimized subscriptions?
- How would you architect cross-store interactions — when one store's state depends on another store's state?

### Difficulty: advanced
### Tags: state-management, React-Query, Zustand, Jotai, Redux, server-state, system-design

---

## Q8: Design a Frontend Monitoring and Error Tracking System

### Question
Design a frontend observability system covering error tracking, performance monitoring, session replay, and alerting. Discuss the architecture, data collection, sampling strategies, and privacy considerations.

### Model Answer
Frontend observability provides visibility into what users actually experience — errors, performance regressions, and interaction failures that are invisible from server-side monitoring.

**Error tracking:** Capture unhandled JavaScript errors via `window.addEventListener('error', handler)` and `window.addEventListener('unhandledrejection', handler)` for Promise rejections. Each error report should include: error message, stack trace (source-mapped to original code), URL, user agent, session ID, breadcrumbs (recent user actions before the error), and custom context (current user ID, feature flags active). Source maps are uploaded to the error tracking service (Sentry, Datadog) at deploy time so minified stack traces are expanded to original file/line numbers.

**React Error Boundaries:** Wrap major application sections in Error Boundaries to catch component-level render errors. The boundary's `componentDidCatch` method receives the error and component stack; report both to your error tracking service. Render a fallback UI rather than a blank screen. Implement boundaries at route level (catching page-level errors) and at widget level (catching isolated component errors).

**Performance monitoring (RUM):** Use `PerformanceObserver` to collect Core Web Vitals (LCP, INP, CLS), navigation timing, and resource timing. The `web-vitals` library handles correct measurement. Send metrics with `navigator.sendBeacon` at page unload. Include attribution data: which element is the LCP element, which interaction caused a poor INP, which elements shifted for CLS.

**Sampling strategies:** Collecting every event from every user is expensive and often unnecessary. Sample at multiple levels: (1) session-level sampling — collect full telemetry for X% of sessions; (2) error sampling — always capture errors (100% sample) but deduplicate repeated identical errors; (3) performance sampling — sample 10% of page loads for detailed performance traces, but collect all pages' Core Web Vitals via lightweight beacons.

**Session replay:** Tools like Sentry Session Replay, LogRocket, or FullStory record DOM mutations (using MutationObserver) and user interactions (clicks, scrolls, inputs) to reconstruct a video-like replay. Privacy is critical: automatically mask input fields containing passwords or PII, mask text content in sensitive sections, provide user consent mechanisms. Session replay data should be linked to error reports so you can watch exactly what led to a crash.

**Alerting architecture:** Define alert conditions on aggregated metrics: error rate > 1% of sessions triggers PagerDuty; p75 LCP > 3s for > 5% of page loads in 10 minutes triggers a Slack alert. Use error fingerprinting to group similar errors and alert on new error types rather than individual error occurrences. Set up weekly performance regression reports comparing key metrics week-over-week.

**Privacy and compliance:** Avoid capturing PII in error context. Strip sensitive data from URLs (query params containing tokens or IDs). Implement data retention policies. GDPR requires consent for session replay tools that record user behavior.

### Key Points
- Source maps must be uploaded to the error tracking service at deploy time for meaningful stack traces
- Always collect errors at 100% sample rate; sample performance data at 10-20%
- Session replay requires automatic PII masking for inputs and sensitive text content
- Alert on error rate (% of sessions) not absolute error count, which scales with traffic
- Link session replays to error reports for maximum debugging context

### Follow-up Prompts
- How would you implement source map upload in a CI/CD pipeline without exposing source maps publicly?
- How do you design an alerting system that distinguishes between a new bug affecting all users versus a pre-existing intermittent error?
- How would you measure "user-visible errors" (errors that actually broke a user flow) versus background errors (silent failures in non-critical paths)?

### Difficulty: advanced
### Tags: error-tracking, performance-monitoring, session-replay, RUM, observability, Sentry, system-design

---

## Q9: Design a Design System with Theming

### Question
Design a comprehensive design system architecture that supports multiple themes (light/dark, brand variants), is accessible, scales across multiple products, and can be updated without breaking consumers.

### Model Answer
A design system is a shared language between design and engineering. Its architecture must balance flexibility with consistency, and allow evolution without constant breaking changes to consumers.

**Token hierarchy — three tiers:**
1. **Primitive tokens** (global tokens): Raw values with no semantic meaning. `color.blue.500 = '#3B82F6'`, `spacing.4 = '16px'`. These form the palette.
2. **Semantic tokens** (alias tokens): Purposeful names that reference primitives. `color.interactive.primary = {value: '{color.blue.500}'}`. These are what components use.
3. **Component tokens**: Component-specific customization. `button.background.primary = {value: '{color.interactive.primary}'}`.

This hierarchy means a theme change (e.g., swapping the primary color) only requires updating the semantic token mappings, not touching every component.

**CSS custom properties as the delivery mechanism:** Transform design tokens into CSS custom properties. Semantic tokens become CSS variables: `--color-interactive-primary: var(--color-blue-500)`. Themes are implemented by overriding the semantic variables in a theme class or `:root` selector. Light/dark theme: `@media (prefers-color-scheme: dark) { :root { --color-interactive-primary: var(--color-blue-400); } }` or toggle via a class `.theme-dark`.

**Token tooling:** Style Dictionary (Amazon) is the standard tool for transforming a token JSON file into CSS, JS, iOS, Android, and other formats from a single source. Tokens defined in Figma (using Figma Tokens or the new Figma Variables) can be exported and synced to the Style Dictionary source via a CI pipeline — ensuring design tool and code are always in sync.

**Component API for theming:** Components should consume tokens, never hardcode values. Components should not expose individual style props for every token — instead, expose a limited, intentional API: `variant`, `size`, `colorScheme`. Additional customization happens through CSS custom property overrides at the consumer level (the "CSS custom property API" pattern).

**Multi-product / multi-brand:** Each brand defines its own semantic token overrides while sharing primitives and components. Brand A might override `--color-brand-primary` to their red; Brand B to their purple. Components render identically in structure; only the token values differ.

**Versioning and migration:** Use semantic versioning. Token renames are breaking changes — provide a migration guide and a codemod. Deprecation period: mark old tokens with `@deprecated` in JSDoc; add console warnings in development; remove after 2 major versions. Changesets automates this in a monorepo.

**Accessibility in the design system:** Define minimum contrast ratios as constraints in the token system. Token validation in CI: compute the contrast ratio of semantic foreground/background token pairs and fail if below WCAG AA (4.5:1 for normal text). This makes accessibility violations impossible to ship accidentally.

### Key Points
- Three-tier token hierarchy (primitive → semantic → component) enables theme swapping at the semantic layer
- CSS custom properties are the runtime delivery mechanism — theme switching is CSS-only, no JS required
- Style Dictionary transforms a single token source into CSS, JS, iOS, Android outputs
- Semantic tokens create the abstraction that insulates components from theme implementation details
- Validate contrast ratios between semantic token pairs in CI to prevent inaccessible color combinations

### Follow-up Prompts
- How would you implement a "user-customizable theme" (like Slack's custom color schemes) on top of this architecture?
- How do you handle the transition between themes without a flash — both on initial load (SSR) and during runtime toggle?
- How would you synchronize Figma Variables with the code token source of truth in a CI pipeline?

### Difficulty: advanced
### Tags: design-system, design-tokens, theming, CSS-custom-properties, Style-Dictionary, accessibility, system-design

---

## Q10: Design Infinite Scroll with Virtualization

### Question
Design a production-grade infinite scroll list that combines remote data pagination with virtual rendering. Handle edge cases: variable item heights, dynamic content insertion, scroll restoration, and network failure recovery.

### Model Answer
Combining infinite scroll with virtualization solves two separate problems simultaneously: fetching data progressively and rendering only visible items. Together they enable lists of millions of items to feel smooth.

**Architecture overview:** The system has two layers — the data layer (pagination + caching) and the render layer (virtualization). They are loosely coupled: the data layer provides items by index; the virtualizer requests items by visible index range.

**Data layer — cursor-based pagination:** Use React Query's `useInfiniteQuery` hook, which manages pages as a list of responses, each containing items and a `nextCursor`. Pages are fetched on demand as the virtualizer requests items in ranges beyond what is loaded. The data layer provides a flat item array by merging all fetched pages; the virtualizer accesses items by index from this array.

**Render layer — virtualization with @tanstack/virtual:** `useVirtualizer` from `@tanstack/react-virtual` handles the virtualization math. Configure it with `count` (total estimated items — can be approximate), `getScrollElement`, and `estimateSize` (a function returning estimated height per index). The virtualizer returns `virtualItems` — the currently visible virtual items with their `index`, `start` (top position), and `size`. Render only these items, positioned absolutely within the scroll container.

**Variable height items:** For dynamic content (tweets with varying text, product cards with different image ratios), items have unknown heights at render time. Use `estimateSize` as an initial estimate, then measure actual rendered heights using `measureElement` (a ref callback provided by `@tanstack/virtual`). The virtualizer corrects its position calculations after measurement, causing minimal layout shift. Items should not change their height after initial render (avoid lazy-loading within items that changes their size).

**Trigger for next page fetch:** Place a sentinel element at position `totalFetchedItems - PREFETCH_THRESHOLD`. When the virtualizer renders the sentinel item (i.e., the user is within PREFETCH_THRESHOLD items of the end of loaded data), trigger the next page fetch. This pre-fetches the next page before the user reaches the bottom, eliminating wait time.

**Scroll restoration:** When navigating away and back, restore the scroll position to where the user was. Store the `scrollOffset` (from the virtualizer) and the item range in the router state or sessionStorage. On mount, if a stored position exists, scroll to that offset and ensure the appropriate pages are pre-loaded. `@tanstack/virtual`'s `scrollToOffset` method enables programmatic scroll.

**Network failure and retry:** On page fetch failure, show an inline retry button within the list at the position where new items would appear. React Query's `retry` and `retryDelay` handle automatic exponential backoff. Show a persistent error state if all retries fail.

**Insertion of new items:** When new items are prepended (real-time updates), maintain the current scroll position by adjusting `scrollOffset` by the height of inserted items. Without this correction, existing items jump down when new ones are prepended.

### Key Points
- Decouple data layer (React Query `useInfiniteQuery`) from render layer (virtualizer) — they compose cleanly
- `@tanstack/react-virtual` with `measureElement` handles variable-height items via post-render measurement
- Prefetch the next page when the user is N items from the end, not at the exact end
- Correct scroll offset when prepending items to prevent existing content from jumping
- Store virtualizer scroll offset in router state for scroll restoration on back navigation

### Follow-up Prompts
- How would you implement bi-directional infinite scroll (loading both older and newer items, like a chat history)?
- How do you handle the case where an item's height changes after render (e.g., a "show more" expansion within the list)?
- How would you implement keyboard navigation (arrow keys, Page Down) that correctly handles virtualized items?

### Difficulty: advanced
### Tags: infinite-scroll, virtual-scrolling, react-virtual, pagination, React-Query, system-design

---
