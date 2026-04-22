# Architecture - Senior Interview Questions
### Language: en

## Q1: How do micro-frontends work, and when should you use them?

### Question
Explain micro-frontend architecture — the different implementation approaches (Module Federation, import maps, iframes, Web Components), when the pattern is appropriate, and what trade-offs and pitfalls to anticipate.

### Model Answer
Micro-frontends apply microservices principles to the frontend: instead of a single monolithic SPA, multiple independent teams each own and deploy a frontend slice. The host application assembles them at runtime or build time.

**When to use micro-frontends:** The pattern makes sense when multiple autonomous teams need to work on distinct parts of a product without coordinating deployments, and when those parts have sufficiently different concerns (separate deploy cadences, technology diversity needs, or team ownership boundaries). It is overkill for teams of under ~50 engineers where a well-structured monorepo suffices. The complexity cost is significant — do not adopt it as a default architecture.

**Webpack Module Federation** is the most production-ready approach. Each app declares itself as a "remote" (exposing components) or "host" (consuming components). At runtime, the host dynamically loads remote modules from a separately deployed URL. The Module Federation plugin handles shared dependency deduplication — React can be declared as a shared singleton so only one copy loads. Each remote is independently built and deployed. Next.js and other bundlers have adopted Module Federation. The `@module-federation/universe` package provides a framework-agnostic implementation.

**Import maps** are a native browser feature (or polyfillable via `systemjs`) that let you map a bare module specifier (`react`) to a URL. Teams can deploy their own copies of dependencies; the import map controls which version is loaded. Each micro-frontend is a native ES module. Less coupling than Module Federation but requires more coordination on shared dependency versions.

**Iframes** provide the strongest isolation — each micro-frontend runs in a completely separate browsing context with no shared JavaScript heap or CSS. Communication is via `postMessage`. Simple to implement, zero CSS conflicts, true independent deployment. The isolation is also the limitation: poor UX for deeply integrated features, routing/auth coordination is complex, accessibility is impaired.

**Web Components / Custom Elements** allow framework-agnostic component packaging. A team builds a component with any framework and wraps it as a custom element. Other teams consume it without knowing the underlying framework. Works for leaf components; less suited for entire page sections with complex routing.

**Key trade-offs and pitfalls:**
- **Bundle duplication:** Without careful shared dependency configuration, each micro-frontend ships its own copy of React, adding hundreds of KB.
- **Operational complexity:** Each team needs its own build pipeline, deployment, and versioning strategy.
- **Cross-app communication:** Shared state is hard — use a shared event bus, URL, or custom element attributes rather than a shared store.
- **CSS isolation:** Styles from one micro-frontend can bleed into another. Use CSS Modules, Shadow DOM, or strict BEM naming.
- **Unified UX:** User experience coherence requires strong design system governance; otherwise teams diverge visually.

### Key Points
- Micro-frontends are appropriate for large organizations with multiple autonomous teams owning distinct product domains
- Module Federation is the most practical approach for webpack/Vite-based stacks with shared dependencies
- Iframes provide maximum isolation but poor integrated UX; use only for truly isolated widgets
- Shared dependency deduplication (React as singleton) is critical to avoid bundle bloat
- The pattern adds substantial operational complexity — validate the organizational need first

### Follow-up Prompts
- How would you handle authentication and session sharing between micro-frontends?
- How do you coordinate design system updates across micro-frontends without a forced simultaneous upgrade?
- How does Module Federation handle versioning when two micro-frontends require different versions of the same library?

### Difficulty: advanced
### Tags: micro-frontends, Module-Federation, import-maps, architecture, team-topology

---

## Q2: What are the trade-offs between Nx and Turborepo for monorepo management?

### Question
Compare Nx and Turborepo as monorepo tools. Cover their approaches to task orchestration, caching, code generation, and the scenarios where each is the better choice.

### Model Answer
Monorepo tooling solves the core problem of efficiently running tasks (build, test, lint) across many packages without redundant work. Both Nx and Turborepo use content-hashing caches and parallel task graphs, but their philosophies differ significantly.

**Turborepo** (by Vercel) is a thin, fast task runner built on top of your existing package.json scripts. Its philosophy is minimal intrusion: define task dependencies in `turbo.json`, and Turborepo handles ordering, parallelization, and caching. Remote caching stores task output (build artifacts, test results) in Vercel's cloud or a self-hosted endpoint. If a task's inputs (source files, env vars, dependencies) haven't changed, Turborepo replays the cached output in milliseconds. It has almost no opinions about project structure — works with any existing setup.

**Nx** (by Nrwl) is a full-featured build system with generators, executors, plugins, and a rich plugin ecosystem. Nx has strong opinions: it uses its own task runner with a project graph computed from static analysis of imports (not just package.json declarations). The Nx Cloud remote cache is the commercial offering; a self-hosted option exists. Generators scaffold new libraries, components, and features following Nx conventions. The Nx Console VSCode extension provides a GUI. Nx has first-class support for React, Angular, Node, and Next.js through official plugins that configure the entire build/test/lint toolchain.

**Key differences:**

- **Setup complexity:** Turborepo can be added to an existing repo in minutes with minimal configuration. Nx migration requires more upfront investment but provides more structure.
- **Project graph:** Nx infers the dependency graph by analyzing imports — it knows that `app-a` depends on `lib-x` because it imports it, without an explicit declaration. Turborepo relies on `package.json` `dependencies` declarations.
- **Generators and scaffolding:** Nx has a rich code generation system (`nx generate @nx/react:library`). Turborepo has no built-in code generation.
- **Affected computation:** Both compute which packages are affected by a change and skip unaffected tasks. Nx's import-graph analysis is more precise — a change to `lib-x` only affects packages that actually import it.
- **Caching granularity:** Both cache at the task level. Nx additionally supports distributed task execution (running tasks in parallel across multiple CI agents).

**When to choose Turborepo:** Starting a new monorepo, migrating an existing repo with minimal disruption, team prefers a lightweight tool with few opinions, using Vercel for deployment.

**When to choose Nx:** Larger organizations needing structure and governance, teams that benefit from code generation and consistency enforcement, Angular-heavy stacks (Nx is the standard tool), or when advanced features like distributed task execution and project graph visualization are needed.

### Key Points
- Both tools use content-hashing caches and task graph ordering — the core value is the same
- Turborepo is lightweight, low-opinion, and easy to adopt incrementally
- Nx provides a full platform: generators, executors, plugins, and precise import-graph analysis
- Nx's import-aware project graph computes affected packages more precisely than package.json-based dependency declarations
- Remote caching (Vercel for Turborepo, Nx Cloud for Nx) is the largest CI time saving — enable it early

### Follow-up Prompts
- How would you migrate a large yarn workspaces repo to Nx without breaking existing CI pipelines?
- How does Nx's distributed task execution (DTE) work, and when does it provide meaningful CI time reduction?
- How do you enforce module boundary rules in an Nx monorepo to prevent unwanted cross-domain imports?

### Difficulty: advanced
### Tags: monorepo, Nx, Turborepo, build-systems, CI, architecture

---

## Q3: How do you architect a scalable design system?

### Question
Describe the architecture of a design system that scales from a small company to an enterprise — covering token architecture, component tiers, contribution model, documentation, versioning, and adoption strategy.

### Model Answer
A design system is a product serving other products. Its success depends as much on organizational design as on technical architecture.

**Foundational layer — design tokens:** Tokens are the atomic values of the design language. Implement a three-tier hierarchy: (1) Global/primitive tokens encode raw values (`color.blue.500 = '#3B82F6'`, `space.4 = '16px'`); (2) Semantic/alias tokens give purposeful names mapping to primitives (`color.action.primary = color.blue.500`); (3) Component tokens expose per-component customization points (`button.background = color.action.primary`). This hierarchy means a brand rebrand only touches semantic tokens; components update automatically.

**Component tiers:** Not all components are created equal. Tier 1 (Core): foundational primitives — Button, Input, Typography, Icon. These are heavily governed, slow to change, used everywhere. Tier 2 (Pattern): composed patterns — Form, DataTable, Card, Modal. Tier 3 (Template): full-page layouts. Higher tiers compose lower tiers. This allows teams to contribute patterns without needing to modify core primitives.

**Contribution model:** A federated model scales better than a centralized one. Core team maintains Tier 1 with strict review gates. Extended contributors (embedded design system champions in product teams) can propose and maintain Tier 2/3 components, subject to core team review. Define clear contribution criteria: component must be used in 3+ places, must have usage docs, must pass a11y review. Use a proposal RFC process (GitHub Issues with a template) to surface needs before implementation.

**Component API philosophy:** Components should have a limited, intentional API. Avoid prop proliferation by using composition patterns (compound components, render props, slots). Expose escape hatches (`className`, `style`, CSS custom property overrides) for one-off customization rather than adding props for every variant. Follow the ARIA Authoring Practices Guide for all interactive components.

**Documentation with Storybook:** Each component has stories for all variants, states (hover, focus, active, disabled, error, loading), and size combinations. Use Storybook's controls addon for interactive playground. Use the a11y addon for automated accessibility checking. Write usage guidelines in MDX alongside stories. Publish to a static hosting URL (Chromatic for visual regression, GitHub Pages for public docs).

**Versioning:** Semantic versioning strictly. All breaking API changes increment major version. Provide codemods (using jscodeshift or ast-grep) for automated migration. Maintain a changelog entry for every release. Support the previous major version with security patches for 12 months. Use Changesets in your monorepo to manage version bumps.

**Adoption strategy:** Adoption requires trust and ease. Provide a Getting Started guide targeting under 15 minutes to first rendered component. Create a migration guide from common alternatives (Bootstrap, custom styles). Track adoption metrics: what % of product UI uses design system components vs custom implementations. Celebrate adoption publicly.

### Key Points
- Three-tier token hierarchy (global → semantic → component) insulates components from design decisions
- Federated contribution model — product teams contribute patterns, core team governs primitives
- Storybook is both the development environment and the documentation platform
- Codemods (automated code transforms) are mandatory for breaking changes at scale
- Track and publicize adoption metrics to build internal momentum

### Follow-up Prompts
- How would you implement a dark mode toggle that works across server-rendered and client-rendered components without a flash?
- How do you manage visual regression testing across all design system components in CI?
- How do you handle the case where a product team needs a one-off variant that doesn't belong in the design system?

### Difficulty: advanced
### Tags: design-system, design-tokens, Storybook, contribution-model, versioning, architecture

---

## Q4: What are the patterns for state management at scale?

### Question
Describe how state management architecture evolves as a React application scales. What patterns emerge for managing server state, global UI state, cross-component communication, and preventing the common pitfalls of centralized state stores?

### Model Answer
State management at scale requires recognizing that "state" is not monolithic and that different categories of state have fundamentally different requirements.

**State categorization (the foundation):** Before choosing tools, categorize each piece of state: (1) Server state — fetched from APIs, has lifecycle (loading/error/stale/fresh), can be shared across components; (2) Global UI state — cross-cutting application state like current user, theme, active modal, notifications; (3) Local UI state — component-internal, ephemeral, only needed within one component tree; (4) URL state — filter parameters, pagination, search queries — should be in the URL for shareability.

**Server state at scale with React Query:** React Query (or SWR) introduces a query cache that serves as the source of truth for all server-side data. Key scaling patterns: (1) Query key factories — centralize query key construction to prevent key collisions across the codebase: `const userKeys = { all: ['users'], detail: (id) => ['users', id] }`; (2) Prefetching on hover/route change to eliminate loading states; (3) Optimistic mutations with rollback for immediate UI feedback; (4) `select` transformer option to subscribe to a derived slice of cached data, preventing unnecessary re-renders; (5) `queryClient.invalidateQueries` for cache invalidation after mutations.

**Global UI state with Zustand:** Split into domain-specific stores rather than one monolithic store: `authStore`, `uiStore` (modals, sidebar state), `notificationStore`. Each store has a narrow, cohesive scope. Use the `subscribeWithSelector` middleware to subscribe to specific slices without triggering re-renders on unrelated state changes. Use `immer` middleware to write immutable updates in a mutable style.

**Avoiding the Redux anti-patterns that emerge at scale:** (1) Never store server data in Redux/Zustand — it duplicates the cache and creates synchronization bugs; (2) Normalize data by ID (entity adapter pattern) to prevent duplicated records; (3) Avoid derived state in the store — compute it with selectors (`reselect`) instead; (4) Never put non-serializable data (Date objects, class instances, functions) in a Redux store.

**URL state for filter/search:** Use the URL search params as the source of truth for all filter, sort, and pagination state. This makes UI state shareable, bookmarkable, and survivable on page reload. React Router's `useSearchParams` or TanStack Router's typed search params make this ergonomic.

**Cross-component communication patterns:** For distant components that need to communicate without a shared parent, options in order of preference: (1) Lift state up; (2) URL state; (3) Zustand store; (4) React Context (for subtree-scoped state); (5) Custom events via `EventEmitter` or browser `CustomEvent` (last resort, breaks React's data flow guarantees).

### Key Points
- Categorize state first: server vs global UI vs local vs URL — each has an optimal tool
- React Query's query cache is the source of truth for server data — never duplicate in Redux/Zustand
- Query key factories prevent collision and enable targeted cache invalidation across a large codebase
- URL state is underused — it makes filter/pagination state shareable and bookmarkable for free
- Split Zustand into narrow domain stores rather than one large store to limit re-render scope

### Follow-up Prompts
- How would you implement cross-tab state synchronization (e.g., logout in one tab reflects in all tabs) in a React application?
- How do you handle the case where the same entity appears in multiple React Query caches with potentially different data?
- How would you architect an undo/redo system that works across optimistic mutations in React Query?

### Difficulty: advanced
### Tags: state-management, React-Query, Zustand, Redux, URL-state, architecture, scale

---

## Q5: How do you design a BFF (Backend for Frontend) API layer?

### Question
Explain the Backend for Frontend pattern — its motivation, how it differs from a general API gateway, how GraphQL federation fits in, and the operational trade-offs of maintaining a BFF layer.

### Model Answer
The Backend for Frontend (BFF) pattern introduces a server-side layer purpose-built for a specific frontend client. Rather than the frontend calling multiple microservices or a generic API directly, the BFF aggregates, transforms, and optimizes data for the precise needs of its client.

**Motivation:** Microservices architectures fragment data across many services. A product page might need data from inventory, pricing, reviews, and user preference services — 4 roundtrips from the browser, with each having different latency. The BFF performs these calls server-to-server (fast, low latency, on a high-bandwidth internal network), aggregates the results, and returns a single optimized response shaped exactly for the UI's needs. The BFF also handles concerns specific to the client: authentication token exchange, response format (mobile apps may need different shapes than web), and protocol translation (REST → gRPC).

**BFF vs API Gateway:** An API gateway is a general infrastructure concern: routing, rate limiting, auth, SSL termination, applicable to all clients. A BFF is product logic specific to one client type. Both can coexist: the API gateway handles cross-cutting infrastructure; the BFF handles client-specific aggregation and transformation.

**GraphQL as a BFF implementation:** GraphQL naturally implements the BFF pattern — clients request exactly the data they need, the GraphQL resolver layer aggregates from multiple backend services. **GraphQL Federation** (Apollo Federation) extends this for microservices: each service defines its own schema "subgraph"; the Federation gateway composes them into a unified supergraph. The frontend queries the supergraph and the gateway routes and merges responses from the appropriate subgraphs. This allows independent teams to evolve their service schemas without coordinating a monolithic schema.

**When to use REST BFF vs GraphQL BFF:** REST BFF is simpler operationally, appropriate when the frontend's data needs are well-defined and stable (minimal schema evolution needed). GraphQL BFF excels when: multiple client types (web, mobile, TV) have divergent data needs; the frontend product evolves rapidly with frequent new data requirements; the team has the expertise to operate a GraphQL layer.

**Operational trade-offs of maintaining a BFF:**
- **Positive:** Decouples frontend from backend service contracts; enables client-specific optimization; server-side authentication token management improves security.
- **Negative:** Another service to build, deploy, monitor, and scale; increases full-stack ownership requirements for frontend teams; latency risk if the BFF itself becomes a bottleneck; potential for the BFF to become a "distributed monolith" if it takes on too much logic.

**Implementation:** Next.js API Routes and Route Handlers are a popular lightweight BFF implementation — they collocate the BFF with the frontend code, simplifying deployment, and enable streaming responses.

### Key Points
- BFF aggregates multiple microservice calls server-to-server, reducing browser roundtrips and latency
- BFF is client-specific (per client type); API Gateway is cross-client infrastructure — they complement each other
- GraphQL Federation composes multiple service subgraphs into a unified supergraph
- Next.js API Routes/Route Handlers are a practical BFF implementation that collocates with the frontend
- BFF adds operational complexity — justify with measurable need (multiple services, diverse clients, auth requirements)

### Follow-up Prompts
- How would you handle BFF caching — at what layer do you cache, and how do you invalidate?
- How does Apollo Federation v2's `@key` directive enable entity references across subgraph boundaries?
- How would you design a BFF for a mobile app and a web app that share the same backend but need different data shapes?

### Difficulty: advanced
### Tags: BFF, GraphQL-Federation, API-design, architecture, microservices

---

## Q6: Explain the frontend testing strategy pyramid.

### Question
Describe a comprehensive frontend testing strategy using the testing pyramid. Cover unit, integration, and end-to-end tests — what each tests, what tools to use, how to balance investment across layers, and common anti-patterns.

### Model Answer
The testing pyramid is a framework for balancing test investment to maximize confidence while minimizing cost and maintenance burden. The layers differ in scope, speed, cost, and the types of bugs they catch.

**Layer 1 — Unit tests (base, largest quantity):** Test individual functions, utilities, hooks, and pure components in isolation. Fast (milliseconds each), cheap to write and maintain, precise failure messages. Tools: Vitest or Jest as the test runner, with Testing Library for React component tests. What to unit test: pure transformation functions, custom hooks, utility modules, simple presentational components, reducers. What not to unit test: implementation details (internal component state, private methods), things better tested at integration level.

**Layer 2 — Integration tests (middle, moderate quantity):** Test multiple units working together — a feature component with its hooks, context providers, and child components. Render a full feature, interact with it, and assert on the result. Use React Testing Library's `render` with real (not mocked) child components, but mock at the network boundary (use MSW — Mock Service Worker — to intercept and mock fetch/XHR calls). This gives tests that are resilient to internal refactoring but catch integration bugs between components and services. MSW runs in both Node.js (Jest/Vitest) and the browser (for manual testing and Storybook).

**Layer 3 — End-to-End tests (apex, smallest quantity):** Test the full application in a real browser against a real (or realistic staging) backend. Tools: Playwright (recommended — multi-browser, reliable, fast) or Cypress. E2E tests are slow (seconds to minutes each), expensive to maintain (flaky by nature), but provide the highest confidence that real user flows work. Focus E2E on critical paths: authentication, checkout, core create/read/update/delete flows. Do not test every edge case at the E2E level — that's the integration test's job.

**Testing anti-patterns:**

- **Testing implementation details:** Testing internal state or private methods makes tests brittle and refactoring painful. Test behavior (what the user sees and does), not implementation.
- **Over-mocking:** Mocking at too fine a granularity (mocking every function in a module) creates tests that pass even when the real integration is broken. Mock at the network boundary (MSW) instead.
- **Snapshot testing without intention:** Auto-updating snapshots defeats their purpose. Use snapshots sparingly — only for stable, meaningful output structures. Visual regression testing (Chromatic, Percy) is more effective for UI.
- **E2E for unit-level coverage:** Running slow E2E tests for cases that could be covered by fast integration tests inverts the pyramid and makes the CI suite slow.

**Coverage targets:** 80%+ unit/integration coverage as a soft target, measured against business-critical paths. 100% coverage of the critical user flows via E2E. Coverage metrics are a proxy — optimize for test confidence, not coverage percentage.

### Key Points
- Unit tests: fast, isolated, abundant — test functions, hooks, pure components
- Integration tests: medium scope — use React Testing Library + MSW; mock at network boundary, not component boundary
- E2E tests: few, slow, high-confidence — Playwright for critical user journeys
- Never test implementation details — test behavior from the user's perspective
- MSW (Mock Service Worker) enables realistic API mocking at the network level in both Jest and browser environments

### Follow-up Prompts
- How would you implement contract testing between a BFF and the frontend to catch API breaking changes?
- How does Playwright's `page.route()` API compare to MSW for network mocking in E2E tests?
- How would you structure a test suite for a React component that has many interaction states (loading, error, empty, populated) without duplicating setup code?

### Difficulty: advanced
### Tags: testing-strategy, testing-pyramid, Playwright, React-Testing-Library, MSW, unit-tests, E2E

---

## Q7: How do you design a CI/CD pipeline for a frontend application?

### Question
Design a production-grade CI/CD pipeline for a large frontend application. Cover what runs at each stage, how to optimize for speed, preview deployments, progressive rollouts, and rollback strategies.

### Model Answer
A well-designed CI/CD pipeline for frontend applications enables multiple deployments per day with confidence, fast feedback on PRs, and safe progressive rollouts to production.

**PR pipeline (runs on every push to a PR branch):**
1. **Install & cache** — `npm ci` with dependency cache keyed on lockfile hash. Node modules are restored from cache if the lockfile hasn't changed, cutting install time from 2 minutes to 5 seconds.
2. **Type check** — `tsc --noEmit` to catch TypeScript errors before tests.
3. **Lint** — ESLint on changed files only (using `eslint --cache` or `nx affected:lint`).
4. **Unit/integration tests** — run in parallel across multiple CI agents (Nx distributed task execution, or Jest `--shard`). Fail fast.
5. **Build** — production build. Capture bundle size metrics.
6. **Bundle size check** — `size-limit` to fail if any chunk exceeds budget.
7. **Preview deployment** — deploy to a preview URL (Vercel, Netlify, or self-hosted preview environment). Post the URL as a PR comment.
8. **E2E tests** — run Playwright against the preview deployment. Run critical path tests on every PR; run full suite nightly.
9. **Visual regression** — Chromatic (Storybook) captures screenshots and diffs against baseline. Requires human approval on visual changes.
10. **Accessibility audit** — `axe-playwright` runs against the preview deployment.

**Merge to main pipeline:**
1. Run all PR steps again (or reuse artifact from PR if SHA matches).
2. Deploy to staging environment.
3. Run smoke tests against staging.
4. If all pass, trigger production deployment.

**Progressive rollout (canary deployment):** Deploy the new version to 5% of traffic using feature flags (LaunchDarkly) or CDN traffic splitting (Cloudflare Workers, Vercel Edge). Monitor error rates and Core Web Vitals for 30 minutes. If metrics are stable, roll out to 25% → 50% → 100%. If error rates spike, immediately set the canary weight to 0 without a code change.

**Rollback strategy:** For static frontends: CDN deployment is atomic — rolling back means promoting the previous deployment artifact back to the live CDN. This takes seconds. Maintain a deployment history of at least the last 10 deployments with one-click rollback. Use immutable deployment URLs (content-hashed) so previous versions are always retrievable.

**Optimizing for speed:** Run independent steps in parallel. Use remote caching (Nx Cloud, Turborepo) to skip unchanged package builds. Split tests across multiple agents with sharding. Cache Docker layers and node_modules between runs. Target a PR pipeline time of under 5 minutes — longer and developers context-switch away.

### Key Points
- Preview deployments on every PR enable stakeholder review and E2E testing against production-like environments
- Bundle size checks (`size-limit`) in CI prevent silent bundle regressions
- Canary rollout using feature flags or CDN traffic splitting limits blast radius of regressions
- Rollback for static frontends is instant — promote previous deployment artifact at the CDN layer
- Target < 5 minutes for PR pipeline; use parallelism, caching, and affected-only runs to achieve it

### Follow-up Prompts
- How would you implement a canary deployment for a React SPA that is served from a CDN without a backend?
- How do you handle environment-specific configuration (API URLs, feature flags) across preview, staging, and production deployments?
- How would you set up a deployment approval gate that requires QA sign-off before promoting to production?

### Difficulty: advanced
### Tags: CI-CD, pipeline, preview-deployments, canary, rollback, Playwright, architecture

---

## Q8: How do you architect a feature flag system for a frontend application?

### Question
Describe the architecture of a feature flag system — the different types of flags, how to evaluate them efficiently on the frontend, how to avoid the pitfalls (flag debt, performance, hydration mismatches), and integration with A/B testing.

### Model Answer
Feature flags (feature toggles) decouple code deployment from feature release, enabling trunk-based development, safe rollouts, and controlled experiments. A mature flag system is infrastructure that requires careful design.

**Types of feature flags:**

- **Release flags:** Wrapping incomplete features under development. Enable/disable by environment. Short-lived — should be removed once the feature ships fully.
- **Ops flags:** Kill switches for functionality (disable a chatbot if the backend is overloaded). Must evaluate instantly without network calls — cached.
- **Experiment flags:** A/B tests. Require stable assignment per user (same user always gets same variant). Track conversion metrics.
- **Permission flags:** Control access by user role or subscription tier. Evaluated based on user attributes.

**Evaluation architecture:** The flag configuration (which flags are on/off for which users/cohorts) is fetched once at application startup from the flag service (LaunchDarkly, Statsig, Unleash, Split.io, or self-hosted). The configuration is cached in memory and updated via SSE or polling. Individual flag evaluations are local — no network call per evaluation. This is critical for performance: `featureFlags.isEnabled('newCheckout')` must be synchronous and instant.

**Bootstrap configuration:** On page load, the flag configuration should be available before rendering to avoid layout shifts or hydration mismatches. For SSR: the server evaluates flags for the current user and injects the configuration into the HTML as a script tag (`window.__FLAGS__ = {...}`). The client hydrates using this server-computed configuration, ensuring server and client render the same content.

**Hydration mismatch problem:** If flags are evaluated client-side only (fetched after hydration), the server renders the unflagged UI and the client swaps to the flagged UI — causing a flash of content change and a React hydration warning. Solutions: (1) server-side flag evaluation injected into HTML; (2) treat the initial render as the "flag-unaware" state and reveal flagged features only after client-side flags load (hiding flagged content initially).

**Flag debt management:** Flags without planned removal become permanent code rot. Every flag should have an owner, creation date, and scheduled cleanup date. Use a flag auditing tool or create CI checks that flag (pun intended) flags older than 90 days without a removal ticket. Delete flags immediately after 100% rollout or experiment conclusion.

**A/B testing integration:** An experiment flag assigns users to variants using a deterministic hash of `userId + flagKey` (ensuring stability across sessions and devices). Track exposures and conversion events in your analytics pipeline. Use statistical significance calculation before concluding an experiment. The flag evaluation SDK emits an exposure event automatically when a flag is evaluated.

**SDK evaluation context:** The flag SDK evaluates rules based on user context attributes: `{ userId, email, country, plan, appVersion }`. These attributes are set once at login and used for all subsequent evaluations.

### Key Points
- Flag evaluations must be synchronous and local — configuration is fetched once, not per evaluation
- SSR must inject server-evaluated flag configuration into the HTML to prevent hydration mismatches
- Release flags must have a scheduled removal date — flag debt degrades code maintainability rapidly
- Experiment flags require stable per-user assignment (deterministic hash) across sessions
- Separate flag types by purpose (release, ops, experiment, permission) — they have different lifecycles and evaluation rules

### Follow-up Prompts
- How would you implement a self-hosted feature flag system without a commercial vendor?
- How do you design experiment flags to ensure that concurrent A/B tests don't interfere with each other (multivariate conflicts)?
- How would you handle feature flags in a micro-frontend architecture where each micro-frontend may have its own flag configuration?

### Difficulty: advanced
### Tags: feature-flags, A/B-testing, LaunchDarkly, hydration, architecture, experimentation

---

## Q9: How do you design an error boundary strategy for a React application?

### Question
Describe a production-grade error boundary strategy — where to place boundaries, what recovery UI to show at each level, how to integrate with error tracking, and how to handle async errors that don't trigger error boundaries.

### Model Answer
React error boundaries are class components (or libraries wrapping them) that catch JavaScript errors in their component tree during rendering, lifecycle methods, and constructors. A strategy around where and how to place them determines whether errors surface as total application crashes or graceful, recoverable failures.

**Error boundary placement levels:**

**Root-level boundary:** Wraps the entire application. Catches catastrophic errors that no lower boundary handled. Shows a full-page error UI: a user-friendly message, a "Reload" button, and optionally a "Copy error ID" button referencing the logged error in your error tracking system. This is a last resort — users should rarely see this.

**Route-level boundaries:** Wrap each route's component tree. If the `/dashboard` route crashes, only the dashboard is replaced with an error UI — the navigation, header, and other routes are unaffected. The user can navigate away and the app remains usable. This is the most impactful placement.

**Widget/section-level boundaries:** Wrap high-risk, independently valuable UI sections — a recommendation widget, a real-time chart, a complex data table. If the widget crashes, the rest of the page continues to function. This is particularly valuable for third-party components or data-driven visualizations.

**Recovery UI design:** Each level should have an appropriate fallback:
- Root: Full-page error with reload
- Route: Page-level error with navigation back to home
- Widget: Inline error state with retry button

The retry mechanism is implemented by the boundary resetting its state (`this.setState({ hasError: false })` on retry click), which re-mounts the failed subtree.

**Error tracking integration:** The boundary's `componentDidCatch(error, errorInfo)` receives the error and the React component stack. Report both to your error tracking service (Sentry's `Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })`). Add context: current user ID, route, feature flags active. `react-error-boundary` (npm) is a widely used library that handles this more ergonomically than raw class components.

**Async errors and event handlers — error boundaries do NOT catch:** Error boundaries only catch synchronous rendering errors. They do not catch: errors in async functions (fetch callbacks, setTimeout, async event handlers), errors in event handlers, errors thrown in the error boundary itself. Async errors require separate handling: wrap async operations in try/catch and manage error state locally, or use a global `window.addEventListener('unhandledrejection', handler)` as a safety net. For event handler errors: use try/catch in the handler and surface the error via local state.

**Testing error boundaries:** Use `react-error-boundary`'s `withErrorBoundary` HOC in tests. To trigger the boundary in testing, override the component to throw during render and assert on the fallback UI. Use `console.error` spies to suppress React's noisy error output in tests.

### Key Points
- Place boundaries at root (last resort), route (most impactful), and widget (high-risk sections) levels
- Route-level boundaries are the most valuable — they contain crashes to a single page without breaking navigation
- `componentDidCatch` receives the React component stack — include it in error reports for faster debugging
- Error boundaries do NOT catch async errors or event handler errors — handle those with try/catch
- `react-error-boundary` library provides a more ergonomic API than raw class components

### Follow-up Prompts
- How would you implement error boundary recovery that retries the failed operation rather than just re-mounting?
- How does React 18's concurrent mode change the behavior of error boundaries?
- How would you design a system that automatically reports errors from error boundaries AND from unhandled promise rejections to a unified error tracking pipeline?

### Difficulty: advanced
### Tags: error-boundaries, React, error-tracking, Sentry, architecture, resilience

---

## Q10: How do you implement frontend observability — logging, tracing, and metrics?

### Question
Describe a comprehensive frontend observability strategy covering structured logging, distributed tracing (connecting frontend actions to backend spans), custom metrics, and how to build a unified observability pipeline for a complex frontend application.

### Model Answer
Frontend observability extends the backend observability model to the browser, creating end-to-end visibility from user interaction through API calls to backend services. A complete strategy covers three pillars: logs, traces, and metrics.

**Structured logging:** Replace unstructured console log strings with structured log objects that can be queried and analyzed. Every log entry includes: timestamp, severity, message, session ID, user ID, current URL, trace ID, and structured context. A frontend logger wraps console output in development and ships to a log aggregation service (Datadog, Loki, CloudWatch) in production via batched `fetch` calls or `navigator.sendBeacon`. Logs should be sampled (e.g., 10% of sessions for INFO, 100% for ERROR) to control cost.

**Distributed tracing — frontend to backend correlation:** OpenTelemetry is the standard. The frontend SDK (`@opentelemetry/sdk-trace-web`) creates spans for user interactions and network requests. When making a fetch request, the tracing SDK automatically injects `traceparent` and `tracestate` headers (W3C Trace Context format). The backend extracts these headers and continues the trace, creating a child span. The result: a single trace that shows the full journey from button click → API request → database query, with timing at each step. This dramatically simplifies debugging latency issues.

**Frontend span instrumentation:** Create spans around meaningful user operations:
```javascript
const span = tracer.startSpan('checkout.submit');
try {
  await submitOrder(cart);
  span.setStatus({ code: SpanStatusCode.OK });
} catch (err) {
  span.recordException(err);
  span.setStatus({ code: SpanStatusCode.ERROR });
} finally {
  span.end();
}
```

**Custom metrics:** Use the User Timing API (`performance.mark`, `performance.measure`) or OpenTelemetry metrics to track business-critical operations: checkout completion time, search results latency, form completion time, feature usage rates. These are "golden signals" specific to your product. Export them via OpenTelemetry's metrics pipeline to Prometheus or Datadog.

**Session context:** All telemetry (logs, traces, spans) must share a session ID generated at app startup and stored in sessionStorage. This allows correlating all events from a single user session across the three pillars — you can start with an error metric, find the log entry, and jump to the trace.

**Unified pipeline architecture:** Use an OpenTelemetry Collector as the backend sink — it receives traces, metrics, and logs from the frontend and routes them to the appropriate backend (Jaeger for traces, Prometheus for metrics, Loki for logs). The collector handles batching, retry, and transformation, decoupling the frontend from the specific observability vendors. Vendor lock-in is avoided — swapping from Datadog to Grafana stack requires only collector configuration changes.

**Sampling strategy:** Sampling is essential — capturing 100% of traces in a high-traffic app is prohibitively expensive. Head-based sampling (decide at trace start): sample 10% of all sessions. Tail-based sampling (decide after the fact): always sample sessions that contain errors or slow operations, regardless of the base sample rate.

### Key Points
- OpenTelemetry is the vendor-neutral standard for all three observability pillars (logs, traces, metrics)
- Distributed tracing requires injecting `traceparent` headers on fetch calls to correlate frontend and backend spans
- A shared session ID ties all telemetry together across the three pillars for a single user session
- OpenTelemetry Collector as a backend sink decouples the frontend from specific vendors
- Tail-based sampling ensures errors and slow traces are always captured regardless of base sample rate

### Follow-up Prompts
- How would you implement automatic instrumentation of all fetch calls with trace context propagation without modifying every call site?
- How does OpenTelemetry's `@opentelemetry/auto-instrumentations-web` package work, and what does it instrument automatically?
- How would you build a custom dashboard that correlates frontend error rates with backend latency using data from the same OpenTelemetry pipeline?

### Difficulty: advanced
### Tags: observability, OpenTelemetry, distributed-tracing, logging, metrics, architecture

---
