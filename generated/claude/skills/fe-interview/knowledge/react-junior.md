# React - Junior Interview Questions
### Language: en

## Q1: What is JSX and why does React use it?

### Question
Explain what JSX is, how it differs from plain HTML, and why React uses it instead of plain JavaScript.

### Model Answer
JSX (JavaScript XML) is a syntax extension for JavaScript that allows you to write HTML-like markup directly inside JavaScript code. It was created by the React team to make writing UI components more intuitive and readable. Under the hood, JSX is transpiled by tools like Babel into plain JavaScript function calls — specifically `React.createElement()` calls in older React, or the `_jsx()` runtime in the newer JSX transform.

For example, `<h1 className="title">Hello</h1>` becomes `React.createElement('h1', { className: 'title' }, 'Hello')` after transpilation. This means JSX is not a separate language but simply syntactic sugar over JavaScript, which is why you can embed JavaScript expressions inside JSX using curly braces `{}`.

JSX differs from plain HTML in several important ways. It uses `className` instead of `class` (since `class` is a reserved word in JavaScript), uses `htmlFor` instead of `for`, requires all tags to be properly closed (even self-closing ones like `<img />`), and uses camelCase for event handlers (`onClick`, `onChange`). CSS properties in inline styles are also camelCase.

React uses JSX because it keeps the component's structure (template) and behavior (logic) co-located in a single file, rather than separating them across HTML templates and JS files. This component-based approach makes it easier to reason about what a piece of UI does and how it renders. It also enables powerful tooling like syntax highlighting, type checking, and auto-completion in editors.

### Key Points
- JSX is syntactic sugar over `React.createElement()` calls, transpiled by Babel or similar tools
- Uses `className`, `htmlFor`, and camelCase attributes instead of standard HTML attributes
- JavaScript expressions can be embedded using curly braces `{}`
- All JSX tags must be closed; fragments `<>...</>` can wrap multiple elements without adding DOM nodes
- JSX enables co-location of UI structure and logic within a single component

### Follow-up Prompts
- What happens if you return two sibling elements from a component without wrapping them? How do you solve this?
- Can you write React without JSX? Show an example.
- What is the new JSX transform introduced in React 17, and how does it differ from the old one?

### Difficulty: basic
### Tags: jsx, react-basics, transpilation, babel

---

## Q2: What is the difference between functional and class components?

### Question
Compare functional and class components in React. When would you use each, and what are the key differences in terms of syntax and capabilities?

### Model Answer
Functional components are plain JavaScript functions that accept props as an argument and return JSX. Class components are ES6 classes that extend `React.Component` and have a `render()` method that returns JSX. Both can render UI, but they differ significantly in how they manage state and lifecycle.

Before React 16.8, class components were required whenever you needed local state or lifecycle methods. Functional components were called "stateless functional components" and were only used for presentational purposes. With the introduction of Hooks in React 16.8, functional components gained the ability to use state (`useState`), side effects (`useEffect`), context, refs, and virtually everything class components could do.

Syntax-wise, class components require more boilerplate: the class declaration, a constructor for initializing state and binding event handlers, and the `render()` method. Functional components are more concise and easier to read. For example, `this.state`, `this.setState()`, and `this.props` in a class component are replaced by `useState` and the props parameter in a functional component, eliminating the confusion that comes with `this` in JavaScript.

Class components have lifecycle methods like `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount`. Functional components use `useEffect` to handle all of these cases in a single, more composable API. One area where class components still have unique support is error boundaries — the `componentDidCatch` and `getDerivedStateFromError` lifecycle methods have no Hook equivalent, so error boundaries must still be class components (though libraries like `react-error-boundary` wrap this for you).

The React team has stated that functional components with Hooks are the future of React. New React features like Server Components are designed primarily around functions. Most modern codebases use functional components exclusively.

### Key Points
- Class components require `extends React.Component` and a `render()` method; functional components are plain functions
- Hooks (introduced in 16.8) gave functional components the ability to manage state and side effects
- `this` binding issues are eliminated in functional components
- Error boundaries still require class components (`componentDidCatch`)
- The React team recommends functional components with Hooks for all new code

### Follow-up Prompts
- How do you convert a class component with state and lifecycle methods to a functional component with Hooks?
- Why does `this` cause confusion in class components, and how do you handle event handler binding?
- Are there any performance differences between class and functional components?

### Difficulty: basic
### Tags: components, class-components, functional-components, hooks

---

## Q3: What is the difference between props and state?

### Question
Explain the difference between props and state in React. How do they affect component rendering, and when should you use each?

### Model Answer
Props (short for "properties") and state are both plain JavaScript objects that hold information influencing the output of a render, but they differ fundamentally in ownership and mutability. Props are passed from a parent component to a child component and are read-only from the child's perspective — a component cannot modify its own props. State, on the other hand, is managed internally by the component itself and can be updated using `setState` (in class components) or `useState` (in functional components).

Think of props as function arguments: a parent passes data down to a child, and the child uses that data to render. The child does not own the data and should not change it. State is like a component's internal memory — it tracks data that can change over time and belongs exclusively to that component.

When either props or state changes, React re-renders the component. However, the trigger is different: props change when the parent re-renders with new values, while state changes are triggered explicitly by the component itself through state setters. Both cause a new render cycle, and React's reconciliation algorithm determines the minimal DOM updates needed.

A common pattern is "lifting state up": when two sibling components need to share the same piece of data, you move the state to their closest common ancestor and pass it down as props. This keeps the data flow predictable and unidirectional. Props can contain any JavaScript value: strings, numbers, objects, arrays, even functions (callbacks) which allow children to communicate back to parents.

It's important to treat state as immutable. You should never mutate state directly (e.g., `state.items.push(newItem)`) because React may not detect the change and re-render. Always use the setter function with a new value or new object reference.

### Key Points
- Props are passed from parent to child and are read-only within the receiving component
- State is owned and managed by the component itself and can change over time
- Both props and state changes trigger re-renders
- State should be treated as immutable — always use setter functions with new values
- "Lifting state up" is the pattern for sharing state between sibling components

### Follow-up Prompts
- What happens if you directly mutate state instead of using the setter? Why is this a problem?
- How do you pass data from a child component back up to a parent?
- What is derived state, and when should you avoid storing it in state?

### Difficulty: basic
### Tags: props, state, data-flow, re-rendering

---

## Q4: How do useState and useEffect work?

### Question
Explain the `useState` and `useEffect` hooks. What are their signatures, common use cases, and important pitfalls?

### Model Answer
`useState` is a Hook that lets you add local state to a functional component. It takes an initial value as its argument and returns an array with two elements: the current state value and a setter function. You call the setter to update state, which triggers a re-render. The initial value is only used on the first render — on subsequent renders, React uses the current state value.

```jsx
const [count, setCount] = useState(0);
// setCount(count + 1) -- basic update
// setCount(prev => prev + 1) -- functional update using previous value
```

The functional update form `setCount(prev => prev + 1)` is important when the new state depends on the previous state, especially in asynchronous contexts or when multiple updates are batched. If you call `setCount` multiple times in the same synchronous block, React may batch them, so relying on `count` inside the setter can produce stale values.

`useEffect` is a Hook that lets you perform side effects in functional components. Side effects include data fetching, subscriptions, manually modifying the DOM, timers, and logging. Its signature is `useEffect(effectFn, dependencyArray)`. The effect function runs after every render by default, but the dependency array controls when it re-runs: an empty array `[]` means run only on mount (equivalent to `componentDidMount`), and a list of values means run whenever any of those values change.

The effect function can optionally return a cleanup function, which React calls before running the next effect or when the component unmounts. This is used to cancel subscriptions, clear timers, or abort fetch requests.

A common pitfall is the "stale closure" problem: if your effect reads a value from the outer scope (like `count`) but doesn't include it in the dependency array, the effect captures the stale value from when it was defined. The ESLint rule `exhaustive-deps` helps catch this. Another pitfall is accidentally creating infinite loops — if you update state inside an effect that depends on that same state without proper conditions, the effect will run forever.

### Key Points
- `useState` returns `[value, setter]`; the setter triggers a re-render
- Use the functional update form `setState(prev => newValue)` when the new state depends on the previous state
- `useEffect` with `[]` runs once on mount; with dependencies, it runs on change; with no array, it runs after every render
- The cleanup function in `useEffect` runs before the next effect execution and on unmount
- Always include all values used inside an effect in the dependency array to avoid stale closures

### Follow-up Prompts
- What is the "stale closure" problem in useEffect and how do you prevent it?
- How would you fetch data from an API using useEffect, and how do you handle cleanup for async operations?
- What is React's batching behavior for state updates, and how did it change in React 18?

### Difficulty: basic
### Tags: useState, useEffect, hooks, side-effects, closures

---

## Q5: How does conditional rendering work in React?

### Question
Describe the different ways to conditionally render UI in React. What are the trade-offs of each approach?

### Model Answer
Conditional rendering in React means displaying different UI based on some condition. Since JSX is just JavaScript, you can use any JavaScript conditional logic to decide what to render. There are several common patterns, each with its own trade-offs.

The most straightforward approach is an `if/else` statement before the return statement. This is readable and works well for complex conditions or when the branches have substantially different markup. However, it cannot be used inline inside JSX.

The ternary operator `condition ? <ComponentA /> : <ComponentB />` is the most commonly used inline approach. It works inside JSX and is great when you need to choose between two distinct elements. For deeply nested or complex conditions, ternaries can become hard to read.

The short-circuit `&&` operator is ideal when you only want to render something or render nothing. `condition && <Component />` renders `<Component />` when `condition` is truthy and renders nothing when it's falsy. A critical pitfall: if `condition` is `0` (a falsy number), React will actually render the number `0` rather than nothing. Use `!!count && ...` or `count > 0 && ...` to avoid this.

For multiple branches, you can use an object map or a switch statement to map a state value to a component. This is cleaner than chained ternaries. You can also use immediately-invoked function expressions (IIFEs) or extract the conditional logic into a separate helper component for readability.

Returning `null` from a component or branch prevents it from rendering anything at all, which is useful for toggling visibility without unmounting a parent.

### Key Points
- Use `if/else` before `return` for complex multi-branch logic
- Use ternary `? :` for inline two-branch rendering
- Use `&&` for "render or nothing" — but avoid `0 && ...` pitfall
- Returning `null` renders nothing; the component still mounts but produces no DOM
- Extract complex conditionals into separate components or helper functions for readability

### Follow-up Prompts
- What is the difference between hiding an element with CSS `display: none` and conditionally rendering it in React?
- How would you implement a loading/error/success state UI pattern?
- What are the performance implications of conditional rendering vs. CSS-based toggling?

### Difficulty: basic
### Tags: conditional-rendering, jsx, ternary, short-circuit

---

## Q6: How do you render a list of items in React, and why are keys important?

### Question
Explain how to render arrays of data in React, what the `key` prop is, and what problems arise from missing or incorrect keys.

### Model Answer
In React, you render lists by mapping an array of data to an array of JSX elements. The `.map()` method is the standard approach. Each element in the returned array must have a unique `key` prop. Without keys, React cannot efficiently identify which items have changed, been added, or been removed.

```jsx
const items = ['Apple', 'Banana', 'Cherry'];
return (
  <ul>
    {items.map((item, index) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);
```

The `key` prop is a special hint to React's reconciliation algorithm. When the list re-renders, React uses keys to match elements from the previous render tree with the new one. With stable, unique keys, React can determine that an item was moved (not deleted and re-created), reorder DOM nodes efficiently, and preserve component state correctly.

Using the array index as a key (`key={index}`) is an anti-pattern when the list can be reordered, filtered, or have items added/removed at positions other than the end. If the list is reordered and you use indices, React sees element at index 0 is now different from what was at index 0 before, causing it to unmount and remount components unnecessarily, losing any internal state (like input values) those components held.

The ideal key is a stable, unique identifier from your data — typically an `id` field from a database. The key must be unique among siblings but doesn't need to be globally unique. Keys are not passed to the component as a prop — if you need the `id` inside the component, pass it separately as a named prop.

If React encounters a list without keys, it logs a console warning and defaults to using indices, which may cause subtle bugs and performance issues.

### Key Points
- Use `.map()` to transform data arrays into JSX element arrays
- Every list item needs a unique, stable `key` prop among its siblings
- Keys help React's reconciliation algorithm identify which items changed
- Using array index as key is problematic when items can reorder, insert, or delete at non-end positions
- `key` is not accessible as a prop inside the component; pass the id separately if needed

### Follow-up Prompts
- What happens to a component's local state if its key changes between renders?
- How would you render a list of items that come from an API, including loading and error states?
- Can you have duplicate keys in a list? What happens if you do?

### Difficulty: basic
### Tags: lists, keys, reconciliation, map, rendering

---

## Q7: How does event handling work in React?

### Question
Describe how React handles events, how it differs from native DOM event handling, and common patterns for handling events in functional components.

### Model Answer
React uses a synthetic event system that wraps the browser's native events. Instead of attaching event listeners directly to DOM nodes, React attaches a single event listener at the root of the application (the root DOM container) and uses event delegation to handle all events. This approach improves performance and ensures consistent behavior across browsers.

In JSX, event handlers are passed as camelCase props: `onClick`, `onChange`, `onSubmit`, `onKeyDown`, etc. The handler receives a `SyntheticEvent` object, which is a cross-browser wrapper around the native event. The `SyntheticEvent` provides the same interface as the native event (`event.target`, `event.preventDefault()`, `event.stopPropagation()`) but normalizes browser differences.

```jsx
function Button() {
  const handleClick = (event) => {
    event.preventDefault();
    console.log('Button clicked');
  };
  return <button onClick={handleClick}>Click me</button>;
}
```

A common pattern is passing additional data to event handlers. You can use an arrow function wrapper or `Function.prototype.bind`:

```jsx
// Arrow function wrapper (creates new function each render)
<button onClick={() => handleDelete(item.id)}>Delete</button>

// Using data attributes (avoids new function per render)
<button data-id={item.id} onClick={handleDelete}>Delete</button>
```

The arrow function approach creates a new function on every render, which can be a minor concern for performance in large lists. Using `useCallback` or data attributes can mitigate this. For most cases, the arrow function approach is acceptable.

Unlike native DOM, you cannot return `false` to prevent default behavior in React — you must explicitly call `event.preventDefault()`. Also note that in React 17+, events are attached to the root container instead of `document`, which changes how stopPropagation interacts with non-React code.

### Key Points
- React uses synthetic events and event delegation — a single listener at the root handles all events
- Event handler props are camelCase: `onClick`, `onChange`, `onSubmit`
- Call `event.preventDefault()` explicitly; returning `false` does not prevent default in React
- Arrow functions in JSX create a new function each render; use `useCallback` for optimization if needed
- The SyntheticEvent normalizes browser differences and provides a consistent API

### Follow-up Prompts
- What is event delegation, and why does React use it instead of attaching listeners to each element?
- How do you pass arguments to an event handler without immediately invoking it?
- What changed about React's event system in React 17, and why?

### Difficulty: basic
### Tags: events, synthetic-events, event-handling, onClick

---

## Q8: What is the difference between controlled and uncontrolled components?

### Question
Explain controlled vs. uncontrolled form components in React. What are the trade-offs of each approach, and when would you use uncontrolled components?

### Model Answer
A controlled component is one where React controls the form element's value through state. The element's current value is always driven by React state, and every user input triggers an `onChange` event that updates the state, which in turn updates the displayed value. This creates a single source of truth: the React state.

```jsx
function ControlledInput() {
  const [value, setValue] = useState('');
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

An uncontrolled component lets the DOM manage its own state, just like traditional HTML forms. You access the value when needed (e.g., on form submit) using a `ref` rather than subscribing to every keystroke. This approach is simpler for straightforward cases but gives you less fine-grained control.

```jsx
function UncontrolledInput() {
  const inputRef = useRef(null);
  const handleSubmit = () => {
    console.log(inputRef.current.value);
  };
  return <input ref={inputRef} defaultValue="initial" />;
}
```

Note the difference between `value` (controlled) and `defaultValue` (uncontrolled). With `value`, React manages the value. With `defaultValue`, you set the initial value but React doesn't manage it afterward.

Controlled components are more powerful: you can validate on every keystroke, conditionally disable buttons, format input as the user types, and easily reset or pre-fill forms from application state. They are the recommended approach for most form use cases and are what libraries like React Hook Form build upon internally.

Uncontrolled components are useful when integrating with non-React code, when performance is critical (avoiding re-renders on every keystroke), for file inputs (which cannot be controlled in React), and for very simple forms where you only need the value on submit.

### Key Points
- Controlled: React state drives the input value; `onChange` syncs state with every keystroke
- Uncontrolled: The DOM manages its own value; access it via `ref` when needed
- `value` prop makes a controlled component; `defaultValue` sets an initial value for uncontrolled
- File inputs (`<input type="file">`) can only be uncontrolled in React
- Controlled components enable real-time validation, formatting, and conditional UI; uncontrolled is simpler for basic cases

### Follow-up Prompts
- What happens if you set a `value` prop but don't provide an `onChange` handler?
- How do you reset a form in both controlled and uncontrolled approaches?
- How does React Hook Form use uncontrolled components internally for performance?

### Difficulty: basic
### Tags: forms, controlled-components, uncontrolled-components, refs

---

## Q9: What is React DevTools and how do you use it for debugging?

### Question
Describe what React DevTools is, what it shows you, and how you would use it to debug a React application.

### Model Answer
React DevTools is a browser extension (available for Chrome and Firefox) and a standalone Electron app that provides a set of developer tools specifically for inspecting and debugging React applications. It adds two panels to the browser's developer tools: the "Components" panel and the "Profiler" panel.

The Components panel gives you a tree view of your entire React component hierarchy, similar to the Elements panel in DevTools but organized around components rather than raw DOM nodes. For each component, you can see its current props, state, hooks values, and context values. You can also directly edit props and state values in the panel to test how the UI responds, which is extremely useful for debugging without modifying code.

The Profiler panel records rendering performance. You start a recording, interact with your app, and then stop the recording. The Profiler shows you which components rendered, why they rendered (prop change, state change, parent render), how long each render took, and the commit-by-commit breakdown. This is invaluable for identifying unnecessary re-renders and performance bottlenecks.

Common debugging workflows with React DevTools include: finding which component owns a particular piece of state by traversing the component tree; inspecting why a component re-rendered by checking its props and state changes; verifying that context values are being correctly passed down the tree; and identifying "wasted" renders where a component re-renders but produces the same output (a signal that `React.memo` or `useCallback` might help).

React DevTools also lets you highlight updates — when enabled, it flashes colored borders around components when they re-render, giving a real-time visual indication of rendering activity. It integrates with source maps to show component names meaningfully even in minified production builds if source maps are included.

### Key Points
- React DevTools is a browser extension that adds Components and Profiler panels to browser DevTools
- The Components panel shows the component tree with props, state, hooks, and context values — all editable in real-time
- The Profiler records rendering performance and shows why each component rendered and how long it took
- "Highlight updates" visually shows which components re-render during interactions
- Essential for debugging unnecessary re-renders, incorrect state values, and context propagation issues

### Follow-up Prompts
- How do you use the Profiler to identify a component that is re-rendering too often?
- What does it mean when the DevTools shows a component rendering with no prop or state changes?
- How can you use React DevTools with a production build?

### Difficulty: basic
### Tags: devtools, debugging, profiler, performance

---

## Q10: Explain useRef and useContext hooks.

### Question
Describe the `useRef` and `useContext` hooks. What problem does each solve, and what are the common use cases and pitfalls?

### Model Answer
`useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument. The ref object persists for the full lifetime of the component. Unlike state, updating a ref does not trigger a re-render. This makes `useRef` useful for two distinct purposes: accessing DOM elements directly, and storing mutable values that should persist between renders without causing re-renders.

For DOM access, you attach the ref to a JSX element's `ref` prop. After the component mounts, `ref.current` points to the DOM node, giving you access to its methods and properties. Common use cases include programmatic focus management, triggering animations, reading scroll positions, and integrating with third-party DOM libraries.

```jsx
const inputRef = useRef(null);
useEffect(() => {
  inputRef.current.focus(); // focus on mount
}, []);
return <input ref={inputRef} />;
```

For storing mutable values, `useRef` acts like an instance variable in a class component. A common pattern is storing the previous value of a prop or state, tracking if a component is mounted (to avoid state updates after unmount), or storing a timer ID for later cleanup.

`useContext` lets a component read and subscribe to a Context. Context solves the "prop drilling" problem — passing data through many layers of components that don't need it, just to get it to a deeply nested component. You create a context with `React.createContext()`, provide a value with the `Context.Provider`, and read it with `useContext(Context)`.

```jsx
const ThemeContext = React.createContext('light');
// In a deeply nested component:
const theme = useContext(ThemeContext);
```

The pitfall with `useContext` is that every component that calls `useContext(MyContext)` will re-render whenever the context value changes, even if the component only uses part of the value. This can cause unnecessary re-renders in large applications. Solutions include splitting contexts by concern, using `useMemo` to memoize the context value, or using a state management library that provides more selective subscriptions.

### Key Points
- `useRef` returns a persistent, mutable object that does not trigger re-renders when `.current` changes
- Primary uses: accessing DOM nodes directly, and storing mutable values that persist across renders
- `useContext` reads a value from the nearest matching Context.Provider up the component tree
- Context solves prop drilling but causes all consumers to re-render on any context value change
- Split contexts by concern and memoize context values to avoid unnecessary re-renders

### Follow-up Prompts
- How would you use `useRef` to store the previous value of a prop?
- What is the difference between `useRef` and creating a regular variable outside the component?
- How do you prevent unnecessary re-renders when using `useContext` with a large context object?

### Difficulty: basic
### Tags: useRef, useContext, hooks, context-api, dom-access
