# HTML/CSS - Junior Interview Questions (Part 2)
### Language: en

## Q11: What are the different values of the CSS `position` property?

### Question
Explain the CSS `position` property. What are the differences between `static`, `relative`, `absolute`, `fixed`, and `sticky`, and how does each affect layout?

### Model Answer
The `position` property controls how an element is placed in the document. It also determines whether `top`, `right`, `bottom`, and `left` offset properties have any effect.

`static` is the default. Elements flow in the normal document flow (block elements stack vertically, inline elements flow horizontally). Offset properties have no effect. This is how every element behaves unless you override it.

`relative` keeps the element in normal flow (it still takes up space in its original position) but allows you to offset it visually using `top`, `right`, `bottom`, and `left` relative to where it would have been. Crucially, `position: relative` establishes a new positioning context, meaning absolutely-positioned descendants will be positioned relative to this element.

`absolute` removes the element from normal flow (it no longer takes up space). It is positioned relative to its nearest ancestor that has `position` set to anything other than `static`. If no such ancestor exists, it is positioned relative to the initial containing block (essentially the `<html>` element). This is commonly used for tooltips, dropdowns, and decorative elements that need precise placement.

`fixed` is similar to `absolute` but always positions the element relative to the browser viewport, not any ancestor. It remains fixed as the user scrolls. Common uses: sticky navigation bars, cookie banners, chat widgets. Note that a parent with `transform`, `filter`, or `perspective` CSS properties will intercept `fixed` positioning, causing the element to be positioned relative to that parent instead — a common source of confusion.

`sticky` is a hybrid. The element behaves like `relative` until it scrolls to a specified threshold (e.g., `top: 0`), at which point it "sticks" to that position within its scrolling container, behaving like `fixed` until its parent scrolls out of view. Commonly used for table headers and sidebar navigation that should stick while the user scrolls through content.

### Key Points
- `static` is the default — normal flow, no offset properties
- `relative` stays in flow but can be visually offset; establishes a positioning context for `absolute` children
- `absolute` is removed from flow, positioned relative to nearest non-static ancestor
- `fixed` is positioned relative to the viewport and stays put on scroll (but `transform` on an ancestor breaks this)
- `sticky` toggles between `relative` and `fixed` behavior based on scroll position within its container

### Follow-up Prompts
- How would you center an absolutely positioned element both horizontally and vertically inside its container?
- Why does `position: sticky` stop working when a parent element has `overflow: hidden`?
- What is a "containing block" in CSS positioning?

### Difficulty: basic
### Tags: position, CSS, layout, absolute, fixed, sticky, relative

---

## Q12: How does `z-index` work and what is a stacking context?

### Question
Explain `z-index` and the concept of a stacking context. Why does a higher `z-index` not always appear on top?

### Model Answer
`z-index` controls the stacking order of positioned elements along the z-axis (depth). An element with a higher `z-index` appears in front of one with a lower value. However, `z-index` only works on elements that are positioned (i.e., `position` is something other than `static`) or are flex/grid items.

The reason a higher `z-index` does not always win is the stacking context. A stacking context is an isolated z-order group — elements inside a stacking context are stacked relative to each other, and the entire context is treated as a single unit when stacked against elements outside it. You cannot make a child element appear above an element outside its stacking context by giving the child a very high `z-index`, because the context as a whole is ranked against other contexts.

Many CSS properties create a new stacking context beyond the obvious `z-index` with `position`. These include: `opacity` less than 1, any `transform` value, `filter`, `will-change`, `isolation: isolate`, `mix-blend-mode` other than `normal`, `contain: layout` or `paint`, and `position: fixed` or `position: sticky`. This is why developers are sometimes surprised when a high `z-index` is ineffective — a parent has an implicit stacking context.

The `isolation: isolate` property was added specifically to create a stacking context without any visual side effects, making it the cleanest way to intentionally isolate z-index behavior in a component.

To debug `z-index` issues: check whether ancestors create stacking contexts (often `transform` or `opacity` is the culprit), inspect the stacking context hierarchy in Chrome DevTools (Layers panel), and ensure the element you are positioning has a non-static `position` value.

### Key Points
- `z-index` controls depth ordering and only works on positioned elements or flex/grid items
- A stacking context groups elements — children cannot escape their context's z-order relative to external elements
- Many properties create new stacking contexts: `opacity < 1`, `transform`, `filter`, `will-change`, `isolation: isolate`
- `isolation: isolate` creates a stacking context without visual side effects — ideal for component encapsulation
- Debugging: check ancestors for implicit stacking contexts created by `transform` or `opacity`

### Follow-up Prompts
- Why does adding `transform: translateZ(0)` to an element sometimes fix a z-index bug elsewhere on the page?
- How would you use `isolation: isolate` to prevent a modal from being affected by ancestor `z-index` values?
- What is the stacking order within a single stacking context (background, negative z-index, block elements, floats, inline elements, positioned elements)?

### Difficulty: basic
### Tags: z-index, stacking context, CSS, layers, positioning, isolation

---

## Q13: What are CSS combinators and how do they work?

### Question
Explain CSS combinators: descendant, child, adjacent sibling, and general sibling. How does each one select elements, and when would you use each?

### Model Answer
CSS combinators define relationships between selectors, allowing you to target elements based on their position relative to other elements in the DOM.

The descendant combinator (a space: `A B`) selects all `B` elements that are descendants of `A` — any level deep, not just direct children. `div p` selects all `<p>` elements inside any `<div>`, whether a direct child or nested many levels deep. This is the broadest and most commonly used combinator.

The child combinator (`A > B`) selects only `B` elements that are direct children of `A`. `ul > li` selects `<li>` elements that are immediate children of `<ul>`, but not `<li>` elements inside nested `<ul>` elements. Use this when you need to target only the immediate level without affecting deeper nesting.

The adjacent sibling combinator (`A + B`) selects the `B` element that immediately follows `A` in the DOM as a sibling (same parent, right next to each other). `h2 + p` selects the first `<p>` that comes right after an `<h2>`. Common use case: styling the first paragraph after a heading differently, or adding spacing between adjacent elements of specific types.

The general sibling combinator (`A ~ B`) selects all `B` elements that follow `A` as siblings (same parent, anywhere after `A`, not just immediately). `h2 ~ p` selects all `<p>` elements that come after an `<h2>` within the same parent. Useful for "all items after this one" scenarios.

These combinators compose with any selectors, including class and ID selectors: `.card > .card__title`, `input:checked ~ .label`. Combinators are read right-to-left by the browser's selector engine for matching, though you write them left-to-right for semantics. Complex descendant selectors can be slow when they match large portions of the DOM, so prefer class-based selectors for performance-critical components.

### Key Points
- Descendant (space): any depth — `A B` selects all `B` inside `A`
- Child (`>`): direct children only — `A > B`
- Adjacent sibling (`+`): immediately following sibling — `A + B`
- General sibling (`~`): all following siblings — `A ~ B`
- Combinators work with any selectors and can be chained; prefer specific class selectors for performance

### Follow-up Prompts
- How would you use the adjacent sibling combinator to style a label when its paired checkbox is checked?
- What is the difference between `ul li` and `ul > li` when the list contains nested lists?
- Why are descendant selectors potentially slower than class selectors in large DOMs?

### Difficulty: basic
### Tags: CSS combinators, selectors, descendant, child, sibling, specificity

---

## Q14: What is the difference between `inline`, `block`, and `inline-block` display values?

### Question
Explain the differences between `display: inline`, `display: block`, and `display: inline-block`. How does each affect sizing, spacing, and flow?

### Model Answer
`display: block` makes an element a block-level element. Block elements start on a new line and stretch to fill the full width of their container by default. You can set explicit `width`, `height`, `margin`, and `padding` on all sides. Common block elements: `div`, `p`, `h1`-`h6`, `ul`, `ol`, `section`, `article`.

`display: inline` makes an element flow with text. Inline elements do not start on a new line and only take up as much width as their content requires. Critically, you cannot set `width` or `height` on inline elements — they are sized by content. Vertical `margin` and `padding` visually appear but do not push other elements away (they overlap). Horizontal `margin` and `padding` work normally. Common inline elements: `span`, `a`, `strong`, `em`, `img` (though `img` is inline but behaves somewhat like inline-block due to its replaced element nature).

`display: inline-block` combines characteristics of both. Like `inline`, it flows in the text line and does not force a line break. Like `block`, you can set `width`, `height`, and full `margin`/`padding`. This makes it useful for elements that need sizing control but should sit inline — buttons, icon + label pairs, navigation items. Before flexbox became universal, `inline-block` was the standard technique for horizontal navigation menus.

A subtle quirk with `inline` and `inline-block`: whitespace in the HTML source (newlines, spaces) creates a small gap between adjacent inline/inline-block elements. This can be fixed by setting `font-size: 0` on the parent, using comments to eliminate whitespace, or simply switching to flexbox which handles spacing more predictably.

In modern CSS, `block` and `inline` are still fundamental, but `inline-block` has been largely replaced by `flex` and `grid` for layout purposes. Understanding all three remains important for working with legacy codebases and understanding element flow.

### Key Points
- `block` creates a full-width box that starts on a new line; supports all sizing and spacing properties
- `inline` flows with text; ignores `width`/`height`; vertical padding/margin does not push other elements
- `inline-block` flows with text but respects `width`, `height`, and all margin/padding
- Whitespace gaps between `inline-block` elements are a common gotcha
- Modern flexbox and grid have largely replaced `inline-block` for layout, but understanding the three values is still fundamental

### Follow-up Prompts
- How would you remove the whitespace gap between two `inline-block` elements without modifying the HTML?
- Why does an `<img>` element sometimes have an unexpected gap below it, and how do you fix it?
- What happens when you set `display: inline` on a `<div>` that contains block-level children?

### Difficulty: basic
### Tags: display, inline, block, inline-block, CSS, layout, box model

---

## Q15: How do CSS `float` and `clear` work?

### Question
Explain the CSS `float` property and `clear`. What does floating do to an element, what problems can arise, and what is the "clearfix" technique?

### Model Answer
`float` removes an element from normal flow (partially — text and inline content still wrap around it) and shifts it to the left or right of its container. Floated elements were the primary layout mechanism before flexbox and grid became widespread. Common historical uses: text wrapping around images, multi-column layouts.

When an element is floated, it becomes a block-level element regardless of its original display value. The floated element moves to the left or right edge of its containing block (or the edge of the nearest preceding float). Inline content — text, inline elements — flows around the float. Block elements behind the float collapse under it.

The classic problem: a container with only floated children collapses to zero height because the floated children are taken out of the normal flow and do not contribute to the parent's height calculation. This "parent collapse" problem was the bane of pre-flexbox layouts.

The `clear` property fixes elements that follow a float. `clear: left` pushes an element below any left floats; `clear: right` clears right floats; `clear: both` clears all preceding floats. If you have a float followed by a footer, adding `clear: both` to the footer ensures it starts below the float.

The **clearfix** technique solves the parent collapse problem without adding extra markup. The most common modern clearfix uses a CSS pseudo-element:

```css
.clearfix::after {
  content: '';
  display: block;
  clear: both;
}
```

This inserts an invisible block-level element after the container's content that clears all floats, forcing the container to expand to encompass them.

Today, `float` is rarely used for layout — flexbox and grid handle multi-column layouts more reliably. `float` is still appropriate for its original use case: wrapping text around an image (e.g., magazine-style layouts with `float: left` on an image).

### Key Points
- `float` shifts an element left or right; block content ignores it, but inline content wraps around it
- Floated elements become block-level regardless of their original display value
- A container with only floated children collapses to zero height — the "parent collapse" problem
- `clear: both` on an element forces it to start below any preceding floats
- Clearfix (`::after { content: ''; display: block; clear: both; }`) solves parent collapse without extra markup

### Follow-up Prompts
- How does `overflow: hidden` on a container also solve the float parent-collapse problem?
- How would you use `float` to create a classic magazine layout with text wrapping around an image?
- What does `display: flow-root` do, and how does it relate to the clearfix technique?

### Difficulty: basic
### Tags: float, clear, clearfix, CSS, layout, normal flow

---

## Q16: What are the HTML5 semantic elements `<details>`, `<summary>`, and `<dialog>`?

### Question
Explain the `<details>`, `<summary>`, and `<dialog>` HTML5 elements. What do they do, what are their built-in behaviors, and when should you use them?

### Model Answer
`<details>` creates a disclosure widget — a collapsible section that the user can open and close. By default, the content inside `<details>` is hidden. Clicking the disclosure triangle (the default browser rendering) toggles visibility. The `open` attribute (a boolean) controls whether it is expanded: `<details open>` starts expanded. JavaScript can detect toggle events via the `toggle` event.

`<summary>` provides the visible, clickable label for a `<details>` element. It must be the first child of `<details>`. If `<summary>` is omitted, browsers provide a default label like "Details." Using `<summary>` gives you semantic control over the label. The `<summary>` element can contain inline content including headings.

Together, `<details>` and `<summary>` provide an accessible accordion/FAQ item out of the box without JavaScript. They are keyboard accessible (Enter/Space to toggle) and expose the expanded/collapsed state to assistive technologies. Use cases: FAQ sections, filter panels, "show more" expandable content, release notes.

`<dialog>` represents a modal or non-modal dialog box. It can be shown with the `.showModal()` JavaScript method (modal — creates a backdrop, traps focus inside, blocks interaction with the rest of the page) or `.show()` (non-modal — no backdrop or focus trap). The `open` attribute makes it visible. The `close` event fires when the dialog is dismissed (via the Escape key or a button with `method="dialog"` in a `<form>` inside the dialog).

`<dialog>` solves accessibility problems that custom modal implementations frequently get wrong: it manages focus trapping, provides a native backdrop via the `::backdrop` pseudo-element, supports closing with Escape by default, and properly communicates the dialog role to screen readers.

Using these native elements is preferred over custom ARIA implementations because they come with correct semantics, keyboard behavior, and accessibility support pre-built.

### Key Points
- `<details>`/`<summary>` create an accessible collapsible disclosure widget without JavaScript
- `<details open>` starts expanded; the `toggle` event fires on state changes
- `<dialog>` creates a modal (`.showModal()`) or non-modal (`.show()`) dialog with built-in focus management and Escape key support
- `<dialog>`'s `::backdrop` pseudo-element styles the modal overlay
- All three elements provide built-in accessibility semantics and keyboard behavior superior to custom div-based implementations

### Follow-up Prompts
- How would you style the `<details>` marker (the disclosure triangle) using CSS?
- What is the difference between `.show()` and `.showModal()` on a `<dialog>` element?
- How would you retrieve the value a user selected inside a `<dialog>` after they submit a form within it?

### Difficulty: basic
### Tags: HTML5, details, summary, dialog, semantic HTML, accessibility, modal

---

## Q17: What does the viewport meta tag do and why is it important for responsive design?

### Question
Explain the `<meta name="viewport">` tag. What does it control, what are the common values, and what happens without it?

### Model Answer
The viewport meta tag tells the browser how to control the page's dimensions and scaling on mobile devices. Without it, mobile browsers apply a "virtual viewport" — they render the page at a desktop width (typically 980px) and then scale it down to fit the physical screen, making text tiny and the page appear zoomed out. This is the default behavior browsers adopted to handle desktop-only websites before responsive design was common.

The standard responsive design declaration is:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

`width=device-width` instructs the browser to set the viewport width equal to the physical pixel width of the device's screen (in CSS pixels, accounting for the device pixel ratio). This means a phone with a 390px-wide logical screen renders the page at 390px wide, and your CSS media queries work as expected.

`initial-scale=1` sets the initial zoom level to 100% — no zoom in or out on page load. Without this, some browsers (particularly older iOS Safari) may apply a default zoom.

Additional values you may encounter: `minimum-scale` and `maximum-scale` control how much the user can zoom out or in. `user-scalable=no` or `user-scalable=0` prevents the user from pinching to zoom entirely. However, `user-scalable=no` is an accessibility violation — it prevents users with low vision from zooming in to read content — and should be avoided. WCAG 2.1 criterion 1.4.4 specifically requires that text can be resized up to 200% without loss of content.

In modern responsive design, the viewport meta tag is table stakes — every web page should have it. CSS media queries (`@media (max-width: 768px)`) only work correctly when the viewport is properly configured.

### Key Points
- Without the viewport meta tag, mobile browsers render pages at desktop width (~980px) then scale them down
- `width=device-width` makes the viewport match the device's logical pixel width
- `initial-scale=1` prevents browsers from applying a default zoom on load
- Avoid `user-scalable=no` — it blocks zooming and violates WCAG accessibility guidelines
- The viewport tag is required for CSS media queries to function correctly on mobile devices

### Follow-up Prompts
- What is the difference between CSS pixels and physical device pixels, and how does `device-pixel-ratio` relate?
- How does the viewport meta tag interact with CSS `@media` queries for responsive breakpoints?
- What does `viewport-fit=cover` do, and when would you use it (hint: iPhone notch/safe areas)?

### Difficulty: basic
### Tags: viewport, meta tag, responsive design, mobile, CSS pixels, media queries

---

## Q18: How does CSS `overflow` work?

### Question
Explain the CSS `overflow` property and its values. How does it control content that exceeds its container, and what is a block formatting context?

### Model Answer
The `overflow` property controls what happens when an element's content is larger than its container. It applies to block-level elements with a defined size (explicit `height` or `width` that can be exceeded).

`overflow: visible` is the default. Content that exceeds the container's bounds is rendered outside the box — it is visible but does not affect layout (it does not push sibling elements). This can cause content to overlap other elements.

`overflow: hidden` clips any content that exceeds the container. The clipped content is simply not rendered. This is also commonly used as a clearfix technique (containing floats) and to hide scrollbars on elements with controlled scrolling. A side effect: `overflow: hidden` establishes a block formatting context (BFC), which is why it contains floats.

`overflow: scroll` always shows scrollbars (both horizontal and vertical, even if not needed). This is rarely desirable visually but guarantees consistent layout since scrollbar presence does not shift content.

`overflow: auto` shows scrollbars only when content overflows. This is usually the preferred choice when you want scrolling — no unnecessary scrollbars, but they appear when needed.

`overflow: clip` (newer, less supported) is similar to `hidden` but does not establish a BFC. It strictly clips without any formatting context side effects.

The `overflow` shorthand sets both axes. `overflow-x` and `overflow-y` control horizontal and vertical independently. A common pattern: `overflow-x: auto; overflow-y: visible` — but be aware that you cannot have `visible` on one axis when the other is not `visible`; browsers will silently change `visible` to `auto` in that case.

A Block Formatting Context (BFC) is an isolated layout region where floats are contained, margins do not collapse with external elements, and the element's box does not overlap floats. Creating a BFC (`overflow: hidden/auto/scroll`, `display: flow-root`, `float`, `position: absolute/fixed`) is a powerful technique for controlling layout behavior.

### Key Points
- `visible` (default): content overflows visually without affecting layout
- `hidden`: clips overflow; also establishes a Block Formatting Context (contains floats)
- `scroll`: always shows scrollbars; `auto`: scrollbars only when needed (preferred for scrollable containers)
- Setting one axis to non-`visible` converts the other axis's `visible` to `auto` automatically
- `overflow: hidden` on a container is a common clearfix technique due to BFC creation

### Follow-up Prompts
- Why does `overflow: hidden` on a parent contain its floated children?
- What is `display: flow-root` and how does it differ from `overflow: hidden` for creating a BFC?
- How would you create a horizontally scrollable card list while keeping vertical overflow hidden?

### Difficulty: basic
### Tags: overflow, CSS, BFC, block formatting context, scroll, clip, layout

---

## Q19: What are the basics of CSS Grid layout?

### Question
Explain CSS Grid. What are its core concepts — grid container, grid items, tracks, and areas — and how does it differ from flexbox?

### Model Answer
CSS Grid is a two-dimensional layout system that allows you to place elements into rows and columns simultaneously. Flexbox is one-dimensional (either a row or a column); Grid handles both axes at once, making it ideal for page-level layouts and complex component structures.

You activate Grid by setting `display: grid` on a container element. The container becomes the grid container; its direct children become grid items. You define the structure with `grid-template-columns` and `grid-template-rows`:

```css
.container {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
}
```

The `fr` unit represents a fraction of the available space after fixed-size tracks are allocated. `1fr 2fr 1fr` creates three columns where the middle is twice as wide as the others.

`gap` (formerly `grid-gap`) sets spacing between tracks. `column-gap` and `row-gap` control each axis independently.

`repeat()` is a convenience function: `repeat(3, 1fr)` is equivalent to `1fr 1fr 1fr`. `minmax(min, max)` defines a size range for a track. The pattern `repeat(auto-fill, minmax(200px, 1fr))` creates as many columns as fit at least 200px wide — a powerful responsive grid without media queries.

Grid items can span multiple tracks with `grid-column: 1 / 3` (spans from column line 1 to line 3, i.e., two columns) or `grid-column: span 2`. Named template areas (`grid-template-areas`) allow you to name regions and assign items using `grid-area` — very readable for page skeleton layouts.

Grid versus flexbox: use Grid for two-dimensional layout where you control both rows and columns, or when items must align on both axes simultaneously. Use Flexbox for one-dimensional layouts — a row of buttons, a column of list items — or when items should size according to their content. In practice, you often use both: Grid for the page macro-layout, Flexbox for individual component internals.

### Key Points
- CSS Grid is two-dimensional (rows and columns); Flexbox is one-dimensional
- `display: grid` on the container; `grid-template-columns`/`rows` define the track structure
- The `fr` unit allocates fractional remaining space; `repeat()`, `minmax()`, and `auto-fill`/`auto-fit` enable flexible responsive grids
- `gap` sets spacing between tracks; `grid-column`/`grid-row` control item placement and spanning
- `grid-template-areas` + `grid-area` enable named, readable layout assignments

### Follow-up Prompts
- What is the difference between `auto-fill` and `auto-fit` in `repeat(auto-fill, minmax(...))`?
- How would you use `grid-template-areas` to create a classic header/sidebar/main/footer layout?
- When would you choose CSS Grid over Flexbox for a component's internal layout?

### Difficulty: basic
### Tags: CSS Grid, layout, grid container, grid item, fr unit, flexbox, two-dimensional

---

## Q20: What are HTML5 form input types and why do they matter?

### Question
Explain HTML5's new input types. What types are available, what built-in behavior do they provide, and why are semantic input types important?

### Model Answer
HTML5 introduced a wide variety of `<input type="">` values beyond the original `text`, `password`, `checkbox`, `radio`, `submit`, `reset`, `button`, `hidden`, `file`, and `image`. These new types provide built-in validation, appropriate mobile keyboards, and native UI controls — all without JavaScript.

`type="email"` validates that the input matches an email format (contains `@` with a domain). `type="url"` validates a URL format. `type="tel"` does not enforce a format (phone formats vary globally) but shows a numeric keypad on mobile. `type="number"` restricts input to numbers, shows increment/decrement spinners, and accepts `min`, `max`, and `step` attributes. `type="range"` renders a slider control with the same attributes. `type="date"`, `type="time"`, `type="datetime-local"`, `type="month"`, and `type="week"` provide native date/time pickers with formatted output values.

`type="search"` is semantically a search field — browsers may style it differently (rounded corners, clear button) and expose it appropriately to search engines and assistive technologies. `type="color"` provides a native color picker. `type="file"` accepts file uploads with the `accept` attribute for MIME type filtering and `multiple` for multi-file selection.

Why they matter: semantic input types improve accessibility (screen readers announce the field's purpose), trigger appropriate virtual keyboards on mobile (a number keypad for `tel`, email layout for `email`), provide built-in browser validation that works without JavaScript, and can trigger native UI (date picker, color picker) that is OS-appropriate. Using `type="text"` for everything and rebuilding this functionality in JavaScript is more work and produces worse UX.

The `required`, `pattern`, `minlength`, `maxlength`, `min`, `max`, and `step` attributes provide declarative validation that integrates with the browser's native form validation UI — tooltips, error styling, and submission blocking — again without JavaScript.

### Key Points
- HTML5 added input types: `email`, `url`, `tel`, `number`, `range`, `date`, `time`, `search`, `color`, and more
- Semantic types trigger appropriate mobile keyboards, native UI controls, and built-in browser validation
- `required`, `pattern`, `min`, `max`, `step` attributes add declarative validation without JavaScript
- `type="date"` family provides native date pickers; `type="number"` provides spinners and numeric validation
- Using correct input types improves accessibility, mobile UX, and form validation with minimal code

### Follow-up Prompts
- How would you use `type="number"` with `min`, `max`, and `step` to create a quantity selector for a shopping cart?
- What are the limitations of `type="date"` in terms of cross-browser styling and locale formatting?
- How does the `pattern` attribute work alongside `type="email"` — does pattern override the built-in email validation?

### Difficulty: basic
### Tags: HTML5, input types, form, validation, accessibility, mobile, semantic HTML

---
