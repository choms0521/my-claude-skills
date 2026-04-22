# JavaScript - Junior Interview Questions (Extended 2)
### Language: en

## Q21: What does `Function.prototype.bind` do and when would you use it?

### Question
Explain `Function.prototype.bind`. What does it return, how does it work, and what are common scenarios where you need it?

### Model Answer
`Function.prototype.bind` creates and returns a new function that, when called, has its `this` keyword permanently set to the provided value, regardless of how the function is later invoked. The original function is not modified — `bind` always produces a new function.

The syntax is `const boundFn = originalFn.bind(thisArg, arg1, arg2, ...)`. The first argument becomes the `this` value inside the bound function. Any additional arguments are "pre-filled" as the leading arguments when the bound function is called — this is partial application. For example, `const double = multiply.bind(null, 2)` creates a function that always multiplies its argument by 2.

The most common use case is preserving `this` context when passing methods as callbacks. Consider an object method like `obj.handleClick`. If you pass it as `element.addEventListener('click', obj.handleClick)`, the method loses its `this` binding — inside the callback, `this` will refer to the element, not `obj`. Using `element.addEventListener('click', obj.handleClick.bind(obj))` ensures `this` stays bound to `obj`.

In class-based React (before hooks), `bind` was heavily used in constructors to bind event handler methods: `this.handleClick = this.handleClick.bind(this)`. Modern code often uses arrow functions instead, since arrow functions inherit `this` from their enclosing scope. However, understanding `bind` remains important because it is more explicit and offers partial application that arrow functions do not.

A bound function cannot be re-bound — calling `bind` again on an already-bound function does not change the original `this` binding. Also, bound functions do not have their own `prototype` property, so they cannot be used as constructors with `new`.

### Key Points
- `bind` returns a new function with `this` permanently set to the provided value
- Additional arguments to `bind` are pre-filled (partial application)
- Most commonly used to preserve `this` context when passing methods as callbacks
- A bound function cannot be re-bound to a different `this`
- Arrow functions are often used as an alternative, but `bind` offers explicit partial application

### Follow-up Prompts
- What is the difference between `bind`, `call`, and `apply`?
- Why can't you re-bind a function that has already been bound?
- How do arrow functions eliminate the need for `bind` in many cases?

### Difficulty: basic
### Tags: bind, this, context, partial application, Function.prototype

---

## Q22: What is the difference between `.call()` and `.apply()`?

### Question
Explain `Function.prototype.call` and `Function.prototype.apply`. How do they differ from each other and from `bind`?

### Model Answer
Both `call` and `apply` invoke a function immediately with a specified `this` value. The only difference between them is how they accept additional arguments: `call` takes arguments individually (comma-separated), while `apply` takes them as a single array (or array-like object).

```javascript
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: 'Alice' };

greet.call(user, 'Hello', '!');    // "Hello, Alice!"
greet.apply(user, ['Hello', '!']); // "Hello, Alice!"
```

A helpful mnemonic: **C**all takes **C**omma-separated arguments; **A**pply takes an **A**rray.

Before the spread operator existed, `apply` was the standard way to pass an array of arguments to a function that expected individual parameters. The classic example was `Math.max.apply(null, [1, 5, 3])` to find the maximum value in an array. With ES6, `Math.max(...[1, 5, 3])` is cleaner and has largely replaced this pattern.

The key difference from `bind` is that `call` and `apply` invoke the function immediately, while `bind` returns a new function without calling it. Use `call`/`apply` when you want to execute the function right away with a specific `this`. Use `bind` when you want to create a reusable function with a permanently bound `this` for later invocation.

A practical use case for `call` is borrowing methods from other objects. For example, `Array.prototype.slice.call(arguments)` converts the `arguments` object into a real array. Another example: `Object.prototype.toString.call(value)` gives precise type information like `"[object Array]"` or `"[object Null]"`.

### Key Points
- `call` invokes a function with a given `this` and comma-separated arguments
- `apply` invokes a function with a given `this` and an array of arguments
- Both execute the function immediately, unlike `bind` which returns a new function
- `apply` was historically used to spread arrays into function arguments; ES6 spread (`...`) is now preferred
- Method borrowing via `call` (e.g., `Array.prototype.slice.call(arguments)`) is a common pattern

### Follow-up Prompts
- When would you still use `apply` now that the spread operator exists?
- How would you use `call` to borrow `Array.prototype.forEach` for a NodeList?
- What happens if you pass `null` or `undefined` as the first argument to `call` or `apply`?

### Difficulty: basic
### Tags: call, apply, this, context, Function.prototype, method borrowing

---

## Q23: What is an IIFE and why would you use one?

### Question
What does IIFE stand for? Explain its syntax, how it works, and why developers use it.

### Model Answer
IIFE stands for Immediately Invoked Function Expression. It is a function that is defined and executed in the same statement. The basic syntax wraps a function expression in parentheses and then calls it immediately:

```javascript
(function() {
  const secret = 'hidden';
  console.log('I run immediately!');
})();

// Arrow function IIFE
(() => {
  const secret = 'hidden';
  console.log('Arrow IIFE!');
})();
```

The outer parentheses are necessary because JavaScript treats `function` at the start of a statement as a function declaration, which requires a name and cannot be immediately invoked. Wrapping it in parentheses forces the parser to treat it as a function expression, which can then be called with the trailing `()`.

The primary purpose of an IIFE is to create a private scope. Before ES6 introduced `let`, `const`, and block scoping, `var` declarations were function-scoped, meaning they leaked into the surrounding scope. An IIFE provided a clean way to encapsulate variables without polluting the global namespace. This was the foundation of the Module Pattern — one of the most important JavaScript design patterns before ES Modules.

```javascript
const counter = (function() {
  let count = 0;
  return {
    increment() { return ++count; },
    getCount() { return count; }
  };
})();

counter.increment(); // 1
counter.getCount();  // 1
// count is not accessible from outside
```

IIFEs can also accept arguments: `(function(window, document) { /* use window and document */ })(window, document)`. This pattern was common in jQuery plugins and library code to create short local aliases and protect against global variable reassignment.

In modern JavaScript with ES Modules and block-scoped variables, IIFEs are less necessary. However, they still appear in specific scenarios: wrapping `await` in non-module scripts (async IIFE), isolating code in bundler output, and preventing variable leakage in inline scripts.

### Key Points
- IIFE is a function expression that executes immediately upon definition
- The wrapping parentheses convert a function declaration into a function expression
- Primary purpose: creating a private scope to avoid polluting the global namespace
- Foundation of the Module Pattern before ES Modules existed
- Less necessary in modern code with `let`, `const`, and ES Modules, but still used for async IIFEs and isolation

### Follow-up Prompts
- How does the Module Pattern use IIFEs to create public and private members?
- Why are IIFEs less common in modern JavaScript?
- What is an async IIFE and when would you use one?

### Difficulty: basic
### Tags: IIFE, scope, module pattern, encapsulation, function expression

---

## Q24: What is the difference between `forEach` and `map`?

### Question
Explain the difference between `Array.prototype.forEach` and `Array.prototype.map`. When should you use each one?

### Model Answer
The fundamental difference is that `map` returns a new array containing the results of calling a function on every element, while `forEach` returns `undefined` and is used purely for side effects. This distinction drives all decisions about which one to use.

```javascript
const numbers = [1, 2, 3, 4];

// map: transforms each element and returns a new array
const doubled = numbers.map(n => n * 2);
// doubled = [2, 4, 6, 8], numbers is unchanged

// forEach: performs an action for each element, returns nothing
numbers.forEach(n => console.log(n));
// logs 1, 2, 3, 4 — returns undefined
```

Use `map` when you need to transform data — converting an array of one shape into an array of another shape. This is extremely common: mapping API response objects to UI-friendly objects, extracting specific properties, performing calculations, or rendering arrays of React components. Since `map` returns a new array, it supports method chaining: `arr.map(transform).filter(condition).reduce(accumulator)`.

Use `forEach` when you want to perform side effects for each element without needing a resulting array — for example, logging each item, updating an external data structure, or sending multiple API requests. Since `forEach` returns `undefined`, it cannot be chained.

A common mistake is using `map` when you don't need the returned array. If you write `arr.map(item => console.log(item))`, you create an array of `undefined` values that is immediately discarded — this is wasteful and misleading. Use `forEach` for side-effect-only operations.

Another important behavioral difference: neither `forEach` nor `map` can be stopped early. Unlike a `for` loop, you cannot use `break` inside them. If you need early termination, use `for...of`, `some`, `every`, or `find` instead. Both `forEach` and `map` skip empty slots in sparse arrays but do execute for elements whose value is `undefined`.

### Key Points
- `map` returns a new array with transformed elements; `forEach` returns `undefined`
- Use `map` when you need a transformed array; use `forEach` for side effects only
- `map` supports method chaining; `forEach` does not
- Do not use `map` when you discard the result — it creates a wasted array
- Neither can be stopped with `break`; use `for...of` or `some`/`every` for early termination

### Follow-up Prompts
- What happens if you mutate the original array inside a `map` callback?
- How does `flatMap` differ from `map`?
- When would you choose `reduce` over `map` followed by `filter`?

### Difficulty: basic
### Tags: forEach, map, array methods, transformation, iteration, functional

---

## Q25: What are host objects vs native objects?

### Question
Explain the difference between host objects and native objects in JavaScript. Give examples of each.

### Model Answer
Native objects (also called built-in objects or standard objects) are objects defined by the ECMAScript specification itself. They exist in every JavaScript environment regardless of where the code runs. Examples include `Object`, `Array`, `Function`, `String`, `Number`, `Boolean`, `Date`, `RegExp`, `Map`, `Set`, `Promise`, `Error`, `Math`, `JSON`, and `Symbol`. These are part of the language specification and their behavior is standardized across all compliant engines.

Host objects are objects provided by the runtime environment — not by the JavaScript language itself. In a browser, host objects include `window`, `document`, `navigator`, `location`, `history`, `XMLHttpRequest`, `fetch`, `console`, `localStorage`, `sessionStorage`, the DOM elements (`HTMLElement`, `HTMLDivElement`, etc.), and event objects. In Node.js, host objects include `process`, `Buffer`, `global`, `__dirname`, `__filename`, and modules from the Node.js standard library like `fs` and `http`.

The distinction matters because native objects behave identically everywhere — `Array.prototype.map` works the same in Chrome, Firefox, Node.js, and Deno. Host objects, however, differ between environments. Code that uses `document.querySelector` fails in Node.js because the DOM is a browser host object. Code that uses `process.env` fails in the browser because `process` is a Node.js host object.

Historically, host objects in older browsers (especially Internet Explorer) did not always follow the same rules as native objects. For example, some DOM host objects did not inherit from `Object.prototype`, and calling `Array.prototype.slice` on a `NodeList` could throw errors. Modern browsers have largely resolved these inconsistencies — DOM objects now properly inherit from JavaScript prototypes.

Understanding this distinction helps when writing isomorphic or universal JavaScript — code intended to run in both browser and server environments. You must check for the existence of host objects before using them, or use abstractions that hide environment-specific APIs.

### Key Points
- Native objects are defined by the ECMAScript specification and exist in every JavaScript environment
- Host objects are provided by the runtime environment (browser, Node.js, Deno, etc.)
- Examples of native: `Object`, `Array`, `Promise`, `Map`, `Date`
- Examples of host: `window`, `document`, `fetch` (browser); `process`, `Buffer` (Node.js)
- Code relying on host objects is environment-specific; native object behavior is universal

### Follow-up Prompts
- How would you check if a host object like `window` or `document` exists before using it?
- Is `console` a native object or a host object?
- What are user-defined objects and how do they relate to native and host objects?

### Difficulty: basic
### Tags: host objects, native objects, built-in objects, environment, ECMAScript, DOM

---

## Q26: What is the same-origin policy in JavaScript?

### Question
Explain the same-origin policy. What does it protect against, what defines "same origin," and how can you work around it when needed?

### Model Answer
The same-origin policy is a critical security mechanism implemented by web browsers that restricts how a document or script loaded from one origin can interact with resources from another origin. It prevents malicious websites from reading sensitive data from other sites that the user is logged into.

Two URLs have the same origin if and only if they share the same protocol (scheme), hostname, and port number. For example, `https://example.com:443/page1` and `https://example.com:443/page2` are same-origin. But `https://example.com` and `http://example.com` are different origins (different protocol). `https://example.com` and `https://api.example.com` are different origins (different hostname). `https://example.com` and `https://example.com:8080` are different origins (different port).

The same-origin policy restricts several types of interactions. JavaScript cannot read the response of a `fetch` or `XMLHttpRequest` to a different origin unless the server explicitly allows it. An `iframe` from a different origin cannot have its DOM accessed by the parent page's JavaScript. `localStorage` and `sessionStorage` are isolated per origin.

When you legitimately need cross-origin communication, several mechanisms exist. CORS (Cross-Origin Resource Sharing) is the most common: the server includes `Access-Control-Allow-Origin` headers in its response, telling the browser which origins are allowed to read the data. For simple requests (GET, POST with certain content types), the browser sends the request and checks the header on the response. For complex requests, the browser sends a preflight `OPTIONS` request first.

Other cross-origin techniques include `postMessage` for communication between windows or iframes, JSONP (legacy technique using `<script>` tags to bypass restrictions), and server-side proxying where your backend fetches the external resource and forwards it to your frontend.

### Key Points
- Same-origin means identical protocol, hostname, and port
- Prevents scripts on one origin from reading responses or DOM from another origin
- CORS headers from the server are the standard way to allow cross-origin requests
- `localStorage`, `sessionStorage`, and cookies are scoped to origin
- `postMessage` enables safe cross-origin communication between windows and iframes

### Follow-up Prompts
- What is a CORS preflight request and when does the browser send one?
- How does `Access-Control-Allow-Credentials` affect cross-origin cookie handling?
- What is the difference between CORS and a server-side proxy for cross-origin requests?

### Difficulty: basic
### Tags: same-origin policy, CORS, security, cross-origin, browser security, origin

---

## Q27: What is "use strict" and what are its advantages and disadvantages?

### Question
Explain JavaScript's strict mode. How do you enable it, what does it change, and what are the trade-offs?

### Model Answer
Strict mode is a way to opt into a restricted variant of JavaScript that eliminates some silent errors, prevents certain unsafe actions, and disables features that are confusing or poorly designed. You enable it by placing the string `"use strict";` at the top of a file or at the beginning of a function body.

```javascript
"use strict";

// File-level strict mode — applies to entire file

function strictFunction() {
  "use strict";
  // Function-level strict mode — applies only inside this function
}
```

The main advantages of strict mode are significant. First, it catches common coding mistakes by turning silent errors into thrown errors. Assigning to an undeclared variable throws a `ReferenceError` instead of silently creating a global variable. Assigning to a non-writable property, a getter-only property, or a non-extensible object throws a `TypeError`. Deleting undeletable properties throws an error.

Second, strict mode prevents potentially dangerous features. The `with` statement is completely forbidden. `eval` does not introduce variables into the surrounding scope. `this` inside a plain function call is `undefined` instead of the global object — this prevents accidental global object mutation and makes it easier to catch missing `this` bindings.

Third, strict mode reserves some keywords for future ECMAScript versions: `implements`, `interface`, `let`, `package`, `private`, `protected`, `public`, `static`, and `yield`. Using them as variable names throws an error, which was forward-looking for ES6.

The disadvantages are relatively minor. Mixing strict and non-strict code can cause confusion, especially when concatenating scripts. Some older third-party libraries may not work in strict mode. There is a very small performance overhead in some engines for the additional checks, though modern engines have largely optimized this away.

In practice, strict mode is now the default in ES Modules (`import`/`export` files) and inside ES6 classes. If you write modern JavaScript with modules and classes, you are already in strict mode without needing the directive explicitly.

### Key Points
- Enable with `"use strict";` at the top of a file or function
- Turns silent errors into thrown exceptions (undeclared variables, non-writable property assignments)
- `this` is `undefined` in plain function calls instead of the global object
- Forbids `with` statement and prevents `eval` from leaking variables
- ES Modules and classes are automatically in strict mode

### Follow-up Prompts
- Why does strict mode make `this` equal to `undefined` in regular function calls?
- What happens when strict mode code calls a non-strict function, or vice versa?
- Since ES Modules are strict by default, is there ever a reason to write `"use strict"` explicitly?

### Difficulty: basic
### Tags: use strict, strict mode, error handling, ES5, modules, safety

---

## Q28: What is the difference between mutable and immutable objects, and how do you make an object immutable in JavaScript?

### Question
Explain mutability and immutability in JavaScript. Why does immutability matter, and what tools does JavaScript provide to make objects immutable?

### Model Answer
A mutable object is one whose state can be changed after it is created. A immutable object is one whose state cannot be modified once created. In JavaScript, primitive values (strings, numbers, booleans, `null`, `undefined`, `Symbol`, `BigInt`) are inherently immutable — you cannot change the value `42` or mutate the string `"hello"`. Objects and arrays, on the other hand, are mutable by default — you can add, change, or delete properties and elements at any time.

```javascript
// Mutable: object can be changed
const user = { name: 'Alice', age: 25 };
user.age = 26; // This works — the object is mutated

// Immutable approach: create a new object instead
const updatedUser = { ...user, age: 26 };
// user is unchanged, updatedUser has the new age
```

Immutability matters because it makes code more predictable and easier to reason about. When objects cannot be changed, you never have to worry about a function unexpectedly modifying data you passed to it. This eliminates an entire category of bugs — especially in complex applications with shared state. Immutability also enables efficient change detection: instead of deep-comparing object contents, you can use reference equality (`===`) to check if something has changed, which is exactly how React's rendering optimization works.

JavaScript provides several built-in methods for object immutability. `Object.freeze(obj)` prevents adding, removing, or modifying properties — it makes the object completely frozen. However, `Object.freeze` is shallow: nested objects inside a frozen object are still mutable. To deeply freeze an object, you must recursively freeze all nested objects.

`Object.seal(obj)` prevents adding or removing properties but still allows modifying existing property values. `Object.preventExtensions(obj)` only prevents adding new properties.

```javascript
const config = Object.freeze({ api: 'https://api.example.com', timeout: 5000 });
config.timeout = 10000; // Silently fails (throws in strict mode)
config.newProp = true;  // Silently fails (throws in strict mode)
```

For application-level immutability patterns, developers typically use the spread operator or `Object.assign` to create new objects with modifications, rather than relying on `Object.freeze`. Libraries like Immer simplify this by letting you write "mutating" code that actually produces immutable updates behind the scenes.

### Key Points
- Primitives are immutable by nature; objects and arrays are mutable by default
- Immutability prevents unexpected side effects and enables efficient change detection
- `Object.freeze` makes an object's properties non-writable and non-configurable (shallow only)
- `Object.seal` prevents adding/removing properties but allows modifying existing values
- Use spread operator or libraries like Immer for practical immutable update patterns

### Follow-up Prompts
- How would you implement a deep freeze function that recursively freezes nested objects?
- How does immutability help React determine when to re-render a component?
- What is the difference between `Object.freeze`, `Object.seal`, and `Object.preventExtensions`?

### Difficulty: basic
### Tags: immutability, mutability, Object.freeze, Object.seal, state management, spread operator

---

## Q29: What is event bubbling and how does it work?

### Question
Explain event bubbling in JavaScript. How does it relate to event capturing, and how can you control event propagation?

### Model Answer
Event bubbling is the default behavior in the DOM where an event triggered on a target element propagates upward through its ancestor elements, all the way up to the `document` and `window` objects. When you click a button inside a `<div>` inside a `<section>`, the click event fires first on the button, then on the `<div>`, then on the `<section>`, and so on up the DOM tree.

```html
<div id="parent">
  <button id="child">Click me</button>
</div>

<script>
document.getElementById('parent').addEventListener('click', () => {
  console.log('Parent clicked');
});
document.getElementById('child').addEventListener('click', () => {
  console.log('Child clicked');
});
// Clicking the button logs: "Child clicked" then "Parent clicked"
</script>
```

Event propagation actually has three phases: capturing (going down from `window` to the target), target (the element that triggered the event), and bubbling (going back up from the target to `window`). By default, event listeners are registered for the bubbling phase. To listen during the capturing phase instead, pass `{ capture: true }` as the third argument to `addEventListener`.

You can stop an event from continuing to propagate with `event.stopPropagation()`. This prevents the event from reaching parent elements during bubbling (or child elements during capturing). There is also `event.stopImmediatePropagation()`, which stops propagation and also prevents any other listeners on the same element from firing.

Event bubbling enables a powerful pattern called event delegation. Instead of attaching an event listener to every item in a list, you attach a single listener to the parent container. When any child is clicked, the event bubbles up to the parent, and you use `event.target` to identify which child was clicked. This is more memory-efficient (one listener instead of hundreds) and automatically handles dynamically added elements.

```javascript
document.getElementById('list').addEventListener('click', (event) => {
  if (event.target.matches('li')) {
    console.log('Clicked item:', event.target.textContent);
  }
});
```

Not all events bubble. `focus`, `blur`, `load`, `unload`, `scroll` (on certain elements), and some other events do not bubble. Their bubbling equivalents — `focusin`, `focusout` — do bubble and are often preferred for delegation.

### Key Points
- Event bubbling means events propagate upward from the target element through its ancestors
- Three phases: capturing (down), target, bubbling (up) — listeners default to the bubbling phase
- `event.stopPropagation()` stops further propagation; `event.stopImmediatePropagation()` also stops sibling listeners
- Event delegation uses bubbling to handle events on a parent instead of individual children
- Not all events bubble — `focus` and `blur` do not; use `focusin` and `focusout` instead

### Follow-up Prompts
- How would you implement event delegation for a dynamically generated list?
- What is the difference between `event.target` and `event.currentTarget`?
- When would you use event capturing instead of event bubbling?

### Difficulty: basic
### Tags: event bubbling, event capturing, event delegation, DOM events, stopPropagation, addEventListener

---

## Q30: What is the difference between synchronous and asynchronous functions?

### Question
Explain synchronous and asynchronous execution in JavaScript. Why is asynchronous programming important, and what mechanisms does JavaScript provide for it?

### Model Answer
Synchronous code executes line by line, in order. Each statement must complete before the next one begins. If a synchronous operation takes a long time — such as a complex computation — it blocks everything else from running. In a browser, this means the UI freezes: the user cannot click buttons, scroll, or type until the blocking operation finishes.

```javascript
// Synchronous: each line waits for the previous one
console.log('First');
const result = heavyComputation(); // Blocks until complete
console.log('Second'); // Only runs after heavyComputation finishes
```

Asynchronous code, on the other hand, allows operations to be initiated and then completed later without blocking the execution of subsequent code. When an async operation starts (like fetching data from a server), JavaScript continues executing the next lines. When the operation completes, a callback or promise resolution runs to handle the result.

```javascript
// Asynchronous: fetch does not block
console.log('First');
fetch('/api/data')
  .then(response => response.json())
  .then(data => console.log('Data received:', data));
console.log('Second'); // Runs immediately, before data arrives
// Output order: "First", "Second", "Data received: ..."
```

This non-blocking behavior is essential because JavaScript is single-threaded — it has only one call stack. Without asynchronous patterns, any network request, file read, or timer would freeze the entire application. The event loop is the mechanism that makes async code possible: when an async operation completes, its callback is placed in a task queue, and the event loop picks it up when the call stack is empty.

JavaScript provides several mechanisms for asynchronous programming, evolved over time. Callbacks were the original approach: pass a function to be called when the operation completes. Promises (ES6) added a cleaner chainable structure with `.then()` and `.catch()`. `async`/`await` (ES2017) is syntactic sugar over Promises that lets you write asynchronous code that reads like synchronous code, using `await` to pause execution within an `async` function until a Promise resolves.

```javascript
// async/await: reads like synchronous code
async function loadData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    console.log('Data:', data);
  } catch (error) {
    console.error('Failed to load:', error);
  }
}
```

Understanding the distinction is fundamental to writing responsive JavaScript applications. Heavy synchronous computations should be offloaded to Web Workers, and I/O operations should always use asynchronous APIs.

### Key Points
- Synchronous code executes sequentially and blocks until each operation completes
- Asynchronous code initiates operations that complete later, without blocking subsequent code
- JavaScript is single-threaded; async programming prevents UI freezing during I/O operations
- The event loop manages async callbacks by processing them when the call stack is empty
- Evolution of async patterns: callbacks → Promises → `async`/`await`

### Follow-up Prompts
- How does the event loop decide the order in which async callbacks are executed?
- What is the difference between microtasks (Promise callbacks) and macrotasks (setTimeout callbacks)?
- How would you handle errors in a chain of multiple `await` calls?

### Difficulty: basic
### Tags: synchronous, asynchronous, event loop, Promise, async/await, single-threaded, callbacks

---
