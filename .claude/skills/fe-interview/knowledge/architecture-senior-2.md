# Architecture - Senior Interview Questions (Part 2)
### Language: en

## Q11: What is Event-Driven Frontend Architecture and When Should You Use It?

### Question
Describe event-driven architecture applied to the frontend, how it differs from direct function calls and shared state, what patterns implement it (EventEmitter, message bus, Redux middleware), and when it is the right choice.

### Model Answer
Event-driven architecture (EDA) in the frontend is a pattern where components communicate by emitting and subscribing to events rather than calling each other's functions directly or sharing mutable state. The fundamental inversion is: instead of A calling B.doSomething(), A emits an event "something-happened" and B (along with any other interested parties) subscribes to that event. This decouples the emitter from the consumers — A does not know who is listening, and new listeners can be added without modifying A.

The simplest implementation is a browser EventEmitter or a custom message bus: a singleton pub/sub object with `emit(eventName, payload)`, `on(eventName, handler)`, and `off(eventName, handler)` methods. In React applications, this can be implemented with a simple module-level EventEmitter (mitt, tiny-emitter) or the native browser `EventTarget`. In more structured applications, Redux middleware (redux-saga, redux-observable) implements an event-driven model on top of the action stream: actions are events, middleware consumes them and may dispatch new actions (respond to events with events).

The key benefits over direct coupling: loose coupling enables independent evolution of components (a analytics module can start listening to "checkout-completed" events without modifying the checkout component), testability improves (emit an event and assert on the resulting state without needing the component tree), and multiple subscribers can react to the same event independently (cart clears, analytics fires, email modal triggers — all from one "purchase-completed" event). The Observer pattern is the foundational design pattern; EDA applies it at architectural scale.

The tradeoffs are significant. Event flows are harder to trace than call stacks — when something breaks, you cannot simply follow the call chain. Events can create unexpected coupling through naming (renaming an event breaks all subscribers), and "fire and forget" events make error handling less explicit. Debugging requires tracing event subscriptions, which most DevTools do not surface as clearly as function calls. This is why EDA is appropriate for cross-cutting concerns (analytics, logging, notifications, undo/redo) rather than for primary business logic where explicit data flow (props, returns, state management) is clearer.

Practical use in large frontend applications: a global event bus for cross-feature communication (the checkout feature emits events; the cart, analytics, and promotion features listen), a command bus pattern where user actions are modeled as commands and domain events are produced (aligns with DDD), and integration between loosely coupled microfrontend applications that cannot share state directly. The key architectural guideline: use events for things that "have happened" (past tense, notifications) and use direct calls/state for things that "should happen" (commands). This aligns with CQRS thinking — commands are explicit and directed, events are notifications to any interested party.

### Key Points
- EDA decouples emitters from consumers — emitters do not know who is subscribed, enabling independent evolution of features
- Implement with a simple EventEmitter/pub-sub for lightweight cases, Redux middleware (saga/observable) for structured apps, or custom EventTarget
- Best for cross-cutting concerns (analytics, logging, undo/redo, notifications) where multiple independent parties react to the same event
- Tradeoff: event flows are harder to debug and trace than call stacks; rename events carefully as it is a distributed breaking change
- Design guideline: events describe "what happened" (past tense); for "what should happen," prefer direct calls or commands

### Follow-up Prompts
- How would you implement a cross-microfrontend event bus where multiple independently deployed applications can communicate without sharing a runtime?
- How does Redux's action stream resemble an event bus and what does redux-saga add to make it event-driven?
- How would you add comprehensive event logging/tracing to an event-driven frontend to make debugging tractable?

### Difficulty: advanced
### Tags: architecture, event-driven, pub-sub, EventEmitter, decoupling, Redux, microfrontend

---

## Q12: How Do You Design a Plugin Architecture for Frontend Extensibility?

### Question
Describe how to design a plugin system for a frontend application that allows extending functionality without modifying core code, covering the plugin API contract, discovery, lifecycle hooks, and security considerations.

### Model Answer
A plugin architecture enables third parties (or internal teams) to extend application behavior through well-defined extension points without forking or modifying core code. This is the architecture behind VS Code extensions, Figma plugins, webpack loaders, and ESLint rules. The core design challenge is creating a stable, expressive API surface that is powerful enough to be useful while being narrow enough to evolve the core without breaking plugins.

The plugin contract is defined by the Plugin interface: `{ name: string, version: string, install(app: AppContext): void, uninstall?(): void }`. The `install` method receives the application context — a controlled surface that exposes extension points without exposing internal implementation. The app context API should be explicitly designed (not "pass the whole app") and follow the principle of minimal exposure: expose only what plugins need. Common extension points in a frontend plugin system: `app.registerComponent(name, component)` for UI components, `app.addMenuItem(item)` for navigation, `app.on(event, handler)` for event hooks, `app.registerRoute(path, component)` for new routes, and `app.provideService(name, impl)` for dependency injection into the plugin graph.

Plugin discovery and registration: In a closed system (internal plugins only), plugins are imported and registered at bootstrap: `app.use(AnalyticsPlugin).use(ThemePlugin)`. In an open extension system (third-party plugins like Figma), plugins are loaded dynamically — either from a plugin manifest (URL or package name) or from a marketplace registry. Dynamic loading uses `import()` with the plugin module URL, which must be allowed by CSP's `script-src`. The registry maintains plugin metadata, version information, and dependency declarations.

Lifecycle hooks give plugins control over their initialization and teardown. A robust lifecycle: `beforeInstall()` (validate prerequisites), `install()` (register extensions), `afterInstall()` (run after all plugins are installed, for inter-plugin dependencies), `beforeUninstall()` (cleanup subscriptions, remove registered items), and `uninstall()` (full cleanup). Inter-plugin dependencies are declared in the plugin manifest (`{ dependencies: ['CorePlugin@^2.0'] }`) and the plugin loader resolves them topologically before calling install.

Security is the hardest problem in open plugin systems. Plugins that run arbitrary JavaScript in the same context as the application have full access to the DOM, user data, and network. Figma solves this by running plugin JavaScript in an isolated iframe with a message-passing API — the plugin cannot access the Figma canvas DOM directly, only through the Figma Plugin API which validates all operations. VS Code extensions run in a separate extension host process. For browser-based plugin systems, sandboxing options include: running plugins in same-origin sandboxed iframes (with `postMessage` bridge), running plugins in Web Workers (no DOM access, message-passing only), or using Trusted Types and a strict CSP to limit what plugin code can do. For closed (internal only) plugin systems, the security model can be relaxed.

Version compatibility is the long-term maintenance challenge. The plugin API is a public contract — once published, breaking changes break all plugins. Semantic versioning for the plugin API, with deprecation warnings before removal and a compatibility layer for major version transitions, is required. The API surface should be as small as possible to minimize the compatibility burden.

### Key Points
- Plugin contract: `{ install(app: AppContext) }` with app context exposing explicit extension points (component registry, event hooks, route registration, DI container)
- Lifecycle hooks (beforeInstall, install, afterInstall, uninstall) with topological dependency resolution for inter-plugin ordering
- Security: open plugin systems must sandbox plugins (iframe with postMessage, Web Workers) — same-context plugin execution grants full application access
- Version compatibility: the plugin API is a public contract; minimize surface area and use semantic versioning with deprecation windows
- Discovery: static registration (app.use()) for closed systems, dynamic import() with CSP allowlist for open marketplaces

### Follow-up Prompts
- How does VS Code's extension host architecture isolate extensions from the main editor process and what are the performance implications?
- How would you implement bidirectional communication between a plugin running in a sandboxed iframe and the host application using postMessage?
- How would you handle a plugin that registers a component using a name that conflicts with an existing plugin's component?

### Difficulty: advanced
### Tags: architecture, plugin-system, extensibility, sandboxing, lifecycle, API-design, versioning

---

## Q13: How Do You Architect a Multi-Tenant Frontend Application?

### Question
Describe the architectural considerations for building a multi-tenant frontend — where the same application serves multiple organizations with different branding, features, and configurations — covering tenant resolution, theming, feature flags, and data isolation.

### Model Answer
Multi-tenancy in frontend architecture means a single deployed application serves multiple organizations (tenants), each with potentially different branding, feature sets, configuration, and data. The key architectural decisions are: how to resolve the current tenant, how to apply tenant-specific customizations, how to isolate tenant data, and how to deploy and maintain the application across tenant configurations.

Tenant resolution is the first problem. The tenant must be identified before any application rendering. Common strategies: subdomain-based (`tenant-a.app.com`, `tenant-b.app.com` — the server reads the hostname and responds with tenant context); path-based (`app.com/tenant-a/...` — less common, complicates routing); and header/cookie-based (for authenticated sessions where the JWT contains the tenant ID). Subdomain-based resolution is cleanest. In Next.js, Middleware at the edge reads `request.headers.get('host')`, resolves the tenant ID, and injects it into request headers or redirects to a tenant-specific layout. The tenant context (branding config, feature flags, i18n locale, allowed modules) is fetched early and provided via React Context to the entire application tree.

Theming for multi-tenancy uses CSS custom properties (CSS variables) as the theming layer. The tenant configuration includes a theme object: `{ primaryColor, secondaryColor, fontFamily, logoUrl, borderRadius, ... }`. At application mount, the tenant's theme variables are injected into `:root` (`document.documentElement.style.setProperty('--color-primary', tenant.primaryColor)`). All components reference `var(--color-primary)` rather than hardcoded values. This allows real-time theme changes without re-rendering the component tree. For more complex theming (dark mode, component variants), CSS variable nesting and the cascade provide the mechanism, while a design token system (Style Dictionary, Theo) ensures consistency.

Feature flags in a multi-tenant context are tenant-scoped: Tenant A has the advanced analytics module, Tenant B does not. Feature flags are part of the tenant configuration object fetched at startup. A `useFeatureFlag('advanced-analytics')` hook reads from the tenant context. Components that should only appear for certain tenants are conditionally rendered: `{flags.advancedAnalytics && <AnalyticsModule />}`. For performance, feature-flagged modules should be code-split so tenants without a feature do not download its code. Dynamic `import()` conditioned on the flag, combined with lazy loading, achieves this.

Data isolation is enforced primarily at the API level: all API calls include the tenant identifier (in the JWT, as a header, or in the URL path), and the backend enforces tenant boundaries. The frontend can support this by ensuring all API calls go through a single HTTP client that automatically attaches the tenant ID from context. For client-side caching (React Query, SWR), cache keys must include the tenant ID: `['users', tenantId]` rather than `['users']` — otherwise cached data from one tenant leaks to another if the user switches tenants in the same session.

The deployment model affects architectural decisions. Fully shared infrastructure (one deployment, all tenants): simplest operationally, tenant configuration served from a central registry. Per-tenant deployment (separate Next.js instances per tenant): maximum isolation, but complex to operate at scale. Hybrid (shared application code, per-tenant configuration injected at edge via Middleware): the most common architecture for SaaS products — one Vercel/Cloudflare deployment with per-tenant edge configuration.

### Key Points
- Tenant resolution: subdomain-based resolution in edge Middleware reads hostname, injects tenant context early before rendering
- CSS custom properties injected at mount provide the theming layer without component tree re-renders
- Feature flags are tenant-scoped; feature-flagged modules must be code-split so tenants without access don't download the code
- React Query/SWR cache keys must include tenant ID to prevent cross-tenant data leakage in single-session multi-tenant switching
- Deployment: shared code + edge-injected per-tenant configuration (Middleware + KV store) is the most scalable hybrid approach

### Follow-up Prompts
- How would you implement a "tenant switcher" that allows a user with access to multiple tenants to switch between them without a full page reload?
- How would you handle per-tenant custom components — where Tenant A has a custom dashboard widget that Tenant B does not — using the plugin architecture pattern?
- What are the SEO implications of subdomain-based multi-tenancy and how would you configure robots.txt and sitemaps per tenant?

### Difficulty: advanced
### Tags: architecture, multi-tenant, SaaS, theming, feature-flags, CSS-variables, edge-middleware, data-isolation

---

## Q14: How Do You Architect an Offline-First Frontend Application?

### Question
Describe offline-first architecture for web applications — covering the Service Worker caching strategy, local data storage, sync conflict resolution, and user experience considerations for connectivity changes.

### Model Answer
Offline-first architecture means designing the application to function fully without a network connection and sync changes when connectivity is restored, rather than treating offline as an error state. The architecture requires rethinking data flow: instead of "fetch from server, display," the model becomes "read from local store, display immediately, sync with server in background."

The Service Worker is the foundation for offline capability. It intercepts all network requests and implements a caching strategy. The correct strategy depends on resource type: for static assets (JS, CSS, fonts), use Cache-First (serve from cache immediately, update in background) — these change infrequently and freshness is less critical than speed. For API responses, use Network-First with cache fallback (try the network for freshness, fall back to cache on failure) or Stale-While-Revalidate (serve cached version immediately, fetch update in background). The Workbox library from Google provides a well-tested implementation of all standard caching strategies with good browser compatibility.

Local data storage for offline-first applications requires a capable client-side database. IndexedDB is the standard choice: it supports structured data, indices for querying, transactions, and storage of hundreds of megabytes. Libraries like Dexie.js provide a Promise-based API over IndexedDB's verbose callback API. The local database is the primary data source — the application reads from and writes to IndexedDB, and a sync layer synchronizes changes to/from the server. PouchDB is a complete offline-first database that syncs with CouchDB or compatible backends, handling conflict resolution automatically.

The sync layer is the most complex component. Operations performed offline are stored in an "outbox" queue in IndexedDB. When connectivity is restored (detected via `navigator.onLine` and the `online` event, supplemented by actual fetch probes since `navigator.onLine` can be wrong), the sync layer processes the outbox. Each operation is sent to the server; success removes it from the outbox, failure (server error, not network error) requires error handling and user notification.

Conflict resolution is the hardest problem in offline-first. If the user edits a document offline and another user edits the same document online, both versions must be reconciled. Strategies: Last-Write-Wins (the most recent timestamp wins — simple but can silently discard work); Three-way merge (compare base version, local changes, and remote changes — merge compatible changes, flag conflicts for user resolution); and CRDTs (Conflict-free Replicated Data Types — data structures that merge deterministically without conflicts, used by Figma, Notion, Linear). For most business applications, three-way merge with user-visible conflict prompts is appropriate. For collaborative text, CRDTs (Yjs, Automerge) are the right choice.

User experience for connectivity changes requires clear, non-disruptive communication. A subtle offline indicator (badge or banner) informs users they are offline and that changes are being saved locally. Action buttons should remain active offline (a "Save" button should save to IndexedDB, not wait for network). Background sync progress can be shown when connectivity is restored. The key principle is that the user should never be blocked by network state — they can always continue working, and the application will sync when possible.

### Key Points
- Service Worker caching: Cache-First for static assets, Network-First or Stale-While-Revalidate for API responses; Workbox provides standard strategy implementations
- IndexedDB (via Dexie.js) as the primary local data store; application reads/writes locally first, sync layer handles server synchronization
- Outbox pattern: queue offline operations in IndexedDB, drain queue when `online` event fires with actual connectivity probe
- Conflict resolution strategies: Last-Write-Wins (simple), three-way merge (most apps), CRDTs/Yjs (collaborative text/complex data)
- UX: offline indicator, always-active action buttons (save to local), background sync progress — never block the user on network state

### Follow-up Prompts
- How does the Background Sync API (`SyncManager`) differ from a manual `online` event listener for draining the outbox?
- How would you implement three-way merge for a form with 20 fields where both the user and another party edited different fields offline?
- How do you handle the case where the user's local data is so stale (weeks offline) that server-side data has been restructured incompatibly?

### Difficulty: advanced
### Tags: architecture, offline-first, Service-Worker, IndexedDB, sync, CRDT, conflict-resolution, PWA

---

## Q15: What Are Frontend Platform Team Patterns and Responsibilities?

### Question
Describe what a frontend platform team does, how it differs from product feature teams, what infrastructure and tooling it owns, and how it measures its own success.

### Model Answer
A frontend platform team is an internal engineering team that builds and maintains the shared infrastructure, tooling, and standards that product feature teams use to build user-facing features. The platform team's customers are other engineers, not end users. This distinction shapes everything about how the team operates: its priorities, success metrics, API design philosophy, and relationship with other teams.

The core responsibilities of a frontend platform team typically include: the build system and developer experience (Vite/webpack configuration, build performance, hot module replacement, TypeScript setup, monorepo tooling like Turborepo or Nx); the design system and component library (canonical implementations of shared UI components, tokens, icons, documentation via Storybook); shared infrastructure code (authentication flow, HTTP client with retry/error handling, logging/monitoring SDK, feature flag client); and engineering standards and practices (ESLint/Prettier configs, commit conventions, PR templates, testing utilities).

Developer Experience (DX) is the product of a platform team. Just as a consumer product team measures user satisfaction with NPS, a platform team measures developer satisfaction — how fast is the CI pipeline, how quickly can a new engineer get a local dev environment running, how much time do engineers spend fighting tooling vs. writing features. Metrics: build time (p95 CI pipeline duration), test cycle time (time from code change to test result), local dev startup time, `npm install` time, time-to-first-PR for new hires, and developer satisfaction surveys. These are the "loading time" and "Core Web Vitals" of developer experience.

The platform team's most important work is often invisible: keeping dependencies up to date (preventing "dependency debt" that makes major upgrades painful), maintaining backward compatibility when updating shared APIs, and providing migration tools when breaking changes are necessary. Codemods (using jscodeshift or ast-grep) automate migration of large codebases to new API shapes — rather than asking 50 product engineers to manually update 200 call sites, the platform team writes a codemod that does it automatically. This is the leveraged way to evolve the platform.

The relationship with product teams requires careful boundary management. Platform teams must resist building features that product teams request without a clear platform-level rationale (scope creep). The DRI (Directly Responsible Individual) model assigns ownership: platform team owns the infrastructure; product teams own the features. When a product team needs something the platform does not provide, the path is: RFC (Request for Comment) proposing the addition to the platform, review by the platform team, implementation by either party. The RFC process prevents ad-hoc expansion and ensures all additions are generalized (solving the N team's problem, not just the one team's specific case).

Inner source — treating internal platform repositories with open source practices (public internal repo, PR-based contribution, changelog, semantic versioning, office hours) — scales the platform team's reach beyond their headcount. Product engineers can contribute to the design system or shared utilities via PRs, with platform team members as reviewers. This creates a force multiplier: 5 platform engineers + 50 contributing product engineers effectively maintain the platform at much greater velocity than the core team alone.

### Key Points
- Frontend platform team's customers are engineers, not users; the product is Developer Experience (DX) measured by build time, setup time, and developer satisfaction
- Owns: build system, design system/component library, shared infrastructure code (auth, HTTP client, logging), and engineering standards
- Codemods (jscodeshift, ast-grep) enable automated large-scale migrations, multiplying the platform team's leverage for breaking changes
- RFC process for additions prevents scope creep and ensures platform investments are generalized solutions, not one-team workarounds
- Inner source model (open internal repo, PR-based contribution, office hours) scales platform team impact beyond core headcount

### Follow-up Prompts
- How would you measure and improve the developer experience of a slow CI pipeline that takes 20 minutes per PR?
- What is the process for deprecating a component from the design system when 30 product teams are using it?
- How would you handle a product team that builds their own parallel implementation of a component rather than using the platform's version?

### Difficulty: advanced
### Tags: architecture, platform-team, DX, design-system, build-system, inner-source, RFC, codemod

---

## Q16: How Do You Implement Dependency Injection in Frontend Applications?

### Question
Explain dependency injection (DI) in the frontend context, why it matters for testability and modularity, how to implement it without a DI framework, and when to use a full DI container.

### Model Answer
Dependency injection is a design pattern where a component or module receives its dependencies from outside (injected by a caller or container) rather than creating them internally. The principle is inversion of control: instead of `class UserService { constructor() { this.api = new ApiClient() } }`, the service receives the ApiClient: `class UserService { constructor(api: ApiClient) { this.api = api } }`. The caller (or container) is responsible for wiring dependencies together.

The primary benefit in frontend development is testability. Services with injected dependencies can be tested with mock implementations: `new UserService(mockApiClient)`. Without DI, unit testing `UserService` requires the real `ApiClient` to function, making tests slow, brittle, and coupled to external APIs. With DI, mock the dependency, test only the `UserService` logic. This is the same reason React components accept `onSubmit` as a prop rather than hardcoding an API call — prop injection is DI for UI components.

React's Context API is a form of DI for the component tree. `React.createContext(defaultValue)` creates a container for a dependency; `<Context.Provider value={implementation}>` injects a specific implementation; `useContext(Context)` retrieves the injected value. This is how most frontend DI is done in React applications: `<ApiClientContext.Provider value={realApiClient}>` in production, `<ApiClientContext.Provider value={mockApiClient}>` in tests. Custom hooks that call `useContext` internally make the injection transparent at the consumer level.

Without a formal DI framework, the module pattern combined with factory functions handles DI for non-component code. A service factory: `function createUserService({ api, logger, analytics }: UserServiceDeps): UserService { return { getUser: (id) => api.get('/users/' + id) } }`. Composition roots (the top-level application bootstrap file) wire everything together: `const userService = createUserService({ api: createApiClient(config), logger, analytics })`. This explicit wiring is readable and has no magic — every dependency is traceable from the composition root.

Full DI containers (InversifyJS, TSyringe) use decorators and metadata to automate dependency resolution. `@injectable()` and `@inject()` decorators register and inject dependencies automatically, enabling constructor injection with type-based resolution. These frameworks are valuable in large applications with deep dependency graphs where manual wiring in a composition root becomes unmaintainable (hundreds of services). The cost: decorators require TypeScript's `experimentalDecorators` and `emitDecoratorMetadata`, adding compile-time overhead and a dependency on reflect-metadata. Angular's DI system is the canonical browser-side DI container, fully integrated into the framework.

The right choice for most React applications is Context-based DI for UI component dependencies and factory function composition for service layers. Full DI containers add complexity that is only justified at large scale. The key principle: any time a module creates its own dependencies with `new` or by importing specific implementations, ask whether inverting that dependency would improve testability — if yes, inject it.

### Key Points
- DI inverts control: components receive dependencies from callers rather than creating them, enabling mock injection for testing
- React Context is DI for the component tree — use `createContext` + `Provider` to inject implementations, `useContext` to consume
- Factory functions with explicit dependency parameters are the lightweight DI pattern for services without a container
- Full DI containers (InversifyJS, TSyringe) automate resolution but add decorator/metadata overhead — justified only at large scale
- Composition root: wire all real dependencies at application bootstrap; swap mocks in test setup

### Follow-up Prompts
- How would you use React Context to inject an API client that can be swapped for a mock in tests and a Storybook-compatible stub in the design system?
- How does Angular's hierarchical DI system differ from a flat container, and what does the hierarchy enable for component-level service scoping?
- What is the "service locator" anti-pattern and how does it differ from proper dependency injection?

### Difficulty: advanced
### Tags: architecture, dependency-injection, DI, testability, React-Context, InversifyJS, composition-root

---

## Q17: What is the Frontend RFC Process and Why Does It Matter?

### Question
Describe the Request for Comments (RFC) process as applied to frontend engineering decisions, what types of changes warrant an RFC, how to structure one, and how the process improves technical governance at scale.

### Model Answer
An RFC (Request for Comments) is a structured technical proposal document that describes a significant change, why it is needed, what alternatives were considered, and what the implementation plan is. Borrowed from the IETF's internet standards process and popularized in the software engineering community by projects like Rust, React (Hooks, Concurrent Mode, and Server Components all went through RFCs), and Ember, the RFC process formalizes how major technical decisions are made in engineering organizations.

The RFC process applies to changes that affect multiple teams, establish new patterns, introduce new dependencies, or create precedents that will be hard to reverse. In frontend engineering: adding a new major dependency (switching from webpack to Vite, adopting Zustand instead of Redux), establishing new architectural patterns (moving to Islands Architecture, adopting micro-frontends), significant design system changes (new token system, major component API changes), new engineering standards (adopting a monorepo, changing the TypeScript configuration), and deprecation of widely-used patterns. The test: if the change affects more than your own team's codebase or will be referenced as "how we do things" for years, it warrants an RFC.

A well-structured RFC contains: Summary (1-2 paragraph TL;DR), Motivation (what problem does this solve? why now?), Detailed Design (the specific change proposed, with examples and API designs), Drawbacks (what are the costs, risks, and limitations?), Alternatives (what other approaches were considered and why were they rejected?), Adoption Strategy (how do existing teams migrate? is it a breaking change? codemods provided?), and Unresolved Questions (what is explicitly out of scope or still uncertain). The detailed design section is where the real engineering thinking lives — vague designs that skip to "we should do X" without specifying what X means in practice are the most common RFC failure mode.

The RFC review process: the author opens a PR in a dedicated RFC repository (or a `docs/rfcs/` directory in the monorepo) with a fixed template. A comment period (typically 1-3 weeks) allows stakeholders from all affected teams to raise concerns, propose modifications, and vote. The RFC shepherd (a senior engineer or the platform team lead) synthesizes feedback, facilitates resolution of disagreements, and makes the final acceptance/rejection decision. Accepted RFCs are merged and become the authoritative specification for the change. Rejected RFCs remain in the repository as valuable records of what was considered and why it was not adopted — the "decisions not made" are as important as the decisions made.

The governance benefit of RFCs is that they convert implicit, informal decision-making (a senior engineer decrees the new pattern in a Slack thread) into explicit, documented, reviewable decisions. New engineers can read the RFC to understand why a decision was made — the context and tradeoffs that shaped the current codebase. This reduces "why do we do it this way?" questions and prevents well-intentioned engineers from unknowingly re-introducing rejected approaches. The process also distributes decision authority: by requiring broad review and consensus, it prevents technical monocultures and incorporates diverse perspectives.

### Key Points
- RFC process formalizes significant technical decisions — changes affecting multiple teams, new patterns, new major dependencies, or hard-to-reverse architectural choices
- RFC structure: Summary, Motivation, Detailed Design (with examples), Drawbacks, Alternatives, Adoption Strategy, Unresolved Questions
- Review: time-boxed comment period (1-3 weeks), shepherd synthesizes feedback, explicit accept/reject decision, rejected RFCs retained as historical record
- Governance value: explicit documented rationale for decisions, accessible to new engineers, prevents re-introduction of rejected approaches
- React, Rust, Vue, and Ember all use public RFC processes — studying them provides examples of high-quality technical proposals

### Follow-up Prompts
- How would you write an RFC for migrating a large Next.js application from Pages Router to App Router?
- What is the difference between an RFC and an Architecture Decision Record (ADR) — when would you use each?
- How do you handle RFC fatigue in a fast-moving organization where the process slows down velocity?

### Difficulty: advanced
### Tags: architecture, RFC, governance, technical-decision-making, engineering-process, documentation

---

## Q18: What Are Incremental Migration Strategies for Large Frontend Codebases?

### Question
Describe the strangler fig pattern and other incremental migration strategies for migrating a large legacy frontend to a modern stack without a "big rewrite," including routing strategies, compatibility layers, and risk management.

### Model Answer
Incremental migration allows organizations to move from a legacy frontend (e.g., a jQuery+Backbone application, or a AngularJS monolith) to a modern stack (React, Vue, Next.js) without stopping feature development for a 6-18 month "big rewrite." Big rewrites have a catastrophic failure rate: requirements change during the rewrite, feature parity is never fully achieved, and the rewrite misses months of product improvements. Incremental migration is the industry-standard alternative.

The strangler fig pattern (named after the strangler fig vine that gradually surrounds and replaces a host tree) works by routing new functionality to the new system while the legacy system handles remaining functionality. At the HTTP routing layer (nginx, Vercel rewrites, Next.js Middleware), specific URL prefixes or pages are routed to the new application while everything else goes to the legacy application. New pages are built in React/Next.js; existing pages remain in the legacy system. Over time, more routes migrate until the legacy system handles nothing and can be removed.

The critical enabler is a shared routing boundary. In nginx: `location /new-feature/ { proxy_pass http://nextjs-server; } location / { proxy_pass http://legacy-server; }`. In a monorepo with both legacy and new application code, a single deployment can serve both. Vercel's rewrites configuration enables route-level migration in a Next.js application that proxies unmatched routes to the legacy backend. The user perceives a single application because the routing is transparent.

Compatibility layers bridge the gap during the transition. If the legacy and new applications share users (session state, authentication), they must share the same cookie/session mechanism. This often means aligning the session model between the two systems — a non-trivial but critical integration point. Shared component libraries in a design system ensure visual consistency: React components used in the new system must visually match legacy jQuery components for the same UI element. Navigation between legacy and new pages must be seamless — a React Router link navigating to a legacy page must trigger a full page navigation, which React Router achieves with a regular `<a>` tag rather than a React Router `<Link>`.

Risk management for incremental migration: feature flags control which users see the new implementation (canary release — 1% first, then 10%, then 100%). This limits the blast radius of bugs. A/B testing the new vs. legacy implementations using the same metrics validates that the new implementation maintains or improves conversion and engagement. Automated visual regression testing (Chromatic, Percy) catches UI discrepancies between legacy and new implementations.

The hardest part of incremental migration is often organizational: maintaining momentum over 12-24 months while shipping new features in parallel. Tracking migration progress visibly (a dashboard showing % of routes migrated, legacy code deleted), celebrating milestones (first major route migrated, legacy dependency removed), and ensuring the migration is funded continuously (not de-prioritized every quarter) are as important as the technical strategy. A dedicated "migration task force" with explicit resourcing, rather than asking product teams to squeeze migration into feature delivery cycles, is the organizational pattern that correlates with successful large-scale migrations.

### Key Points
- Strangler fig pattern: route new pages/features to the new system via HTTP routing layer; legacy system handles remaining routes until fully replaced
- Shared routing boundary (nginx proxy, Vercel rewrites, Next.js Middleware) enables transparent coexistence of legacy and new systems
- Compatibility layers: shared session/auth mechanism, design system components for visual consistency, correct navigation types (Router Link vs anchor) between systems
- Risk management: feature flags + canary release for new implementations; visual regression testing for UI parity; metrics validation (conversion, engagement)
- Organizational: visible migration dashboard, dedicated resourcing, milestone celebration — momentum over 12-24 months is as important as the technical approach

### Follow-up Prompts
- How would you migrate a React class component codebase to React hooks incrementally without rewriting all components at once?
- How does the "branch by abstraction" technique differ from the strangler fig and when would you use it for a frontend migration?
- How would you migrate a large Redux codebase to Zustand incrementally while both state systems coexist in the same application?

### Difficulty: advanced
### Tags: architecture, strangler-fig, migration, legacy, incremental, routing, risk-management, organizational

---

## Q19: How Do Modern Build Systems Like esbuild, Vite, and Turbopack Work Internally?

### Question
Explain the architectural differences between webpack, esbuild, Vite, and Turbopack — covering their bundling strategies, module resolution, HMR implementation, and why native-speed tools dramatically outperform webpack for large codebases.

### Model Answer
Build system architecture has undergone a fundamental shift from single-threaded JavaScript-based bundlers (webpack) to native-speed tools (esbuild in Go, Turbopack in Rust) and unbundled dev servers (Vite). Understanding the architectural differences explains the 10-100x speed differences reported by large teams.

Webpack's architecture is a JavaScript single-threaded dependency graph walker. It starts from entry points, parses each module using a loader chain (babel-loader for JS/TS, css-loader, file-loader etc.), builds a dependency graph by analyzing `require`/`import` calls, applies plugins at each lifecycle hook (hundreds of them — the webpack plugin API is extremely powerful), and finally serializes the graph into output chunks. The key bottleneck: everything runs in Node.js on a single thread. Parsing TypeScript with ts-loader or babel-loader is expensive because these transformers are written in JavaScript and run synchronously. Large projects with thousands of modules spend significant time in parsing and transformation even with caching.

esbuild (by Evan Wallace) achieves 10-100x speed improvements over webpack through three architectural decisions: written in Go (compiled native code vs. JavaScript runtime overhead), fully parallelized (parsing, transformation, and linking all run in parallel across all CPU cores), and implements its own TypeScript and JSX parser in Go (no Babel dependency). esbuild's limitation is that it implements a subset of the transform pipeline — it does not support every webpack plugin or loader. It is not suitable as a direct webpack replacement for complex setups, but excels as a transformation engine embedded in other tools (Vite uses esbuild for development transformation).

Vite's architecture separates development and production. In development, Vite does not bundle at all — it serves ES modules directly to the browser using the browser's native `import` support. The browser sends individual module requests; Vite's dev server transforms each file on demand (using esbuild for TS/JSX transformation) and responds. This means cold start time is near-instant (no upfront bundling) and HMR is surgical (only the changed module is re-transformed and sent). The tradeoff: many HTTP requests for deep dependency trees (hundreds of requests for node_modules) — Vite mitigates this by pre-bundling dependencies into single ESM files using esbuild on first run. For production, Vite uses Rollup (JS bundler) for well-optimized output with tree-shaking and code splitting.

Turbopack (by Vercel, written in Rust) is the next evolution — a native-speed bundler with a persistent caching architecture. Its key innovation is a demand-driven computation model: it only computes what is requested (the minimal set of modules needed for the current route/page) and caches the computation graph with fine-grained invalidation. When a file changes, only the computations that directly depend on that file are invalidated and re-executed. This is similar to how build systems like Bazel work. Turbopack claims to be 10x faster than Vite for large applications by combining native speed (Rust) with incremental computation.

HMR (Hot Module Replacement) implementation differs across tools. webpack's HMR works via the webpack runtime injected into bundles, which maintains a WebSocket connection to the dev server and replaces module exports in-place when updates arrive. Vite's HMR uses ESM-native hot updates — the dev server sends a WebSocket message with the URL of the changed module; the browser fetches the new module directly. React Fast Refresh (for component state-preserving HMR) integrates with both webpack (react-refresh/webpack) and Vite (vite-plugin-react) by tracking component identity and selectively re-rendering without state loss.

### Key Points
- webpack: JS single-threaded dependency graph walker, highly configurable via plugins but slow due to JS runtime and sequential processing
- esbuild: Go-native, fully parallelized, 10-100x faster transformation — best as a transformation engine embedded in other tools, not a webpack drop-in replacement
- Vite: unbundled dev server serving native ESM + esbuild on-demand transformation; Rollup for production — near-instant cold start, surgical HMR
- Turbopack: Rust-native with demand-driven incremental computation and fine-grained cache invalidation — fastest for large apps with deep dependency graphs
- HMR: webpack uses runtime module replacement; Vite uses ESM native module fetch; React Fast Refresh adds component state preservation on top of both

### Follow-up Prompts
- What is "pre-bundling" in Vite and why is it necessary for npm packages even in an unbundled dev server model?
- How does Turbopack's persistent cache survive process restarts and what are the cache invalidation triggers?
- When would you choose to keep webpack over Vite/esbuild for a new project in 2024?

### Difficulty: advanced
### Tags: architecture, build-systems, webpack, esbuild, Vite, Turbopack, HMR, bundling, performance

---

## Q20: How Do You Govern Frontend Architecture at Scale?

### Question
Describe how to govern frontend architecture across a large engineering organization with multiple teams — covering standards enforcement, architectural fitness functions, dependency management, tech debt tracking, and balancing consistency with team autonomy.

### Model Answer
Frontend governance at scale is the set of processes, tools, and cultural norms that ensure a large engineering organization's frontend codebase evolves in a coherent direction without requiring centralized control over every decision. The challenge is balancing consistency (teams need to collaborate, share code, and onboard across codebases) with autonomy (teams move faster when empowered to make local decisions without approval gates).

Architectural fitness functions (from "Building Evolutionary Architectures" by Ford, Parsons, Kua) are automated tests that verify architectural properties continuously. Examples: a CI check that fails if any new `import` from a feature module imports from another feature module's internal implementation (enforcing bounded contexts); a bundle size budget check that fails builds exceeding a threshold; a "no circular dependencies" check using madge; an import restriction ESLint rule (`eslint-plugin-import` with `no-restricted-imports`) that enforces layering (presentation layer cannot import from infrastructure layer directly). These convert architectural rules from documentation into enforced constraints — the architecture degrades only if a human explicitly removes the constraint.

Dependency governance is critical at scale. Uncoordinated dependency updates create version fragmentation: Team A uses React 17, Team B uses React 18, and shared components built for React 18 break Team A's builds. A "golden path" dependency manifest maintained by the platform team specifies the approved versions of major shared dependencies. Teams on the monorepo share one version (enforced by the package manager); teams on separate repositories are nudged (not forced) to stay current via automated PRs (Renovate Bot or Dependabot with a custom configuration that aligns on the golden path). Regular "dependency health" reports surfacing teams on significantly old versions enable targeted assistance.

Tech debt tracking requires making debt visible and quantifiable. Architectural debt indicators: circular dependency count (madge), code coverage trend (decreasing over time is a warning), average module size (growing modules violate cohesion), "forbidden pattern" ESLint rule violation counts (tracked over time), and the ratio of RFC-compliant to non-RFC-compliant architectural decisions made each quarter. These metrics in a dashboard make the invisible visible — leadership can see debt accumulating and make informed prioritization decisions.

The governance model spectrum: full centralization (platform team approves all architectural changes — bottleneck, resentment) vs. full federation (each team decides independently — fragmentation, inconsistency). The successful model for large organizations is "Paved Road with Guardrails": the platform team builds an opinionated but optional blessed path (the paved road — generators, templates, shared config) that makes doing the right thing easiest. Guardrails (fitness functions, linting rules) enforce critical constraints but leave latitude within those constraints. Teams that need to go off the paved road can, but they accept owning the maintenance of their divergence. The key cultural norm: the paved road is maintained, divergences are not. Teams quickly learn to prefer the maintained path.

Architecture Decision Records (ADRs) document significant architectural decisions at the team level — below the RFC threshold but above individual implementation details. `docs/architecture/adr-001-use-zustand-for-state.md` captures: the context, the decision, and the consequences. ADRs are kept with the codebase, not in a separate wiki that goes stale. New team members read the ADR log to understand the decisions that shaped the codebase. Regular "ADR Review" sessions (quarterly) evaluate whether old decisions still hold, deprecating outdated ADRs and creating new ones as context evolves.

### Key Points
- Architectural fitness functions automate enforcement of architectural properties in CI (circular dependency checks, bundle budgets, import restrictions) — rules that degrade only by human override
- Golden path dependency manifest maintained by platform team prevents version fragmentation; Renovate Bot automates alignment PRs
- Make tech debt visible with metrics (circular dependencies, coverage trend, module size, forbidden pattern counts) surfaced in a leadership dashboard
- "Paved Road with Guardrails" governance model: platform builds the blessed path, fitness functions enforce critical constraints, teams can diverge but own maintenance of divergences
- ADRs document team-level architectural decisions with the codebase — below RFC threshold, above implementation detail — reviewed quarterly for relevance

### Follow-up Prompts
- How would you implement an ESLint rule that enforces bounded context isolation — preventing direct imports between feature modules?
- How do you handle the situation where a team needs to make an architectural decision urgently and the RFC process timeline is too slow?
- What is Conway's Law and how does it suggest organizing engineering teams to produce the frontend architecture you want?

### Difficulty: advanced
### Tags: architecture, governance, fitness-functions, ADR, RFC, tech-debt, platform-team, Conway-Law, paved-road

---
