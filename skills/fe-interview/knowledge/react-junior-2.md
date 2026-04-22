# React - Junior Interview Questions (Part 2)
### Language: en

## Q11: What is React.Fragment and when should you use it?

### Question
Explain what React.Fragment is, why it exists, and when you should use it over a wrapper div.

### Model Answer
React.Fragment is a built-in React component that lets you group multiple child elements without adding an extra DOM node. When a component needs to return more than one element, React requires them to be wrapped in a single parent. Without Fragment, developers often reach for a `<div>` wrapper, but this adds unnecessary nodes to the DOM and can break CSS layouts like flexbox or grid where parent-child relationships matter.

There are two syntaxes for Fragment. The explicit form is `<React.Fragment>...</React.Fragment>`, and the shorthand is the empty angle brackets `<>...</>`. The explicit form is the only one that accepts the `key` prop, which is required when rendering lists of fragments. The shorthand is more concise and preferred when no key is needed.

Common use cases include rendering table rows where a component returns multiple `<td>` elements (a wrapping `<div>` would be invalid HTML inside a `<tr>`), returning sibling elements from a component without adding DOM depth, and avoiding CSS layout issues caused by unnecessary wrapper elements.

Using unnecessary `<div>` wrappers leads to "div soup" — deeply nested DOM trees that are harder to style, debug, and reason about. Fragment keeps the DOM clean and semantic. Modern React always encourages using Fragment over a generic `<div>` when the wrapper serves no styling or semantic purpose.

### Key Points
- React.Fragment wraps multiple children without adding a real DOM node
- Shorthand `<>...</>` is convenient but cannot accept props including `key`
- Use explicit `<React.Fragment key={id}>` when rendering lists of grouped elements
- Avoids breaking HTML semantics (e.g., invalid `<div>` inside `<tr>`)
- Prevents "div soup" and keeps the DOM tree clean

### Follow-up Prompts
- What happens if you try to add a `key` prop to the shorthand `<>` syntax?
- Can you give an example where a `<div>` wrapper would break the HTML structure?
- How does Fragment affect the component tree shown in React DevTools?

### Difficulty: basic
### Tags: react-fragment, jsx, dom, html-semantics

---

## Q12: What is React.StrictMode and what does it do?

### Question
What is React.StrictMode, what checks does it enable, and does it affect the production build?

### Model Answer
React.StrictMode is a developer tool built into React that helps identify potential problems in your application. It renders as a component in your JSX tree — typically wrapping the entire app — but it renders no visible UI. Its purpose is purely to activate additional warnings and checks during development.

StrictMode intentionally double-invokes certain functions such as the component render body, state initializer functions, and reducer functions. It does this to help you detect side effects that occur during rendering, which should be pure. If your render function produces different results on the second call, it signals that you have an unintentional side effect. This double-invocation only happens in development mode.

In React 18, StrictMode also mounts components, unmounts them, and then re-mounts them to simulate the behavior that will be needed for a future feature called "resumable state" (where React may need to restore component state from a previous mount). This means `useEffect` cleanup functions are exercised more thoroughly in development. If your effects do not properly clean up, StrictMode will surface those bugs.

StrictMode also warns about deprecated APIs. For example, it warns when you use legacy lifecycle methods like `componentWillMount`, `componentWillReceiveProps`, and `componentWillUpdate` that have been deprecated and should be replaced. It also warns about legacy string ref usage and findDOMNode.

Crucially, StrictMode has zero impact on the production build. The double rendering and extra checks are stripped out entirely. It is safe and recommended to keep StrictMode enabled throughout development. If you find that enabling StrictMode breaks something, it almost always reveals a real bug in your code rather than a problem with StrictMode itself.

### Key Points
- StrictMode adds no visible UI but activates extra development-only checks
- Intentionally double-invokes render, state initializers, and reducers to surface side effect bugs
- In React 18, it mounts/unmounts/remounts components to test effect cleanup
- Warns about deprecated lifecycle methods and legacy APIs
- Has zero performance or behavioral impact in production

### Follow-up Prompts
- Why would your useEffect run twice in development with StrictMode enabled?
- If removing StrictMode fixes a bug in your app, what does that tell you?
- How does StrictMode help prepare your codebase for future React features?

### Difficulty: basic
### Tags: strict-mode, react-dev-tools, side-effects, react-18

---

## Q13: What is useReducer and how does it differ from useState?

### Question
Explain the useReducer hook. When would you choose useReducer over useState, and what is the reducer pattern?

### Model Answer
`useReducer` is a React hook that manages state using a reducer function — the same pattern popularized by Redux. It takes a reducer function and an initial state value, and returns the current state and a dispatch function. You call dispatch with an action object, and React passes the current state and that action to your reducer, which returns the next state.

The fundamental difference from `useState` is how state transitions are expressed. With `useState`, you call a setter function directly with the new value. With `useReducer`, you describe what happened (dispatch an action like `{ type: 'INCREMENT' }`) and the reducer determines what the new state should be. This separation of "what happened" from "how state changes" is the core of the reducer pattern.

`useReducer` is preferable over `useState` in several scenarios. When multiple state values are interdependent — for example, a form with validation state, loading state, and field values — a reducer can manage all of them atomically, ensuring they stay consistent. When the next state depends on the previous state in complex ways, a reducer makes the logic explicit and easier to test. The reducer is a pure function that takes state and action and returns new state, so it can be unit tested completely independently of React.

Another benefit is that the dispatch function is stable across renders — React guarantees it never changes identity, so you can safely pass it to child components or include it in dependency arrays without causing re-renders. This is similar to the setState function from useState.

For simple, independent state (a toggle, a counter, a single string input), `useState` is cleaner and more readable. The choice between them is about complexity: if you find yourself managing related pieces of state with `useState` and writing complex state update logic, reaching for `useReducer` will make your code more organized and testable.

### Key Points
- useReducer takes `(state, action) => newState` reducer plus initial state, returns `[state, dispatch]`
- dispatch sends action objects; the reducer handles the actual state transition logic
- Preferred for complex state with multiple interdependent values or complex transition logic
- Reducer is a pure function — easy to test in isolation without React
- The dispatch function has stable identity across renders (safe for dependency arrays)

### Follow-up Prompts
- How would you share a reducer's dispatch function with deeply nested child components?
- Can you combine useReducer with useContext to build a simple state management solution?
- What is the difference between useReducer and useState in terms of how React batches updates?

### Difficulty: basic
### Tags: use-reducer, hooks, state-management, reducer-pattern

---

## Q14: What is prop drilling and how can you solve it?

### Question
Explain the prop drilling problem in React. What are the main solutions, and what are the trade-offs of each?

### Model Answer
Prop drilling refers to the practice of passing data through multiple layers of components just to get it from a top-level component down to a deeply nested one that actually needs it. Every intermediate component in the chain must accept and forward the prop even though it has no use for the data itself. This creates tight coupling, makes refactoring difficult, and pollutes component interfaces with props they do not own.

For example, if a theme color lives in the root `App` component and a deeply nested `Button` needs it, you must pass the color through every component in between: `App → Layout → Sidebar → NavSection → Button`. If you rename the prop or change its type, you have to update every component in the chain.

The most common solution is the React Context API. You create a context, provide it at a high level in the tree, and any descendant can consume it with `useContext` without requiring any intermediate components to pass it down. Context is ideal for truly global data like themes, authentication state, or locale preferences. The downside is that all consumers of a context re-render when its value changes, so you need to be careful about putting frequently-changing data in context without memoization.

Component composition is another solution that is often overlooked. Instead of passing data down through many levels, you can pass already-rendered JSX as the `children` prop or as named prop slots. This lets the top-level component render the deeply nested component directly and pass props to it at that level, eliminating the intermediate chain. This is the most performant solution but requires restructuring your component tree.

State management libraries like Redux, Zustand, or Jotai provide a global store that any component can read from directly. These are worth the overhead for large applications with complex shared state, but they add dependency and setup cost that is unnecessary for simpler cases.

### Key Points
- Prop drilling passes data through intermediate components that do not need it, creating coupling
- React Context API solves it for global data but causes re-renders of all consumers on change
- Component composition (passing JSX as children/slots) eliminates drilling without a global store
- State management libraries (Redux, Zustand) provide a global store accessible from any component
- Choose the lightest solution: composition first, context for global data, library for complex state

### Follow-up Prompts
- When would you choose Context over a state management library like Zustand?
- How does component composition solve prop drilling differently from Context?
- What are the performance implications of putting frequently-updated state in React Context?

### Difficulty: basic
### Tags: prop-drilling, context, composition, state-management

---

## Q15: How do you use CSS Modules in React?

### Question
What are CSS Modules, how do you use them in a React project, and what problems do they solve compared to plain CSS?

### Model Answer
CSS Modules are a CSS file format where all class names and animation names are scoped locally by default. When you import a CSS Module file into a React component, the imported object contains the actual generated class names — which are unique hashes — that you use in your JSX. This prevents naming collisions between different components, even if they use the same class name in their respective CSS files.

To use a CSS Module, you name your file with the `.module.css` extension (e.g., `Button.module.css`). In your React component, you import it as an object: `import styles from './Button.module.css'`. You then apply classes using the imported object: `<button className={styles.primary}>`. The build tool (Vite, webpack, or Create React App) transforms the class name into something like `Button_primary__3aB7f`, ensuring it is unique across the entire application.

The main problem CSS Modules solve is global scope. In plain CSS, all class names live in one global namespace, so a class named `.button` in one file can accidentally conflict with a `.button` class in another file, leading to style bleed. CSS Modules eliminate this by making styles local by default. You can still have global styles when needed using the `:global()` syntax, but this is opt-in rather than the default.

CSS Modules also enable you to compose styles using the `composes` keyword. A class can inherit styles from another class within the same file or from another module entirely. This is useful for building on top of base styles without duplication.

Compared to CSS-in-JS solutions like styled-components or Emotion, CSS Modules are closer to plain CSS and do not require a runtime JavaScript library. They produce static CSS files at build time, which can be cached more efficiently and have no runtime overhead. Many developers prefer them for their simplicity and familiarity.

### Key Points
- CSS Modules scope class names locally by default, preventing global style collisions
- Import as an object and use `styles.className` syntax in JSX
- File naming convention is `ComponentName.module.css`
- Build tools transform class names into unique identifiers at build time
- No runtime overhead — generates static CSS files, unlike CSS-in-JS libraries

### Follow-up Prompts
- How would you apply a global style override when using CSS Modules?
- How does CSS Modules compare to Tailwind CSS or styled-components?
- How do you apply multiple class names conditionally with CSS Modules?

### Difficulty: basic
### Tags: css-modules, styling, scoped-css, build-tools

---

## Q16: Explain the React component lifecycle (mount, update, unmount)

### Question
Describe the three phases of a React component's lifecycle. How do you handle each phase in both class components and functional components with hooks?

### Model Answer
Every React component goes through three lifecycle phases: mounting (appearing on screen), updating (re-rendering due to state or prop changes), and unmounting (being removed from the screen). Understanding these phases is essential for managing side effects like data fetching, subscriptions, and cleanup.

During the mounting phase, a component is created and inserted into the DOM for the first time. In class components, the `constructor` runs first to initialize state, then `render` produces the JSX, and finally `componentDidMount` fires after the component is in the DOM. This is where you would start data fetches, set up subscriptions, or interact with DOM nodes. In functional components, the body of the function serves as the render, and a `useEffect` with an empty dependency array `[]` serves as `componentDidMount` — it runs once after the first render.

The updating phase occurs whenever the component's state or props change. In class components, `render` is called again, and after the DOM updates, `componentDidUpdate(prevProps, prevState)` fires. You compare current props/state with previous values to decide whether to take action (e.g., re-fetch data when an ID prop changes). In functional components, `useEffect` with specific dependencies handles this: the effect runs after every render where those dependencies changed.

The unmounting phase is when the component is removed from the DOM. In class components, `componentWillUnmount` fires just before removal — this is where you cancel subscriptions, clear timers, or cancel in-flight requests. In functional components, the cleanup function returned from `useEffect` serves this purpose. If you return a function from `useEffect`, React calls it before the next effect runs and before the component unmounts.

One key insight is that `useEffect` unifies all three lifecycle phases into a single, more composable API. Each `useEffect` call handles one concern, and the relationship between setup (effect body) and teardown (cleanup function) is co-located, making it easier to avoid cleanup bugs that were common with class component lifecycle methods split across multiple methods.

### Key Points
- Mount: component first appears; `componentDidMount` / `useEffect(() => {}, [])`
- Update: state or props change causes re-render; `componentDidUpdate` / `useEffect(() => {}, [dep])`
- Unmount: component removed from DOM; `componentWillUnmount` / cleanup function returned from `useEffect`
- `useEffect` with no dependency array runs after every render; with `[]` runs once; with deps runs when deps change
- Return a cleanup function from `useEffect` to handle subscriptions, timers, and cancellations

### Follow-up Prompts
- What happens if you omit the dependency array from useEffect entirely?
- How would you cancel a fetch request when a component unmounts?
- Why is it important to clean up event listeners in the unmounting phase?

### Difficulty: basic
### Tags: lifecycle, use-effect, mount, unmount, class-components

---

## Q17: What are default props in React and how do you define them?

### Question
Explain default props in React. What are the different ways to define them, and when should you use them?

### Model Answer
Default props allow you to specify fallback values for props that a component expects but did not receive. When a parent component renders a child without providing a certain prop, React uses the default value instead of leaving it undefined. This makes components more robust and self-documenting.

In functional components, the idiomatic modern way to define default props is to use JavaScript's default parameter syntax directly in the function signature. For example: `function Button({ variant = 'primary', size = 'medium', disabled = false }) { ... }`. This is concise, readable, and works with TypeScript's type inference naturally. The defaults are visible right at the top of the component definition.

The older approach is to use the static `defaultProps` property on the component. For class components, you write `MyComponent.defaultProps = { variant: 'primary' }` outside the class body, or as a static class property. For functional components, the same pattern works: `Button.defaultProps = { variant: 'primary' }`. However, the React team has deprecated `defaultProps` for functional components and plans to remove it in a future version, so the parameter default syntax should be preferred.

For TypeScript users, you can combine default parameter values with a TypeScript interface or type to get both type safety and default values: the type declares the prop as optional (`variant?: string`) and the default in the destructuring provides the fallback. TypeScript correctly infers that the prop will always be a string inside the component even though callers may omit it.

Default props are most useful for presentational/UI components with many optional configuration props (like a Button with variant, size, color, disabled), components consumed by many different parts of the codebase where you want predictable behavior without requiring every caller to provide every prop, and developer experience — they serve as documentation of what a component considers a "normal" state.

### Key Points
- Modern approach: JavaScript default parameter syntax in destructured props (`{ count = 0 }`)
- Legacy approach: `Component.defaultProps = { ... }` — deprecated for functional components
- TypeScript: combine optional type (`prop?: Type`) with destructuring default for type safety
- Default props make components self-documenting and robust against missing props
- `defaultProps` on class components is not deprecated and still works

### Follow-up Prompts
- What is the difference between a default prop and a fallback value using the `??` operator inside the component body?
- How do you handle default props for object or array type props without causing re-render issues?
- Is there a case where defaultProps on a class component behaves differently than you'd expect?

### Difficulty: basic
### Tags: default-props, props, functional-components, typescript

---

## Q18: What are the different patterns for using the children prop?

### Question
Explain the `children` prop in React. What are the different ways you can work with it, and when would you use each pattern?

### Model Answer
The `children` prop is a special prop automatically provided by React that contains whatever JSX or content was placed between a component's opening and closing tags. It enables the "slot" pattern — a component can render content without knowing what that content is ahead of time, making it highly reusable.

The simplest use is just rendering `{props.children}` or `{children}` directly in the component's JSX. This is how container components like cards, modals, and layout wrappers work. The parent decides what goes inside, and the container provides the surrounding structure. This is a powerful alternative to prop drilling — instead of passing data down to a child, you can lift the child's rendering up to where the data is and pass the already-rendered element down as children.

When you need more control, React provides the `React.Children` API. `React.Children.map` lets you iterate over children and transform them, similar to `Array.map`. `React.Children.count` returns the number of children. `React.Children.only` asserts that there is exactly one child and returns it. These utilities handle edge cases like null children or single vs multiple children that plain array operations do not.

Named slot patterns can be achieved by passing JSX as explicitly named props rather than (or in addition to) children. For example, a `Modal` component might accept `header={<h2>Title</h2>}` and `footer={<Button>Close</Button>}` as separate props alongside `children` for the body. This gives the parent full control over multiple distinct regions of the component.

The function-as-children pattern (also called render props with children) allows passing a function as children: `{children => children(data)}`. This lets the parent component receive data from the child component and decide how to render it, which was a key pattern for code reuse before hooks but is now less common.

### Key Points
- `children` is a special prop automatically populated with JSX placed between component tags
- Use `{children}` directly for simple container/wrapper components
- `React.Children.map/count/only` provide utilities for iterating and validating children
- Named slot pattern: pass JSX as explicit props for multiple content regions
- Function-as-children / render props pattern: children is a function that receives data

### Follow-up Prompts
- What are the limitations of using React.Children.map compared to just treating children as an array?
- How would you implement a compound component using children?
- What happens when children is null or undefined and you try to render it?

### Difficulty: basic
### Tags: children-prop, composition, render-props, slots

---

## Q19: What are React Portals and when would you use them?

### Question
What are React Portals? Explain the problem they solve and give examples of appropriate use cases.

### Model Answer
React Portals provide a way to render a component's output into a different DOM node than its parent component. Normally, a component's rendered output is inserted into the DOM as a child of its parent element. With a portal, you can "teleport" the rendered output to any DOM node in the document — most commonly to `document.body` or a dedicated container element.

You create a portal using `ReactDOM.createPortal(children, domNode)` where `children` is the JSX you want to render and `domNode` is the target DOM element. This is typically used in the `return` statement of a component or in a component specifically dedicated to rendering portals.

The main problem portals solve is CSS overflow and stacking context. If a modal or tooltip is rendered deep inside a component tree where an ancestor has `overflow: hidden` or `position: relative`, the modal might be clipped or appear behind other elements. By rendering the modal into `document.body`, it escapes all ancestor stacking contexts and appears on top of everything else in the document, regardless of where it is in the React component tree.

Despite rendering outside the parent DOM node, portals preserve all React tree behaviors. Events bubble up through the React component tree as if the portal content were normally positioned — clicks inside a portal still trigger event handlers on ancestor React components. Context works across portals too — a portal component can consume context provided by an ancestor even though it renders in a different part of the DOM.

Common use cases include: modal dialogs (need to appear above all other content), tooltips and dropdowns (need to escape overflow containers), toast notifications (need to appear at the edge of the screen regardless of where they are triggered in the tree), and any UI that visually needs to "break out" of its container.

### Key Points
- `ReactDOM.createPortal(jsx, domNode)` renders JSX into a different part of the real DOM
- Solves overflow clipping and stacking context problems for modals and overlays
- React event bubbling and Context still work normally through portals
- Portal output appears in a different DOM location but remains in the same React component tree
- Common uses: modals, tooltips, dropdowns, toast notifications

### Follow-up Prompts
- How do you handle accessibility (focus management, aria attributes) when using a portal for a modal?
- If a user clicks inside a portal modal, does the click event bubble to the portal's React parent?
- How would you implement a reusable Modal component using a portal?

### Difficulty: basic
### Tags: portals, react-dom, modal, stacking-context, accessibility

---

## Q20: What are synthetic events in React?

### Question
What are synthetic events in React? How do they differ from native browser events, and why does React use them?

### Model Answer
Synthetic events are React's wrapper around the browser's native event system. When you write `onClick`, `onChange`, or `onSubmit` in JSX, React does not attach native event listeners directly to each DOM element. Instead, React attaches a single event listener at the root of the application and uses event delegation to handle events from all elements. When an event fires, React creates a SyntheticEvent object that wraps the native event and normalizes it across different browsers.

The SyntheticEvent object has the same interface as a native browser event — properties like `target`, `currentTarget`, `preventDefault()`, and `stopPropagation()` all work the same way. This means you can use React event handlers exactly like native event handlers without worrying about browser differences. The normalization is particularly valuable for events that historically behaved differently across browsers, like drag events and focus events.

One important historical behavior (changed in React 17) was event pooling. Before React 17, React reused SyntheticEvent objects for performance — after an event handler finished, the event's properties were set to null and the object was returned to a pool. This meant you could not access the event asynchronously (e.g., inside a setTimeout). If you needed async access, you had to call `event.persist()`. React 17 removed event pooling entirely, so you can now safely access event properties asynchronously.

React 17 also changed where event listeners are attached. Previously, React attached its listener to `document`. Now it attaches to the root DOM container (the element passed to `ReactDOM.createRoot()`). This makes it easier to embed multiple React applications on the same page without their events interfering with each other.

One practical difference to be aware of: calling `stopPropagation()` on a synthetic event stops React's event propagation, but because React uses delegation, the native event has already reached the root before React processes it. Native event listeners added with `addEventListener` at the document level may still fire.

### Key Points
- Synthetic events wrap native browser events with a normalized, cross-browser compatible interface
- React uses event delegation — one listener at the root handles all events, not one per element
- The same API as native events: `preventDefault()`, `stopPropagation()`, `target`, etc.
- React 17 removed event pooling — async event property access is now safe without `persist()`
- React 17 moved event delegation from `document` to the React root container

### Follow-up Prompts
- How would you add a native (non-React) event listener to a DOM node inside a React component?
- Why might `stopPropagation()` on a synthetic event not prevent a native document-level listener from firing?
- What is the difference between the `onChange` event in React and the native `change` event in the browser?

### Difficulty: basic
### Tags: synthetic-events, event-delegation, event-handling, react-17

---
