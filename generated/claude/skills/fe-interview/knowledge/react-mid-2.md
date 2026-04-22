# React - Mid Interview Questions (Part 2)
### Language: en

## Q11: What is the render props pattern and when would you use it?

### Question
Explain the render props pattern in React. How does it work, what problem does it solve, and when is it still relevant today?

### Model Answer
The render props pattern is a technique for sharing stateful logic between React components by passing a function as a prop — the function receives data from the component and returns JSX. The component with the shared logic calls this function during its render, allowing the consumer to control what gets rendered with the shared data.

A classic example is a `MouseTracker` component that tracks cursor position. Instead of hardcoding what to render with the coordinates, it accepts a `render` prop (or uses `children` as a function): `<MouseTracker render={({ x, y }) => <Cursor x={x} y={y} />} />`. The `MouseTracker` manages the event listeners and state, while the consumer decides the visual output. Any component that needs mouse coordinates can reuse `MouseTracker` with different render outputs.

The pattern solves the same code-reuse problem as HOCs (Higher-Order Components) but with different trade-offs. Render props are explicit about where data comes from — the data flows through the function argument, making it clear what a component provides. HOCs inject props implicitly, which can cause prop name collisions and makes the source of props less obvious. Render props also allow dynamic behavior: the function is called on every render, so it can react to the current state naturally.

However, render props have downsides. They can cause "callback hell" when nested: multiple render prop components nested inside each other create deeply indented, hard-to-read code. They can also create performance issues because a new function is created on every parent render — each call to the render prop causes the consumer to re-render unless carefully memoized.

Today, custom hooks are the preferred way to share stateful logic. A custom `useMouseTracker` hook gives you the same x/y values with much simpler syntax. Render props are still relevant in two situations: when you need to expose slot-based rendering in a component library (compound components), and when working in class component codebases that cannot use hooks.

### Key Points
- A function passed as a prop that the component calls with its internal state/data to produce JSX
- Shares stateful logic without using HOCs or duplicating code
- More explicit than HOCs — data source is visible in the function argument
- Nesting multiple render prop components creates "callback hell" and readability issues
- Largely superseded by custom hooks for logic sharing, but still valid for slot/composition patterns

### Follow-up Prompts
- How would you convert a render prop component into a custom hook?
- What are the performance implications of passing an inline arrow function as a render prop?
- Can you use the children prop as a render prop? Show an example.

### Difficulty: intermediate
### Tags: render-props, patterns, code-reuse, hoc

---

## Q12: What is the Higher-Order Component (HOC) pattern?

### Question
Explain Higher-Order Components in React. What problem do they solve, how do you implement one, and what are the pitfalls?

### Model Answer
A Higher-Order Component is a function that takes a component and returns a new, enhanced component. It is a pattern derived from higher-order functions in functional programming. HOCs allow you to abstract cross-cutting concerns — like authentication checks, logging, data fetching, or feature flags — into reusable wrappers that can be applied to any component.

The implementation follows a consistent shape: `const withEnhancement = (WrappedComponent) => { return function Enhanced(props) { /* add logic */ return <WrappedComponent {...props} extraProp={value} /> } }`. The HOC adds behavior (side effects, additional props, conditional rendering) and then renders the original component, passing through all original props using the spread operator. This is the "transparent wrapper" convention.

HOCs are powerful for concerns like authentication (`withAuth` redirects to login if not authenticated), theming (`withTheme` injects the current theme as a prop), data loading (`withData(url)` fetches data and passes it as props), and analytics (wrapping components to log when they mount). Libraries like React Redux's `connect()` and React Router's `withRouter()` are classic HOC examples.

The pitfalls are significant. HOCs create wrapper components that inflate the React DevTools component tree, making debugging harder. They can cause prop name collisions when multiple HOCs inject props with the same name. They must be careful to forward refs — a HOC that does not use `React.forwardRef` will swallow refs meant for the inner component. Static methods on the wrapped component are not automatically copied to the HOC wrapper (the `hoist-non-react-statics` library solves this). HOCs applied at the module level (outside the component) are fine, but HOCs created inside render functions create new component types on every render, breaking reconciliation.

Custom hooks have largely replaced HOCs for logic sharing because they avoid these pitfalls. However, HOCs are still useful when you genuinely need to wrap a component's JSX output (not just inject logic), when working with class components, or when a library API specifically expects HOCs.

### Key Points
- HOC: `(Component) => EnhancedComponent` — wraps a component to inject behavior or props
- Must spread original props through: `<WrappedComponent {...props} />` for transparency
- Common pitfalls: prop name collisions, ref forwarding, static method loss, DevTools wrapper inflation
- Never create HOCs inside render functions — creates new component types causing remounts
- Custom hooks are preferred for logic sharing; HOCs still valid for JSX-level wrapping

### Follow-up Prompts
- How do you forward refs through a Higher-Order Component?
- What happens if you apply a HOC inside a render function instead of at the module level?
- How does React Redux's `connect()` HOC differ from a simple HOC that injects props?

### Difficulty: intermediate
### Tags: hoc, higher-order-components, patterns, code-reuse

---

## Q13: What is the compound component pattern?

### Question
Explain the compound component pattern in React. How is it implemented and what makes it preferable to alternative approaches for complex UI components?

### Model Answer
The compound component pattern is a way to build complex UI components that share implicit state while giving the consumer declarative control over composition. Instead of a single component with many configuration props, you expose a set of sub-components that work together. The classic example is an HTML `<select>` with `<option>` children — the consumer specifies what options exist without needing to configure the select's dropdown behavior.

Implementation uses React Context to share state between the parent and its child sub-components. The parent component manages state (e.g., which tab is active) and provides it through context. The child sub-components (like `Tabs.List`, `Tabs.Tab`, `Tabs.Panel`) consume that context to render correctly without receiving any explicit props from the consumer. The parent component is typically the context provider, and the sub-components are attached as static properties: `Tabs.List = TabList`, `Tabs.Tab = Tab`, `Tabs.Panel = TabPanel`.

The usage reads like declarative HTML: `<Tabs defaultTab="a"><Tabs.List><Tabs.Tab id="a">Alpha</Tabs.Tab></Tabs.List><Tabs.Panel id="a">...</Tabs.Panel></Tabs>`. The consumer controls the structure and content; the compound component manages the behavior. Contrast this with a monolithic API: `<Tabs tabs={[{id: 'a', label: 'Alpha', content: '...'}]} />` — this is inflexible and requires the component to accept every possible configuration.

The pattern's key advantages are flexibility and expressiveness. Consumers can add custom elements between sub-components, rearrange them, apply conditional rendering, or replace individual parts without the parent needing to anticipate these variations. This makes compound components particularly well-suited for design systems and UI libraries where consumers have diverse layout needs.

The main downside is that sub-components must be direct or nested children of the parent context provider. If a sub-component is rendered outside the parent, the context will be undefined. You should add a guard in each sub-component to throw a useful error if the required context is missing: `if (!ctx) throw new Error('Tab must be used within Tabs')`.

### Key Points
- Shares state implicitly through Context between a parent and its child sub-components
- Consumer gets declarative control over composition and layout
- Sub-components are attached as static properties on the parent: `Component.SubPart = SubPart`
- Guard against usage outside provider by checking context and throwing a clear error
- Ideal for UI library components: Tabs, Accordion, Select, Menu, Modal with flexible slots

### Follow-up Prompts
- How do you handle the case where a sub-component is used outside its parent compound component?
- How would you add TypeScript types to a compound component that uses Context?
- What is the difference between compound components and the render props pattern?

### Difficulty: intermediate
### Tags: compound-components, context, design-patterns, ui-components

---

## Q14: What are headless components and why are they useful?

### Question
What are headless components (or headless UI)? Explain the concept, its benefits, and give examples of where this pattern is used.

### Model Answer
Headless components are components that provide behavior, accessibility, and state management with zero default styling or visual output. They handle the complex logic of interactive UI patterns — keyboard navigation, ARIA attributes, focus management, event handling — while delegating all visual rendering to the consumer. The name "headless" means the component has no visible "head" (appearance) of its own.

The core idea is separating concerns: logic and accessibility are hard to get right, while styling is subjective and varies per project. A headless dropdown handles: opening/closing on trigger click, keyboard navigation (arrow keys, Enter, Escape), ARIA roles (`role="listbox"`, `aria-expanded`, `aria-activedescendant`), focus trapping, and outside-click detection. The consumer simply wraps their desired HTML elements with the headless component's provided props. There is no className to override, no CSS specificity battle, and no `!important` required.

Libraries like Headless UI (from Tailwind Labs), Radix UI, and React Aria implement this pattern extensively. Radix UI's `<Select.Root>`, `<Select.Trigger>`, `<Select.Content>` give you a fully accessible, keyboard-navigable select component that you style entirely yourself. This is also why they pair naturally with Tailwind CSS — you apply utility classes to your own HTML elements without fighting the component's built-in styles.

In custom hooks, the headless pattern manifests as hooks that return props objects. For example, a `useButton` hook might return `{ role: 'button', tabIndex: 0, onKeyDown, onClick, 'aria-pressed': pressed }` — you spread these onto whatever element you want to act as a button. This is the approach React Aria from Adobe takes.

Headless components solve "the impossible customization problem" that plagues traditional component libraries. Traditional libraries like Material UI or Bootstrap give you a styled button, and overriding its styles requires fighting CSS specificity or using styled-components overrides. Headless components solve this by having no styles to fight. The trade-off is that the consumer must do all the styling work, which is more effort but yields complete control.

### Key Points
- Headless components provide behavior and accessibility without any visual styling
- Consumer renders their own HTML/JSX using provided props/render functions from the headless component
- Solves the "impossible customization" problem of heavily styled component libraries
- Popular libraries: Headless UI, Radix UI, React Aria, Downshift
- Often implemented as hooks that return prop objects to spread onto elements

### Follow-up Prompts
- How does Radix UI implement headless components differently from Headless UI by Tailwind Labs?
- What accessibility concerns does a headless combobox need to handle?
- How would you build a headless toggle button component using a custom hook?

### Difficulty: intermediate
### Tags: headless-components, accessibility, ui-patterns, design-systems

---

## Q15: What is React Query (TanStack Query) and what problems does it solve?

### Question
Explain React Query (now TanStack Query). What problems does it solve, and how does it differ from managing server state with useState/useEffect?

### Model Answer
TanStack Query (formerly React Query) is a server-state management library for React. It handles fetching, caching, synchronizing, and updating asynchronous data from servers or any async source. It addresses a category of state called "server state" — data that lives on the server and must be fetched, kept in sync, and invalidated when it changes — which `useState` and `useEffect` handle poorly at scale.

The core problem with `useState`/`useEffect` for data fetching is that it requires reimplementing the same concerns every time: loading state, error state, race condition prevention, cache management, refetch-on-focus, retry logic, and stale data handling. A typical data fetching pattern with `useEffect` has at least 15 lines of boilerplate per query and still gets race conditions wrong (setting state after a component unmounts, not canceling outdated requests).

TanStack Query replaces all of this with `useQuery`: `const { data, isLoading, error } = useQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id) })`. The `queryKey` is the cache key — queries with the same key share cached data across the entire application. Behind the scenes, TanStack Query handles deduplication (multiple components using the same query key make only one network request), background refetching (when the window regains focus or network reconnects), stale-while-revalidate (shows cached data immediately while fetching fresh data), and automatic retry on failure.

For mutations (creating, updating, deleting data), `useMutation` provides `mutate` and `mutateAsync` functions along with callbacks (`onSuccess`, `onError`, `onSettled`). After a successful mutation, you typically call `queryClient.invalidateQueries({ queryKey: ['user'] })` to tell TanStack Query to refetch all queries starting with `['user']`, ensuring UI consistency.

The most significant architectural benefit is that server state is no longer scattered across component-level `useState` calls. Any component can subscribe to a query and gets the cached data instantly without prop drilling or a global store. This eliminates entire categories of bugs: stale data after mutations, redundant network requests, missing loading/error states, and race conditions.

### Key Points
- Manages server state: fetching, caching, background sync, and invalidation
- `useQuery({ queryKey, queryFn })` replaces useState/useEffect data fetching with automatic caching and deduplication
- `useMutation` handles write operations with `onSuccess`/`onError` callbacks and cache invalidation
- Provides stale-while-revalidate, refetch-on-focus, automatic retry out of the box
- Separates server state (remote, async) from client state (local, synchronous) — do not use Redux for server data

### Follow-up Prompts
- How does TanStack Query prevent race conditions in data fetching?
- What is the difference between stale time and cache time (gcTime) in TanStack Query?
- How would you implement optimistic updates with useMutation?

### Difficulty: intermediate
### Tags: react-query, tanstack-query, server-state, data-fetching, caching

---

## Q16: What is Zustand and how does it compare to Redux?

### Question
Explain Zustand as a state management solution. How does it work, and what are its advantages over Redux for mid-sized applications?

### Model Answer
Zustand is a minimal, unopinionated global state management library for React. It creates a store using a single `create` function and exposes state and actions through a hook. The entire setup can be done in a few lines: `const useStore = create((set) => ({ count: 0, increment: () => set(state => ({ count: state.count + 1 })) }))`. Components subscribe to slices of the store: `const count = useStore(state => state.count)` — the component only re-renders when `count` changes, not when unrelated store state changes.

The key architectural difference from Redux is that Zustand has minimal boilerplate. Redux requires defining action type constants, action creators, reducers, and connecting components with `connect` or `useSelector`/`useDispatch`. Even with Redux Toolkit (which significantly reduces Redux boilerplate), a feature requires a slice file with `createSlice`, and the store must be configured with `configureStore` and wrapped in a `<Provider>`. Zustand requires none of this — no Provider, no actions separated from state, no reducers as a mandatory pattern.

Zustand uses a subscription model outside of React's rendering cycle by default. The store is a plain JavaScript object that can be accessed and modified outside of components — useful for updating state in response to WebSocket events, integrating with non-React code, or calling actions from utility functions. Redux also supports this with `store.dispatch` and `store.getState`, but Zustand makes it more ergonomic.

Zustand handles derived state elegantly through selectors. You pass a selector function to the hook: `const fullName = useStore(state => state.firstName + ' ' + state.lastName)`. By default, Zustand uses strict equality to determine if the selected value changed. For object selectors, you use the shallow equality option: `useStore(state => ({ a: state.a, b: state.b }), shallow)`.

For a mid-sized application with modest state management needs — shared auth state, UI preferences, shopping cart — Zustand is often the better choice due to less boilerplate and faster onboarding. Redux shines at very large scale with time-travel debugging (Redux DevTools), strict unidirectional data flow enforcement, and team conventions that benefit from Redux's explicit patterns.

### Key Points
- `create((set, get) => ({ state, actions }))` creates a store; `useStore(selector)` subscribes components
- No Provider wrapper required — store is created outside React
- No boilerplate: state and actions live together, no separate action types or reducers
- Components only re-render when their selected slice of state changes
- Redux preferred for large teams needing strict patterns and time-travel debugging; Zustand for simpler setups

### Follow-up Prompts
- How do you persist Zustand state to localStorage?
- What is the `immer` middleware in Zustand and when would you use it?
- How does Zustand compare to Jotai or Recoil's atomic model?

### Difficulty: intermediate
### Tags: zustand, state-management, redux, global-state

---

## Q17: How do you test async components in React?

### Question
What are the best practices for testing React components that perform asynchronous operations like data fetching or timers? What tools and patterns do you use?

### Model Answer
Testing async React components requires handling two challenges: waiting for async operations to complete before asserting, and controlling or mocking the async operations themselves. The React Testing Library (RTL) is the standard tool, and it provides utilities specifically designed for async testing.

For components that fetch data, you should mock the network layer rather than making real requests. The most common approach is using `msw` (Mock Service Worker), which intercepts requests at the network level and returns mock responses. This is more realistic than mocking fetch directly because it tests the full data flow including your fetching logic. You set up handlers in a `beforeAll` block, use `server.resetHandlers()` in `afterEach`, and `server.close()` in `afterAll`.

RTL's `waitFor` utility polls an assertion until it passes or times out. When your component shows a loading state and then renders data, you write: `const heading = await waitFor(() => screen.getByText('User Name'))`. The `findBy*` queries are syntactic sugar for `waitFor` + `getBy*`: `const heading = await screen.findByText('User Name')` is equivalent and preferred for simple cases.

For timer-based async behavior (debouncing, polling, animations), Jest's fake timers let you control time: `jest.useFakeTimers()` in `beforeEach`, then `act(() => jest.advanceTimersByTime(500))` to advance time without waiting in real-time. Always wrap timer advances in `act()` to flush React state updates that result from the timer firing.

A common mistake is forgetting to `await` RTL queries or not wrapping state updates in `act()`. React Testing Library wraps most of its async utilities in `act()` automatically, but if you interact with the component outside RTL's utilities (e.g., directly calling a function that triggers state updates), you may need explicit `act()` wrapping. RTL prints a warning when state updates happen outside `act()`.

For components using React Query or SWR, wrap your test render in the library's query client provider and configure it with no retries (`retry: false`) and immediate stale time to avoid flaky tests from retry/caching behavior.

### Key Points
- Mock the network layer with `msw` for realistic, maintainable async tests
- Use `findBy*` queries or `waitFor()` to wait for async UI changes before asserting
- Use Jest fake timers + `act()` for timer-based async behavior
- Configure React Query/SWR with `retry: false` in tests to prevent flakiness
- Wrap state updates triggered outside RTL utilities in `act()` to avoid warnings

### Follow-up Prompts
- What is the difference between `waitFor` and `waitForElementToBeRemoved`?
- How do you test error states in a component that fetches data?
- Why is it better to use msw over mocking `fetch` directly?

### Difficulty: intermediate
### Tags: testing, react-testing-library, async, msw, jest

---

## Q18: What is React 18's automatic batching and how does it differ from React 17?

### Question
Explain automatic batching in React 18. What changed from React 17, and how does batching affect component rendering performance?

### Model Answer
Batching is React's optimization of grouping multiple state updates into a single re-render. Instead of re-rendering the component after each individual `setState` call, React collects all state updates that happen synchronously in the same event handler and applies them together in one render. This has been in React since the beginning, but prior to React 18 it only worked in React event handlers.

In React 17, if you called multiple state setters inside a `setTimeout`, a native event listener, a Promise callback, or any async operation, each `setState` triggered its own separate re-render. For example, in a fetch callback: `setData(result); setLoading(false);` — this caused two renders instead of one. The workaround was to use `unstable_batchedUpdates` from `react-dom` to manually opt into batching in these contexts.

React 18 introduced automatic batching, which extends batching to all contexts — including `setTimeout`, `Promise.then`, native event listeners, and any other async context. Now `setData(result); setLoading(false);` inside a fetch callback causes exactly one re-render, without any manual wrapping. This is a significant performance improvement for applications with complex async state updates.

The improvement is automatically applied to all applications using React 18's new root API: `ReactDOM.createRoot(container).render(<App />)`. Applications using the legacy `ReactDOM.render()` get React 17 behavior even with React 18 installed — this is a deliberate migration path.

If you genuinely need to opt out of batching for a specific case (which is rare), you can use `flushSync` from `react-dom`: `flushSync(() => setCount(c + 1))` forces synchronous state application and re-render before the next line executes. This is useful when you need to read the DOM immediately after a state update, such as measuring element dimensions after making it visible.

### Key Points
- Batching groups multiple state updates into a single re-render for performance
- React 17: batching only in React event handlers — async contexts (setTimeout, Promise) caused multiple renders
- React 18: automatic batching in ALL contexts including async, with no code changes required
- Requires `ReactDOM.createRoot()` (new root API) — legacy `ReactDOM.render()` keeps old behavior
- `flushSync()` opts out of batching when you need synchronous DOM updates

### Follow-up Prompts
- When would you actually need to use `flushSync`? Give a real-world example.
- How does automatic batching interact with `useReducer` dispatch calls?
- Does automatic batching affect Context value updates?

### Difficulty: intermediate
### Tags: react-18, batching, performance, concurrent-react, flushsync

---

## Q19: What is the useId hook and what problem does it solve?

### Question
Explain the `useId` hook introduced in React 18. What problem does it solve, and how does it differ from other approaches to generating unique IDs?

### Model Answer
`useId` is a React 18 hook that generates a unique, stable identifier that is consistent between the server and client renders. It solves the problem of associating HTML form elements with their labels, and connecting ARIA attributes like `aria-describedby` to their targets, without generating IDs that cause hydration mismatches in server-rendered applications.

The HTML accessibility model relies heavily on IDs. A `<label>` must reference an `<input>` via the `htmlFor`/`id` pair. ARIA attributes like `aria-labelledby`, `aria-describedby`, and `aria-controls` reference elements by ID. Without unique IDs, multiple instances of the same form component on a page would have duplicate IDs, breaking accessibility. The ID must be the same on both server and client for hydration to succeed.

Before `useId`, common approaches were using `Math.random()` (generates different values on server vs client, causing hydration errors), using a module-level counter with `useState` (does not reset between server renders, breaks with concurrent rendering), or using libraries like `uuid` (same hydration problem as Math.random). None of these are reliably safe for SSR.

`useId` generates IDs using React's component tree position, encoded in a deterministic format (like `:r0:`, `:r1:`). Because the tree position is the same on server and client (assuming the same tree structure), the IDs match, preventing hydration mismatches. The IDs are also guaranteed unique across component instances — two `<FormField>` components in the same app get different IDs.

Usage: `const id = useId(); return <><label htmlFor={id}>Name</label><input id={id} /></>`. For multiple related IDs (e.g., input + error message), prefix the base ID: `const inputId = id + '-input'` and `const errorId = id + '-error'`. Do not use `useId` for list keys — it is not a substitute for data-driven keys and is not stable across dynamic list changes.

### Key Points
- Generates unique, SSR-safe IDs that match between server and client renders
- Solves accessibility: stable IDs for `htmlFor`/`id` pairing and ARIA attributes in reusable components
- ID is based on component's tree position — deterministic across server and client
- Multiple instances of the same component each get unique IDs
- Do NOT use for list rendering keys — use data-derived IDs (like `item.id`) for keys instead

### Follow-up Prompts
- Why does using `Math.random()` for IDs cause hydration errors in SSR applications?
- How would you generate multiple related IDs from a single `useId` call?
- Can you use `useId` outside of a component or in a regular JavaScript function?

### Difficulty: intermediate
### Tags: use-id, react-18, accessibility, ssr, hydration

---

## Q20: What is useSyncExternalStore and when would you use it?

### Question
Explain the `useSyncExternalStore` hook. What problem does it solve, and in what scenarios would you use it?

### Model Answer
`useSyncExternalStore` is a React 18 hook designed for subscribing to external stores — any data source outside of React's state system. It was introduced to replace the previous pattern of using `useState` + `useEffect` for reading from external stores, which has a subtle but critical bug in React 18's concurrent mode called "tearing."

Tearing is when different components read different values from the same external store during a single render pass. In React 18, concurrent mode can pause and resume rendering, meaning the store might change value in the middle of a render. If component A reads the store at the beginning of a render and component B reads it after the store updates, they see different values — the UI "tears." `useSyncExternalStore` prevents this by ensuring all components read a consistent snapshot of the store's value during each render.

The hook takes three arguments: a `subscribe` function (called with a callback that React fires when the store changes, returns an unsubscribe function), a `getSnapshot` function (returns the current store value), and an optional `getServerSnapshot` for SSR. React uses `getSnapshot` to read the current value and `subscribe` to know when to re-render.

The primary consumers of this hook are state management library authors — Redux's `useSelector`, Zustand's `useStore`, and similar hooks use `useSyncExternalStore` internally. If you are building a custom integration with a browser API (like `window.matchMedia`, `navigator.onLine`, the browser's history API, or any third-party observable/event emitter), `useSyncExternalStore` is the correct primitive to use.

A practical example is a network status hook: `useSyncExternalStore(subscribe, () => navigator.onLine)` where `subscribe` adds a listener to the `online`/`offline` events. Without `useSyncExternalStore`, the equivalent `useState`/`useEffect` approach could cause tearing and also has the "first render" problem where the effect runs after the initial render (missing the initial value).

### Key Points
- Subscribes React components to external data stores outside React's state system
- Prevents "tearing" in React 18 concurrent mode — ensures consistent read during each render pass
- API: `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)`
- Used internally by Redux, Zustand, and other state libraries to ensure concurrent-mode safety
- Use for browser APIs (matchMedia, online/offline, history) or any third-party observable

### Follow-up Prompts
- What is "tearing" in React concurrent mode and why does it matter?
- How would you use `useSyncExternalStore` to build a hook that tracks the browser's online/offline status?
- Why is `getSnapshot` required to return a stable reference (or primitive) to avoid infinite loops?

### Difficulty: intermediate
### Tags: use-sync-external-store, react-18, concurrent-mode, external-store, tearing

---
