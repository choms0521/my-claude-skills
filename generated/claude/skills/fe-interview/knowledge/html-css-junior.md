# HTML/CSS - Junior Interview Questions
### Language: en

## Q1: What is semantic HTML and why does it matter?

### Question
What is semantic HTML? Give examples of semantic vs. non-semantic elements and explain why using semantic markup matters for accessibility, SEO, and maintainability.

### Model Answer
Semantic HTML means using HTML elements that convey meaning about their content — the element name itself describes what the content is, not just how it looks. Non-semantic elements like `<div>` and `<span>` are layout containers with no inherent meaning. Semantic elements like `<article>`, `<nav>`, `<header>`, and `<button>` communicate the role and purpose of their content.

**Semantic vs. non-semantic comparison:**

```html
<!-- Non-semantic: layout divs everywhere -->
<div class="header">
  <div class="nav">
    <div class="nav-item">Home</div>
  </div>
</div>
<div class="main">
  <div class="article">
    <div class="title">My Post</div>
    <div class="content">...</div>
  </div>
</div>

<!-- Semantic: elements communicate structure -->
<header>
  <nav>
    <a href="/">Home</a>
  </nav>
</header>
<main>
  <article>
    <h1>My Post</h1>
    <p>...</p>
  </article>
</main>
```

**Why it matters:**

**Accessibility**: Screen readers and assistive technologies use semantic elements to navigate the page. A screen reader can jump directly to `<main>`, `<nav>`, or `<aside>` content. Using `<button>` instead of a styled `<div>` ensures keyboard focusability and role announcements work automatically.

**SEO**: Search engines understand semantic structure. `<h1>` through `<h6>` communicate content hierarchy. `<article>` signals standalone content. `<time datetime="2024-01-15">` provides machine-readable dates. This improves how search engines index and rank the page.

**Maintainability**: Developers reading semantic HTML understand the page structure without relying solely on class names. It is easier to apply CSS (target `<nav>` instead of `.header-nav-wrapper`) and write tests.

**Browser defaults**: Semantic elements come with useful browser behaviors for free — `<button>` is focusable and keyboard-activatable, `<a>` is navigable, `<form>` handles submission, `<details>`/`<summary>` provides disclosure widget behavior.

Common semantic elements: `<header>`, `<footer>`, `<main>`, `<nav>`, `<article>`, `<section>`, `<aside>`, `<figure>`, `<figcaption>`, `<time>`, `<address>`, `<mark>`, `<strong>`, `<em>`.

### Key Points
- Semantic elements communicate meaning about content; `<div>` and `<span>` do not
- Accessibility: screen readers use landmark elements to navigate; semantic elements provide correct ARIA roles automatically
- SEO: search engines weight semantic structure for indexing and ranking
- Semantic elements often come with browser behaviors for free (keyboard interaction, form submission, etc.)
- Prefer the most specific semantic element available before reaching for `<div>`

### Follow-up Prompts
- When is it appropriate to use a `<div>` or `<span>` despite the push for semantic HTML?
- How does the `<section>` element differ from `<article>`, and when do you use each?
- What ARIA roles are implied by semantic elements, and when do you need to add ARIA attributes explicitly?

### Difficulty: basic
### Tags: semantic HTML, accessibility, SEO, landmark elements, screen readers, HTML5

---

## Q2: Explain the CSS box model.

### Question
Describe the CSS box model. What are its four components and how do `box-sizing: content-box` and `box-sizing: border-box` change how dimensions are calculated?

### Model Answer
Every element in CSS is represented as a rectangular box. The CSS box model describes how this box is structured by defining four areas around an element's content:

1. **Content**: The actual content of the element (text, images, etc.). Sized by `width` and `height`.
2. **Padding**: Space between the content and the border. Transparent — shows the background color.
3. **Border**: A line drawn around the padding area. Has width, style, and color.
4. **Margin**: Space outside the border, separating the element from neighbors. Transparent — does not show the background.

```css
.box {
  width: 200px;
  height: 100px;
  padding: 20px;
  border: 5px solid black;
  margin: 10px;
}
```

**`box-sizing: content-box` (the default):**

`width` and `height` apply only to the content area. The total rendered width is: `width + padding-left + padding-right + border-left + border-right`.

For the example above: total rendered width = 200 + 20 + 20 + 5 + 5 = **250px**.

This is often counterintuitive — adding padding to a sized element makes it larger than specified.

**`box-sizing: border-box`:**

`width` and `height` include the content, padding, and border. The content area shrinks to fit within the specified dimensions.

For the same example: total rendered width = **200px** (with 20px padding on each side, content is 200 - 40 - 10 = 150px wide).

This is almost universally preferred because sizing is predictable — setting `width: 200px` means the element is always 200px wide regardless of padding or border.

```css
/* Common reset to use border-box everywhere */
*, *::before, *::after {
  box-sizing: border-box;
}
```

**Margin collapsing:** Adjacent vertical margins collapse into a single margin equal to the larger of the two. This only happens with block elements in normal flow (not with flex or grid children).

```css
.a { margin-bottom: 20px; }
.b { margin-top: 30px; }
/* Distance between .a and .b is 30px, not 50px */
```

### Key Points
- The box model has four areas: content, padding, border, margin — from inside to outside
- `content-box` (default): `width`/`height` apply to content only; total size is larger due to padding and border
- `border-box`: `width`/`height` include content + padding + border — more predictable sizing
- Apply `box-sizing: border-box` globally as a CSS reset — virtually all modern projects do this
- Adjacent vertical margins collapse in normal flow; this does not happen with flex or grid children

### Follow-up Prompts
- How does `outline` differ from `border`, and does it affect the box model?
- What causes margin collapsing and what are the conditions that prevent it?
- How does `overflow: hidden` on a container relate to the box model and containing block behavior?

### Difficulty: basic
### Tags: box model, box-sizing, padding, margin, border, content-box, border-box

---

## Q3: How does Flexbox work?

### Question
Explain the core concepts of CSS Flexbox. Cover the main and cross axes, key container properties (`justify-content`, `align-items`, `flex-wrap`), and key item properties (`flex-grow`, `flex-shrink`, `flex-basis`).

### Model Answer
Flexbox (Flexible Box Layout) is a one-dimensional layout model designed for distributing space and aligning items along a single axis (either row or column). It is the go-to tool for navigation bars, toolbars, card rows, and centered layouts.

**Setup:** Declare `display: flex` on a container element. Its direct children become flex items.

**Axes:** The main axis is the direction items flow (controlled by `flex-direction`). The cross axis is perpendicular. By default, `flex-direction: row` means the main axis is horizontal.

**Key container properties:**

`justify-content` — aligns items along the main axis:
```css
.container {
  display: flex;
  justify-content: flex-start;  /* pack at start (default) */
  justify-content: flex-end;    /* pack at end */
  justify-content: center;      /* center */
  justify-content: space-between; /* equal gaps between items */
  justify-content: space-around;  /* equal space around items */
  justify-content: space-evenly;  /* equal space between and edges */
}
```

`align-items` — aligns items along the cross axis (perpendicular to main):
```css
.container {
  align-items: stretch;    /* fill cross axis (default) */
  align-items: center;     /* center on cross axis */
  align-items: flex-start; /* align to start of cross axis */
  align-items: flex-end;   /* align to end of cross axis */
  align-items: baseline;   /* align text baselines */
}
```

`flex-wrap` — controls whether items wrap to new lines:
```css
.container {
  flex-wrap: nowrap;  /* default: single line, may overflow */
  flex-wrap: wrap;    /* items wrap to new lines as needed */
}
```

**Key item properties:**

`flex-grow` — how much an item grows relative to others when there is extra space. `flex-grow: 1` on all items means they share extra space equally.

`flex-shrink` — how much an item shrinks relative to others when space is tight. Default is 1 (all shrink equally).

`flex-basis` — the initial size of an item before growing/shrinking is applied. Acts like `width` (or `height` in column direction).

The shorthand `flex: grow shrink basis`:
```css
.item { flex: 1 1 0; }    /* grow, shrink, start from 0 */
.item { flex: 1; }         /* shorthand for flex: 1 1 0 */
.item { flex: none; }      /* flex: 0 0 auto — no growing or shrinking */
```

**Perfect centering:**
```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### Key Points
- Flexbox is one-dimensional — one row or one column at a time (use Grid for two dimensions)
- `justify-content` controls main axis distribution; `align-items` controls cross axis alignment
- `flex-grow` and `flex-shrink` control how items proportionally expand or contract
- `flex: 1` is the most common shorthand for "take equal share of available space"
- Flex does not collapse margins between flex items (unlike block flow)

### Follow-up Prompts
- What is the difference between `align-items` and `align-content`, and when does `align-content` take effect?
- How do you make a flex container's items wrap onto new rows and align those rows with `align-content`?
- When would you choose CSS Grid over Flexbox for a layout?

### Difficulty: basic
### Tags: flexbox, layout, justify-content, align-items, flex-grow, flex-shrink, CSS

---

## Q4: How does CSS specificity work?

### Question
Explain CSS specificity. How is it calculated, what order do selectors rank in, and what are the best practices for managing specificity in a codebase?

### Model Answer
CSS specificity determines which rule wins when multiple rules target the same element and property. The browser calculates a specificity score for each selector and applies the rule with the highest score.

**Specificity is calculated as a three-part score (A, B, C):**

- **A** — inline styles (`style=""` attribute): score 1,0,0
- **A** — ID selectors (`#header`): score 1,0,0 (in the A column)

Wait — the actual columns are:

| Column | What counts | Score per match |
|--------|-------------|-----------------|
| A | ID selectors | 0,1,0,0 |
| B | Class selectors, attribute selectors, pseudo-classes | 0,0,1,0 |
| C | Type (element) selectors, pseudo-elements | 0,0,0,1 |

Inline styles beat all of these. `!important` overrides everything (but is not specificity — it is a separate mechanism).

```css
p                      /* 0,0,0,1 — one type selector */
.card                  /* 0,0,1,0 — one class */
p.card                 /* 0,0,1,1 — type + class */
#sidebar               /* 0,1,0,0 — one ID */
#sidebar .card p       /* 0,1,1,1 — ID + class + type */
style="color: red"     /* 1,0,0,0 — inline style */
```

When specificity is equal, the rule that appears later in the CSS wins (cascade order).

**Comparing specificity:** Compare left to right. The first column where scores differ determines the winner. A single ID (0,1,0,0) beats any number of classes (0,0,99,0).

**Best practices:**

1. **Avoid ID selectors in stylesheets** — their high specificity makes them hard to override. Use classes instead.
2. **Avoid `!important`** — it breaks the cascade and makes debugging painful. Legitimate uses: utility classes that must always apply (`.hidden { display: none !important }`), overriding third-party styles you cannot control.
3. **Keep specificity flat and low** — single class selectors wherever possible. Deep selectors like `.nav > ul > li > a.active` are hard to override and indicate over-specific CSS.
4. **Use BEM or a similar methodology** — BEM uses single flat classes (`.block__element--modifier`), naturally keeping specificity low and uniform.
5. **Understand `!important`'s own specificity layer** — competing `!important` rules are then compared by their own specificity.

### Key Points
- Specificity is a three-column score: ID (0,1,0,0) > class/attribute/pseudo-class (0,0,1,0) > type/pseudo-element (0,0,0,1)
- Inline styles beat all CSS selectors; `!important` overrides everything (but is not part of specificity calculation)
- When specificity is tied, later rules in the cascade win
- Avoid IDs and deeply nested selectors — they create specificity wars
- Use low, flat specificity (single classes) and methodologies like BEM to keep CSS maintainable

### Follow-up Prompts
- How does the `:where()` pseudo-class help manage specificity in CSS, and how does it differ from `:is()`?
- What is the CSS cascade and how does specificity fit within it alongside origin and importance?
- How would you refactor an existing codebase with high specificity conflicts without breaking the UI?

### Difficulty: basic
### Tags: CSS specificity, cascade, selectors, ID selectors, !important, BEM

---

## Q5: What is responsive design and how do you implement it?

### Question
What is responsive web design? Explain the core concepts: fluid grids, flexible media, and media queries. What is the mobile-first approach and why is it recommended?

### Model Answer
Responsive web design (RWD) is an approach where a website adapts its layout and appearance to the screen size and capabilities of the device it is viewed on — from a small mobile phone to a large desktop monitor — using the same HTML markup.

The three foundational techniques are:

**1. Fluid grids:** Use relative units (percentages, `fr`, `vw`) rather than fixed pixel widths so layout columns scale proportionally with the viewport.

```css
.container { max-width: 1200px; width: 100%; margin: 0 auto; }
.column { width: 33.333%; float: left; } /* or use flexbox/grid */
```

**2. Flexible media:** Images and videos should scale down to fit their containers:
```css
img, video { max-width: 100%; height: auto; }
```

**3. Media queries:** Apply different CSS rules based on viewport characteristics:
```css
/* Styles that apply above 768px */
@media (min-width: 768px) {
  .sidebar { display: block; }
  .content { width: 70%; }
}

@media (min-width: 1024px) {
  .content { width: 75%; }
}
```

**Mobile-first approach:**

Write base styles for the smallest viewport first, then add complexity for larger screens using `min-width` media queries. This is the opposite of desktop-first (starting with a large layout and stripping it down with `max-width` queries).

```css
/* Mobile base — no media query */
.nav { flex-direction: column; }

/* Tablet and up */
@media (min-width: 768px) {
  .nav { flex-direction: row; }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .nav { gap: 2rem; }
}
```

**Why mobile-first is recommended:**
- Mobile users are the majority globally
- Starting simple forces prioritization of essential content
- `min-width` queries are more performant than `max-width` (browsers load and apply base styles even on small screens — don't load heavy desktop CSS by default)
- Aligns with progressive enhancement philosophy

The viewport meta tag is essential for mobile rendering:
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Without it, mobile browsers render the page at a desktop width and scale it down, breaking responsive layouts.

### Key Points
- Responsive design = fluid grids + flexible media + media queries, all with the same HTML
- Mobile-first: write base styles for small screens, enhance progressively with `min-width` queries
- Always include `<meta name="viewport" content="width=device-width, initial-scale=1">`
- Use `max-width: 100%; height: auto` on images to prevent overflow
- Common breakpoints: 480px (mobile landscape), 768px (tablet), 1024px (desktop), 1280px (wide desktop)

### Follow-up Prompts
- How do CSS `clamp()`, `min()`, and `max()` reduce the need for media queries in fluid typography?
- What is the difference between responsive design and adaptive design?
- How do container queries (`@container`) differ from media queries and what new possibilities do they unlock?

### Difficulty: basic
### Tags: responsive design, media queries, mobile-first, viewport, fluid layout, breakpoints

---

## Q6: What are HTML meta tags and what do the most important ones do?

### Question
What are HTML meta tags? Describe the most important meta tags for character encoding, viewport, SEO, and social sharing (Open Graph).

### Model Answer
Meta tags are HTML elements placed in the `<head>` section that provide metadata about the document. They are not visible to users but are read by browsers, search engines, and social media crawlers.

**Character encoding:**
```html
<meta charset="UTF-8">
```
Always the first element in `<head>`. Tells the browser how to decode the HTML text. UTF-8 supports all languages and is universally used.

**Viewport (essential for responsive design):**
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```
Tells mobile browsers to use the device's actual width as the viewport width rather than rendering at 980px and scaling down.

**SEO meta tags:**
```html
<meta name="description" content="A concise description of the page, ideally 150-160 characters.">
<meta name="robots" content="index, follow">
<!-- Prevent indexing of specific pages: -->
<meta name="robots" content="noindex, nofollow">
```

The `description` is used by search engines as the snippet under the link in search results. It does not directly affect ranking but improves click-through rate.

**Open Graph (social sharing):**
```html
<meta property="og:title" content="Page Title">
<meta property="og:description" content="Description for social share cards">
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:url" content="https://example.com/page">
<meta property="og:type" content="website">
```
Open Graph tags control how a page appears when shared on Facebook, LinkedIn, and other platforms that support OG. Twitter uses its own `twitter:card` tags, though it also falls back to OG.

**HTTP-Equiv (less common today):**
```html
<!-- Redirect (prefer server-side redirects) -->
<meta http-equiv="refresh" content="5; url=https://example.com">
<!-- Set Content-Security-Policy via meta -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'">
```

**Theme color (mobile browser UI):**
```html
<meta name="theme-color" content="#2563eb">
```
Colors the mobile browser's address bar to match your brand.

A well-structured `<head>`:
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page Title | Site Name</title>
  <meta name="description" content="...">
  <meta property="og:title" content="...">
  <meta property="og:image" content="...">
  <link rel="canonical" href="https://example.com/page">
</head>
```

### Key Points
- `charset="UTF-8"` must be the first element in `<head>` — it controls text decoding
- The viewport meta tag is mandatory for responsive layouts on mobile devices
- `name="description"` controls the search result snippet — 150-160 characters is ideal
- Open Graph tags (`og:title`, `og:image`, etc.) control social media share card appearance
- `<link rel="canonical">` tells search engines the authoritative URL to avoid duplicate content issues

### Follow-up Prompts
- What is the difference between `<title>` and `og:title`, and when would they differ?
- How do you validate that Open Graph tags are working correctly?
- What meta tags are relevant for PWA installation (web app manifest, apple-mobile-web-app-capable)?

### Difficulty: basic
### Tags: meta tags, SEO, Open Graph, viewport, charset, social sharing, HTML head

---

## Q7: How do HTML forms and validation work?

### Question
Explain HTML form elements and built-in browser validation. What are the key input types, validation attributes, and how do you control validation behavior?

### Model Answer
HTML forms are the primary mechanism for collecting user input. They consist of a `<form>` element containing various input controls, with built-in browser support for validation before submission.

**Form structure and submission:**
```html
<form action="/submit" method="POST">
  <!-- inputs here -->
  <button type="submit">Submit</button>
</form>
```

`action` is the URL that receives the data; `method` is `GET` (data in URL query string) or `POST` (data in request body). For file uploads, add `enctype="multipart/form-data"`.

**Key input types:**
```html
<input type="text">      <!-- plain text -->
<input type="email">     <!-- validates email format -->
<input type="password">  <!-- masked text -->
<input type="number">    <!-- numeric keyboard on mobile, allows min/max -->
<input type="tel">       <!-- telephone keyboard on mobile -->
<input type="url">       <!-- validates URL format -->
<input type="date">      <!-- date picker -->
<input type="checkbox">  <!-- boolean toggle -->
<input type="radio">     <!-- one-of-many selection (group by name) -->
<input type="file">      <!-- file picker -->
<input type="range">     <!-- slider -->
<input type="hidden">    <!-- not visible, submits with form -->
<textarea></textarea>    <!-- multi-line text -->
<select>                 <!-- dropdown -->
  <option value="a">A</option>
</select>
```

Using specific input types improves UX (appropriate mobile keyboard) and provides automatic validation.

**Validation attributes:**
```html
<input type="text" required>                    <!-- must have a value -->
<input type="text" minlength="2" maxlength="50"> <!-- length constraints -->
<input type="number" min="1" max="100">          <!-- numeric range -->
<input type="text" pattern="[A-Z]{3}">           <!-- regex pattern -->
<input type="email" required>                    <!-- type + required -->
```

The browser validates these constraints on form submission and shows built-in error messages. You can customize error messages using the Constraint Validation API:

```javascript
const input = document.querySelector('input[type="email"]');
input.addEventListener('invalid', e => {
  e.target.setCustomValidity('Please enter a valid email address.');
});
input.addEventListener('input', e => {
  e.target.setCustomValidity(''); // clear on user input
});
```

**Controlling validation:**
- `novalidate` on `<form>`: disables browser validation entirely (useful when doing custom JS validation)
- `formnovalidate` on a submit button: bypasses validation for that specific button (e.g., a "Save Draft" button)

**Labels are essential for accessibility:**
```html
<label for="email">Email address</label>
<input type="email" id="email" name="email" required>
<!-- Or wrap input in label: -->
<label>
  Email address
  <input type="email" name="email" required>
</label>
```

### Key Points
- Use specific input types (`email`, `number`, `date`) for automatic validation and better mobile UX
- `required`, `minlength`, `maxlength`, `min`, `max`, `pattern` are the main built-in validation attributes
- The Constraint Validation API (`setCustomValidity`, `checkValidity`) allows custom JavaScript validation integrated with native behavior
- `novalidate` on `<form>` disables built-in validation for full custom validation control
- Every input must have an associated `<label>` for accessibility

### Follow-up Prompts
- How do you implement real-time field validation (validate as the user types) while also validating on submit?
- What are the accessibility requirements for form error messages — how do you make them work with screen readers?
- How does the `autocomplete` attribute work and what are its security implications?

### Difficulty: basic
### Tags: forms, HTML validation, input types, constraint validation, accessibility, label

---

## Q8: What are the differences between CSS units — px, em, rem, %, vw, vh?

### Question
Explain the different CSS length units. When would you use `px`, `em`, `rem`, `%`, `vw`, and `vh`, and what are the practical implications of each for responsive design and accessibility?

### Model Answer
CSS offers several length units, each with different reference points and behaviors. Choosing the right unit affects responsiveness, accessibility, and layout predictability.

**Absolute units:**

`px` (pixels) — fixed size, does not scale with font size or viewport. One CSS pixel is not always exactly one device pixel (on high-DPI screens, a CSS pixel may be 2 or 3 device pixels).

Use `px` for: borders (`border: 1px solid`), box shadows, specific fixed-width elements, or when you explicitly do not want scaling.

**Font-relative units:**

`em` — relative to the **parent element's** font size (or the element's own font size when used for non-font properties like `padding`). This compounds — nested `em` values multiply:

```css
.parent { font-size: 16px; }
.child { font-size: 1.5em; }  /* 24px — 16 * 1.5 */
.grandchild { font-size: 1.5em; } /* 36px — 24 * 1.5 */
```

Use `em` for: component-level spacing that should scale proportionally with the component's own font size (e.g., `padding: 0.75em` on a button so padding scales if the button text is larger).

`rem` (root em) — relative to the **root element** (`<html>`) font size only. Does not compound. The browser's default root font size is 16px.

```css
html { font-size: 16px; }
.element { font-size: 1.5rem; } /* always 24px, regardless of nesting */
```

Use `rem` for: body text, headings, and most sizing — it is predictable and does not suffer from em compounding. Users can change the browser's base font size (for accessibility), and `rem`-based layouts scale appropriately.

**Relative to viewport:**

`vw` / `vh` — 1vw = 1% of viewport width; 1vh = 1% of viewport height.

Use for: full-height sections (`height: 100vh`), fluid typography (`font-size: clamp(1rem, 2.5vw, 2rem)`), elements that must scale with the viewport.

**Percentage `%`:**

Relative to the parent element's size (for `width`/`height`) or the element's own size (for `line-height`). Very context-dependent.

Use for: fluid column widths in layouts, images (`max-width: 100%`).

**Practical recommendations:**
- `rem` for typography and most spacing (accessible, predictable)
- `em` for component-internal spacing that should scale with that component's font
- `px` for borders, shadows, precise small values
- `%` for layout widths and flexible containers
- `vw`/`vh` for viewport-sized sections and fluid scaling
- `clamp(min, preferred, max)` for fluid type that stays within safe bounds

### Key Points
- `px` is absolute and does not scale; prefer relative units for accessible, responsive designs
- `em` is relative to the parent's font size and compounds with nesting — use deliberately
- `rem` is relative to the root font size only — the most predictable and accessible unit for text/spacing
- `vw`/`vh` are relative to viewport dimensions — great for full-screen sections and fluid scaling
- Users may change browser base font size for accessibility; `rem`-based layouts respect this preference

### Follow-up Prompts
- How does `clamp(min, val, max)` work and how does it simplify fluid typography?
- What is the `dvh` unit and why was it introduced to address `100vh` issues on mobile browsers?
- How do CSS Container Queries use `cqi` and `cqw` units, and how do they differ from `vw`/`vh`?

### Difficulty: basic
### Tags: CSS units, px, em, rem, vw, vh, responsive, accessibility, typography

---

## Q9: What are CSS pseudo-classes and how do you use them?

### Question
What are pseudo-classes in CSS? Explain the most common ones used for user interaction, structural selection, and form state, with examples.

### Model Answer
Pseudo-classes are CSS selectors that target elements based on their state or position in the document tree — information that cannot be captured by a simple element, class, or ID selector. They are written with a single colon (`:`) prefix.

**User interaction pseudo-classes:**

```css
a:hover { color: blue; }          /* mouse pointer over element */
button:focus { outline: 2px solid blue; } /* keyboard/programmatic focus */
button:focus-visible { outline: 2px solid blue; } /* focus only via keyboard */
a:active { color: red; }          /* element being clicked */
a:visited { color: purple; }      /* visited links */
```

`:focus-visible` is important — it shows a focus ring only when keyboard-navigating, hiding it for mouse clicks, which is better UX than hiding focus outlines entirely (which harms keyboard accessibility).

**Structural pseudo-classes:**

```css
li:first-child { font-weight: bold; }   /* first child of parent */
li:last-child { border-bottom: none; }  /* last child */
li:nth-child(2) { color: red; }         /* second child */
li:nth-child(odd) { background: #f5f5f5; } /* odd children */
li:nth-child(3n) { color: blue; }       /* every 3rd child */
p:first-of-type { font-size: 1.2em; }  /* first <p> in parent */
:only-child { margin: auto; }           /* element with no siblings */
```

```css
/* Select all items except the last */
li:not(:last-child) { margin-bottom: 1rem; }

/* :is() for grouped selectors with single specificity */
:is(h1, h2, h3) { line-height: 1.2; }
```

**Form state pseudo-classes:**

```css
input:required { border-left: 3px solid red; }
input:optional { border-left: 3px solid gray; }
input:valid { border-color: green; }
input:invalid { border-color: red; }
input:disabled { opacity: 0.5; cursor: not-allowed; }
input:checked { accent-color: blue; } /* checkbox/radio checked state */
input:placeholder-shown { font-style: italic; }
```

**Other useful pseudo-classes:**

```css
:root { --primary: #2563eb; }  /* the <html> element, used for CSS custom properties */
.container:empty { display: none; } /* element with no children */
a[href]:not([href=""]):hover { } /* link with non-empty href */
```

**Pseudo-elements** (double colon `::`) target parts of an element rather than states:

```css
p::first-line { font-weight: bold; }
p::first-letter { font-size: 2em; float: left; }
.tooltip::before { content: '▲'; }
.clearfix::after { content: ''; display: table; clear: both; }
```

### Key Points
- Pseudo-classes select elements based on state or structural position; pseudo-elements select parts of elements
- `:hover`, `:focus`, `:active`, `:visited` target user interaction states
- `:nth-child()`, `:first-child`, `:last-child`, `:not()` enable structural selection without extra classes
- Form pseudo-classes (`:valid`, `:invalid`, `:disabled`, `:checked`) style form elements based on their state
- Use `:focus-visible` instead of removing `outline` — it improves both aesthetics and keyboard accessibility

### Follow-up Prompts
- What is the difference between `:nth-child()` and `:nth-of-type()`, and when does the distinction matter?
- How does `:is()` differ from `:where()` in terms of specificity?
- How would you use `:has()` (the CSS parent selector) to style a form field based on whether its input is filled?

### Difficulty: basic
### Tags: pseudo-classes, CSS selectors, :hover, :focus, :nth-child, :not, form state, pseudo-elements

---

## Q10: How do CSS media queries work?

### Question
Explain CSS media queries — their syntax, the types of media features you can query, and how to write maintainable responsive stylesheets. What are common breakpoints?

### Model Answer
Media queries allow you to apply CSS rules conditionally based on characteristics of the user's device or viewport — primarily the viewport width for responsive layouts, but also print media, color capability, pointer type, and more.

**Basic syntax:**
```css
@media media-type and (feature: value) {
  /* CSS rules */
}
```

The `media-type` is usually `screen` (default if omitted) or `print`. The feature is a condition in parentheses.

**Width-based queries (most common):**
```css
/* Mobile-first: apply styles when viewport is at least 768px */
@media (min-width: 768px) {
  .sidebar { display: block; }
}

/* Apply styles only between 768px and 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  .nav { flex-direction: column; }
}

/* Modern range syntax (Level 4) */
@media (768px <= width < 1024px) {
  .layout { grid-template-columns: 1fr 2fr; }
}
```

**Print media:**
```css
@media print {
  .nav, .sidebar, .ads { display: none; }
  a::after { content: ' (' attr(href) ')'; }
}
```

**Other useful media features:**

```css
/* Prefer dark color scheme */
@media (prefers-color-scheme: dark) {
  body { background: #1a1a1a; color: #f0f0f0; }
}

/* Prefer reduced motion (accessibility) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; }
}

/* High-resolution displays (retina) */
@media (min-resolution: 2dppx) {
  .logo { background-image: url('logo@2x.png'); }
}

/* Touch vs. precise pointer */
@media (hover: none) and (pointer: coarse) {
  /* Likely a touchscreen — increase tap target sizes */
  .btn { min-height: 44px; }
}

/* Orientation */
@media (orientation: landscape) {
  .hero { height: 50vh; }
}
```

**Common breakpoints (T-shirt sizing approach):**
```css
/* Mobile: < 640px (no query needed — base styles) */
/* Small / Tablet portrait: 640px */
@media (min-width: 640px) { }
/* Medium / Tablet landscape: 768px */
@media (min-width: 768px) { }
/* Large / Desktop: 1024px */
@media (min-width: 1024px) { }
/* Extra Large: 1280px */
@media (min-width: 1280px) { }
/* 2XL: 1536px */
@media (min-width: 1536px) { }
```

(These match Tailwind CSS's default breakpoints, which have become a common reference point.)

**Maintainability tips:** Define breakpoints as CSS custom properties or use a preprocessor like Sass to store them as variables. Avoid too many breakpoints — rely on fluid units (`%`, `rem`, `clamp`) to reduce the number of breakpoints needed.

### Key Points
- Media queries conditionally apply CSS based on device/viewport characteristics
- `min-width` queries are mobile-first; `max-width` queries are desktop-first — prefer mobile-first
- Beyond width: `prefers-color-scheme`, `prefers-reduced-motion`, `hover`, `pointer`, and `print` are all valuable media features
- Common breakpoints: 640px, 768px, 1024px, 1280px — but exact values matter less than design consistency
- Combine media queries with fluid units to minimize the number of breakpoints needed

### Follow-up Prompts
- How do CSS Container Queries (`@container`) differ from media queries, and what new patterns do they enable?
- How would you implement a dark mode toggle that respects `prefers-color-scheme` but also allows manual override?
- What is the `prefers-reduced-motion` media feature and why is it important for accessibility?

### Difficulty: basic
### Tags: media queries, responsive design, breakpoints, prefers-color-scheme, prefers-reduced-motion, mobile-first

---
