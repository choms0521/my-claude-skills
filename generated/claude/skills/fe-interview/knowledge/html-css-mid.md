# HTML/CSS - Mid-Level Interview Questions
### Language: en

## Q1: Explain CSS Grid advanced layout techniques.

### Question
Go beyond the basics of CSS Grid. Explain named grid areas, `auto-fill` vs `auto-fit`, `minmax()`, subgrid, and how to build complex responsive layouts without media queries.

### Model Answer
CSS Grid is a two-dimensional layout system that enables complex layouts that were previously only achievable with JavaScript or elaborate CSS hacks. Beyond the basics, several advanced features allow for highly flexible, responsive designs.

**Named Grid Areas:**

Named areas make layout intent explicit and readable. Define the template on the container and assign elements to areas:

```css
.layout {
  display: grid;
  grid-template-areas:
    "header  header"
    "sidebar content"
    "footer  footer";
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
main     { grid-area: content; }
footer   { grid-area: footer; }
```

Rearranging the layout for mobile only requires redefining `grid-template-areas` in a media query — no changes to the child elements.

**`auto-fill` vs `auto-fit` with `minmax()`:**

These create intrinsically responsive grids that add or remove columns based on available space — often eliminating the need for media queries:

```css
/* auto-fill: creates as many columns as fit, even empty ones */
.grid-fill {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* auto-fit: collapses empty tracks — filled columns expand to fill the row */
.grid-fit {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

With `minmax(200px, 1fr)`: each column is at least 200px wide, and columns grow equally to fill available space. The browser automatically determines how many columns fit. A 600px container gets 3 columns; an 800px container gets 4. No media queries needed for the column count.

**`minmax()` and `clamp()` for flexible tracks:**

```css
.sidebar-layout {
  grid-template-columns: minmax(200px, 300px) 1fr;
  /* sidebar: min 200px, max 300px; content: rest */
}
```

**Subgrid (modern, now broadly supported):**

Subgrid allows nested grid items to align to the parent grid's tracks, solving the longstanding problem of aligning content across card components:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto;
}

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid; /* inherit parent's row tracks */
}
/* Now all card headers, bodies, and footers align across the row */
```

**Dense packing:**

`grid-auto-flow: dense` fills gaps left by large items, allowing a masonry-like layout without JavaScript:

```css
.masonry {
  grid-auto-flow: dense;
}
.wide-item {
  grid-column: span 2;
}
```

### Key Points
- Named grid areas (`grid-template-areas`) make layout structure explicit and easy to rearrange
- `repeat(auto-fit, minmax(min, 1fr))` creates fully responsive column layouts without media queries
- `auto-fill` preserves empty column tracks; `auto-fit` collapses them — the difference is visible when items don't fill a row
- `subgrid` enables nested items to align to the parent grid's tracks, solving card alignment problems
- `grid-auto-flow: dense` fills gaps automatically for masonry-like effects

### Follow-up Prompts
- How do you implement a true masonry layout with CSS Grid versus JavaScript-based approaches?
- When would you choose CSS Grid over Flexbox for a component-level layout?
- How does `grid-template-columns: subgrid` interact with items that have explicit column spans?

### Difficulty: intermediate
### Tags: CSS Grid, named areas, auto-fit, auto-fill, minmax, subgrid, responsive layout

---

## Q2: How do CSS animations and transitions work?

### Question
Explain the difference between CSS transitions and animations. Describe `@keyframes`, timing functions, and performance considerations. When should you animate `transform` and `opacity` instead of layout properties?

### Model Answer
CSS provides two mechanisms for motion: transitions (simple A-to-B state changes) and animations (complex multi-step sequences defined with keyframes).

**CSS Transitions:**

Transitions interpolate between two states when a property changes (typically triggered by class change or pseudo-class like `:hover`):

```css
.button {
  background-color: blue;
  transform: scale(1);
  transition: background-color 300ms ease, transform 200ms ease-out;
}

.button:hover {
  background-color: darkblue;
  transform: scale(1.05);
}
```

Syntax: `transition: property duration timing-function delay`

**CSS Animations with `@keyframes`:**

Animations run independently of state changes and support multiple steps:

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Multi-step: */
@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.element {
  animation: slideIn 400ms ease-out forwards;
  /* name duration timing fill-mode */
}

.loader {
  animation: pulse 1.5s ease-in-out infinite;
}
```

Key animation properties: `animation-duration`, `animation-timing-function`, `animation-delay`, `animation-iteration-count`, `animation-direction`, `animation-fill-mode` (`forwards` keeps the final keyframe state after completion).

**Timing functions:**

- `ease` — slow start, fast middle, slow end (default)
- `linear` — constant speed
- `ease-in` — slow start, fast end
- `ease-out` — fast start, slow end (best for exit animations)
- `ease-in-out` — slow start and end
- `cubic-bezier(x1, y1, x2, y2)` — custom curve
- `steps(n)` — stepped (sprite animations, counters)

**Performance: animate `transform` and `opacity` only:**

The browser's rendering pipeline has four phases: Style → Layout → Paint → Composite. Animating properties that trigger layout (like `width`, `height`, `top`, `left`, `margin`) forces the browser to recalculate geometry every frame — expensive.

`transform` and `opacity` only trigger the Composite phase — the GPU can handle these without involving the CPU's layout or paint phases. This produces 60fps animations even on complex pages:

```css
/* BAD: causes layout recalculation every frame */
.slide { animation: slide-bad; }
@keyframes slide-bad {
  from { left: -100px; } to { left: 0; }
}

/* GOOD: GPU-accelerated, no layout recalculation */
.slide { animation: slide-good; }
@keyframes slide-good {
  from { transform: translateX(-100px); } to { transform: translateX(0); }
}
```

Use `will-change: transform` to hint the browser to promote the element to a GPU layer in advance, avoiding the promotion cost at animation start. Use sparingly — each promoted layer consumes GPU memory.

### Key Points
- Transitions handle A-to-B state changes on property change; `@keyframes` animations run complex multi-step sequences
- `animation-fill-mode: forwards` keeps the final keyframe state after the animation completes
- `transform` and `opacity` are the only properties you should animate for 60fps performance — they only trigger the Composite phase
- Animating `width`, `height`, `margin`, `top`, `left` forces layout recalculation every frame — avoid
- `will-change: transform` pre-promotes an element to a GPU layer; use sparingly due to memory cost

### Follow-up Prompts
- How do you implement a staggered animation (each item animates in with a delay) for a list of items?
- How does the Web Animations API (`element.animate()`) compare to CSS animations, and when would you prefer it?
- How do you ensure your animations respect the `prefers-reduced-motion` media feature?

### Difficulty: intermediate
### Tags: CSS animations, transitions, keyframes, timing functions, performance, transform, opacity, GPU

---

## Q3: What is the BEM methodology and how does it solve CSS architecture problems?

### Question
Explain the BEM (Block, Element, Modifier) naming convention. What problems does it solve, and what are its practical tradeoffs compared to utility-first CSS (like Tailwind)?

### Model Answer
BEM (Block, Element, Modifier) is a CSS naming convention that creates a clear, predictable relationship between HTML structure and CSS classes, addressing the global-scope and specificity problems inherent in CSS.

**The three concepts:**

- **Block**: A standalone component that is meaningful on its own. Named as a simple noun: `.card`, `.nav`, `.button`
- **Element**: A part of a Block that has no standalone meaning. Named with double underscore: `.card__header`, `.card__body`, `.nav__item`
- **Modifier**: A variation of a Block or Element. Named with double dash: `.button--primary`, `.button--large`, `.nav__item--active`

```html
<div class="card card--featured">
  <div class="card__header">
    <h2 class="card__title">Post Title</h2>
  </div>
  <div class="card__body">
    <p class="card__text">Content...</p>
  </div>
  <div class="card__footer">
    <button class="button button--primary button--small">Read More</button>
  </div>
</div>
```

```css
.card { border: 1px solid #ddd; border-radius: 4px; }
.card--featured { border-color: gold; }
.card__header { padding: 1rem; border-bottom: 1px solid #eee; }
.card__title { font-size: 1.25rem; margin: 0; }
.button { padding: 0.5em 1em; cursor: pointer; }
.button--primary { background: blue; color: white; }
.button--small { font-size: 0.875rem; }
```

**Problems BEM solves:**

1. **Specificity wars**: BEM selectors are almost always single classes (specificity 0,0,1,0). No ID selectors, no deep nesting — no specificity conflicts.
2. **Name collisions**: The Block prefix creates a namespace. `.card__title` only means the title inside a card, avoiding conflicts with other `.title` classes.
3. **Implicit dependencies**: The class name itself tells you what component an element belongs to, making HTML self-documenting.
4. **Reusability**: Blocks are encapsulated — you can move `.card` to any context and it works identically.

**Tradeoffs vs. utility-first CSS (Tailwind):**

BEM produces semantic, readable class names but requires writing and maintaining CSS files. Tailwind uses small, single-purpose utility classes directly in HTML:

```html
<!-- BEM -->
<button class="button button--primary button--small">Submit</button>

<!-- Tailwind equivalent -->
<button class="bg-blue-500 text-white text-sm px-3 py-1 rounded cursor-pointer">Submit</button>
```

Tailwind reduces the need for custom CSS files and eliminates dead CSS. BEM produces cleaner HTML but can lead to large CSS files. Many teams combine approaches: utility classes for one-off styles, BEM-style component classes for reusable patterns.

### Key Points
- Block (component) → Element (part of block, `__`) → Modifier (variation, `--`)
- BEM uses flat, single-class selectors — no specificity conflicts, no nesting
- The naming convention creates a namespace per component, preventing class name collisions
- BEM makes HTML self-documenting — the class name tells you what component a piece belongs to
- Tradeoff: verbose class names and separate CSS files vs. utility-first (Tailwind) — both are valid at scale

### Follow-up Prompts
- How do you handle BEM in a component-based framework like React where components already provide encapsulation?
- What are the problems with deeply nested BEM names (`.block__element__sub-element`) and how do you avoid them?
- How does CSS Modules solve the same namespace problem as BEM using a different mechanism?

### Difficulty: intermediate
### Tags: BEM, CSS architecture, naming conventions, specificity, Tailwind, CSS Modules, methodology

---

## Q4: What are the tradeoffs of CSS-in-JS?

### Question
What is CSS-in-JS? Describe the main approaches (styled-components, Emotion, CSS Modules), their benefits, and the performance and developer experience tradeoffs compared to traditional CSS.

### Model Answer
CSS-in-JS is a pattern where CSS styles are written in JavaScript files, co-located with component logic, rather than in separate `.css` files. It emerged to solve the global-scope and dead-code problems of CSS at the component-based application scale.

**Main approaches:**

**styled-components / Emotion** (runtime CSS-in-JS): Generate CSS at runtime using tagged template literals. Styles are inserted into `<style>` tags dynamically.

```javascript
import styled from 'styled-components';

const Button = styled.button`
  background: ${props => props.primary ? 'blue' : 'white'};
  color: ${props => props.primary ? 'white' : 'blue'};
  padding: 0.5em 1em;
  border-radius: 4px;

  &:hover {
    opacity: 0.9;
  }
`;

// Usage
<Button primary>Click me</Button>
```

**CSS Modules** (build-time, not truly CSS-in-JS but often grouped with it): Locally scope CSS class names at build time, generating unique hashed names. No runtime overhead.

```css
/* Button.module.css */
.button { padding: 0.5em 1em; }
.primary { background: blue; color: white; }
```

```javascript
import styles from './Button.module.css';
<button className={`${styles.button} ${styles.primary}`}>Click</button>
// Renders as: <button class="Button_button__xK2Lp Button_primary__mZ9qP">
```

**Zero-runtime CSS-in-JS** (Vanilla Extract, Linaria, StyleX): Extract CSS to static files at build time while allowing JS-like authoring. Combines co-location benefits with zero runtime cost.

**Benefits of CSS-in-JS:**

1. **Co-location**: styles live next to the component they style — easy to find, easy to delete
2. **True encapsulation**: styles are scoped to the component, no global leaks
3. **Dynamic styles**: easy to base styles on props or theme variables
4. **Dead code elimination**: delete the component, its styles are gone
5. **TypeScript integration**: props for dynamic styles are type-checked

**Tradeoffs and concerns:**

**Runtime overhead** (for styled-components/Emotion): CSS is generated and injected at runtime, adding JavaScript execution time. On slow devices this contributes to slower render. Each unique prop combination generates a new class rule.

**Increases JavaScript bundle size**: CSS logic ships in JS, not in a separate `.css` file. This delays First Contentful Paint since the browser must parse JS before styles are applied.

**Streaming SSR complexity**: React 18 streaming SSR is harder with runtime CSS-in-JS — styles may not be available when the server sends HTML chunks.

**Debugging**: Generated class names like `sc-bdfxgf iRMXqC` are hard to debug compared to BEM names.

**When to use what:**
- Use **CSS Modules** for most projects — zero runtime cost, simple, works everywhere
- Use **styled-components/Emotion** when you need highly dynamic styles or have an established React component library
- Use **Vanilla Extract or StyleX** for large-scale applications that need co-location with zero runtime cost
- Use **Tailwind** when you prefer utility-first and want to minimize custom CSS

### Key Points
- CSS-in-JS co-locates styles with components, providing true scope, dynamic styles, and automatic dead code elimination
- Runtime CSS-in-JS (styled-components, Emotion) has a performance cost: JS must execute before styles apply
- CSS Modules provide scoped class names at build time with zero runtime overhead — often the best default
- Zero-runtime solutions (Vanilla Extract, StyleX) offer co-location benefits without performance drawbacks
- Runtime CSS-in-JS complicates React 18 streaming SSR — this is driving many teams toward zero-runtime alternatives

### Follow-up Prompts
- How does the React team's StyleX differ from styled-components and what constraints does it impose?
- How do you migrate a large styled-components codebase to CSS Modules or Tailwind?
- What is the `style` attribute versus CSS-in-JS for dynamic styling, and when is each appropriate?

### Difficulty: intermediate
### Tags: CSS-in-JS, styled-components, CSS Modules, Emotion, Vanilla Extract, performance, SSR

---

## Q5: What is web accessibility (ARIA) and how do you implement it?

### Question
Explain ARIA (Accessible Rich Internet Applications). When should you add ARIA roles and attributes versus relying on native HTML semantics? Describe the most important ARIA patterns for common UI components.

### Model Answer
ARIA (WAI-ARIA) is a specification that adds semantics to HTML elements that lack inherent meaning or that implement patterns not covered by native HTML. It provides roles, states, and properties that assistive technologies (screen readers, etc.) use to communicate interface structure and interactivity to users.

**The first rule of ARIA: do not use ARIA if native HTML can do it.**

Most common UI elements have semantic HTML equivalents with built-in accessibility:

```html
<!-- Prefer this -->
<button>Submit</button>
<input type="checkbox"> Label
<a href="/home">Home</a>
<nav>, <main>, <article>, <header>, <footer>

<!-- Over this (requires extensive ARIA to fix) -->
<div role="button" tabindex="0">Submit</div>
<div role="checkbox" tabindex="0" aria-checked="false">Label</div>
```

Native elements have keyboard interaction, focus management, and screen reader announcements built in. Custom elements require you to implement all of that manually.

**When ARIA is necessary:**

Custom interactive patterns that have no HTML equivalent — modals, tabs, accordions, tooltips, comboboxes, tree views, data grids.

**Essential ARIA attributes:**

`role` — overrides or adds a semantic role:
```html
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
  ...
</div>
```

`aria-label` / `aria-labelledby` — provide accessible names:
```html
<button aria-label="Close dialog">×</button>
<div aria-labelledby="section-heading">...</div>
```

`aria-describedby` — points to a description element:
```html
<input type="password" aria-describedby="password-hint">
<p id="password-hint">Must be at least 8 characters.</p>
```

`aria-expanded`, `aria-selected`, `aria-checked` — communicate state:
```html
<button aria-expanded="false" aria-controls="menu">Menu</button>
<div id="menu" hidden>...</div>
```

`aria-live` — announce dynamic content changes:
```html
<div aria-live="polite" role="status">
  <!-- Screen reader announces new content added here -->
  Form submitted successfully!
</div>
<!-- aria-live="assertive" for urgent messages; "polite" for non-urgent -->
```

`aria-hidden` — hide decorative elements from the accessibility tree:
```html
<span aria-hidden="true">★★★★☆</span>
<span class="sr-only">4 out of 5 stars</span>
```

**Focus management for custom components:**

Keyboard users must be able to operate all interactive elements. Modal dialogs must trap focus within them:
```javascript
// When modal opens: focus the first focusable element
modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').focus();

// Tab key must cycle within the modal
// Close modal on Escape key
modal.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
```

### Key Points
- First rule: use native HTML semantics before adding ARIA — native elements have accessibility built in
- ARIA roles, states, and properties communicate semantics that HTML cannot express natively
- `aria-label`/`aria-labelledby` provide accessible names; `aria-describedby` provides additional description
- `aria-live` regions announce dynamic content changes to screen readers without page reload
- Custom interactive components (modals, tabs) require full keyboard interaction implementation — focus management, keyboard shortcuts, ARIA state

### Follow-up Prompts
- How do you implement an accessible custom dropdown/combobox that passes screen reader testing?
- What is the difference between `aria-label` and `aria-labelledby`, and when would you use each?
- How do you test accessibility — what combination of automated tools and manual testing do you use?

### Difficulty: intermediate
### Tags: accessibility, ARIA, screen readers, role, aria-label, aria-live, focus management, WCAG

---

## Q6: What are CSS custom properties and how do you use them for theming?

### Question
Explain CSS custom properties (CSS variables). How do they differ from preprocessor variables (Sass), and how do you use them to implement a robust theming system with dark mode support?

### Model Answer
CSS custom properties (also called CSS variables) are properties defined by authors that store values for reuse throughout a stylesheet. They are defined with a `--` prefix and accessed via the `var()` function.

```css
:root {
  --color-primary: #2563eb;
  --color-text: #111827;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --border-radius: 4px;
}

.button {
  background: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
}

/* Fallback value */
color: var(--color-accent, #6366f1);
```

**How CSS custom properties differ from Sass variables:**

| Feature | CSS Custom Properties | Sass Variables |
|---------|----------------------|----------------|
| Scope | Cascade-aware, inherited | Compile-time, lexical |
| Runtime | Can be changed with JS | No — compiled to static values |
| Inheritance | Yes — flow through the DOM | No |
| Media queries | Can be redefined inside | Cannot be used inside |
| DevTools | Visible and editable | Lost after compilation |

Sass variables are resolved at compile time — they produce static CSS. CSS custom properties exist at runtime and can be changed via JavaScript or redefined in narrower scopes.

**Theming with CSS custom properties:**

Define tokens on `:root` for the default (light) theme:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --color-brand: #2563eb;
}

[data-theme="dark"] {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border-color: #374151;
  --color-brand: #60a5fa;
}
```

Apply the theme by toggling an attribute on `<html>` with JavaScript:

```javascript
document.documentElement.setAttribute('data-theme', 'dark');
```

**Respecting `prefers-color-scheme` with manual override:**

```css
:root { /* light theme defaults */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* dark theme — applies when system is dark AND user hasn't forced light */
    --bg-primary: #111827;
  }
}

[data-theme="dark"] {
  --bg-primary: #111827; /* manual dark mode override */
}
```

**Component-scoped custom properties:**

Custom properties can be scoped to components, enabling component-level theming:

```css
.card {
  --card-padding: 1rem;
  --card-bg: var(--bg-secondary);
  padding: var(--card-padding);
  background: var(--card-bg);
}

/* A variant with wider padding */
.card--spacious {
  --card-padding: 2rem;
}
```

JavaScript can read and write custom properties at runtime:
```javascript
const root = document.documentElement;
root.style.setProperty('--color-brand', '#10b981');
const value = getComputedStyle(root).getPropertyValue('--color-brand').trim();
```

### Key Points
- CSS custom properties are runtime, cascade-aware, and inheritable — fundamentally different from Sass compile-time variables
- `var(--property, fallback)` provides a default value if the custom property is not defined
- Theme systems: define semantic tokens on `:root`, redefine them in `[data-theme]` or `@media (prefers-color-scheme)` selectors
- Custom properties can be scoped to components for local theming and component variants
- JavaScript can read and write custom properties at runtime via `style.setProperty` and `getComputedStyle`

### Follow-up Prompts
- How do you use CSS custom properties to implement a design token system that integrates with a design tool like Figma?
- What are the performance implications of updating a custom property on `:root` versus on a specific element?
- How do you handle custom properties in a CSS-in-JS environment like styled-components?

### Difficulty: intermediate
### Tags: CSS custom properties, CSS variables, theming, dark mode, Sass, design tokens, runtime styling

---

## Q7: How do you optimize CSS performance — critical CSS, font loading, and rendering?

### Question
Describe CSS performance optimization strategies: what is critical CSS, how do you load non-critical CSS asynchronously, what are the best practices for web font loading, and how do you reduce render-blocking resources?

### Model Answer
CSS is a render-blocking resource — the browser cannot paint pixels until it has processed all CSS in the `<head>`. Optimizing CSS delivery is critical for Core Web Vitals, specifically First Contentful Paint (FCP) and Largest Contentful Paint (LCP).

**Critical CSS:**

Critical CSS (or above-the-fold CSS) is the minimum CSS needed to render the visible portion of the page on first load. By inlining it in a `<style>` tag in the `<head>`, you eliminate the render-blocking network request for the full CSS file.

```html
<head>
  <!-- Critical CSS: inlined, no network request -->
  <style>
    body { margin: 0; font-family: system-ui; }
    .hero { min-height: 100vh; display: flex; align-items: center; }
    /* ... ~14KB of above-the-fold styles ... */
  </style>

  <!-- Non-critical CSS: loaded asynchronously -->
  <link rel="preload" href="/styles.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>
</head>
```

The `rel="preload"` trick: preload downloads the CSS at high priority but does not apply it until `onload` changes `rel` to `stylesheet`. This is the standard pattern for async CSS loading.

Tools like `critical` (npm), Penthouse, or Critters automate critical CSS extraction.

**Web Font Optimization:**

Fonts are late-discovered resources — the browser downloads them only after it has parsed CSS and determined which glyphs are needed. This causes the Flash of Invisible Text (FOIT) or Flash of Unstyled Text (FOUT).

```html
<!-- Preconnect to the font origin to reduce connection overhead -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Preload the most important font file -->
<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>
```

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-regular.woff2') format('woff2');
  font-display: swap; /* show fallback immediately, swap when loaded */
  font-weight: 400;
  font-style: normal;
}
```

`font-display` values:
- `swap` — use fallback immediately, swap when font is ready (best for body text)
- `optional` — use font only if already cached; don't wait or swap (best for non-essential fonts)
- `fallback` — short block period, then swap (compromise)
- `block` — invisible text for up to 3 seconds (FOIT — avoid)

**Reducing CSS payload:**

- **Purge unused CSS**: Tools like PurgeCSS analyze HTML/JS and remove CSS rules that match nothing
- **Minification**: Remove whitespace, comments, and redundant rules
- **HTTP/2**: Multiplexing makes multiple small CSS files more practical than concatenating everything
- **Cache headers**: CSS should be cached aggressively with content-hash filenames (`styles.a3f9b2.css`), enabling far-future `Cache-Control: max-age=31536000, immutable`

**CSS containment:**

```css
.widget {
  contain: layout style paint;
  /* Browser can isolate this element's rendering from the rest of the page */
}
```

`contain: paint` tells the browser that the element clips its contents, allowing it to skip repainting outside the boundary during animations.

### Key Points
- CSS is render-blocking by default — inline critical CSS in `<style>` and load the rest asynchronously
- Use `rel="preload" as="style"` with the `onload` technique for async CSS loading
- Preload critical fonts with `<link rel="preload" as="font">` and use `font-display: swap` to avoid FOIT
- PurgeCSS eliminates unused rules; minification and content-hash caching reduce payload and maximize cache reuse
- CSS `contain` property lets the browser optimize rendering by isolating an element's layout/paint impact

### Follow-up Prompts
- How do Core Web Vitals (LCP, FID/INP, CLS) relate to CSS delivery, and what CSS changes most improve them?
- What is the `size-adjust` descriptor in `@font-face` and how does it reduce Cumulative Layout Shift from font swapping?
- How do you implement a CSS code-splitting strategy in a large application?

### Difficulty: intermediate
### Tags: CSS performance, critical CSS, font loading, font-display, preload, render-blocking, Core Web Vitals

---

## Q8: How do you work with SVG in HTML and CSS?

### Question
Explain the different ways to include SVG in a web page and the tradeoffs of each approach. How do you style SVGs with CSS and animate them?

### Model Answer
SVG (Scalable Vector Graphics) can be included in HTML in several ways, each with different capabilities for styling, interaction, and performance.

**1. Inline SVG** — paste SVG code directly into HTML:

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
</svg>
```

Advantages: full CSS styling access (including `:hover`, CSS variables, animations), no extra HTTP request, can be made accessible with `<title>` and `aria-label`, JavaScript can interact with SVG elements.

Disadvantages: increases HTML payload, cannot be cached separately, difficult to reuse without a component system.

**2. `<img>` tag** — reference SVG as an image:

```html
<img src="icon.svg" alt="Home icon" width="24" height="24">
```

Advantages: cacheable, clean HTML, image semantics. Disadvantages: cannot style with CSS (external stylesheets have no access), no JavaScript interaction, no CSS animations targeting SVG internals.

**3. CSS `background-image`:**

```css
.icon { background-image: url('icon.svg'); background-size: contain; }
/* Or inline with data URI: */
.icon { background-image: url("data:image/svg+xml,%3Csvg...%3E"); }
```

Useful for decorative icons. No accessibility, no CSS variable access in the SVG.

**4. `<use>` with sprite:**

Define symbols in a hidden SVG sprite and reference them:

```html
<!-- Sprite (can be in a separate file) -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="..." />
  </symbol>
</svg>

<!-- Usage -->
<svg><use href="#icon-home" /></svg>
<!-- Or from external file: -->
<svg><use href="/icons.svg#icon-home" /></svg>
```

**Styling SVGs with CSS:**

For inline SVGs, all CSS applies. Key properties:

```css
svg { fill: currentColor; } /* inherit the text color */
.icon path { stroke: var(--color-brand); stroke-width: 2; fill: none; }
.icon:hover path { fill: blue; }
```

`currentColor` is particularly useful — it makes the SVG color inherit from the surrounding text color, so the icon automatically matches the text it appears with.

**Animating SVGs:**

```css
/* CSS animation on SVG path */
.spinner circle {
  stroke-dasharray: 150;
  stroke-dashoffset: 150;
  animation: draw 1.5s ease-in-out infinite;
}

@keyframes draw {
  from { stroke-dashoffset: 150; }
  to   { stroke-dashoffset: 0; }
}
```

`stroke-dasharray` and `stroke-dashoffset` are used for path drawing animations. GSAP and anime.js provide JavaScript animation control for complex SVG animations.

**Accessibility for SVGs:**

```html
<!-- Decorative SVG: hide from screen readers -->
<svg aria-hidden="true" focusable="false">...</svg>

<!-- Meaningful SVG: provide a label -->
<svg role="img" aria-label="Home">
  <title>Home</title>
  <path d="..."/>
</svg>
```

### Key Points
- Inline SVG gives full CSS styling and JavaScript access but increases HTML size and cannot be separately cached
- `<img src="icon.svg">` is cacheable and clean but blocks CSS styling of SVG internals
- `fill: currentColor` is the key technique for making SVG icons inherit their surrounding text color
- `<use>` with a sprite file reduces inline SVG duplication while maintaining some styling capability
- Animate SVG with `stroke-dashoffset` for path drawing effects; `transform` and `opacity` for performant motion

### Follow-up Prompts
- How do you make a complex multi-color SVG icon themeable using CSS custom properties?
- What are SVGR and vite-plugin-svgr, and how do they simplify SVG usage in React projects?
- How does the `viewBox` attribute work and how do you use it to control SVG scaling and cropping?

### Difficulty: intermediate
### Tags: SVG, inline SVG, CSS styling, currentColor, SVG sprites, SVG animation, accessibility

---

## Q9: What is CSS architecture — OOCSS, SMACSS, and ITCSS?

### Question
Explain the CSS architectural methodologies OOCSS, SMACSS, and ITCSS. What problem does each solve, and how do they complement modern tooling like BEM and utility-first CSS?

### Model Answer
As CSS codebases grow, maintaining predictable, scalable styles becomes challenging due to CSS's global scope, specificity conflicts, and lack of encapsulation. Several methodologies emerged to provide structure and constraints.

**OOCSS (Object-Oriented CSS) — Nicole Sullivan, 2009:**

Two core principles:
1. **Separate structure from skin**: Define layout/structure (box model, positioning) separately from visual styling (colors, fonts, backgrounds). A `.media-object` defines the structure; `.media-object--featured` adds the visual variant.
2. **Separate container from content**: A `<h2>` inside a `.sidebar` should not look different from an `<h2>` elsewhere just because of its location. Style the element, not its context.

```css
/* Structure (reusable) */
.btn { display: inline-block; padding: 0.5em 1em; border: none; cursor: pointer; }
/* Skin (visual variants) */
.btn-primary { background: blue; color: white; }
.btn-danger  { background: red; color: white; }
```

OOCSS promotes class-based, reusable patterns and reduces code duplication. Its ideas directly influenced Bootstrap and later BEM.

**SMACSS (Scalable and Modular Architecture for CSS) — Jonathan Snook, 2011:**

Organizes CSS into five categories that set rules for how selectors in each category should be written:

1. **Base** — element defaults, resets. No classes: `body {}`, `a {}`, `p {}`
2. **Layout** — major structural sections. Prefix `l-` or `layout-`: `.l-header`, `.l-sidebar`
3. **Module** — reusable components. No prefix: `.card`, `.nav`, `.btn`
4. **State** — JS-driven states. Prefix `is-`: `.is-active`, `.is-collapsed`, `.is-loading`
5. **Theme** — color/font overrides for themes: `.theme-dark .card {}`

SMACSS provides a file organization strategy and naming discipline but is less prescriptive about selector specifics than BEM.

**ITCSS (Inverted Triangle CSS) — Harry Roberts, 2014:**

ITCSS organizes CSS by specificity and reach in a layered "inverted triangle" — layers at the top affect the most elements with the lowest specificity; layers at the bottom affect fewer elements with higher specificity:

```
Settings    → Custom properties, Sass variables (no CSS output)
Tools       → Mixins, functions (no CSS output)
Generic     → Resets, box-sizing, normalize
Elements    → Bare HTML element styles (h1, a, p) — no classes
Objects     → Layout patterns (OOCSS objects) — low specificity
Components  → UI components — the bulk of the code
Utilities   → Overrides, helpers — highest specificity, often !important
```

```
settings/
  _colors.scss
  _typography.scss
tools/
  _mixins.scss
generic/
  _reset.scss
elements/
  _headings.scss
objects/
  _wrapper.scss
components/
  _card.scss
  _nav.scss
utilities/
  _hidden.scss
  _text-align.scss
```

ITCSS integrates naturally with BEM (components layer uses BEM naming) and with utility classes (utilities layer). It is the organizational backbone for large design systems like inuitcss.

**Modern synthesis:**

Most mature CSS architectures blend these: ITCSS for file/layer organization, BEM for component naming, CSS Modules or Scoped CSS for actual encapsulation, and utility classes for one-off styles. PostCSS and Sass handle preprocessing.

### Key Points
- OOCSS: separate structure from skin, separate container from content — promotes reusable class-based patterns
- SMACSS: five categories (Base, Layout, Module, State, Theme) with naming prefix conventions
- ITCSS: file organization by specificity — low specificity globals at top, high specificity utilities at bottom
- These methodologies are complementary: ITCSS for structure, BEM for naming, utilities for overrides
- In component frameworks (React/Vue), CSS Modules or scoped styles handle encapsulation — ITCSS still guides global styles

### Follow-up Prompts
- How would you set up an ITCSS-based CSS architecture for a design system that uses Sass?
- How do you handle the "utilities layer" in ITCSS when you adopt Tailwind CSS into an existing project?
- What is Cube CSS and how does it attempt to reconcile BEM, OOCSS, and utility-first approaches?

### Difficulty: intermediate
### Tags: CSS architecture, OOCSS, SMACSS, ITCSS, BEM, scalability, methodology, design systems

---

## Q10: How do responsive images work — srcset and the picture element?

### Question
Explain how to serve appropriately sized images for different screen sizes and resolutions using `srcset`, `sizes`, and the `<picture>` element. What are the performance benefits and how does the browser decide which image to download?

### Model Answer
Serving a single large image to all devices wastes bandwidth for mobile users and can be blurry or oversized on high-DPI displays. The `srcset`, `sizes`, and `<picture>` features give the browser the information it needs to select the optimal image.

**`srcset` with pixel density descriptors (`x` descriptors):**

Tell the browser which image to use for different device pixel ratios:

```html
<img
  src="logo.png"
  srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x"
  alt="Company Logo"
  width="200" height="80"
>
```

The browser picks based on `window.devicePixelRatio`. Retina screens (2x) get the sharper version. Good for fixed-size images like logos and icons.

**`srcset` with width descriptors (`w` descriptors) + `sizes`:**

For images whose display size varies with layout, width descriptors are more powerful. You provide the image widths, and a `sizes` attribute tells the browser how wide the image will be displayed at different viewport sizes:

```html
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg 400w,
          hero-800.jpg 800w,
          hero-1200.jpg 1200w,
          hero-2000.jpg 2000w"
  sizes="(max-width: 640px) 100vw,
         (max-width: 1024px) 50vw,
         800px"
  alt="Hero image"
  width="800" height="400"
>
```

The browser calculates: "At a 375px viewport, `sizes` says `100vw` = 375px. My screen is 2x DPI, so I need a 750px image. The closest available is `hero-800.jpg`." The browser downloads only that one image.

`sizes` is a media-condition list evaluated top to bottom, with the last value as the default. It must match the actual CSS layout size — the browser uses it before layout is computed.

**`<picture>` element for art direction and format switching:**

`<picture>` lets you specify completely different images for different conditions — not just sizes, but crops, orientations, or modern formats with legacy fallbacks:

```html
<picture>
  <!-- Modern format: AVIF for browsers that support it -->
  <source type="image/avif" srcset="hero.avif 1x, hero@2x.avif 2x">
  <!-- WebP for browsers that support it -->
  <source type="image/webp" srcset="hero.webp 1x, hero@2x.webp 2x">
  <!-- JPEG fallback -->
  <img src="hero.jpg" srcset="hero@2x.jpg 2x" alt="Hero image" width="1200" height="600">
</picture>
```

```html
<!-- Art direction: different crop for mobile vs. desktop -->
<picture>
  <source media="(max-width: 640px)" srcset="hero-portrait.jpg">
  <source media="(min-width: 641px)" srcset="hero-landscape.jpg">
  <img src="hero-landscape.jpg" alt="Hero image">
</picture>
```

**Performance impact:**

Serving an appropriately sized image versus a 2000px image on a 375px mobile device can reduce payload by 80-90%. Combined with lazy loading (`loading="lazy"`) and modern formats (AVIF can be 50% smaller than JPEG at equal quality), responsive images are one of the highest-impact performance optimizations.

```html
<img loading="lazy" decoding="async" src="..." srcset="..." sizes="..." alt="...">
```

### Key Points
- `srcset` with `x` descriptors: choose image based on device pixel ratio — for fixed-size images
- `srcset` with `w` descriptors + `sizes`: browser selects optimal image based on viewport width and DPR — for variable-size images
- `<picture>`: art direction (different crops per breakpoint) and format negotiation (AVIF → WebP → JPEG)
- The browser chooses which `srcset` source to download — it may pick a cached larger image over the "correct" one
- Combine with `loading="lazy"` for below-the-fold images and modern formats (AVIF, WebP) for maximum savings

### Follow-up Prompts
- How does `loading="lazy"` interact with `srcset` and `sizes`, and are there any edge cases where it can hurt performance?
- What are the differences between AVIF, WebP, and JPEG XL in terms of compression, browser support, and encoding time?
- How do CDN image transformation services (Cloudinary, Imgix, Next.js Image) automate responsive image generation?

### Difficulty: intermediate
### Tags: responsive images, srcset, sizes, picture element, art direction, WebP, AVIF, performance, lazy loading

---
