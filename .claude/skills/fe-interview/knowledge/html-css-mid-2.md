# HTML/CSS - Mid Interview Questions (Part 2)
### Language: en

## Q11: What is CSS containment and how does the `contain` property work?

### Question
Explain the CSS `contain` property. What is containment, what values are available, and how does it improve rendering performance?

### Model Answer
CSS containment is a performance optimization mechanism that allows you to tell the browser that a subtree of the DOM is independent from the rest of the page. By declaring containment, you enable the browser to limit the scope of layout, style, and paint calculations, avoiding expensive recalculations that would otherwise ripple through the entire document.

The `contain` property accepts several values that can be combined. `contain: layout` tells the browser that nothing inside the element affects the layout of things outside it, and vice versa. The element becomes a containing block for absolutely-positioned descendants and establishes formatting contexts. This means a layout change inside cannot trigger a global reflow. `contain: paint` tells the browser that the element's descendants do not display outside its bounds — the browser can skip painting the element if it is off-screen. It also establishes a new stacking context and a new formatting context. `contain: style` (experimental, removed from spec in some implementations) limits style counters and quotes to the subtree.

`contain: size` tells the browser that the element's size does not depend on its children — you must provide an explicit size. This allows the browser to skip measuring children when computing the element's size. `contain: strict` is shorthand for `layout paint size`, and `contain: content` is shorthand for `layout paint` (size is excluded because it is the most restrictive).

Real-world use case: a list of thousands of cards. If each card has `contain: content`, updating one card's content cannot trigger layout recalculation across all cards. For an off-screen card, `contain: paint` allows the browser to skip painting it entirely.

`content-visibility: auto` (a newer related property) goes further — it applies `contain: layout style paint` automatically and also defers rendering off-screen content entirely, skipping style calculation and layout for elements not visible in the viewport. This can dramatically reduce initial render time for long pages. `contain-intrinsic-size` provides a placeholder size for `content-visibility: auto` elements while they are not rendered, preventing scrollbar jumps.

### Key Points
- `contain` limits the scope of layout, paint, and style recalculations to a subtree, improving rendering performance
- `layout` isolates layout; `paint` isolates painting and clips overflow; `size` declares the element's size is independent of children
- `contain: content` (`layout paint`) is the safest general-use value; `contain: strict` adds `size`
- `content-visibility: auto` extends containment to defer off-screen element rendering entirely
- Use containment on independent, repeated UI units (cards, list items, widgets) to reduce reflow scope

### Follow-up Prompts
- What are the side effects of `contain: layout` on absolutely positioned children inside the contained element?
- How does `content-visibility: auto` interact with the browser's accessibility tree?
- What is `contain-intrinsic-size` and why is it important when using `content-visibility: auto`?

### Difficulty: intermediate
### Tags: CSS containment, contain, content-visibility, rendering, performance, reflow

---

## Q12: What is CSS Houdini and what problems does it solve?

### Question
Explain the CSS Houdini project. What APIs does it expose, and what can developers do with it that was not previously possible?

### Model Answer
CSS Houdini is a set of browser APIs that expose the CSS engine's internal rendering pipeline to JavaScript developers. Before Houdini, if you wanted a visual effect that CSS could not natively express — a wavy border, a custom layout algorithm, or an animated gradient that tracks scroll position — you had to use workarounds: SVG filters, Canvas overlays, JavaScript-driven style mutations. These workarounds are fragile, bypass the browser's optimization pipeline, and often cause layout jank. Houdini provides official extension points directly into the CSS engine.

The **CSS Painting API** (`CSS.paintWorklet`) lets you define a custom CSS image via a JavaScript worklet that draws to a Canvas-like surface. You register a painter with `CSS.paintWorklet.addModule('my-painter.js')` and use it in CSS as `background: paint(my-painter)`. The painter has access to the element's computed styles and dimensions and can draw any Canvas 2D content. Importantly, this runs off the main thread in some implementations, avoiding jank.

The **CSS Layout API** (`CSS.layoutWorklet`) lets you define entirely custom layout algorithms — the equivalent of creating your own `display: masonry` or `display: circular`. Your worklet implements `layout()` with child intrinsic sizes and returns computed positions. This is how the proposed Masonry layout is prototyped.

The **CSS Properties and Values API** (`CSS.registerProperty`) allows you to register custom CSS properties with a syntax (type), initial value, and whether they inherit. Registering a property allows the browser to interpolate it in CSS transitions and animations — something that was impossible with unregistered custom properties (which are always treated as strings). `@property` is the at-rule equivalent that can be used in pure CSS without JavaScript.

The **Typed OM (CSS Typed Object Model)** replaces the string-based `element.style.width = '10px'` API with typed objects: `element.attributeStyleMap.set('width', CSS.px(10))`. Typed OM is faster (avoids string parsing) and less error-prone.

The **Animation Worklet** allows performant, scroll-linked animations that run off the main thread, enabling truly smooth parallax and scroll-driven effects without `requestAnimationFrame` jank.

### Key Points
- Houdini exposes CSS engine internals via JavaScript worklets and APIs, enabling previously impossible custom effects
- CSS Painting API: custom `paint()` images defined in a worklet with Canvas-like drawing
- CSS Layout API: custom layout algorithms (your own `display` values)
- `CSS.registerProperty` / `@property`: typed custom properties that can be animated and transitioned
- Typed OM replaces string-based style manipulation with typed, faster objects

### Follow-up Prompts
- How does `@property` in pure CSS differ from `CSS.registerProperty()` in JavaScript?
- Why can the CSS Paint worklet run off the main thread, and what does that mean for performance?
- How would you use `CSS.registerProperty` to animate a CSS custom property in a `@keyframes` animation?

### Difficulty: intermediate
### Tags: CSS Houdini, Paint API, Layout API, CSS Properties, Typed OM, rendering, worklet

---

## Q13: What are CSS logical properties and why do they matter for internationalization?

### Question
Explain CSS logical properties. How do they differ from physical properties like `margin-left`, and why are they important for bidirectional and multi-script layouts?

### Model Answer
CSS physical properties (`margin-left`, `padding-top`, `border-right`, `width`, `height`) describe position in absolute physical terms — left, right, top, bottom. This works fine for left-to-right, top-to-bottom layouts (LTR Latin scripts). But it breaks down for right-to-left scripts (Arabic, Hebrew) or vertical writing modes (traditional Chinese, Japanese columns).

CSS logical properties map to layout-relative directions instead: "inline start" (the start of the text direction) and "block start" (the start of the block flow direction). In a standard horizontal LTR layout, "inline start" is the left side and "block start" is the top. In an RTL layout, "inline start" is the right side. In a vertical writing mode, "block start" may be the top or left depending on the direction.

The mapping is systematic: `margin-left` → `margin-inline-start`, `margin-right` → `margin-inline-end`, `margin-top` → `margin-block-start`, `margin-bottom` → `margin-block-end`. Shorthand forms: `margin-inline` sets both `margin-inline-start` and `margin-inline-end`; `margin-block` sets both block-axis margins. The same pattern applies to `padding`, `border`, `inset` (for positioning), `width`/`height` → `inline-size`/`block-size`, and `border-radius` corners.

Practical example: a comment component with a user avatar and text beside it. Using `margin-left: 1rem` on the text always pushes it from the left — in RTL layouts, this places it incorrectly. Using `margin-inline-start: 1rem` automatically respects the writing direction, placing it correctly for both LTR and RTL without media queries or JavaScript.

Adoption strategy: new codebases should use logical properties by default. Existing codebases can adopt them incrementally where internationalisation is needed. Browser support is now excellent across all modern browsers for the common properties. Some shorthand edge cases (like `border-radius` corners' logical equivalents) still have spotty support — check before using.

### Key Points
- Physical properties (`margin-left`) are absolute; logical properties (`margin-inline-start`) are relative to writing direction
- In LTR: `inline-start` = left, `inline-end` = right, `block-start` = top, `block-end` = bottom
- In RTL, `inline-start` and `inline-end` flip automatically — no extra CSS needed
- `inline-size` replaces `width`; `block-size` replaces `height`; `inset-inline-start` replaces `left`
- Use logical properties in new codebases by default for robust internationalization support

### Follow-up Prompts
- How would you migrate a codebase from physical to logical properties — what tooling can help?
- What does the `writing-mode` property do, and how does it affect which axis is "block" and which is "inline"?
- How do logical properties interact with CSS Grid's `justify-items` and `align-items`?

### Difficulty: intermediate
### Tags: CSS logical properties, RTL, writing mode, internationalization, i18n, margin-inline

---

## Q14: How does CSS scroll-snap work?

### Question
Explain the CSS Scroll Snap module. What properties control it, and what are good use cases versus cases where it is inappropriate?

### Model Answer
CSS Scroll Snap is a module that allows you to define snap positions in a scrollable container — points where scrolling will settle, rather than stopping at an arbitrary position. It enables carousel-like experiences, full-page scroll sections, and horizontally scrollable card lists with snap-to-card behavior, all without JavaScript.

There are two sides: the scroll container properties and the snap child properties. On the container, `scroll-snap-type` defines the snap axis and strictness. The axis can be `x` (horizontal), `y` (vertical), or `both`. The strictness is either `mandatory` (always snaps to a snap point — the browser will not stop mid-scroll) or `proximity` (snaps only if the scroll position is close to a snap point — allows stopping between snaps). `mandatory` is appropriate for full-page slideshows; `proximity` is better for card lists where stopping between cards should sometimes be allowed.

On the child elements, `scroll-snap-align` defines where on the element the snap point is: `start` (the element's leading edge aligns to the container's scroll padding start), `center`, or `end`. `scroll-snap-stop: always` (on a child) forces the scroll to stop at that child even during fast flings, preventing users from scrolling past it — useful for mandatory terms or important steps in a flow.

`scroll-padding` on the container and `scroll-margin` on children fine-tune the effective snap positions, accounting for fixed headers or visual offsets.

Use cases: horizontal image carousels, vertical story/reel layouts (like Instagram Stories), full-page "one slide at a time" presentations, horizontally scrollable tag filters. Scroll snap is inappropriate when the content is continuous text or a long feed where users expect to stop at any point — `mandatory` snap on such content would be disorienting.

A critical consideration: never use `overflow: hidden` on a scroll-snap container — it removes scroll capability. Use `overflow: scroll` or `overflow: auto`. Also ensure `overscroll-behavior` is set appropriately to prevent scroll chaining to parent containers.

### Key Points
- `scroll-snap-type` on the container sets the axis and whether snapping is `mandatory` or `proximity`
- `scroll-snap-align` on children declares where on the child the snap point lands (start, center, end)
- `scroll-snap-stop: always` prevents fast flings from skipping a child
- `scroll-padding` (container) and `scroll-margin` (child) offset snap positions for fixed headers etc.
- `mandatory` suits full-page slideshows; `proximity` suits card lists; avoid snap on continuous text content

### Follow-up Prompts
- How would you build a horizontal card carousel with scroll-snap that also works well on touch devices?
- What is the difference between `scroll-snap-stop: always` and `scroll-snap-type: mandatory`?
- How do you handle the case where a snap child is taller or wider than the viewport?

### Difficulty: intermediate
### Tags: scroll-snap, CSS, carousel, scroll-snap-type, scroll-snap-align, UX

---

## Q15: What is `color-scheme` and how does `prefers-color-scheme` enable dark mode?

### Question
Explain the `color-scheme` CSS property and the `prefers-color-scheme` media query. How do you implement dark mode support, and what is the difference between the CSS property and the meta tag approach?

### Model Answer
`prefers-color-scheme` is a CSS media query that detects whether the user has set their operating system to prefer a light or dark color scheme. Values are `light` and `dark`. You use it like any other media query:

```css
@media (prefers-color-scheme: dark) {
  body { background: #1a1a1a; color: #f0f0f0; }
}
```

CSS custom properties make this much cleaner — define a color palette using custom properties and swap the values in the media query, allowing all components that reference the variables to update automatically without rewriting each selector.

The `color-scheme` CSS property (and `<meta name="color-scheme">`) tells the browser itself — not just your CSS — which color schemes the page supports. The browser uses this to style its own UI: form controls (checkboxes, select dropdowns, scrollbars), the default background color, link colors, and other browser-rendered UI. Without declaring `color-scheme: dark`, a page with dark background CSS but no `color-scheme` declaration will have white form inputs in dark mode, creating jarring contrast mismatches.

Setting `color-scheme: light dark` on `:root` tells the browser the page supports both schemes and to use the user's preference for browser UI. `color-scheme: dark` forces browser UI to dark styling. The `<meta name="color-scheme" content="light dark">` HTML tag does the same thing but applies earlier in page load, before CSS is parsed, preventing a flash of light-colored browser UI.

For JavaScript-toggled themes (a light/dark toggle button), the common approach is to set a `data-theme` attribute on `<html>` and use attribute selectors in CSS:

```css
[data-theme="dark"] { --background: #1a1a1a; }
[data-theme="light"] { --background: #ffffff; }
```

The best architecture combines all three: `prefers-color-scheme` for the default OS-matched behavior, `color-scheme` property to fix browser UI styling, and a `data-theme` attribute for user-initiated overrides, with a stored preference in `localStorage`.

### Key Points
- `prefers-color-scheme: dark` media query detects OS-level dark mode preference
- `color-scheme: light dark` tells the browser to style its own UI (forms, scrollbars) according to the user's preference
- The `<meta name="color-scheme">` tag applies before CSS is parsed, preventing flash of incorrect browser UI
- CSS custom properties make dark mode theming clean — redefine variables in the media query or under a theme attribute
- A complete dark mode solution combines: `prefers-color-scheme` default + `color-scheme` property + `data-theme` attribute for user override + `localStorage` persistence

### Follow-up Prompts
- How would you implement a three-way theme toggle (light / dark / system) using `prefers-color-scheme` and `localStorage`?
- Why do form elements look wrong in dark mode even with correct CSS, and how does `color-scheme` fix this?
- What is the `forced-colors` media query and how does it relate to Windows High Contrast Mode?

### Difficulty: intermediate
### Tags: color-scheme, prefers-color-scheme, dark mode, CSS, media query, theming

---

## Q16: How do CSS Container Queries work?

### Question
Explain CSS Container Queries. How do they differ from media queries, what is a containment context, and what are their primary use cases?

### Model Answer
Media queries respond to the size of the viewport — the browser window. Container queries respond to the size of a specific ancestor container element. This distinction is fundamental: with media queries, a sidebar card component must know whether it is in a sidebar or a main content area based on the viewport width. With container queries, the component itself detects its available space regardless of the viewport size, enabling truly portable, context-aware components.

To use container queries, first declare a containment context on the container element using `container-type`. `container-type: inline-size` enables querying of the container's inline (typically width) size. `container-type: size` enables both inline and block (height) size queries. Setting a `container-name` is optional but allows querying a specific ancestor by name:

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}
```

Then use `@container` queries on children:

```css
@container card (min-width: 400px) {
  .card { flex-direction: row; }
}

@container (max-width: 300px) {
  .card__image { display: none; }
}
```

Without a name, the query targets the nearest `container-type` ancestor. Container queries support the same size features as media queries: `min-width`, `max-width`, `min-height`, `max-height`, and the newer range syntax.

`cqi` and `cqb` are container query units — percentages of the queried container's inline or block size, similar to `vw`/`vh` but relative to the container. `cqw`, `cqh`, `cqmin`, `cqmax` are also available.

Container queries complement, not replace, media queries. Viewport-level decisions (navigation layout, sidebar presence) belong in media queries. Component-level adaptations (card layout, image visibility) belong in container queries. This separation produces more maintainable, composable CSS.

### Key Points
- Container queries respond to the size of a container element, not the viewport
- Declare a containment context with `container-type: inline-size` (or `size`) on the ancestor
- Use `@container (min-width: Xpx) {}` to style children based on container size
- `container-name` allows querying a specific named ancestor, not just the nearest one
- Container query units (`cqi`, `cqb`, `cqw`, `cqh`) are percentage-based relative to the query container

### Follow-up Prompts
- How would you build a card component that switches between vertical and horizontal layouts based on its container width, not the viewport?
- What is the difference between `container-type: inline-size` and `container-type: size`?
- Can container queries be used for style queries (querying CSS custom property values) in addition to size queries?

### Difficulty: intermediate
### Tags: container queries, CSS, responsive design, media queries, containment, component design

---

## Q17: What is CSS subgrid and when do you need it?

### Question
Explain CSS subgrid. What problem does it solve that regular grid cannot, and how do you use it?

### Model Answer
CSS subgrid allows a nested grid container to participate in its parent grid's track definitions instead of creating entirely independent tracks. Before subgrid, nested grids always created their own, independent coordinate system — items inside a nested grid could not align with the parent grid's rows or columns.

The classic problem it solves: a card grid where each card has a title, image, and description. You want all cards' titles to align on the same row, all images on the next row, and all descriptions on the following row — even if title text lengths differ between cards. Without subgrid, each card's internal layout is independent, so a card with a long title pushes its image and description down, misaligning with adjacent cards.

With subgrid, a card that spans multiple parent columns or rows can share the parent's track sizes. You enable it by setting `grid-template-columns: subgrid` or `grid-template-rows: subgrid` on the nested grid container:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto; /* title, image, description rows */
  gap: 1rem;
}

.card {
  grid-row: span 3; /* occupy 3 parent rows */
  display: grid;
  grid-template-rows: subgrid; /* inherit parent's 3 row definitions */
}
```

Now each `.card` item (title, image, description) aligns to the parent grid's shared row tracks, making all cards' elements align perfectly regardless of content height differences.

Subgrid is particularly powerful for form layouts (label + input pairs aligning across multiple rows), data tables built with CSS grid, and any repeating multi-row/column component structure where alignment across instances matters.

Browser support reached baseline in 2023 (Safari 16, Chrome 117, Firefox 71). `grid-template-columns: subgrid` and `grid-template-rows: subgrid` can be used independently — you can inherit columns but define your own rows.

### Key Points
- Subgrid allows a nested grid to use the parent grid's track sizes instead of defining its own
- `grid-template-columns: subgrid` or `grid-template-rows: subgrid` on a child grid container enables it
- The child must span multiple parent tracks with `grid-column: span N` or `grid-row: span N` to have tracks to inherit
- Primary use case: aligning internal elements across multiple instances of a repeated component (cards, form rows)
- Baseline support achieved in 2023 across all major browsers

### Follow-up Prompts
- How would you use subgrid to align form labels and inputs across multiple rows in a complex form?
- What happens if a subgrid child spans different numbers of parent tracks in different screen sizes?
- Can you use subgrid on both axes simultaneously — `grid-template-columns: subgrid; grid-template-rows: subgrid;`?

### Difficulty: intermediate
### Tags: CSS subgrid, CSS Grid, nested grid, layout, alignment

---

## Q18: How does the `aspect-ratio` property work in CSS?

### Question
Explain the CSS `aspect-ratio` property. What does it do, how does it interact with explicit sizing, and what are its use cases?

### Model Answer
The `aspect-ratio` property allows you to define a preferred width-to-height ratio for an element. When only one dimension is specified (or the element is sized by the container), the browser calculates the other dimension automatically to maintain the ratio. `aspect-ratio: 16 / 9` means for every 16 units of width, the element will be 9 units tall.

Before `aspect-ratio`, the classic technique for maintaining aspect ratio was the "padding-top hack" — setting `height: 0` and `padding-top: 56.25%` (which is 9/16 as a percentage) on a wrapper. This worked because percentage padding is calculated relative to the element's width. It was fragile, required wrapper divs, and was confusing to read. `aspect-ratio` replaces this entirely.

The property's behavior depends on how other sizing properties are set. If `width` is specified but not `height`, the browser calculates `height` from the ratio. If `height` is specified but not `width`, it calculates `width`. If both `width` and `height` are set, `aspect-ratio` is ignored — explicit dimensions take priority. If neither is set, the element uses its intrinsic size or content-determined size, and `aspect-ratio` maintains the ratio.

The `auto` keyword can be prepended: `aspect-ratio: auto 16 / 9`. For replaced elements (images, videos, iframes) that have an intrinsic aspect ratio, `auto` uses the intrinsic ratio; otherwise, it falls back to the specified ratio. This is the recommended way to set `aspect-ratio` on images: `img { aspect-ratio: auto 16 / 9; }` respects the image's natural dimensions if they differ.

Common use cases: responsive video embeds (`iframe { aspect-ratio: 16 / 9; width: 100%; }`), square cards or thumbnails (`aspect-ratio: 1`), consistent thumbnail placeholders while images load (prevents layout shift), and avatar circles.

### Key Points
- `aspect-ratio: W / H` maintains a width-to-height ratio when only one dimension is explicitly set
- If both `width` and `height` are specified, `aspect-ratio` is ignored — explicit sizing wins
- Replaces the old `padding-top` percentage hack for responsive iframes and video embeds
- `aspect-ratio: auto W / H` uses the element's intrinsic ratio for replaced elements (images) and falls back to `W / H`
- Use `aspect-ratio: 1` for squares, `16 / 9` for video, or any ratio for consistent placeholder sizing

### Follow-up Prompts
- How would you create a responsive video embed that maintains 16:9 ratio with `aspect-ratio`?
- What happens to `aspect-ratio` when an element has `min-height` or `max-height` that conflicts with the ratio?
- How does `aspect-ratio` help prevent Cumulative Layout Shift (CLS) for images?

### Difficulty: intermediate
### Tags: aspect-ratio, CSS, responsive design, layout, video embed, CLS

---

## Q19: What is the CSS `:has()` selector and what makes it so powerful?

### Question
Explain the CSS `:has()` pseudo-class. What does it allow, how does it work, and why was it difficult to implement in browsers?

### Model Answer
`:has()` is a CSS pseudo-class that selects elements based on whether they contain elements matching a given selector. It is often described as the "parent selector" that CSS developers requested for decades. `a:has(img)` selects anchor tags that contain an image. `form:has(:invalid)` selects a form that contains at least one invalid input. `section:has(h2)` selects sections with an `h2` heading.

The capability is transformative. Before `:has()`, CSS selectors could only look "downward" into descendants or "sideways" to following siblings — never "upward" to parents or ancestors. Any parent-conditional styling required JavaScript. `:has()` eliminates entire categories of JavaScript DOM manipulation for styling purposes.

Real examples of what becomes possible: styling a list item differently when its child checkbox is checked (`li:has(input:checked) { background: lightgreen; }`), changing a form layout when a specific option is selected (`form:has(select[value="express"]) .shipping-options { display: block; }`), styling a card header differently when the card has no image (`card:not(:has(.card__image)) .card__title { font-size: 1.5rem; }`).

`:has()` can also work with combinators for sibling or descendant conditions. `h2:has(+ p)` selects an `h2` that is immediately followed by a `p`. This builds on the adjacent sibling combinator to check the following element — something previously impossible.

The reason `:has()` was hard to implement: most CSS selectors can be evaluated right-to-left for performance (find all elements matching the rightmost simple selector, then filter by ancestors). `:has()` requires looking at descendants or siblings to decide if the current element matches — which potentially requires evaluating the entire subtree for every element, making naive implementations extremely slow. Browser engineers had to develop efficient evaluation strategies before shipping it. It became baseline available (all major browsers) in 2023.

`:has()` cannot use pseudo-elements inside it (like `::before`), and forgiving selector parsing means invalid selectors inside `:has()` are ignored rather than invalidating the rule.

### Key Points
- `:has()` selects an element if it contains (or is followed by) elements matching the argument selector
- Enables the long-requested "parent selector" pattern — styles applied based on child content
- Works with any valid selector including combinators: `:has(> .child)`, `:has(+ sibling)`, `:has(~ following)`
- Became baseline across all major browsers in 2023 after years of implementation challenges
- Cannot reference pseudo-elements inside `:has()`; invalid selectors inside are silently ignored

### Follow-up Prompts
- How would you use `:has()` to style a navigation item differently when it contains the current active link?
- What is the performance impact of `:has()` with complex selectors on large DOMs?
- How does `:has()` interact with `:not()` — for example, `article:not(:has(img))`?

### Difficulty: intermediate
### Tags: :has(), CSS, parent selector, pseudo-class, selector, DOM

---

## Q20: What are CSS Cascade Layers (`@layer`) and how do they change specificity management?

### Question
Explain CSS `@layer`. How do cascade layers work, how do they differ from specificity and source order, and when would you use them?

### Model Answer
CSS Cascade Layers are a mechanism to explicitly control the order of specificity for groups of CSS rules, independent of selector specificity or source order. They address a fundamental pain point: in large codebases with frameworks, third-party libraries, and application styles, managing specificity through selector complexity is fragile and hard to reason about.

You declare layers with the `@layer` at-rule. Layers are sorted by their declaration order — styles in a later-declared layer always override styles in an earlier layer, regardless of selector specificity. An `!important` rule inside a layer inverts this — `!important` in earlier layers beats `!important` in later layers (the cascade inversion also applies to layer importance).

```css
@layer reset, base, components, utilities;

@layer reset {
  * { box-sizing: border-box; margin: 0; }
}

@layer base {
  h1 { font-size: 2rem; }
}

@layer components {
  .button { background: blue; color: white; }
}

@layer utilities {
  .mt-4 { margin-top: 1rem !important; }
}
```

The `@layer` declaration at the top establishes the order: `reset` < `base` < `components` < `utilities`. Any `.button` style in `utilities` would beat a `.button` style in `components`, even if the `components` selector is more specific. This makes the priority explicit and readable.

Unlayered styles (styles not in any `@layer`) have the highest priority by default — they beat all layered styles. This is crucial for gradual adoption: existing code without layers is unaffected and continues to win.

The main use case is importing third-party CSS into a layer so it cannot accidentally override your application styles: `@import url('library.css') layer(third-party)`. Any library selector, no matter how specific, loses to your unlayered or higher-priority-layer styles.

Sub-layers are also possible: `@layer components.buttons { }` creates a `buttons` sub-layer within `components`. Anonymous layers (`@layer { }`) create a layer that cannot be referenced or appended to later.

### Key Points
- `@layer` creates named groups of CSS rules; later-declared layers win over earlier ones, regardless of specificity
- The `@layer name1, name2, name3` declaration at the top establishes the priority order explicitly
- Unlayered styles beat all layered styles by default — existing code without layers is unaffected
- Primary use case: importing third-party CSS into a lower-priority layer so your styles always win
- `@import url('lib.css') layer(third-party)` wraps an entire stylesheet in a layer

### Follow-up Prompts
- How does `!important` inside a cascade layer interact with `!important` outside layers?
- What happens when you append styles to a previously declared layer — do they take the original layer's priority position?
- How would you use `@layer` to integrate a utility-first framework like Tailwind with a component library, ensuring the right styles win?

### Difficulty: intermediate
### Tags: CSS layers, @layer, cascade, specificity, CSS architecture, third-party

---
