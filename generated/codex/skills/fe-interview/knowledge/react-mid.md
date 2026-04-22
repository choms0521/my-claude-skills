# React - Mid-Level Interview Questions
### Language: en

## Q1: What are custom hooks and how do you design them?

### Question
Explain what custom hooks are, when you should extract logic into a custom hook, and what makes a well-designed custom hook.

### Model Answer
Custom hooks are JavaScript functions whose names start with "use" and that can call other hooks inside them. They are the primary mechanism for reusing stateful logic across multiple components in React. Before hooks, patterns like higher-order components (HOCs) and render props were used for this purpose, but they added nesting complexity. Custom hooks let you extract common logic without changing the component hierarchy.

You should extract logic into a custom hook when the same combination of state and effects appears in two or more components, or when a component's logic becomes complex enough that separating concerns improves readability. Good candidates include: fetching data from an API, subscribing to browser events (resize, scroll), managing form state, implementing debounce or throttle behavior, reading from localStorage, and handling WebSocket connections.

A well-designed custom hook follows several principles. First, it should have a focused, single responsibility — `useFetchUser` is better than `useEverythingAboutTheUserPage`. Second, it should expose a clear and minimal API. If you're returning many values, consider returning an object instead of an array so callers can destructure what they need by name. Third, it should accept configuration through parameters rather than hardcoding assumptions.

```js
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => { if (!cancelled) setData(data); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}
```

Custom hooks can also compose other custom hooks, building a layered abstraction. The rule of hooks (only call hooks at the top level, only call hooks from React functions or custom hooks) applies inside custom hooks just as in components.

### Key Points
- Custom hooks are functions starting with "use" that encapsulate and reuse stateful logic across components
- Extract to a custom hook when the same state+effect pattern appears in 2+ places or when component logic is too complex
- Return an object (not an array) for hooks that expose multiple values so callers can destructure by name
- Custom hooks compose naturally — a hook can call other hooks
- All rules of hooks (top-level calls, only inside React functions) apply within custom hooks

### Follow-up Prompts
- How would you test a custom hook that uses useEffect and state?
- What is the difference between a custom hook and a utility function?
- How do you handle cleanup in a custom hook that sets up subscriptions or timers?

### Difficulty: intermediate
### Tags: custom-hooks, reusability, hooks-composition, abstraction

---

## Q2: How do useCallback and useMemo optimize performance?

### Question
Explain `useCallback` and `useMemo`, when they should be used, and what the trade-offs are. Why is premature memoization sometimes worse than no memoization?

### Model Answer
`useMemo` memoizes the result of a computation, recomputing it only when its dependencies change. `useCallback` memoizes a function reference, returning the same function object between renders unless its dependencies change. Both hooks exist to help maintain referential equality across renders, which matters for performance in specific scenarios.

Without memoization, every render creates new object and function references. This is usually fine, but becomes a problem in two cases: (1) when a child component wrapped in `React.memo` receives a new function or object reference as a prop on every parent render, causing the memo to break and the child to re-render unnecessarily; and (2) when a dependency array (in `useEffect`, `useCallback`, or `useMemo`) includes a function or object created inline, causing infinite re-runs.

```js
// Without useCallback, handleSubmit is a new function every render
// If passed to a React.memo child, the child re-renders on every parent render
const handleSubmit = useCallback((data) => {
  submitForm(data);
}, [submitForm]); // only changes if submitForm changes
```

```js
// Without useMemo, this expensive calculation runs on every render
const sortedList = useMemo(() => {
  return [...items].sort(expensiveComparator);
}, [items]); // only recalculates when items changes
```

The trade-off is that memoization has a cost: React must store the previous value, compare dependencies, and decide whether to recompute. For cheap computations and frequently changing dependencies, this overhead can exceed the savings. Memoization also increases code complexity and can make bugs harder to diagnose (stale closures become more likely).

Premature memoization is harmful because: it adds complexity for no benefit when the child doesn't use `React.memo`, when the dependency array changes on every render anyway, or when the computation is so fast that the memoization overhead is larger. The React team's guidance is to profile first — use React DevTools Profiler to identify actual performance problems before reaching for `useCallback` and `useMemo`.

A practical rule: use `useCallback` primarily when passing callbacks to optimized child components (wrapped in `React.memo`) or to `useEffect` dependency arrays. Use `useMemo` for truly expensive computations and for creating stable object references passed to memoized children.

### Key Points
- `useCallback` memoizes a function reference; `useMemo` memoizes a computed value
- They are useful when maintaining referential equality for React.memo children or stable values in dependency arrays
- Both have their own overhead — memoizing cheap computations or frequently-changing dependencies can make things worse
- Profile with React DevTools Profiler before adding memoization; don't optimize prematurely
- Overusing these hooks increases code complexity and risk of stale closure bugs

### Follow-up Prompts
- When would a child component wrapped in `React.memo` still re-render despite using `useCallback` for the callback prop?
- How do you decide whether a computation is "expensive enough" to warrant useMemo?
- What is the "referential equality" problem and why does it matter in React's rendering model?

### Difficulty: intermediate
### Tags: useCallback, useMemo, performance, memoization, React.memo

---

## Q3: Context API vs. external state management — when do you use each?

### Question
Compare React's built-in Context API with external state management libraries like Redux, Zustand, or Jotai. What are the limitations of Context and when does it make sense to reach for a library?

### Model Answer
React's Context API is a built-in mechanism for sharing values (data and functions) across the component tree without prop drilling. It is ideal for low-frequency, global values that don't change often: the current authenticated user, theme, locale/language settings, and feature flags. Context was not designed to be a high-performance state manager for frequently changing data — it is a dependency injection mechanism.

The core limitation of Context for state management is its re-render behavior. Any component that consumes a context via `useContext` will re-render whenever the context value changes, even if that component only cares about a small slice of the value. If you store `{ user, cart, theme, notifications }` in a single context and the notification count updates, every component consuming that context re-renders — including those that only display the theme. Splitting contexts by domain mitigates this but adds boilerplate and doesn't solve the fundamental issue for high-frequency updates.

External state management libraries address these problems with selective subscription: components can subscribe to specific slices of state and only re-render when those slices change. Redux uses selectors for this; Zustand and Jotai are built around this principle natively. Libraries also provide dev tools for time-travel debugging, middleware for side effects (Redux Thunk, Redux Saga), and a clear pattern for handling complex state transitions.

Redux (with Redux Toolkit) is appropriate for large applications with complex state transitions, many developers who benefit from explicit patterns and conventions, or applications needing robust debugging tools. Zustand is a lighter alternative — minimal API, no boilerplate, works outside React components, and is excellent for medium-sized apps or when you want fine-grained subscriptions without Redux's ceremony. Jotai takes an atomic approach (similar to Recoil) where state is composed of small atoms, which works well for highly granular state with many interdependencies.

A practical heuristic: if your state changes infrequently and you have fewer than ~5 consumers, use Context. If state changes frequently or has many consumers, or if you need middleware and dev tools, use a library. Many production apps use both — Context for stable configuration, Zustand/Redux for dynamic application state.

### Key Points
- Context is a dependency injection tool, not a high-performance state manager — every consumer re-renders on any value change
- Split contexts by domain to reduce re-render scope, but this doesn't solve high-frequency update problems
- External libraries (Redux, Zustand, Jotai) provide selective subscriptions: components only re-render when their subscribed slice changes
- Redux Toolkit reduces Redux boilerplate; Zustand offers minimal API; Jotai uses atomic, granular state
- A common pattern: Context for stable global config, external state manager for dynamic data

### Follow-up Prompts
- How would you implement selective subscriptions with the Context API to reduce unnecessary re-renders?
- What is Redux's "normalized state" pattern and why is it recommended for entity collections?
- How does Zustand's approach to subscriptions differ from React's useContext?

### Difficulty: intermediate
### Tags: context-api, state-management, redux, zustand, jotai, performance

---

## Q4: Explain React Router patterns for navigation and route management.

### Question
Describe the core concepts of React Router v6, including nested routes, dynamic segments, protected routes, and navigation programmatically.

### Model Answer
React Router v6 introduced significant API changes from v5, adopting a JSX-based route configuration that is more declarative and composable. The core primitive is the `<Routes>` component, which replaces `<Switch>`, and `<Route>`, which now uses `element` instead of `component` or `render` prop.

Dynamic route segments are defined with `:paramName` syntax. The `useParams()` hook reads these values inside the matched component. Query parameters are accessed through `useSearchParams()`, which returns a `URLSearchParams` object and a setter, similar to `useState`.

Nested routes are a first-class feature in v6. A parent route renders an `<Outlet />` component as a placeholder, and child routes render into that outlet. This allows layouts to be defined at the route level — a common pattern for authenticated app sections with a shared sidebar or header. The route config becomes a tree that mirrors the UI hierarchy.

```jsx
<Routes>
  <Route path="/app" element={<AppLayout />}>
    <Route index element={<Dashboard />} />
    <Route path="users/:id" element={<UserDetail />} />
  </Route>
</Routes>
```

Protected routes are implemented by wrapping route elements with a guard component that checks authentication state and redirects to `/login` if the user is not authenticated. Using `<Navigate replace to="/login" />` performs a redirect that replaces the current history entry, so the user doesn't land back on the protected route when navigating back.

Programmatic navigation uses the `useNavigate()` hook. `navigate('/path')` pushes to history; `navigate(-1)` goes back. You can pass state with `navigate('/path', { state: { from: location } })`, which is useful for redirecting back after login.

The `useLocation()` hook gives you the current location object, including `pathname`, `search`, `hash`, and `state`. It's useful for reading query strings, detecting route changes in effects, and preserving location context for authentication redirects.

### Key Points
- React Router v6 uses `<Routes>` + `<Route element={...}>` syntax; nested routes render into `<Outlet />`
- Dynamic params via `:paramName` are accessed with `useParams()`; query strings via `useSearchParams()`
- Protected routes are guard components that render `<Navigate />` when authentication is missing
- `useNavigate()` enables programmatic navigation including back/forward and state passing
- `useLocation()` accesses current path, search params, and navigation state

### Follow-up Prompts
- How do you implement a redirect after login that sends the user back to the originally requested URL?
- What is the difference between `<Navigate replace />` and `<Navigate />` (without replace)?
- How would you implement a breadcrumb component that reads from the current route hierarchy?

### Difficulty: intermediate
### Tags: react-router, routing, nested-routes, navigation, protected-routes

---

## Q5: What are error boundaries and how do you implement them?

### Question
Explain what error boundaries are, how they work, where to place them in a component tree, and how to handle errors in event handlers and async code.

### Model Answer
An error boundary is a React class component that catches JavaScript errors anywhere in its child component tree, logs those errors, and displays a fallback UI instead of crashing the entire application. Error boundaries catch errors during rendering, in lifecycle methods, and in constructors of child components.

They are implemented using two lifecycle methods: `static getDerivedStateFromError(error)` renders a fallback UI on the next render after an error, and `componentDidCatch(error, errorInfo)` logs the error (to an error tracking service like Sentry). There is currently no Hook equivalent for these lifecycle methods, so error boundaries must be class components.

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logErrorToService(error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

The `react-error-boundary` library provides a functional wrapper (`<ErrorBoundary>`) with a `FallbackComponent` prop, `onError` callback, and a `resetErrorBoundary` function that allows the fallback UI to offer a "try again" button.

Placement strategy matters: wrapping the entire app gives a top-level safety net, but wrapping individual feature sections (the sidebar, the main content area, a widget) provides more granular recovery — the rest of the UI remains functional if one section fails. A common pattern is to wrap lazy-loaded routes individually.

A critical limitation: error boundaries do NOT catch errors in event handlers (because those don't happen during rendering), async code (like `setTimeout` or Promise rejections), or server-side rendering. For event handler errors, use try/catch blocks directly. For unhandled Promise rejections, use `window.addEventListener('unhandledrejection', handler)`.

### Key Points
- Error boundaries catch render-time errors in child components using `getDerivedStateFromError` and `componentDidCatch`
- They must be class components — there is no Hook equivalent
- Use `react-error-boundary` for a convenient functional API with reset capability
- They do NOT catch errors in event handlers, async code, or SSR — handle those with try/catch and global handlers
- Placement strategy: fine-grained boundaries around feature sections for better resilience

### Follow-up Prompts
- How would you implement a "retry" button in a fallback UI that attempts to re-render the failed component?
- What information does the `errorInfo.componentStack` contain and how is it useful for debugging?
- How do you test an error boundary in React Testing Library?

### Difficulty: intermediate
### Tags: error-boundaries, error-handling, class-components, resilience

---

## Q6: How do lazy loading and Suspense work in React?

### Question
Explain `React.lazy` and `<Suspense>`, how they improve performance through code splitting, and what their current limitations are.

### Model Answer
`React.lazy` is a function that lets you dynamically import a component. It takes a function that returns a Promise resolving to a module with a default export that is a React component. Instead of loading all component code upfront in a single JavaScript bundle, the browser only downloads a component's code when it is first needed, reducing the initial bundle size and improving load time.

```jsx
const UserProfile = React.lazy(() => import('./UserProfile'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile />
    </Suspense>
  );
}
```

`<Suspense>` is a component that catches the "pending" state of lazy-loaded components and renders a `fallback` UI (a loading spinner, skeleton screen, etc.) while the chunk downloads. When the Promise resolves, Suspense replaces the fallback with the actual component. Multiple `React.lazy` components can be wrapped by a single `<Suspense>` — the fallback shows while any of them are loading.

The most common use case is route-based code splitting with React Router. Each route's component is lazy-loaded, so users download only the code for the pages they visit. This is typically the highest-impact code splitting strategy. You can further optimize by prefetching route chunks on hover or mouse-down before the user clicks.

Suspense works with concurrent React features and is being expanded in React 18+ to support data fetching directly (not just lazy loading). With libraries like TanStack Query or Relay in Suspense mode, a component can "suspend" while data is loading, and Suspense renders the fallback, keeping the UI consistent.

Current limitations of `React.lazy`: it only supports default exports (named exports require a wrapper), it does not work in server-side rendering without additional tooling (Next.js handles this with `next/dynamic`), and it only works with dynamic `import()` — not other async loading mechanisms.

### Key Points
- `React.lazy(() => import('./Component'))` enables dynamic import and code splitting
- `<Suspense fallback={...}>` renders a loading UI while the lazy component's chunk downloads
- Route-based code splitting is the highest-impact use case, reducing initial bundle size significantly
- React 18 expands Suspense to support data fetching (components can suspend on data, not just code)
- `React.lazy` only works with default exports and is not SSR-compatible without framework support (like Next.js `dynamic()`)

### Follow-up Prompts
- How do you implement prefetching of a lazy-loaded route component before the user navigates to it?
- What happens if a lazy-loaded component fails to load (network error)? How do you handle this case?
- How does Next.js `dynamic()` differ from `React.lazy` and what additional options does it provide?

### Difficulty: intermediate
### Tags: lazy-loading, suspense, code-splitting, performance, dynamic-import

---

## Q7: How do you optimize rendering with React.memo and related patterns?

### Question
Explain `React.memo`, when it helps, when it doesn't help, and how to use it effectively in combination with `useCallback` and `useMemo`.

### Model Answer
`React.memo` is a higher-order component that memoizes the rendered output of a functional component. When the parent re-renders, a memoized child only re-renders if its props have changed (by shallow comparison). If the props are the same, React reuses the previous render output. It is the functional component equivalent of `shouldComponentUpdate` returning `false` or `PureComponent`.

Shallow comparison means that primitive values (strings, numbers, booleans) are compared by value, while objects and arrays are compared by reference. This is where the combination with `useCallback` and `useMemo` becomes necessary: if a parent passes an inline object `style={{ color: 'red' }}` or an inline function `onClick={() => handleClick()}` to a memoized child, those create new references every render, breaking the memoization.

```jsx
// WRONG: defeats memo because handleSave is a new reference every render
const handleSave = () => save(data);
return <ExpensiveChild onSave={handleSave} />;

// CORRECT: stable reference maintained with useCallback
const handleSave = useCallback(() => save(data), [data]);
return <ExpensiveChild onSave={handleSave} />;
```

`React.memo` accepts a second argument — a custom comparison function — for cases where shallow comparison is too strict (you want to ignore certain props) or not strict enough (you need deep comparison of a nested object). However, custom comparison functions add complexity and risk; they are rarely needed.

`React.memo` is most valuable for: components that render frequently as part of a large list, pure presentational components that receive the same props often, and components with expensive rendering logic. It is NOT valuable for: components that always receive new props, components with very cheap rendering, or components at the top of the tree that rarely re-render.

A key insight is that React.memo only prevents re-renders triggered by the parent. State changes within the memoized component still cause re-renders. Context changes that the component subscribes to also bypass memo.

### Key Points
- `React.memo` uses shallow prop comparison to skip re-renders when props haven't changed
- Inline objects and functions in JSX break memoization — stabilize them with `useCallback` and `useMemo`
- Best for: frequently re-rendered list items, expensive presentational components, pure components receiving stable props
- Internal state changes and context changes bypass `React.memo`
- The optional second argument allows a custom comparison function, but use it sparingly

### Follow-up Prompts
- How does React.memo interact with React Context? Does it prevent re-renders from context changes?
- When would you use the custom comparison function argument of `React.memo`?
- How do you identify which components are good candidates for memoization using the Profiler?

### Difficulty: intermediate
### Tags: React.memo, performance, memoization, optimization, re-renders

---

## Q8: How do you test React components with React Testing Library?

### Question
Explain the philosophy of React Testing Library, how to write effective tests for components, and what common testing patterns look like for events, async behavior, and custom hooks.

### Model Answer
React Testing Library (RTL) is built around the principle of testing components the way users interact with them, rather than testing implementation details. Its queries prioritize user-visible attributes: `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`. These queries map to what a user sees and interacts with, making tests more resilient to refactoring.

The testing pyramid with RTL favors integration-style tests that render a component with all its children and real hooks, rather than shallow rendering that isolates a component from its dependencies. This approach gives higher confidence because it tests the actual behavior, not mocked internals.

```jsx
test('increments counter on button click', async () => {
  render(<Counter />);
  const button = screen.getByRole('button', { name: /increment/i });
  await userEvent.click(button);
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

For async operations (data fetching, delayed updates), RTL provides `findBy*` queries (which return Promises and wait for elements to appear) and `waitFor` (which retries an assertion until it passes or times out). You should `await` these queries and set up proper request mocking with `msw` (Mock Service Worker), which intercepts network requests at the Service Worker level, making tests more realistic than manual fetch mocks.

Testing custom hooks uses the `renderHook` utility from `@testing-library/react`. It renders a test component that uses the hook and exposes the hook's return values.

```jsx
const { result } = renderHook(() => useCounter(0));
act(() => result.current.increment());
expect(result.current.count).toBe(1);
```

Common anti-patterns to avoid: using `container.querySelector` (couples tests to DOM structure), testing implementation details like state variable names, snapshot testing without clear intent (snapshot tests tend to fail for trivial reasons and get blindly updated).

### Key Points
- RTL queries prioritize accessibility roles and user-visible text over CSS selectors and component internals
- Use `findBy*` queries and `waitFor` for async operations; mock network requests with `msw`
- `renderHook` from `@testing-library/react` is the standard way to test custom hooks
- Avoid testing implementation details — test behavior and outcomes, not state variable names or internal functions
- Write tests that give confidence the component works for users, not just that it matches a previous snapshot

### Follow-up Prompts
- What is the difference between `getBy`, `queryBy`, and `findBy` queries in RTL?
- How would you test a component that makes an API call and displays the results?
- Why does RTL discourage shallow rendering (like Enzyme's `shallow()`)? What are the trade-offs?

### Difficulty: intermediate
### Tags: testing, react-testing-library, unit-tests, async-testing, custom-hooks

---

## Q9: How do form libraries like React Hook Form improve form management?

### Question
Explain why form libraries are used in React applications, how React Hook Form (RHF) works under the hood, and what advantages it has over manually managing form state with useState.

### Model Answer
Managing complex forms with `useState` leads to boilerplate: one state variable per field, onChange handlers for each, validation logic, error state, touched/dirty tracking, and submit handling. For a form with 10 fields, this can mean 30+ pieces of state and corresponding logic. Form libraries like React Hook Form abstract this complexity.

React Hook Form takes an "uncontrolled" approach under the hood, using refs to access form values instead of React state. This is the key to its performance advantage: since form values are stored in the DOM (via refs), typing in an input does not trigger React re-renders. Only events that should update the UI (like validation errors appearing or the form submitting) cause re-renders.

```jsx
const { register, handleSubmit, formState: { errors } } = useForm();

const onSubmit = (data) => console.log(data);

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <input {...register('email', { required: true, pattern: /^\S+@\S+$/ })} />
    {errors.email && <span>Valid email required</span>}
  </form>
);
```

`register` attaches a ref and event listeners to the input, collecting its value on submit rather than on every keystroke. `handleSubmit` validates the form using the registered rules before calling `onSubmit` with the collected values. `formState` provides reactive values for errors, isSubmitting, isDirty, isValid, etc. that only trigger re-renders when they change.

For complex validation, RHF integrates with schema validation libraries like Zod or Yup via the `@hookform/resolvers` package. This separates validation logic from the component, making it reusable and testable.

RHF also handles controlled inputs (for custom components like date pickers or UI library inputs) through its `<Controller>` component or `useController` hook, which bridges the uncontrolled RHF approach with components that require controlled value/onChange props.

### Key Points
- React Hook Form uses uncontrolled inputs (refs) instead of state, eliminating re-renders on every keystroke
- `register()` attaches the ref and validation rules; `handleSubmit()` validates and calls your submit handler
- `formState` provides reactive derived values (errors, isSubmitting, isDirty) that only re-render what's needed
- Integrates with Zod/Yup schemas via `@hookform/resolvers` for schema-based validation
- Use `<Controller>` or `useController` for controlled third-party input components

### Follow-up Prompts
- How do you implement dynamic field arrays (add/remove items) with React Hook Form?
- What is the `watch` function in RHF and when would you use it versus subscribing to individual field values?
- How would you implement cross-field validation (e.g., "confirm password must match password") with RHF and Zod?

### Difficulty: intermediate
### Tags: forms, react-hook-form, validation, performance, uncontrolled-inputs

---

## Q10: What are the basics of SSR with Next.js?

### Question
Explain how server-side rendering (SSR) works in Next.js, the difference between SSR, SSG, and ISR, and when to use each rendering strategy.

### Model Answer
Server-side rendering (SSR) means generating the HTML for a page on the server on every request, rather than sending a minimal HTML shell and letting JavaScript build the DOM in the browser (CSR). The user receives a fully rendered HTML page, which can be displayed before JavaScript loads. This benefits Time to First Contentful Paint (FCP) and is important for SEO since search engine crawlers see complete content.

In Next.js Pages Router, `getServerSideProps` enables SSR for a page. It runs on every request on the server, fetches data, and passes it as props to the page component. The component renders to HTML on the server, which is sent to the browser and then "hydrated" — React attaches event listeners to the server-rendered HTML, making it interactive.

Static Site Generation (SSG) with `getStaticProps` generates HTML at build time. The resulting HTML is cached and served as a static file. It is faster than SSR because there's no server computation per request — the CDN serves pre-built HTML instantly. It's ideal for content that doesn't change per user: blog posts, documentation, marketing pages.

Incremental Static Regeneration (ISR) combines the benefits of both: pages are statically generated at build time but can be regenerated in the background at a specified interval (`revalidate` seconds). After the revalidation period, the next request triggers regeneration of the static page, while the previous version continues to be served until the new one is ready (stale-while-revalidate).

Next.js App Router (Next.js 13+) changes the paradigm significantly. Server Components are the default — they render on the server and send HTML + a minimal client bundle. Data fetching happens directly in Server Components using `async/await`. Client-interactive components are marked with `'use client'`. The distinction between SSR/SSG/ISR is handled through `fetch` cache options (`cache: 'no-store'` for SSR behavior, `next: { revalidate: 60 }` for ISR, default caching for SSG) rather than exported lifecycle functions.

### Key Points
- SSR (`getServerSideProps`) generates HTML per-request on the server — good for personalized, dynamic content
- SSG (`getStaticProps`) generates HTML at build time — fastest, ideal for content that doesn't change per user
- ISR adds `revalidate` to SSG to regenerate pages in the background after a set interval
- Next.js App Router uses Server Components by default; data fetching is done with `async/await` and `fetch` cache options
- Hydration is the process of React attaching to server-rendered HTML to make it interactive

### Follow-up Prompts
- What is the "hydration mismatch" error in Next.js and what causes it?
- How does the App Router's Server Components model differ from the Pages Router's getServerSideProps?
- When would you choose ISR over SSR even for frequently updated content?

### Difficulty: intermediate
### Tags: nextjs, ssr, ssg, isr, server-components, rendering-strategies
