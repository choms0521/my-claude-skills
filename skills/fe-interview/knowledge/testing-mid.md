# Testing - Mid Interview Questions
### Language: en

## Q1: Unit Testing Fundamentals with Jest/Vitest

### Question
What are the core principles of unit testing, and what are the key differences between Jest and Vitest?

### Model Answer
Unit testing is the practice of testing individual functions, modules, or components in isolation from their dependencies. A good unit test verifies a single behavior, runs fast (milliseconds), is deterministic (same result every run), and does not depend on external systems like databases, networks, or the file system. The "unit" is the smallest testable piece of logic in your application.

Jest has been the dominant testing framework in the JavaScript ecosystem for years. It is built by Meta and comes with a test runner, assertion library, mocking capabilities, and code coverage reporting bundled together. Jest uses a custom module resolver and transform pipeline (typically via Babel or ts-jest for TypeScript) to handle imports. It runs each test file in an isolated Node.js worker process, which provides strong isolation but has a startup cost.

Vitest is a newer testing framework built by the Vite team. Its primary advantage is that it reuses your Vite configuration — including plugins, module resolution, and transforms — eliminating the need to maintain a separate transpilation pipeline for tests. Vitest is significantly faster for projects already using Vite because it can leverage Vite's native ESM support and HMR-based watch mode. Vitest's API is intentionally compatible with Jest, so migration requires minimal changes.

The key differences: Jest requires a separate Babel/TypeScript transform configuration, while Vitest inherits from Vite's config. Vitest runs tests in Vite's dev server context, enabling faster module resolution and better ESM support. Jest has more battle-tested plugins and broader community adoption, especially in React projects using Create React App or older toolchains. For new projects using Vite or those prioritizing test speed, Vitest is typically the better choice.

Both frameworks share the same fundamental API: `describe` for grouping, `it`/`test` for individual cases, `expect` for assertions, and `beforeEach`/`afterEach`/`beforeAll`/`afterAll` for setup and teardown. Assertions use a chainable API — `expect(value).toBe(expected)`, `expect(arr).toHaveLength(3)`, `expect(fn).toThrow()`.

### Key Points
- Unit tests verify single behaviors in isolation, run in milliseconds, and must be deterministic
- Jest is the battle-tested standard with a full bundled toolchain but requires separate transform config
- Vitest reuses Vite config for zero-overhead integration, with a Jest-compatible API
- Both share the same `describe`/`it`/`expect`/`beforeEach` API surface
- Isolation is provided by running each file in a separate worker process (Jest) or Vite worker (Vitest)

### Follow-up Prompts
- How do you configure TypeScript support in Jest versus Vitest, and what are the trade-offs?
- What is the difference between `toBe` and `toEqual` in assertions?
- How do you run only a subset of tests in a large test suite for faster iteration?

### Difficulty: intermediate
### Tags: testing, jest, vitest, unit-testing, javascript

---

## Q2: React Testing Library Best Practices

### Question
What are the core principles of React Testing Library, and what practices lead to tests that are resilient and meaningful?

### Model Answer
React Testing Library (RTL) is built around the philosophy that tests should resemble how users interact with your application. Rather than testing implementation details (component state, internal methods, class names), RTL encourages testing behavior and output — what the user sees and can interact with. The guiding principle is: "The more your tests resemble the way your software is used, the more confidence they can give you."

The query priority hierarchy is central to RTL's philosophy. Queries are ordered from most to least preferred: `getByRole` (accessible role — most preferred), `getByLabelText` (form labels), `getByPlaceholderText`, `getByText` (visible text), `getByDisplayValue`, `getByAltText`, `getByTitle`, and finally `getByTestId` (least preferred). This ordering encourages you to query elements the way screen readers and users would find them, which simultaneously verifies accessibility.

Avoiding implementation detail testing is the most important practice. This means not querying by class names, not accessing component state directly, not testing internal function calls, and not using `wrapper.instance()`. If your test breaks when you refactor the component without changing its behavior, it is testing implementation details. A good test only breaks when observable behavior changes.

The `userEvent` library (from `@testing-library/user-event`) should be preferred over `fireEvent` for simulating user interactions. `userEvent` simulates real browser events more faithfully — for example, `userEvent.type` fires `keydown`, `keypress`, `input`, and `keyup` events in sequence, just like a real keyboard interaction. `fireEvent.change` fires only the change event, which may not trigger all the behavior your component relies on.

Async testing requires `waitFor`, `findBy` queries, or `findAllBy` queries for elements that appear after asynchronous operations. Wrapping assertions in `waitFor` retries the assertion until it passes or times out. Always `await` these calls and avoid arbitrary `setTimeout` delays in tests. After each test, RTL cleans up the rendered component automatically, but you should avoid persisting mutable state between tests via module-level variables.

### Key Points
- Tests should verify observable behavior, not implementation details like state or class names
- Query priority: prefer `getByRole` and `getByLabelText` over `getByTestId` for better accessibility alignment
- Use `userEvent` over `fireEvent` for more realistic interaction simulation
- Use `findBy` queries or `waitFor` for async elements; never use `setTimeout` in tests
- Good tests only fail when user-visible behavior changes, not when internals are refactored

### Follow-up Prompts
- How do you test a component that makes an API call on mount without calling the real API?
- When is it acceptable to use `getByTestId`, and what naming conventions should you follow?
- How do you test that a component correctly handles an error state from a failed API call?

### Difficulty: intermediate
### Tags: testing, react-testing-library, rtl, react, best-practices

---

## Q3: Mocking Strategies

### Question
What are the different mocking strategies in Jest/Vitest — module mocks, API mocks, timer mocks — and when should you use each?

### Model Answer
Mocking is the practice of replacing real dependencies with controlled substitutes during testing. The goal is to isolate the unit under test, make tests deterministic, and avoid side effects like network requests, database writes, or timer delays. Choosing the right mocking strategy depends on what you are trying to isolate.

Module mocking replaces an entire module or specific exports with a mock implementation. In Jest, `jest.mock('./module')` auto-mocks the module (replacing all exports with `jest.fn()`). You can provide a factory function for custom implementations: `jest.mock('./api', () => ({ fetchUser: jest.fn().mockResolvedValue({ id: 1 }) }))`. Vitest uses `vi.mock()` with the same API. Module mocks are hoisted to the top of the file by the transpiler, so they apply before any imports — a behavior that can be surprising when mocking modules that other modules import at initialization time.

API mocking at the HTTP level is preferable to module-mocking your API client because it tests the actual request-making code path. The most popular tool for this is Mock Service Worker (MSW), which intercepts `fetch` and XHR requests at the service worker level in browsers and via node interceptors in tests. MSW lets you define request handlers that return mock responses, giving you full control over response data, status codes, headers, and timing while keeping your API client code unchanged.

Timer mocks replace `setTimeout`, `setInterval`, `Date.now`, and related functions with controllable fakes. `jest.useFakeTimers()` / `vi.useFakeTimers()` installs fake timers, and then `jest.advanceTimersByTime(1000)` or `jest.runAllTimers()` advances time programmatically without waiting. This is essential for testing debounced functions, polling logic, retry mechanisms, or any code that depends on time passing. Always restore real timers in `afterEach` to avoid test pollution.

For function mocking, `jest.fn()` creates a spy function that records calls, arguments, and return values. You can configure it with `.mockReturnValue()`, `.mockResolvedValue()` (for Promises), `.mockImplementation()`, or `.mockImplementationOnce()` for per-call behavior. `jest.spyOn(object, 'method')` wraps an existing method, allowing you to observe calls while optionally overriding the implementation, and it can be restored with `.mockRestore()`.

### Key Points
- Module mocks replace entire modules; use for third-party libraries, database clients, or utilities with side effects
- MSW is preferred for HTTP API mocking as it intercepts at the network level without changing application code
- Fake timers control `setTimeout`/`setInterval` programmatically; always restore them in `afterEach`
- `jest.fn()` creates call-recording spy functions; `jest.spyOn()` wraps existing methods
- Prefer mocking at the lowest level possible — mock the network, not the function that calls the network

### Follow-up Prompts
- How do you reset mocks between tests to prevent state leakage?
- What is the difference between `mockReturnValue` and `mockImplementation`, and when would you use each?
- How does Mock Service Worker work in a Node.js test environment versus a browser environment?

### Difficulty: intermediate
### Tags: testing, mocking, jest, vitest, msw, timers

---

## Q4: Testing React Hooks

### Question
How do you test custom React hooks, and what tools and patterns make hook testing effective?

### Model Answer
Custom React hooks can only be called inside a React component, which creates a challenge for unit testing them in isolation. The `renderHook` utility from `@testing-library/react` solves this by creating a minimal test component that calls the hook and exposes its return value. You call `renderHook(() => useMyHook(args))` and receive a `result` object whose `current` property always reflects the latest return value of the hook.

For hooks that update state or trigger effects, you must wrap state-changing calls in `act()`. The `act` function ensures that all pending state updates, effects, and re-renders are processed before you make assertions. `renderHook` wraps its initial render in `act` automatically, but subsequent interactions (calling functions returned by the hook) need explicit `act` wrapping. When using `userEvent` from `@testing-library/user-event`, `act` wrapping is handled internally.

Testing hooks that accept props uses the `initialProps` option and the `rerender` function. For example: `const { result, rerender } = renderHook(({ id }) => useUser(id), { initialProps: { id: 1 } })` lets you later call `rerender({ id: 2 })` to test that the hook responds correctly to prop changes. This is important for testing hooks that trigger new data fetches when an ID changes.

Hooks with side effects like `useEffect` for data fetching require careful async handling. If a hook calls `fetch` or sets state asynchronously, you use `waitFor` to wait for the expected state. For example: `await waitFor(() => expect(result.current.data).toBeDefined())`. Without `waitFor`, you would assert before the async operation completes and get a false failure.

Context-dependent hooks need a wrapper component that provides the context. The `renderHook` options accept a `wrapper` prop: `renderHook(() => useTheme(), { wrapper: ThemeProvider })`. This is cleaner than creating test components manually. For hooks with multiple dependencies, you can compose wrappers or create a single `AllProviders` wrapper that includes all necessary contexts.

### Key Points
- `renderHook` from `@testing-library/react` creates a minimal test harness for hooks
- `result.current` reflects the hook's latest return value after any re-renders
- Wrap state-changing calls in `act()` to flush all pending React updates before asserting
- Use `waitFor` for async state updates; use `rerender` to test prop changes
- Context-dependent hooks need a `wrapper` provider in `renderHook` options

### Follow-up Prompts
- How do you test a hook that sets up a subscription (like a WebSocket) and cleans it up on unmount?
- What is the difference between testing a hook with `renderHook` versus testing it indirectly through a component?
- How do you test a hook that uses `useReducer` with complex state transitions?

### Difficulty: intermediate
### Tags: testing, react-hooks, renderHook, react-testing-library, custom-hooks

---

## Q5: Snapshot Testing Pros and Cons

### Question
What is snapshot testing, when is it useful, and what are its limitations and common pitfalls?

### Model Answer
Snapshot testing works by rendering a component or serializing a value on the first run and saving the output to a `.snap` file. On subsequent runs, the output is compared against the saved snapshot. If they differ, the test fails. You update the snapshot with `jest --updateSnapshot` when the change is intentional.

The main appeal of snapshot testing is that it requires almost no setup — one line of `expect(component).toMatchSnapshot()` creates a comprehensive assertion covering all rendered output. It is particularly useful for catching accidental changes to component output, detecting unexpected prop behavior, and documenting the expected rendered structure.

The most significant pitfall is that snapshots are only as meaningful as the code that generates them. If a developer accidentally introduces a bug that changes the rendered output and then updates the snapshot, the test now documents incorrect behavior. Snapshot updates become a reflex — "tests failing, just update snapshots" — which defeats the purpose of testing. Large snapshots are especially problematic because it is difficult to review what changed in a code review.

Snapshot tests also couple tightly to implementation. If you restructure a component (change a `div` to a `section`, reorder class names, rename a CSS module) without changing user-visible behavior, all snapshots for that component fail and require updating. This creates noise and erodes trust in the test suite.

Better alternatives for most snapshot use cases: use explicit assertions for specific output (`expect(screen.getByRole('heading')).toHaveTextContent('Welcome')`), use inline snapshots for small, meaningful outputs (`toMatchInlineSnapshot`), or use visual regression testing tools (Chromatic, Percy) for visual appearance verification. Reserve snapshot testing for stable, rarely-changing outputs like serialized API response shapes, styled-component class hashes, or complex configuration objects where a full equality check is genuinely useful.

### Key Points
- Snapshot tests capture and compare serialized output; fail when any detail changes
- Useful for detecting accidental changes; low setup cost
- Major pitfall: developers update snapshots reflexively, documenting bugs rather than catching them
- Large snapshots are unreviewed and provide false confidence; they couple tests to implementation details
- Prefer explicit assertions or inline snapshots for most cases; reserve snapshots for stable serialized outputs

### Follow-up Prompts
- When would you choose `toMatchInlineSnapshot` over `toMatchSnapshot`, and what are the trade-offs?
- How do you prevent snapshot tests from becoming a maintenance burden in a large team?
- How does visual regression testing differ from component snapshot testing?

### Difficulty: intermediate
### Tags: testing, snapshot-testing, jest, react, best-practices

---

## Q6: Code Coverage Metrics

### Question
What are the different types of code coverage metrics — line, branch, function, statement — and how should you interpret and use coverage data effectively?

### Model Answer
Code coverage measures how much of your source code is exercised by your test suite. Jest and Vitest both integrate with Istanbul (nyc) for coverage collection. There are four primary metrics, each measuring a different dimension of coverage.

Statement coverage counts the percentage of executable statements that were executed by tests. A statement is a single instruction like a variable assignment, function call, or return. Line coverage is similar but counts lines rather than statements; one line can contain multiple statements (e.g., `const x = a ? b : c`), so statement coverage is generally more precise. These are the most basic metrics.

Branch coverage tracks whether every branch of every conditional has been executed. For an `if/else`, branch coverage requires tests that hit both the `if` path and the `else` path. For a ternary `a ? b : c`, both the true and false cases must be executed. For a short-circuit `a && b()`, the case where `a` is falsy (and `b()` is not called) is a separate branch. Branch coverage is more meaningful than line coverage because high line coverage can mask untested conditional paths.

Function coverage simply tracks whether each function (including arrow functions and methods) has been called at all during tests. It is a coarser metric — a function might be called but with only one of several input scenarios tested. 100% function coverage does not mean the function's logic is thoroughly tested.

Coverage thresholds should be enforced in CI but treated as a floor, not a goal. A 80-90% coverage target is common, but 100% coverage is often not worth pursuing — some code is genuinely hard to test (error handlers for impossible states, platform-specific branches) and the effort to cover the last 10% may not provide proportional value. More important than the number is the quality of what is covered: a test suite with 60% coverage of meaningful behavior scenarios is more valuable than 95% coverage achieved through shallow assertions.

Coverage reports identify untested code but do not tell you whether the tests that do exist are good. High coverage with weak assertions (always passes regardless of output) is a false positive. Use coverage as a signal for finding gaps, not as a measure of test quality.

### Key Points
- Statement/line coverage: percentage of executable lines/statements executed; basic but foundational
- Branch coverage: verifies both sides of every conditional; more meaningful than line coverage
- Function coverage: confirms each function is called at least once; coarse-grained
- Treat coverage thresholds as a floor (80-90% typical), not a target to maximize
- High coverage with weak assertions is misleading; coverage measures quantity, not quality

### Follow-up Prompts
- How do you configure coverage thresholds in Jest/Vitest to fail the CI build when coverage drops?
- What does it mean when you have 100% line coverage but your tests still miss important bugs?
- How do you handle coverage for code that should never be reached (defensive error handling)?

### Difficulty: intermediate
### Tags: testing, code-coverage, jest, vitest, istanbul, ci

---

## Q7: Test Doubles - Stub, Mock, Spy, Fake

### Question
What is the difference between stubs, mocks, spies, and fakes in testing? When should you use each?

### Model Answer
Test doubles is the umbrella term (coined by Gerard Meszaros in "xUnit Test Patterns") for any object that stands in for a real dependency during testing. The four main types have distinct purposes and behaviors, though the terms are often used loosely in practice.

A stub provides pre-programmed responses to calls made during the test. It does not verify how it was called — it simply returns the configured value when invoked. Stubs are used when you need a dependency to return specific data so your unit under test can proceed. For example, a stub for a user repository might always return `{ id: 1, name: 'Alice' }` so the service can process the user without needing a real database. In Jest/Vitest, `jest.fn().mockReturnValue(value)` creates a stub.

A mock is a pre-programmed object that also has expectations — it verifies that it was called in a specific way (with specific arguments, a specific number of times, in a specific order). If the expected calls do not happen, the test fails. Mocks are assertion objects — the verification happens on the mock itself, not via `expect` on a separate value. Jest's `toHaveBeenCalledWith` and `toHaveBeenCalledTimes` matchers are how you write mock assertions.

A spy wraps a real object's method, recording all calls to it while still executing the real implementation by default. This lets you verify interactions without changing behavior. `jest.spyOn(console, 'error')` is a classic example — it lets you assert that an error was logged without suppressing the actual logging. Spies can optionally override the implementation with `.mockImplementation()`.

A fake is a working, simplified implementation of a real dependency. Unlike stubs and mocks which return hardcoded values, fakes have actual logic — they just use simpler or in-memory mechanisms. An in-memory SQLite database used instead of a real PostgreSQL database during tests is a fake. An in-memory key-value store used instead of Redis is a fake. Fakes are more realistic than stubs, making tests more trustworthy, but require more maintenance.

The practical guideline: use stubs when you need a dependency to return data; use mocks when you need to verify that a side effect was triggered (email sent, event published); use spies when you want to observe calls without changing behavior; use fakes when a real implementation would be too slow or complex but you need behavioral correctness.

### Key Points
- Stub: returns pre-configured values; no call verification; used to supply dependency data
- Mock: has built-in expectations; verifies that calls were made with specific arguments/counts
- Spy: wraps real implementation; records calls; can optionally override behavior
- Fake: working simplified implementation (e.g., in-memory database); more realistic than stubs
- Jest/Vitest's `jest.fn()` can act as stub or mock depending on how you use it with matchers

### Follow-up Prompts
- How do you test that a function was called exactly once with specific arguments using Jest?
- When is it better to use a fake (like an in-memory database) versus a mock for testing data access?
- What are the risks of over-mocking and how does it affect test confidence?

### Difficulty: intermediate
### Tags: testing, test-doubles, mocks, stubs, spies, fakes, jest

---

## Q8: Testing Async Code

### Question
What are the patterns and pitfalls for testing asynchronous code in JavaScript — Promises, async/await, and callbacks?

### Model Answer
Asynchronous code is one of the most common sources of flaky tests and false positives. The core rule is that your test must wait for all asynchronous operations to complete before making assertions. If you forget to await an async operation, the test may pass before the operation resolves, then fail or produce side effects in subsequent tests.

For Promise-based code, you can return the Promise from the test function and Jest/Vitest will wait for it to resolve or reject. With async/await syntax, marking the test function with `async` and using `await` before async calls is cleaner and more readable: `it('fetches a user', async () => { const user = await fetchUser(1); expect(user.name).toBe('Alice'); })`.

Testing rejected Promises requires special handling. If you use `expect(promise).rejects.toThrow()` or `expect(promise).rejects.toMatchObject({ message: 'Not found' })`, you must `await` it: `await expect(fetchUser(999)).rejects.toThrow('Not found')`. Without the `await`, the assertion returns a Promise that is never awaited, and a rejection might go undetected or surface as an unhandled rejection in a later test.

The `done` callback is the legacy pattern for testing callbacks. Jest passes a `done` function as the test's first argument; you call `done()` when the async work is complete or `done(error)` to fail the test. This pattern is error-prone — if you forget to call `done`, the test times out. The async/await pattern is strongly preferred for all new tests. For existing callback APIs, you can promisify them with `util.promisify` or wrap them in a `new Promise()` before testing.

For React components that trigger async operations, `@testing-library/react`'s `waitFor` utility retries an assertion callback until it passes or times out (default 1000ms). `findBy*` queries are syntactic sugar for `waitFor(() => getBy*(...))`. Avoid using `waitFor` around the entire test or with assertions that should be synchronous — use it only for the specific parts that are async. Overusing `waitFor` masks synchronous errors and makes test failures harder to diagnose.

### Key Points
- Always `await` async operations in tests; un-awaited Promises silently pass and create test pollution
- Use `async/await` pattern for tests; avoid the legacy `done` callback pattern
- `await expect(promise).rejects.toThrow()` tests rejected Promises — the outer `await` is required
- `waitFor` retries assertions until they pass; `findBy*` queries are shorthand for waitFor+getBy
- Never use `setTimeout` delays in tests to "wait" for async work; use `waitFor` or `findBy` instead

### Follow-up Prompts
- How do you test a function that uses `setTimeout` to delay an operation without waiting for real time?
- What is the cause of "act() warning" in React tests and how do you fix it properly?
- How do you handle race conditions in tests where multiple async operations run concurrently?

### Difficulty: intermediate
### Tags: testing, async, promises, async-await, react-testing-library, waitFor

---

## Q9: Component Integration Testing

### Question
What is component integration testing, how does it differ from unit and E2E testing, and what makes a good integration test?

### Model Answer
Component integration testing sits between unit tests (testing a single function or component in isolation) and E2E tests (testing complete user flows through the full stack). Integration tests verify that multiple components, hooks, and services work correctly together, without requiring a real browser or backend server. They test the composition and interaction of real code rather than mocked internals.

The distinction from unit tests is that integration tests render real component trees, including child components, rather than mocking them. If you are testing a `ProductPage` component, a unit test might mock the `ProductCard` and `ReviewSection` child components. An integration test renders the full tree and verifies that `ProductPage` correctly passes data to `ProductCard` and that `ReviewSection` shows the right content based on the page's state.

The distinction from E2E tests is that integration tests still mock the network layer (using MSW or similar) and run in a jsdom environment rather than a real browser. They do not test actual network requests, real database state, or browser-specific APIs. This makes them much faster than E2E tests (hundreds of milliseconds vs. seconds) while still providing more confidence than unit tests.

A good integration test follows a user scenario: render the component tree in a realistic state, perform actions a user would take (click a button, fill a form), and assert on the visible outcome. For example: render a login form, fill in credentials, click submit, mock the auth API to return a success response, and assert that the user is redirected to the dashboard. This test covers the form component, the submit handler, the API service, the routing logic, and the success UI — all in one test.

The risk with integration tests is that they can become too broad and slow to be useful as fast feedback. Keep them focused on a specific user journey or feature flow. They should run in CI in under 30 seconds per file. If a test becomes slow or complex, consider whether it should be an E2E test instead, or broken into more focused integration tests with better mocking at the boundaries.

### Key Points
- Integration tests render real component trees (no child mocking) but mock the network layer
- Faster than E2E (jsdom, no real browser) but higher confidence than unit tests (real composition tested)
- Follow user scenarios: render, act, assert on visible behavior across the full component tree
- MSW is the preferred tool for network mocking at the integration test level
- Keep tests focused on specific user journeys; avoid tests that are so broad they become slow and fragile

### Follow-up Prompts
- How do you set up MSW in a test environment to intercept API calls in integration tests?
- When should you promote an integration test to an E2E test?
- How do you handle authentication state in integration tests without logging in through the real auth flow each time?

### Difficulty: intermediate
### Tags: testing, integration-testing, react-testing-library, msw, component-testing

---

## Q10: E2E Testing Basics with Playwright and Cypress

### Question
What are the fundamentals of E2E testing with Playwright and Cypress? What are their key differences and how do you structure effective E2E tests?

### Model Answer
End-to-end (E2E) tests verify complete user journeys by controlling a real browser and interacting with a real or staging backend. They are the highest-confidence test type — they validate that your entire stack (frontend, API, database) works together as the user experiences it. The trade-off is that they are slower (seconds to minutes per test), more expensive to run, and more brittle due to network latency, timing issues, and environment dependencies.

Playwright and Cypress are the two dominant tools. Playwright, created by Microsoft, supports Chromium, Firefox, and WebKit (Safari's engine) from a single test suite. It runs tests out-of-process — the test code and the browser are separate processes communicating via WebSocket. This makes Playwright more versatile and capable of testing multiple tabs, browser contexts, and cross-origin scenarios.

Cypress runs in-process inside the browser, which gives it exceptional developer experience — real-time test execution, time-travel debugging via snapshots, and automatic waiting for elements. However, Cypress's in-process model limits multi-tab testing, cross-origin navigation, and non-Chromium browser support (Firefox is supported but WebKit is not). Cypress is generally easier for beginners; Playwright is more powerful for complex scenarios.

Both tools use automatic waiting by default — they retry finding elements and assertions until they succeed or time out. This eliminates most timing-related flakiness that plagued older Selenium-based tests. Instead of arbitrary `sleep` calls, you query for elements that indicate the async operation completed (a success message, a list of results, a redirect).

Effective E2E tests focus on critical user paths — login, checkout, core feature workflows — rather than exhaustive permutation testing. They should use realistic data (not hardcoded literals), reset state between test runs (clean database, clear cookies), and be independent of each other (no test should depend on another test's side effects). Page Object Model (POM) is a common pattern for organizing selectors and interactions behind reusable classes, reducing duplication when page structure changes.

### Key Points
- E2E tests use a real browser against a real or staging stack; highest confidence, highest cost
- Playwright supports all major browsers including WebKit; Cypress is Chromium-focused with better DX
- Both tools implement automatic waiting — no `sleep` calls needed; query for outcome indicators instead
- Focus E2E tests on critical user journeys, not exhaustive coverage; reserve that for unit/integration tests
- Tests must be independent and idempotent; reset state between runs to prevent cascading failures

### Follow-up Prompts
- How do you handle authentication in E2E tests without going through the full login flow in every test?
- What is the Page Object Model pattern and what problems does it solve in large E2E test suites?
- How do you run E2E tests in CI without a running backend — do you use a staging environment or a test server?

### Difficulty: intermediate
### Tags: testing, e2e, playwright, cypress, end-to-end, browser-testing

---
