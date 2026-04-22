# React - Senior Interview Questions
### Language: en

## Q1: Explain React Fiber architecture and how it enables concurrent rendering.

### Question
Describe the React Fiber architecture: what problem it was designed to solve, how it represents the component tree differently from the old stack reconciler, and how it enables concurrent features.

### Model Answer
Before React Fiber (introduced in React 16), React used a recursive "stack reconciler" to traverse the component tree and compute updates. The recursion was synchronous and could not be interrupted — once React started reconciling, it had to finish the entire tree before yielding control back to the browser. For large component trees, this meant long, uninterruptible JavaScript execution that blocked the main thread, causing dropped frames, unresponsive inputs, and janky animations.

React Fiber reimplemented the reconciler as a linked list of "fiber" nodes rather than a recursive call stack. Each fiber is a plain JavaScript object representing a unit of work for a single component or DOM element. It contains the component type, the pending props, the current state, and pointers to its parent, first child, and next sibling. This linked list structure allows React to traverse the tree iteratively — and, critically, to pause, resume, and prioritize units of work.

The Fiber reconciler separates work into two phases: the "render" (or reconciliation) phase and the "commit" phase. The render phase is interruptible — React builds a "work-in-progress" fiber tree in memory, diffing it against the "current" fiber tree. If higher-priority work arrives (a user input, an animation frame), React can abandon the in-progress work and start fresh. The commit phase is synchronous and uninterruptible — once React decides what changes to apply, it applies all DOM mutations in one go to prevent inconsistent UI states.

This architecture enables React's concurrent features: `useTransition` and `startTransition` mark state updates as low priority, allowing React to interrupt them in favor of urgent updates like keystrokes. `useDeferredValue` provides a deferred version of a value, letting React render with the old value while computing the new one in the background. The Scheduler package (separate from React) assigns priorities to work and coordinates time-slicing via `requestIdleCallback`-style scheduling.

Double buffering is a key Fiber concept: there is always a "current" tree (what's currently on screen) and a "work-in-progress" tree (what React is building for the next render). The trees share fibers for unchanged subtrees. When the work-in-progress tree is complete and committed, it becomes the new current tree, and the old current tree becomes available for reuse.

### Key Points
- The old stack reconciler was synchronous and uninterruptible; Fiber uses a linked list for interruptible, priority-based traversal
- Each fiber node represents one unit of work (one component), with pointers to parent, first child, and next sibling
- Render phase (reconciliation) is interruptible; commit phase (DOM mutations) is synchronous and uninterruptible
- Double buffering: React maintains a current tree and a work-in-progress tree simultaneously
- Fiber enables concurrent features: `useTransition`, `useDeferredValue`, and the Scheduler's priority-based work scheduling

### Follow-up Prompts
- What is "tearing" in concurrent React, and how does React prevent it?
- How does React's Scheduler package assign priorities, and what are the priority levels?
- What is the significance of the "lanes" model introduced in React 18 over the previous expiration-time model?

### Difficulty: advanced
### Tags: fiber, reconciliation, concurrent-react, architecture, scheduler

---

## Q2: How do useTransition and useDeferredValue work, and when do you use each?

### Question
Explain React 18's `useTransition` and `useDeferredValue` hooks. What problem do they solve, how do they differ from each other, and what are the practical use cases for each?

### Model Answer
Both `useTransition` and `useDeferredValue` are concurrent React features that let you mark certain state updates or values as non-urgent, allowing React to prioritize urgent updates (like user input responses) and defer the expensive ones. They solve the problem of UI feeling sluggish when a state update triggers an expensive re-render that blocks the main thread.

`useTransition` returns a `[isPending, startTransition]` tuple. You wrap a state update inside `startTransition` to mark it as a transition — a low-priority, interruptible update. If a higher-priority update arrives while React is rendering the transition, React abandons the transition work and handles the urgent update first. `isPending` is `true` while the transition is in progress, allowing you to show a loading indicator in the triggering UI (like a tab becoming "pending" while its content loads).

```jsx
const [isPending, startTransition] = useTransition();
const handleSearch = (query) => {
  startTransition(() => {
    setFilteredResults(expensiveFilter(allData, query));
  });
};
// isPending can grey out the current view while the new one loads
```

`useDeferredValue` takes a value and returns a deferred version of it. During a concurrent render, React renders the component with the new value first, but if that render is expensive, it can defer to the previous value and show the old UI while rendering the new one in the background. It is similar to `useTransition` but is used when you don't control where the state update originates — for example, when a value comes from props rather than local state.

```jsx
const deferredQuery = useDeferredValue(searchQuery);
// Pass deferredQuery to the expensive list, not searchQuery
// The input stays responsive; the list updates with a slight lag
```

The key distinction: use `useTransition` when you own the state update (you call the setter yourself); use `useDeferredValue` when you receive a value from outside (a prop, or state you don't control). `useTransition` is more explicit — you wrap the exact update. `useDeferredValue` is a value-level optimization. Both require components to support concurrent rendering correctly (no side effects in render, pure rendering behavior).

A common pitfall is expecting these hooks to make expensive synchronous JavaScript faster — they don't. They only help with responsiveness by deprioritizing the update. The render still happens; it just yields to the browser between fiber slices.

### Key Points
- `useTransition` wraps state updates as low-priority transitions; `isPending` signals when the transition is in-flight
- `useDeferredValue` defers a value to a previous version while the expensive new render catches up in the background
- Use `useTransition` when you own the state update; use `useDeferredValue` when the value comes from outside your control
- Both require the component tree being rendered to be idempotent and side-effect-free in the render phase
- These hooks improve perceived performance and responsiveness, not raw computational speed

### Follow-up Prompts
- What is the visual difference between using `useTransition` and just `setTimeout(() => setState(...), 0)`?
- How do you use `useDeferredValue` with `React.memo` to prevent the expensive component from re-rendering until the deferred value settles?
- What happens if a transition is interrupted by another transition?

### Difficulty: advanced
### Tags: useTransition, useDeferredValue, concurrent-react, react-18, performance

---

## Q3: What are React Server Components (RSC) and how do they change the React model?

### Question
Explain what React Server Components are, how they differ from client components and SSR, what their constraints and benefits are, and how they integrate with Next.js App Router.

### Model Answer
React Server Components (RSC) are components that render exclusively on the server and never run in the browser. Unlike traditional SSR where a component renders on the server but its code is also shipped to the client for hydration, Server Components' code is never included in the client JavaScript bundle. They can directly access server resources (databases, file systems, internal services) without an API layer, and their output is serialized and streamed to the client as a special RSC payload format, not raw HTML.

The fundamental shift RSC introduces is a new component model: components are now either Server Components (default in Next.js App Router, run only on the server), Client Components (marked with `'use client'`, can use hooks and browser APIs), or Shared Components (work in both environments with limitations). The boundary between server and client is explicit and intentional.

Server Components eliminate several pain points. First, the "data waterfall" problem: instead of rendering a skeleton, fetching data client-side, and then rendering the full UI, a Server Component awaits data directly and renders the complete UI. Second, bundle size: heavy libraries used only for data transformation or formatting (date-fns, syntax highlighters, large parsers) don't need to be shipped to the client if used only in Server Components. Third, direct backend access: no API route needed for data that only needs to be rendered on the server.

Constraints of Server Components: they cannot use `useState`, `useEffect`, event handlers, or any browser APIs because they run only on the server. They cannot be made interactive. When you need interactivity, you must use a Client Component. The composition pattern is "push interactivity to the leaves" — Server Components form the backbone of the tree, and Client Components are used at the edges where user interaction is needed.

The RSC payload is a JSON-like serialization format that describes the component tree. Next.js App Router streams this payload to the browser, which React uses to render the component tree incrementally without the need for full hydration of the entire page. Streaming with `<Suspense>` allows the browser to start showing content as soon as the first chunk arrives, rather than waiting for all data to be fetched.

### Key Points
- Server Components run only on the server; their code is never sent to the client, reducing bundle size
- They can directly access databases and server resources without API routes
- They cannot use state, effects, event handlers, or browser APIs — interactivity requires Client Components (`'use client'`)
- RSC uses a streaming serialization format, not HTML; Next.js App Router supports progressive streaming with Suspense
- The composition model: Server Components wrap the tree; Client Components are "pushed to the leaves" for interaction

### Follow-up Prompts
- How do you pass data from a Server Component to a Client Component? Are there restrictions on what can be passed?
- What is the RSC payload format and how does it differ from the HTML output of traditional SSR?
- How do you handle mutations (form submissions, data updates) in a Server Component-first architecture?

### Difficulty: advanced
### Tags: server-components, rsc, nextjs, app-router, streaming

---

## Q4: Compare state management architectures: Redux vs. Zustand vs. Jotai.

### Question
At a senior level, compare Redux (with Redux Toolkit), Zustand, and Jotai as state management solutions. Discuss their mental models, architectural trade-offs, and when each is appropriate for a production application.

### Model Answer
These three libraries represent three distinct mental models for state management in React. Understanding their philosophies is more valuable than memorizing API differences.

Redux/Redux Toolkit follows a Flux-inspired, centralized store architecture. All application state lives in a single normalized store. State transitions are expressed as pure functions (reducers) that take the current state and an action and return a new state. This creates a strict one-way data flow: dispatch an action → reducer produces new state → components re-render. Redux Toolkit (RTK) drastically reduces Redux boilerplate with `createSlice`, `createAsyncThunk`, and RTK Query for data fetching. The mental model rewards teams that value explicitness, auditability, and tooling: the Redux DevTools provide time-travel debugging, action replay, and state inspection that are invaluable in complex applications.

Redux is appropriate when: the application has complex state with many interdependencies, multiple developers need consistent patterns, you need robust developer tooling, or you're dealing with highly predictable state machines (e-commerce carts, complex workflows). The drawbacks are ceremony — even with RTK, there's more code per feature than alternatives.

Zustand takes a minimalist, hook-centric approach. The store is defined as a single function that returns state and actions. Components subscribe to slices of the store using a selector function, and only re-render when that selector's result changes. There's no Provider, no reducers, no action creators — just a store and hooks. Zustand also works outside of React (accessing or updating the store from anywhere in your code), which makes integration with non-React libraries straightforward.

Zustand is appropriate for: medium-to-large applications where Redux's ceremony feels excessive, apps needing fine-grained subscriptions without extra setup, and teams who prefer a more imperative mutation style (Zustand uses Immer-style mutations under the hood optionally).

Jotai takes an atomic approach, modeling state as small, composable atoms. Each atom is an independent piece of state. Derived atoms are computed from other atoms, creating a reactive dependency graph similar to spreadsheet cells. Components subscribe to specific atoms and only re-render when those atoms change. This is excellent for highly granular state where different parts of a component depend on different pieces of data.

Jotai is appropriate for: applications with many small, interdependent state values (dashboard widgets, form state), situations where you want React's concurrent mode to work most effectively (atoms integrate naturally with Suspense), and teams migrating from Recoil.

A practical architecture often combines approaches: RTK Query for server state (cached, synchronized), Zustand or Context for global UI state, and local useState/useReducer for component-level state.

### Key Points
- Redux/RTK: centralized store, explicit reducers and actions, excellent dev tooling, higher ceremony
- Zustand: minimal API, selector-based subscriptions, works outside React, mutable style via Immer
- Jotai: atomic model, composable reactive dependency graph, fine-grained subscriptions, Suspense-friendly
- Server state (cached API data) is increasingly managed by dedicated libraries: RTK Query, TanStack Query, SWR
- Production architecture typically combines libraries: server state manager + UI state manager + local state

### Follow-up Prompts
- How would you migrate a large Redux application to RTK without a full rewrite?
- What is "normalized state" in Redux and why does it matter for collections of entities?
- How does Jotai's atom model integrate with React Suspense for async state?

### Difficulty: advanced
### Tags: state-management, redux, zustand, jotai, architecture

---

## Q5: How do you implement micro-frontends with React?

### Question
Explain the micro-frontend architecture pattern in the context of React applications: what problems it solves, common implementation approaches (Module Federation, iframes, Web Components), and the trade-offs involved.

### Model Answer
Micro-frontends apply the microservice philosophy to the frontend: decompose a large web application into independent, deployable units owned by separate teams. Each team owns a "vertical slice" — from backend to UI — for a specific business domain. This solves organizational scaling problems: as a product and team grows, a monolithic frontend becomes a coordination bottleneck where every team's changes must be integrated and deployed together.

The primary technical challenge is composing separately built and deployed frontend applications into a coherent user experience. There are three main approaches.

Webpack Module Federation (the most popular React-specific approach) allows separately built applications to share modules at runtime. A "host" application dynamically loads "remote" components from other deployed applications. Each remote exposes components or utilities, and the host imports them as if they were local. React and other shared libraries can be declared as "singletons" to avoid loading multiple versions.

```js
// webpack.config.js of the remote app
new ModuleFederationPlugin({
  name: 'cartApp',
  exposes: { './CartWidget': './src/CartWidget' },
  shared: { react: { singleton: true }, 'react-dom': { singleton: true } }
})
```

The major challenge with Module Federation is shared state and styling: if multiple remotes render into the same page, managing a shared authentication state, theme, or event bus requires coordination. You can use a shared singleton store, browser CustomEvents, or a shared context provided by the host.

iframes provide the strongest isolation: each micro-frontend runs in its own browsing context with no JavaScript or CSS conflicts. The trade-off is severe: cross-frame communication is cumbersome (postMessage), deep linking is complex, performance is worse, and the user experience can feel fragmented (independent scroll areas, accessibility issues).

Web Components provide a browser-native encapsulation boundary. React apps can be wrapped in Web Components (using a thin custom element wrapper) and embedded in any framework or vanilla host. They work without a framework-specific runtime, making them agnostic. The trade-offs include verbose authoring, limited SSR support, and imperfect React integration (synthetic events don't propagate across shadow DOM boundaries).

Key trade-offs to acknowledge: micro-frontends add operational complexity (versioning, deployment coordination, shared design systems), can increase bundle duplication if not carefully managed, add latency for runtime loading, and make end-to-end testing harder. They are primarily an organizational pattern — the benefits accrue to teams, not individual users.

### Key Points
- Micro-frontends enable independent team deployments and ownership of vertical product slices
- Module Federation is the most common React approach: runtime module sharing with singleton declarations for shared libraries
- iframes offer maximum isolation but poor UX, cross-frame communication overhead, and accessibility problems
- Web Components provide framework-agnostic encapsulation but limited SSR and React event system integration
- The primary benefits are organizational; the technical trade-offs (complexity, duplication, coordination) are real costs

### Follow-up Prompts
- How do you handle authentication state and user session data shared across multiple micro-frontends?
- What strategies do you use to ensure visual consistency (design system) across independently deployed micro-frontends?
- How do you approach end-to-end testing for a micro-frontend architecture?

### Difficulty: advanced
### Tags: micro-frontends, module-federation, architecture, webpack, deployment

---

## Q6: How do you profile and optimize React application performance?

### Question
Describe a systematic approach to profiling a React application for performance issues, the tools available, and the most impactful optimization strategies at the component, bundle, and network level.

### Model Answer
Performance optimization should always begin with measurement, not assumption. The first step is establishing clear performance budgets and identifying user-perceived metrics: Largest Contentful Paint (LCP), Time to Interactive (TTI), First Input Delay (FID)/Interaction to Next Paint (INP), and Total Blocking Time (TBT). Tools like Lighthouse, WebPageTest, and Chrome User Experience Report (CrUX) provide real-world baseline data.

For runtime performance (rendering), the React DevTools Profiler is the primary tool. Record a user interaction, then examine the flame graph to find components that took longest to render. Look for: components rendering unnecessarily (no prop changes but rendering because the parent rendered), deeply nested component trees causing slow reconciliation, and large lists without virtualization.

Unnecessary re-renders are the most common React performance issue. Fixes: `React.memo` for components that receive stable props, `useCallback` and `useMemo` for stable function and object references passed as props, lifting state down (keeping state close to where it's used to avoid re-rendering large subtrees), and splitting context by concern to reduce consumer re-renders.

For large lists, virtualization is the most impactful optimization — only render DOM nodes that are visible in the viewport. Libraries like `@tanstack/virtual` (TanStack Virtual) or `react-window` implement this. Without virtualization, a list of 10,000 items creates 10,000 DOM nodes, even though only ~20 are visible.

For bundle performance, use webpack-bundle-analyzer or Rollup's visualization to identify large dependencies. Strategies: route-based code splitting with `React.lazy`, tree shaking unused library exports, replacing heavy libraries with lighter alternatives (moment → date-fns, lodash → specific function imports), and loading non-critical third-party scripts asynchronously.

For network performance: implement proper HTTP caching headers, use CDN for static assets, preload critical resources (`<link rel="preload">`), defer non-critical JavaScript, optimize images with next-gen formats (WebP, AVIF), and implement progressive loading patterns (skeleton screens, content placeholders).

### Key Points
- Always profile before optimizing: use React DevTools Profiler for render performance, Lighthouse/WebPageTest for load performance
- Unnecessary re-renders are the most common React performance issue; fix with memoization and state co-location
- List virtualization is the highest-impact optimization for rendering large datasets
- Bundle analysis guides code splitting and dependency replacement decisions
- Performance is a product of rendering + bundle + network; each layer requires different tools and solutions

### Follow-up Prompts
- How do you measure and improve the Interaction to Next Paint (INP) metric specifically?
- What is the trade-off between code splitting granularity and the number of network requests?
- How do you profile memory leaks in a React application?

### Difficulty: advanced
### Tags: performance, profiling, devtools, optimization, bundle-size, virtualization

---

## Q7: How do you architect a design system in React?

### Question
Describe how to architect a React component design system: component API design principles, theming, accessibility, documentation, versioning, and distribution.

### Model Answer
A design system is more than a component library — it is a shared language between design and engineering, a source of truth for visual consistency, and a productivity multiplier for teams building multiple applications. Architecting one well requires decisions across API design, theming, accessibility, and distribution.

Component API design principles: components should be "open" (extendable via props and composition) rather than trying to anticipate all use cases upfront. The polymorphic `as` prop pattern allows a component to render as any HTML element or another component, giving consumers flexibility. Uncontrolled/controlled parity — every interactive component should support both modes. Composition over configuration: prefer composing smaller components (`<Dialog.Root>`, `<Dialog.Trigger>`, `<Dialog.Content>`) over a single large component with many props. This is the Radix UI / Headless UI pattern.

Theming with CSS Custom Properties (design tokens) is the recommended approach. Design tokens (colors, spacing, typography, radii) are defined as CSS variables at the root. Components reference these variables, allowing themes to be applied by swapping variable values without changing any component code. Tokens should be multi-layered: raw → semantic → component-level. For example: `--color-blue-500` → `--color-interactive-primary` → `--button-background`.

Accessibility must be built in, not bolted on. Use Radix UI primitives or ARIA-APG patterns for complex interactive components (dialogs, dropdowns, tabs). Every component must be keyboard navigable, announce state to screen readers via ARIA attributes, and support focus management. Test with automated tools (axe-core, jest-axe) and manual screen reader testing.

Versioning follows semantic versioning strictly: breaking API changes are major versions, new features are minor, bug fixes are patch. Use Changesets for managing changelogs and coordinating version bumps across a monorepo. Maintain a changelog and document migration guides for major versions.

Distribution via npm with dual ESM/CJS output (using tools like tsup or Rollup). Peer dependencies for React and React DOM — consumers bring their own. Storybook serves as both the development environment and the documentation/demo portal. Component stories serve as living documentation. Chromatic or similar tools provide visual regression testing against Storybook stories.

### Key Points
- Prefer composition-based APIs (compound components pattern) over monolithic components with many props
- Design tokens as CSS Custom Properties enable robust theming without component code changes
- Accessibility must be built-in: keyboard navigation, ARIA, focus management — use Radix or Headless UI primitives for complex interactions
- Strict semantic versioning with documented migration guides; use Changesets for monorepo version management
- Storybook for development + documentation; visual regression testing (Chromatic) for preventing unintended changes

### Follow-up Prompts
- How do you handle the trade-off between design system strictness (enforcing visual consistency) and consumer flexibility?
- What is the "open/closed principle" as applied to React component API design?
- How do you manage breaking changes in a design system consumed by 30+ internal applications?

### Difficulty: advanced
### Tags: design-system, component-library, theming, accessibility, storybook

---

## Q8: How do you structure a React monorepo?

### Question
Explain how to set up and structure a monorepo for React applications: tooling choices, workspace organization, code sharing patterns, and CI/CD considerations.

### Model Answer
A monorepo hosts multiple packages and applications in a single repository. For React-heavy organizations, this means apps, the design system, shared utilities, and sometimes backend code, all version-controlled together. The key benefits: atomic commits across multiple packages, shared tooling and configuration, easy code sharing, and consistent developer experience.

Tooling: Turborepo (by Vercel) is the current standard for JavaScript/TypeScript monorepos, providing a task pipeline with caching. It integrates with npm/yarn/pnpm workspaces. The `turbo.json` defines task dependencies: `build` depends on all packages' builds, `lint` runs in parallel, `test` can be cached based on input file hashes. Turborepo's remote caching shares build artifacts across developers and CI, dramatically reducing build times.

```
/apps
  /web          - Next.js application
  /admin        - Another Next.js or CRA app
/packages
  /ui            - Design system components
  /utils         - Shared TypeScript utilities
  /config        - Shared ESLint, TS, Tailwind configs
  /api-client    - Generated or hand-written API client
```

Each package in `packages/` is a proper npm package with its own `package.json`. Shared packages are referenced in app `package.json` files as `"@myorg/ui": "workspace:*"`, which the package manager resolves to the local directory. TypeScript `paths` configuration or `tsconfig.json` `references` enable proper type resolution across packages.

Shared configuration packages are a key pattern: `@myorg/eslint-config`, `@myorg/tsconfig`, and `@myorg/tailwind-config` packages that all apps extend. This ensures consistent linting, TypeScript settings, and styling rules across the monorepo without duplication.

CI/CD: Turborepo's `--filter` flag enables affected-only builds — if you change the design system, only the design system and apps that depend on it are rebuilt and tested. This requires a "dependency graph aware" CI pipeline. GitHub Actions with Turborepo remote cache reduces CI times significantly.

Versioning in a monorepo depends on the release strategy: independent versioning (each package has its own semver, managed by Changesets) works for libraries shared externally. Fixed versioning (all packages share a version, like a big bang release) suits internal-only monorepos where all apps deploy together.

### Key Points
- Turborepo provides build orchestration with task caching; pnpm workspaces handles package resolution
- Standard structure: `/apps` for deployed applications, `/packages` for shared libraries and configs
- Shared configuration packages (`@myorg/tsconfig`, `@myorg/eslint-config`) ensure consistency without duplication
- Affected-only builds in CI (via `--filter`) prevent rebuilding unchanged packages, reducing CI time
- Changesets manages versioning and changelogs for packages consumed externally; fixed versioning for internal-only

### Follow-up Prompts
- How do you handle a breaking change in a shared package when multiple apps consume it?
- What are the trade-offs between Turborepo and Nx for monorepo management?
- How do you set up development with hot module reloading across package boundaries in a monorepo?

### Difficulty: advanced
### Tags: monorepo, turborepo, architecture, ci-cd, code-sharing

---

## Q9: What are CI/CD best practices for React applications?

### Question
Describe a mature CI/CD pipeline for a React application: what stages to include, quality gates, deployment strategies, and how to handle environment-specific configuration.

### Model Answer
A mature React CI/CD pipeline provides automated quality assurance at every stage, fast feedback loops, and safe, reversible deployments to production. The pipeline is typically structured as progressive gates: fast checks first, slower checks later.

The PR stage runs on every pull request: type checking (`tsc --noEmit`), linting (ESLint), unit/integration tests (Vitest/Jest), and visual regression tests (Chromatic against Storybook). These should complete within 5 minutes. A preview deployment to a staging environment (Vercel Preview, Netlify Deploy Preview, or a custom environment per PR) allows stakeholders to review changes before merge. Playwright E2E tests can run against the preview environment.

The main branch stage runs on merge to main: all PR checks, bundle size analysis (size-limit or bundlesize to fail if the bundle grows beyond a threshold), accessibility audits (axe-core), and performance budgets (Lighthouse CI). Security scanning (npm audit, Snyk) should run here.

Deployment strategies: Blue-Green deployment maintains two identical production environments; traffic is switched atomically from blue (current) to green (new). This allows instant rollback by switching traffic back. Canary deployments send a percentage of traffic (1%, 5%, 10%) to the new version, monitoring error rates and performance metrics before full rollout. Feature flags (LaunchDarkly, Unleash) decouple deployments from feature releases — code is deployed but the feature is disabled until explicitly enabled.

Environment-specific configuration in React: never embed secrets in the client bundle (they are visible to all users). API base URLs, feature flag keys, and analytics IDs are appropriate for `REACT_APP_*` or `NEXT_PUBLIC_*` env vars. Actual secrets (API keys with server privileges) must only exist in server-side code. Use `.env.local`, `.env.staging`, `.env.production` files, injected by the CI/CD system.

Rollback strategy: keep the previous deployment artifact available for instant rollback. With Vercel/Netlify, instant rollback to any previous deployment. With containerized apps (Docker + Kubernetes), roll back by changing the image tag in the Kubernetes deployment. Database migrations that are compatible with both old and new code (additive, backward-compatible) are essential for safe rollbacks.

### Key Points
- Pipeline stages: type check + lint + unit tests (fast, on PR) → E2E + bundle size + Lighthouse (slower, on main)
- Preview deployments per PR enable stakeholder review and E2E test environments before merge
- Canary/Blue-Green deployments with instant rollback capability protect production from bad deploys
- Feature flags decouple code deployment from feature activation, enabling safe incremental rollouts
- Never embed secrets in client bundles; all client-accessible config goes through typed, prefixed env vars

### Follow-up Prompts
- How do you implement automated performance regression detection in a CI pipeline?
- What is the difference between feature flags for deployment safety vs. product experimentation?
- How do you handle database schema migrations in a zero-downtime React + API deployment?

### Difficulty: advanced
### Tags: ci-cd, deployment, testing, performance-budget, feature-flags

---

## Q10: What are accessibility patterns for complex React UIs?

### Question
Describe how to implement accessibility in complex React component patterns: focus management, ARIA patterns, keyboard navigation, and how to audit and test accessibility systematically.

### Model Answer
Accessibility (a11y) in React goes beyond adding `alt` attributes to images. Complex interactive components — dialogs, menus, tabs, comboboxes, drag-and-drop — require deliberate ARIA pattern implementation, focus management, and keyboard navigation to be usable by people relying on screen readers or keyboard-only navigation.

The WAI-ARIA Authoring Practices Guide (APG) defines the expected keyboard interaction and ARIA attribute patterns for common widget types. Adhering to these patterns ensures that assistive technology users have a consistent experience. For example, a tabs pattern requires: `role="tablist"`, each tab with `role="tab"` and `aria-selected`, the active tab panel with `role="tabpanel"` and `aria-labelledby` pointing to its tab, and arrow keys to navigate between tabs.

Focus management is critical for dialogs and drawers. When a modal opens, focus must move to the first focusable element inside it. When it closes, focus must return to the element that triggered it. Focus must be trapped within the modal while it's open (Tab cycles through modal elements only). The `inert` attribute (or a polyfill) and `aria-hidden="true"` on the rest of the application prevent screen readers from announcing background content.

Radix UI and Headless UI provide unstyled, accessible primitives that implement these ARIA patterns correctly. Using them as a foundation is strongly recommended over building from scratch — the edge cases (browser differences, screen reader quirks, virtual keyboard behavior on mobile) are handled by the library.

For custom interactive elements that don't have a native HTML equivalent, use the correct `role` attribute, ensure they are keyboard focusable (`tabIndex="0"` or using native focusable elements), handle keyboard events (`onKeyDown` for Enter, Space, arrow keys per APG spec), and provide descriptive accessible names via `aria-label` or `aria-labelledby`.

Testing strategy: automated tools (axe-core via jest-axe for unit tests, or axe in Playwright E2E tests) catch roughly 30-40% of accessibility issues automatically. Manual testing with screen readers (NVDA + Firefox on Windows, VoiceOver + Safari on macOS/iOS) and keyboard-only navigation is required to catch the remaining issues. The accessibility tree (visible in browser DevTools under Accessibility tab) shows what assistive technology sees.

### Key Points
- Follow WAI-ARIA Authoring Practices Guide patterns for complex widgets (tabs, dialogs, menus, comboboxes)
- Focus management is non-negotiable for dialogs: trap focus inside, return focus on close
- Use Radix UI or Headless UI for accessible primitives — don't reinvent well-tested a11y patterns
- Automated tools (axe-core, jest-axe) catch ~30-40% of issues; manual screen reader testing is required
- Accessible names (`aria-label`, `aria-labelledby`), roles, and keyboard interaction are the three pillars of ARIA implementation

### Follow-up Prompts
- How do you implement an accessible autocomplete/combobox component from scratch?
- What is the difference between `aria-hidden`, `inert`, and `visibility: hidden` for hiding content from assistive technology?
- How do you handle accessibility in a drag-and-drop list component?

### Difficulty: advanced
### Tags: accessibility, aria, focus-management, keyboard-navigation, screen-readers
