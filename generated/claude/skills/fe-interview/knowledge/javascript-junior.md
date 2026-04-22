# JavaScript - Junior Interview Questions
### Language: en

## Q1: What is the difference between var, let, and const?

### Question
Explain the differences between `var`, `let`, and `const` in JavaScript. When would you use each one?

### Model Answer
`var`, `let`, and `const` are all ways to declare variables in JavaScript, but they differ in scope, hoisting behavior, and mutability.

`var` is function-scoped, meaning it is accessible anywhere within the function it is declared in. If declared outside a function, it becomes a global variable. `var` declarations are hoisted to the top of their scope and initialized with `undefined`, which can lead to subtle bugs where you access a variable before its assignment.

`let` is block-scoped, meaning it is only accessible within the nearest set of curly braces (`{}`). `let` is also hoisted but is NOT initialized, so accessing it before declaration throws a `ReferenceError`. This zone between the start of the block and the declaration is called the Temporal Dead Zone (TDZ).

`const` is also block-scoped like `let`. The key difference is that `const` requires an initializer and cannot be reassigned after declaration. However, `const` does not make the value itself immutable — if the value is an object or array, its properties or elements can still be modified.

As a best practice, prefer `const` by default, use `let` when you need to reassign a variable, and avoid `var` in modern code because its function-scoping and hoisting behavior can cause unexpected bugs.

```javascript
var x = 1;
if (true) {
  var x = 2; // same variable
  console.log(x); // 2
}
console.log(x); // 2

let y = 1;
if (true) {
  let y = 2; // different variable
  console.log(y); // 2
}
console.log(y); // 1

const z = { name: 'Alice' };
z.name = 'Bob'; // allowed - object mutation
z = {}; // TypeError - reassignment not allowed
```

### Key Points
- `var` is function-scoped; `let` and `const` are block-scoped
- All three are hoisted, but only `var` is initialized to `undefined`; `let`/`const` enter the Temporal Dead Zone
- `const` prevents reassignment but does not deeply freeze objects or arrays
- Prefer `const` by default, use `let` for reassignable variables, and avoid `var` in modern code

### Follow-up Prompts
- What is the Temporal Dead Zone and why does it exist?
- Can you show a real bug that `var` causes in a loop that `let` fixes?
- If `const` doesn't make objects immutable, how would you make a truly immutable object?

### Difficulty: basic
### Tags: variables, scoping, hoisting, es6, var, let, const

---

## Q2: What is hoisting in JavaScript?

### Question
Explain what hoisting is in JavaScript and give examples showing how it affects `var` declarations and function declarations differently.

### Model Answer
Hoisting is JavaScript's behavior of moving declarations to the top of their scope before code executes. It is important to understand that only declarations are hoisted, not initializations or assignments.

For `var` variables, the declaration is hoisted and automatically initialized to `undefined`. This means you can reference a `var` variable before its declaration line without getting an error — you simply get `undefined`.

```javascript
console.log(name); // undefined, not ReferenceError
var name = 'Alice';
console.log(name); // 'Alice'
```

Function declarations are fully hoisted — both the declaration and the function body are moved to the top. This means you can call a function before it appears in the source code.

```javascript
greet(); // 'Hello!' — works fine
function greet() {
  console.log('Hello!');
}
```

Function expressions and arrow functions assigned to variables are NOT fully hoisted. Only the variable declaration is hoisted (with `undefined`), not the function itself.

```javascript
greet(); // TypeError: greet is not a function
var greet = function() {
  console.log('Hello!');
};
```

`let` and `const` declarations are also hoisted to the top of their block, but they are NOT initialized. Accessing them before their declaration line causes a `ReferenceError` due to the Temporal Dead Zone.

Understanding hoisting is critical for debugging confusing bugs, especially when dealing with legacy `var`-heavy codebases or when accidentally relying on function declaration ordering.

### Key Points
- `var` declarations are hoisted and initialized to `undefined`; assignments stay in place
- Function declarations are fully hoisted (both declaration and body)
- Function expressions assigned with `var` only hoist the variable declaration, not the function
- `let` and `const` are hoisted but not initialized, creating the Temporal Dead Zone

### Follow-up Prompts
- Why does JavaScript hoist declarations in the first place — what problem does it solve?
- How does hoisting behave inside a class definition?
- What happens when a function declaration and a `var` declaration share the same name?

### Difficulty: basic
### Tags: hoisting, var, function declarations, temporal dead zone, scoping

---

## Q3: What is a closure and how does it work?

### Question
What is a closure in JavaScript? Explain with a practical example of when closures are useful.

### Model Answer
A closure is a function that retains access to variables from its outer (enclosing) scope even after that outer function has finished executing. In JavaScript, every time a function is created, it forms a closure over the variables in the scope where it was defined.

The key mechanism is that inner functions hold a reference to the outer scope's variable environment, not a copy of the values. This means closures can both read and write to the outer variables even after the outer function has returned.

A simple example is a counter factory:

```javascript
function makeCounter() {
  let count = 0;
  return function() {
    count++;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

Here, the inner function closes over `count`. Each call to `counter()` increments the same `count` variable. The `count` variable is private — nothing outside can directly access or reset it.

Closures are useful for data encapsulation (creating private state), function factories (creating specialized versions of a function), and callbacks that need context. They are foundational to patterns like the Module Pattern, memoization, and partial application.

A common closure pitfall is with loops and `var`:

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(function() { console.log(i); }, 1000);
}
// Prints: 3, 3, 3 (not 0, 1, 2)
```

Because `var` is function-scoped and all three callbacks close over the same `i`, they all see the final value. Using `let` (block-scoped) or wrapping in an IIFE fixes this.

### Key Points
- A closure gives a function access to its outer scope's variables after the outer function has returned
- Closures capture variable references, not values — changes to the variable are visible inside the closure
- Common uses: private state, function factories, event handlers that need context, memoization
- The `var` loop bug is a classic closure pitfall; `let` solves it because each iteration gets its own block scope

### Follow-up Prompts
- How can closures cause memory leaks, and how do you prevent them?
- Can you implement a memoization function using closures?
- How does the Module Pattern use closures to simulate private members?

### Difficulty: basic
### Tags: closures, scope, lexical scope, private state, function factory

---

## Q4: What is the difference between == and ===?

### Question
Explain the difference between `==` (loose equality) and `===` (strict equality) in JavaScript. When might you actually want to use `==`?

### Model Answer
`==` is loose (or abstract) equality, which compares two values after performing type coercion if the types differ. `===` is strict equality, which compares both value and type without any coercion.

When you use `==`, JavaScript follows a set of coercion rules defined in the specification. For example, when comparing a number and a string, the string is converted to a number. When comparing with `null` or `undefined`, they are equal to each other but not to anything else.

```javascript
0 == '0'       // true  — string '0' coerced to number 0
0 == false     // true  — false coerced to number 0
'' == false    // true  — both coerced to 0
null == undefined // true  — special rule
null == 0      // false — null only equals undefined with ==

0 === '0'      // false — different types
0 === false    // false — different types
null === undefined // false — different types
```

The coercion rules are complex and non-obvious (they involve the Abstract Equality Comparison algorithm), which is why most style guides recommend always using `===` by default. It makes your intent explicit and avoids hard-to-spot bugs.

The one situation where `==` is commonly considered acceptable is checking for `null` or `undefined` simultaneously:

```javascript
if (value == null) {
  // value is null OR undefined
}
```

This is more concise than `value === null || value === undefined` and the behavior is well-understood.

In modern codebases, ESLint's `eqeqeq` rule enforces the use of `===` to prevent accidental coercion bugs.

### Key Points
- `==` coerces types before comparing; `===` does not coerce and requires both value and type to match
- The coercion rules for `==` are complex and counterintuitive — avoid relying on them
- Use `===` by default for predictable, explicit comparisons
- The `value == null` pattern (checking for both `null` and `undefined`) is the most accepted use of `==`

### Follow-up Prompts
- How does JavaScript coerce types when comparing objects with `==`?
- What does `Object.is()` do differently from `===`?
- Can you walk through the Abstract Equality Comparison algorithm for `[] == false`?

### Difficulty: basic
### Tags: equality, type coercion, strict equality, loose equality, comparison operators

---

## Q5: What does typeof return and what are its quirks?

### Question
What does the `typeof` operator do in JavaScript? What are some of its known quirks or limitations?

### Model Answer
The `typeof` operator returns a string indicating the type of the operand. It is used for type checking at runtime and is one of the most basic tools for introspection in JavaScript.

The possible return values of `typeof` are: `'undefined'`, `'boolean'`, `'number'`, `'bigint'`, `'string'`, `'symbol'`, `'function'`, and `'object'`.

```javascript
typeof undefined   // 'undefined'
typeof true        // 'boolean'
typeof 42          // 'number'
typeof 'hello'     // 'string'
typeof Symbol()    // 'symbol'
typeof 42n         // 'bigint'
typeof function(){} // 'function'
typeof {}          // 'object'
typeof []          // 'object'  — array, not 'array'
typeof null        // 'object'  — famous bug!
```

The most well-known quirk is `typeof null === 'object'`. This is a historical bug in JavaScript dating back to the original implementation where all values had a type tag, and `null` shared the object type tag (all-zeros). It was never fixed because doing so would break existing code.

Another quirk is that `typeof` an undeclared variable returns `'undefined'` instead of throwing a ReferenceError. This makes `typeof` safe for checking if a global variable exists:

```javascript
if (typeof window !== 'undefined') {
  // running in a browser
}
```

To check if something is an array, use `Array.isArray()`. To distinguish between object types, use `instanceof` or `Object.prototype.toString.call()`:

```javascript
Object.prototype.toString.call([])   // '[object Array]'
Object.prototype.toString.call(null) // '[object Null]'
Object.prototype.toString.call({})   // '[object Object]'
```

### Key Points
- `typeof null` returns `'object'` — this is a historical bug, not intended behavior
- `typeof` an undeclared variable safely returns `'undefined'` rather than throwing
- `typeof []` returns `'object'`, so use `Array.isArray()` to check for arrays
- For detailed type inspection, `Object.prototype.toString.call()` is more reliable

### Follow-up Prompts
- How would you write a robust `getType()` utility that handles all primitive and object types?
- Why does `typeof` return `'function'` for functions but `'object'` for arrays, when both are objects under the hood?
- How do TypeScript's type guards relate to runtime `typeof` checks?

### Difficulty: basic
### Tags: typeof, type checking, null bug, undeclared variables, runtime types

---

## Q6: How does the event loop work in JavaScript?

### Question
Explain the JavaScript event loop. What is the call stack, what is the task queue, and how do they interact?

### Model Answer
JavaScript is single-threaded, meaning it can only execute one piece of code at a time. The event loop is the mechanism that allows JavaScript to handle asynchronous operations (like timers, network requests, and user events) without blocking the main thread.

The call stack is a LIFO (last in, first out) data structure that tracks function execution. When a function is called, a frame is pushed onto the stack. When it returns, the frame is popped off. Synchronous code runs by pushing and popping frames on the call stack.

Web APIs (in browsers) or libuv (in Node.js) handle asynchronous operations off the main thread. When an async operation completes (e.g., a `setTimeout` fires), its callback is placed in the task queue (also called the macrotask queue).

The event loop's job is simple: check if the call stack is empty. If it is, pick the first callback from the task queue and push it onto the call stack to execute. This cycle repeats continuously.

There is also the microtask queue, which has higher priority than the task queue. Microtasks include Promise callbacks (`.then`, `.catch`, `.finally`) and `queueMicrotask()`. After every macrotask completes, the event loop drains the entire microtask queue before picking the next macrotask.

```javascript
console.log('1 - synchronous');

setTimeout(() => console.log('2 - macrotask'), 0);

Promise.resolve().then(() => console.log('3 - microtask'));

console.log('4 - synchronous');

// Output order: 1, 4, 3, 2
```

Understanding the event loop explains why `setTimeout(fn, 0)` doesn't execute immediately — it waits for the current call stack to clear — and why Promises resolve before setTimeout callbacks.

### Key Points
- JavaScript is single-threaded; the event loop handles async operations without blocking
- The call stack executes synchronous code; async callbacks wait in the task queue
- Microtasks (Promises) have higher priority than macrotasks (setTimeout, setInterval) and are processed after every task
- The event loop checks if the call stack is empty before processing queued callbacks

### Follow-up Prompts
- What is the difference between microtasks and macrotasks? Can you list examples of each?
- How does `async/await` interact with the microtask queue?
- What happens if a microtask schedules another microtask — does the event loop get stuck?

### Difficulty: basic
### Tags: event loop, call stack, task queue, microtask, async, single-threaded

---

## Q7: Explain map, filter, and reduce array methods.

### Question
What do the `map`, `filter`, and `reduce` array methods do? Explain each with an example and describe when you would use one over the other.

### Model Answer
`map`, `filter`, and `reduce` are higher-order array methods introduced in ES5 that allow you to process arrays in a declarative, functional style without mutating the original array.

`map` transforms each element in an array by applying a callback function and returns a new array of the same length. Use it when you want to convert every element into something else.

```javascript
const numbers = [1, 2, 3, 4];
const doubled = numbers.map(n => n * 2);
// [2, 4, 6, 8]

const users = [{ name: 'Alice' }, { name: 'Bob' }];
const names = users.map(user => user.name);
// ['Alice', 'Bob']
```

`filter` selects elements that match a condition and returns a new array containing only those elements. The length of the result can be shorter than the original.

```javascript
const numbers = [1, 2, 3, 4, 5, 6];
const evens = numbers.filter(n => n % 2 === 0);
// [2, 4, 6]
```

`reduce` accumulates all elements into a single value (though that value can be an object or array). It takes a callback and an initial accumulator value. Use it for summing, grouping, flattening, or any transformation that produces one output from many inputs.

```javascript
const numbers = [1, 2, 3, 4];
const sum = numbers.reduce((acc, n) => acc + n, 0);
// 10

const words = ['a', 'b', 'a', 'c', 'b', 'a'];
const frequency = words.reduce((acc, word) => {
  acc[word] = (acc[word] || 0) + 1;
  return acc;
}, {});
// { a: 3, b: 2, c: 1 }
```

These methods can be chained: `array.filter(...).map(...)`. This is more readable than imperative loops for many transformations, but be mindful of performance on very large arrays since each method iterates the full array.

### Key Points
- `map` — transform every element, same-length output, use for conversions
- `filter` — select elements matching a condition, shorter or equal length output
- `reduce` — accumulate all elements into one value; the most flexible but also most complex
- All three return new arrays/values and do not mutate the original array
- Methods can be chained for readable data pipelines

### Follow-up Prompts
- How would you implement `map` and `filter` using `reduce`?
- When would you use a `for...of` loop instead of these array methods?
- What is `flatMap` and when is it more appropriate than `map` followed by `flat`?

### Difficulty: basic
### Tags: array methods, map, filter, reduce, functional programming, higher-order functions

---

## Q8: What is the DOM and how do you select and manipulate elements?

### Question
What is the DOM? Describe common ways to select DOM elements and explain how to create, modify, and remove elements programmatically.

### Model Answer
The DOM (Document Object Model) is a programming interface for HTML documents. When a browser loads an HTML page, it parses the HTML and builds a tree of objects (nodes) representing the document structure. JavaScript can interact with this tree to read content, change styles, add or remove elements, and respond to user events.

The most common ways to select elements are:

```javascript
// By ID — returns a single element or null
document.getElementById('header');

// By CSS selector — returns the first match or null
document.querySelector('.card');
document.querySelector('#nav > ul > li:first-child');

// By CSS selector — returns a static NodeList
document.querySelectorAll('.card');

// Older methods
document.getElementsByClassName('card'); // live HTMLCollection
document.getElementsByTagName('div');    // live HTMLCollection
```

`querySelector` and `querySelectorAll` are the most flexible because they accept any CSS selector.

To create and insert elements:

```javascript
const div = document.createElement('div');
div.textContent = 'Hello World';
div.classList.add('greeting');
document.body.appendChild(div);

// Modern: insertAdjacentHTML for HTML strings
document.body.insertAdjacentHTML('beforeend', '<p>New paragraph</p>');
```

To modify elements:

```javascript
const el = document.querySelector('#title');
el.textContent = 'Updated Title';       // text only (safer)
el.innerHTML = '<strong>Bold</strong>'; // HTML (watch for XSS)
el.setAttribute('data-id', '42');
el.style.color = 'red';
el.classList.add('active');
el.classList.remove('hidden');
el.classList.toggle('selected');
```

To remove elements:

```javascript
const el = document.querySelector('.old');
el.remove(); // modern, removes itself
el.parentNode.removeChild(el); // older approach
```

### Key Points
- The DOM is a tree of nodes representing the HTML document, accessible via JavaScript
- `querySelector` / `querySelectorAll` are the most versatile selectors — prefer them over older methods
- Use `textContent` for setting plain text and `innerHTML` only when you need HTML (sanitize inputs to prevent XSS)
- `classList` methods (`add`, `remove`, `toggle`, `contains`) are cleaner than manipulating `className` directly

### Follow-up Prompts
- What is the difference between `innerHTML`, `textContent`, and `innerText`?
- What are live vs. static NodeLists and when does the distinction matter?
- How would you efficiently insert 1000 elements into the DOM without causing performance issues?

### Difficulty: basic
### Tags: DOM, document, querySelector, createElement, innerHTML, manipulation

---

## Q9: What are template literals and what are their advantages?

### Question
What are template literals in JavaScript? Explain their syntax and describe all the advantages they have over traditional string concatenation.

### Model Answer
Template literals (introduced in ES6) are string literals enclosed by backticks (`` ` ``) instead of single or double quotes. They support embedded expressions, multi-line strings, and tagged templates.

The primary feature is expression interpolation using `${expression}`:

```javascript
const name = 'Alice';
const age = 30;

// Old way — string concatenation
const msg1 = 'Hello, ' + name + '! You are ' + age + ' years old.';

// Template literal
const msg2 = `Hello, ${name}! You are ${age} years old.`;
```

Any valid JavaScript expression can go inside `${}`, including function calls, ternary operators, and arithmetic:

```javascript
const price = 9.99;
const quantity = 3;
console.log(`Total: $${(price * quantity).toFixed(2)}`);
// 'Total: $29.97'

const isLoggedIn = true;
console.log(`Status: ${isLoggedIn ? 'Online' : 'Offline'}`);
```

Multi-line strings are natural with template literals — newlines are preserved:

```javascript
const html = `
  <div class="card">
    <h2>${title}</h2>
    <p>${description}</p>
  </div>
`;
```

Without template literals, multi-line strings required `\n` or string concatenation across lines, which is verbose and error-prone.

Tagged templates allow a function to process the template, enabling custom parsing, escaping, or transformation:

```javascript
function highlight(strings, ...values) {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] ? `<mark>${values[i]}</mark>` : '');
  }, '');
}

const result = highlight`Hello, ${name}! You are ${age} years old.`;
// 'Hello, <mark>Alice</mark>! You are <mark>30</mark> years old.'
```

Tagged templates are used by libraries like `styled-components` (CSS-in-JS), `graphql-tag`, and `sql` libraries.

### Key Points
- Template literals use backticks and support `${}` interpolation with any JavaScript expression
- Multi-line strings work natively — no need for `\n` or string concatenation
- Tagged templates let a function preprocess the template, enabling powerful DSLs
- They improve readability and reduce concatenation errors compared to `+` string building

### Follow-up Prompts
- How would you use a tagged template to safely escape HTML to prevent XSS?
- How do `styled-components` use tagged templates internally?
- Can you nest template literals inside other template literals?

### Difficulty: basic
### Tags: template literals, es6, string interpolation, tagged templates, multi-line strings

---

## Q10: What are arrow functions and how do they differ from regular functions?

### Question
What are arrow functions in JavaScript? Explain the key differences between arrow functions and regular function declarations or expressions, focusing on the `this` keyword.

### Model Answer
Arrow functions (introduced in ES6) provide a shorter syntax for writing functions using `=>`. They are especially popular for callbacks and short expressions, but they have important behavioral differences from regular functions.

Syntax comparison:

```javascript
// Regular function expression
const add = function(a, b) { return a + b; };

// Arrow function
const add = (a, b) => a + b;  // implicit return for single expression

// Single parameter — parentheses optional
const double = n => n * 2;

// No parameters — parentheses required
const greet = () => 'Hello!';

// Multi-line body — explicit return required
const process = (a, b) => {
  const result = a + b;
  return result;
};
```

The most important difference is how `this` is handled. Regular functions have their own `this` context, which is determined by how the function is called. Arrow functions do NOT have their own `this` — they inherit `this` from the enclosing lexical scope (where they are written).

```javascript
function Timer() {
  this.seconds = 0;

  // Regular function — 'this' is wrong (undefined or global in strict mode)
  setInterval(function() {
    this.seconds++; // 'this' is not the Timer instance
  }, 1000);

  // Arrow function — 'this' is inherited from Timer constructor
  setInterval(() => {
    this.seconds++; // 'this' correctly refers to the Timer instance
  }, 1000);
}
```

Other differences: arrow functions do not have their own `arguments` object (use rest parameters `...args` instead), they cannot be used as constructors (cannot use `new`), and they cannot have `prototype` property.

Because of these constraints, you should NOT use arrow functions as object methods when you need `this` to refer to the object, and you should not use them as event handlers if you need `this` to refer to the element.

### Key Points
- Arrow functions provide shorter syntax with implicit return for single expressions
- Arrow functions do NOT have their own `this` — they inherit it lexically from the surrounding scope
- Arrow functions cannot be used as constructors (`new` throws an error)
- Arrow functions have no `arguments` object — use rest parameters `...args` instead
- Use regular functions for object methods and event handlers that rely on `this`

### Follow-up Prompts
- Can you demonstrate a bug caused by using an arrow function as an object method?
- How does `call`, `apply`, or `bind` behave when used on an arrow function?
- Why can't arrow functions be used as generator functions?

### Difficulty: basic
### Tags: arrow functions, es6, this keyword, lexical scope, function syntax

---
