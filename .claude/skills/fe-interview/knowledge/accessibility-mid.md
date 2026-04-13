# Accessibility - Mid Interview Questions
### Language: en

## Q1: WCAG 2.1 Levels (A, AA, AAA)

### Question
What are the WCAG 2.1 conformance levels (A, AA, AAA), how do they differ, and which level should most applications target?

### Model Answer
The Web Content Accessibility Guidelines (WCAG) 2.1 are organized into three conformance levels: A (minimum), AA (standard), and AAA (enhanced). Each level builds on the previous — to achieve AA conformance, you must satisfy all Level A and all Level AA criteria. To achieve AAA, you must satisfy all three levels.

Level A represents the most essential accessibility requirements — criteria that, if not met, make content completely inaccessible to some users. Examples include providing text alternatives for non-text content (alt text for images), ensuring all functionality is available from a keyboard, and not using color as the sole means of conveying information. These are the baseline requirements that remove the most severe barriers.

Level AA adds criteria that address common barriers for users with disabilities and are achievable without significantly restructuring most applications. AA requirements include minimum color contrast ratios (4.5:1 for normal text, 3:1 for large text), captions for prerecorded audio in video, navigable focus indicators, consistent navigation, and error identification in forms. AA is the level required by most legal accessibility standards worldwide — the ADA in the United States, EN 301 549 in the European Union, and AODA in Canada all reference WCAG 2.1 AA.

Level AAA contains the most stringent requirements, some of which are difficult or impossible to satisfy for all types of content. Examples include a 7:1 contrast ratio (enhanced contrast), sign language interpretation for prerecorded video, and no timing constraints whatsoever. The WCAG authors explicitly note that "it is not possible to satisfy all Level AAA Success Criteria for some content." AAA is appropriate as a target for specific content areas (like government services for severely impaired users) rather than as a universal requirement.

For most commercial and consumer web applications, WCAG 2.1 AA is the correct target. It provides meaningful accessibility for the majority of users with disabilities, aligns with legal requirements, and is achievable with thoughtful development practices. Teams should treat AA as a baseline, not a ceiling — go beyond AA where it benefits users and where the implementation cost is justified.

### Key Points
- Level A: most critical barriers removed; keyboard access, alt text, no color-only information
- Level AA: standard target; includes 4.5:1 contrast, captions, visible focus, error identification
- Level AAA: most stringent; 7:1 contrast, sign language, not achievable for all content types
- Most legal requirements worldwide reference WCAG 2.1 AA
- AA builds on A; AAA builds on AA — each level requires all lower-level criteria too

### Follow-up Prompts
- What specific criteria were added in WCAG 2.1 compared to WCAG 2.0?
- How do you assess whether your application meets WCAG 2.1 AA in a development workflow?
- Which WCAG 2.1 AA criteria are most commonly failed in real-world applications?

### Difficulty: intermediate
### Tags: accessibility, wcag, a11y, compliance, standards

---

## Q2: ARIA Roles, States, and Properties

### Question
What are ARIA roles, states, and properties? How do they work with the accessibility tree, and what are the rules for using them correctly?

### Model Answer
ARIA (Accessible Rich Internet Applications) is a set of HTML attributes that supplement or override the semantic information exposed to assistive technologies. When native HTML semantics are insufficient to describe the role or state of a custom UI widget, ARIA fills the gap. The accessibility tree — a parallel representation of the DOM that screen readers and other assistive technologies consume — uses ARIA attributes alongside native semantics to build the picture of what is on screen and how it behaves.

ARIA roles define what a widget is. A `role="dialog"` tells assistive technologies that this element is a dialog window. A `role="tablist"`, `role="tab"`, and `role="tabpanel"` together communicate a tab widget. Roles override the implicit role of the HTML element — a `<div role="button">` is announced as a button, even though a `<div>` has no implicit role. Many roles have required child roles (a `tablist` must contain `tab` elements) and required parent roles; violating these relationships produces an invalid ARIA structure.

ARIA states describe the current condition of a widget — things that change dynamically. `aria-expanded="true/false"` communicates whether a dropdown or accordion is open or closed. `aria-checked="true/false/mixed"` communicates checkbox state. `aria-disabled="true"` communicates that an element is non-interactive. `aria-selected="true"` communicates which item in a listbox or tab group is currently selected. States must be updated dynamically via JavaScript as the UI changes — a static `aria-expanded="false"` on an always-closed element is misleading but not actively harmful; a dynamic accordion that does not update `aria-expanded` as it opens and closes is a real failure.

ARIA properties describe characteristics that do not change or change less frequently. `aria-label` provides an accessible name directly; `aria-labelledby` references another element's text as the name. `aria-describedby` references additional descriptive text. `aria-controls` references the element the current widget controls. `aria-haspopup` indicates that activating the element will open a popup.

The cardinal rule of ARIA is: do not use ARIA when native HTML can do the job. A `<button>` is always better than `<div role="button" tabindex="0" onKeyDown=...>`. Native HTML elements come with built-in keyboard behavior, focus management, and semantics that ARIA cannot fully replicate. ARIA is for situations where no native element conveys the required semantics — complex custom widgets like comboboxes, tree views, data grids, or custom sliders.

### Key Points
- Roles define what an element is; states describe its current condition; properties describe characteristics
- ARIA supplements or overrides semantics in the accessibility tree — assistive technologies read this tree
- States must be updated dynamically via JavaScript to reflect UI changes (e.g., `aria-expanded`)
- The first rule of ARIA: do not use ARIA if native HTML semantics can convey the same information
- Many roles have required owned roles and required parent roles; violating these creates invalid structure

### Follow-up Prompts
- What is the difference between `aria-label` and `aria-labelledby`, and when would you use each?
- How does `aria-live` work, and what are the differences between `polite` and `assertive`?
- What happens if you use an invalid ARIA role or an ARIA state inconsistent with the element's role?

### Difficulty: intermediate
### Tags: accessibility, aria, wcag, screen-readers, a11y, html

---

## Q3: Keyboard Navigation Implementation

### Question
What are the requirements for keyboard navigation on a web application, and how do you implement it correctly for custom interactive components?

### Model Answer
Keyboard navigation is a foundational accessibility requirement. Many users — people with motor disabilities, power users, people without a mouse, and screen reader users — rely entirely on the keyboard to navigate and operate web applications. Every interactive element must be reachable by keyboard, operable by keyboard, and provide a clear visual indicator of focus.

The Tab key moves focus through focusable elements in document order. Natively focusable elements — links, buttons, form controls, and elements with `tabindex="0"` — are included in the tab order. `tabindex="-1"` removes an element from the natural tab order but allows it to receive focus programmatically via JavaScript (essential for focus management in dialogs and dynamic content). `tabindex` values greater than 0 create a custom tab order that overrides document order and should be avoided — they are confusing to maintain and create unexpected navigation patterns.

Arrow key navigation is the expected pattern for composite widgets — groups of related items where Tab moves in and out of the group and arrow keys navigate within it. Examples: a tab list uses Tab to enter the tab group and left/right arrows to switch between tabs. A menu uses Tab to open/close and up/down arrows to move between items. A tree view uses Tab to reach the tree and arrow keys to expand/collapse and move between nodes. This pattern, defined in the ARIA Authoring Practices Guide (APG), ensures users do not have to Tab through every item in a large list.

Keyboard interaction for custom widgets also requires handling Enter and Space (activate buttons and links), Escape (close dialogs, menus, and popups), Home/End (jump to first/last item), and Page Up/Page Down (scroll or jump multiple items) where applicable. Implementing these requires `onKeyDown` handlers in React that check `event.key` and execute the corresponding action.

Focus trapping is required for modal dialogs and overlay panels. When a modal opens, focus must move into it, and the Tab key must cycle only within the modal (not reach elements behind it). When the modal closes, focus must return to the element that triggered it. Libraries like `focus-trap-react` handle this correctly. Building focus traps from scratch is error-prone — the implementation must account for all focusable element types, dynamically added content, and iframe boundaries.

### Key Points
- Every interactive element must be Tab-reachable, keyboard-operable, and have a visible focus indicator
- `tabindex="0"` adds to tab order; `tabindex="-1"` removes from tab order but allows programmatic focus; avoid positive values
- Composite widgets (tabs, menus, listboxes) use arrow keys for internal navigation and Tab to enter/exit
- Implement Enter, Space, Escape, Home, End handling as appropriate per the ARIA APG patterns
- Focus trapping is required in modals; focus must return to the trigger element on modal close

### Follow-up Prompts
- How do you implement the roving tabindex pattern for a custom radio button group?
- What is the difference between `focus()` and `scrollIntoView()` for managing keyboard focus programmatically?
- How do you test that all keyboard interactions work correctly without using a mouse?

### Difficulty: intermediate
### Tags: accessibility, keyboard-navigation, tabindex, focus-management, aria, a11y

---

## Q4: Focus Management

### Question
What is focus management, why is it critical for accessibility, and what are the correct patterns for managing focus in dynamic applications?

### Model Answer
Focus management is the practice of deliberately controlling which element receives keyboard focus in response to user interactions and application state changes. In a simple static webpage, the browser handles focus naturally as users Tab through the document. But in dynamic single-page applications — modals opening and closing, routes changing, content updating, panels sliding in — focus management requires explicit programming to maintain a coherent navigation experience for keyboard and screen reader users.

The fundamental rule is that focus must never be lost. When a user triggers an action that removes the focused element from the DOM (closing a modal, deleting a list item, submitting a form that hides a section), focus falls to the `<body>` element by default, leaving keyboard users stranded with no indication of where they are. Every action that removes a focused element must explicitly move focus to a sensible replacement — the element that triggered the action, the next item in a list, or the first focusable element in a newly revealed section.

Modal dialogs have the clearest focus management requirements. When a modal opens, focus must move into the modal — typically to the first focusable element or the modal's heading. Focus must remain trapped within the modal while it is open. When the modal closes, focus must return to the trigger element (the button that opened it). Failure to return focus to the trigger leaves screen reader users at the top of the document with no memory of where they were.

Route changes in SPAs are a common focus management failure point. When the URL changes and new content renders, focus remains wherever it was — often on the now-invisible link that was clicked. This means screen reader users hear content from the previous page while visual content has changed. The correct pattern is to move focus to the main content area (an `<h1>` or a `main` landmark with `tabindex="-1"`) after each route change so users know a navigation occurred and where to start reading.

For dynamically added content (search results appearing, notifications, form validation errors), focus management depends on the urgency. If the content requires immediate attention (an inline error message), move focus to it. If it is informational (a search result list updating), use `aria-live` to announce the update without moving focus. Moving focus too aggressively interrupts users' current context; not moving it at all leaves them uninformed.

### Key Points
- Focus must never be lost to the body when DOM elements are removed; always redirect to a logical target
- Modals: move focus in on open, trap within, return to trigger on close
- SPA route changes: move focus to `<h1>` or main landmark so screen readers register the page change
- Dynamic content: move focus for errors/actions requiring attention; use `aria-live` for informational updates
- Use `tabindex="-1"` to make non-interactive elements programmatically focusable for focus targets

### Follow-up Prompts
- How do you handle focus management in a multi-step wizard where each step replaces the previous step's content?
- What is a "skip to main content" link and how do you implement it correctly?
- How do you manage focus in a virtualized list where items are removed and re-added from the DOM?

### Difficulty: intermediate
### Tags: accessibility, focus-management, keyboard, spa, modals, a11y

---

## Q5: Color Contrast Requirements

### Question
What are the WCAG color contrast requirements, how do you calculate contrast ratios, and what tools help you verify compliance?

### Model Answer
Color contrast is the relationship between the luminance of foreground text and its background. Insufficient contrast makes text difficult or impossible to read for people with low vision, color blindness, or in challenging viewing conditions (bright sunlight, poor screen quality). WCAG 2.1 defines minimum contrast ratios at Level AA and enhanced ratios at Level AAA.

At WCAG 2.1 Level AA, normal text (smaller than 18pt regular or 14pt bold) must have a contrast ratio of at least 4.5:1 against its background. Large text (18pt regular = 24px, or 14pt bold = ~18.67px) requires a minimum ratio of 3:1. The reasoning is that larger text is more readable at lower contrast due to its increased size and stroke width. Non-text UI components — icons, focus indicators, input borders, chart elements — also require a 3:1 contrast ratio against adjacent colors at AA (added in WCAG 2.1). At AAA, the requirements increase to 7:1 for normal text and 4.5:1 for large text.

Contrast ratio is calculated using relative luminance. The luminance of each color is computed from its sRGB values with gamma correction applied, then the ratio is: (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter color's luminance and L2 is the darker. A ratio of 1:1 means identical colors; 21:1 is the maximum (black on white). You never need to calculate this manually — browser tools and design tools compute it automatically.

Key tools for verifying contrast: the browser's DevTools (Chrome and Firefox both show contrast ratios in the color picker when inspecting text elements), the Colour Contrast Analyser desktop app by TPGi (useful for sampling colors from any screen content including images), the axe browser extension (automatically detects contrast violations across an entire page), and Figma plugins like "Stark" or "Contrast" that check designs before implementation. Design tokens systems should encode accessible color pairs, with contrast ratios validated at the design system level so individual components inherit compliant colors by default.

Common pitfalls: text over images or gradients where the background color varies, placeholder text (often fails at the light gray typically used), disabled state text (WCAG exempts truly disabled controls, but "disabled-looking" interactive elements are not exempt), focus indicator outlines that blend with the background, and text over video or animated backgrounds.

### Key Points
- WCAG 2.1 AA: 4.5:1 minimum for normal text, 3:1 for large text (18pt+ or 14pt+ bold)
- WCAG 2.1 AA: 3:1 for non-text UI components (icons, input borders, focus indicators) — new in 2.1
- WCAG 2.1 AAA: 7:1 for normal text, 4.5:1 for large text
- Use browser DevTools, axe extension, or Colour Contrast Analyser to verify contrast
- Validate color pairs at the design token / design system level to enforce compliance by default

### Follow-up Prompts
- How do you handle contrast for text displayed over dynamic backgrounds like user-uploaded images?
- What is the contrast requirement for placeholder text in form inputs?
- How do you design a color system that is both accessible and visually distinctive enough for branding?

### Difficulty: intermediate
### Tags: accessibility, color-contrast, wcag, a11y, design, testing

---

## Q6: Screen Reader Testing Basics

### Question
What are the most commonly used screen readers, how do they work, and what should you know to do basic screen reader testing?

### Model Answer
Screen readers are software applications that convert digital text and interface elements to spoken audio or Braille output. They allow people who are blind, have low vision, or have reading disabilities to use computers and smartphones. The most widely used screen readers are NVDA (NonVisual Desktop Access, free, Windows), JAWS (Job Access With Speech, paid, Windows), VoiceOver (built into macOS, iOS, and iPadOS), and TalkBack (built into Android). Browser choice matters — screen readers interact differently with different browsers, and specific pairings have better compatibility: NVDA + Chrome, JAWS + Chrome or Edge, and VoiceOver + Safari are the most common effective pairings.

Screen readers navigate the accessibility tree, not the visual DOM. They read elements in document order (the order in the HTML source, not necessarily visual order). They provide navigation shortcuts for jumping between headings (H key in NVDA/JAWS), landmarks (D key for next landmark), links (K key), form controls, tables, and other element types. This navigation mode (often called "Browse mode" or "Virtual cursor mode") is distinct from "Focus mode" where the user interacts with form controls by typing.

For basic screen reader testing, start by navigating the page using only the keyboard and screen reader — no mouse. Check that every interactive element has a descriptive accessible name (announced correctly when focused). Verify that images have appropriate alt text (described meaningfully for content images, empty for decorative ones). Check that form fields are properly labeled (the field name is announced when you focus the input). Verify that dynamic content updates are announced (a success message after form submission, a loading indicator).

Heading structure is particularly important for screen reader navigation. NVDA/JAWS users frequently navigate by headings to get an outline of page content. The heading hierarchy should reflect the document structure logically — one `<h1>` per page, sections using `<h2>`, subsections using `<h3>`, etc. Skipping levels (going from `<h2>` to `<h4>`) creates a confusing outline. Headings should also be descriptive — "Submit" as a heading is unhelpful; "Account Settings" is informative.

For component-level testing, VoiceOver on macOS is the most accessible starting point because it is free and built-in. Enable it with Cmd+F5, navigate with VO+Right arrow to read next element, and Tab to move focus. Announce mode shows what VoiceOver is saying visually — useful during development. The goal is not to be an expert screen reader user but to catch obvious failures: unlabeled buttons, inaccessible modals, missing form labels, and silent dynamic content changes.

### Key Points
- Primary screen readers: NVDA+Chrome (Windows), JAWS+Chrome/Edge (Windows), VoiceOver+Safari (macOS/iOS), TalkBack (Android)
- Screen readers navigate the accessibility tree in document order using heading/landmark/element navigation shortcuts
- Test every interactive element for an accessible name, form fields for labels, images for alt text
- Heading structure is critical for navigation — one `<h1>`, logical hierarchy, descriptive text
- VoiceOver on macOS (Cmd+F5) is the most accessible starting point for developers doing basic testing

### Follow-up Prompts
- How do you test that a modal dialog is correctly announced and focus-managed using VoiceOver?
- What is the difference between Browse mode and Focus mode in NVDA, and why does it matter for ARIA widget testing?
- How do you make a custom tooltip announced by screen readers without disrupting keyboard navigation?

### Difficulty: intermediate
### Tags: accessibility, screen-readers, nvda, voiceover, testing, a11y

---

## Q7: Semantic HTML for Accessibility

### Question
Why is semantic HTML the foundation of accessibility, and what semantic elements should developers use instead of generic divs and spans?

### Model Answer
Semantic HTML uses elements that carry inherent meaning about the structure and content of a page. When you use a `<button>` instead of a `<div>`, you get keyboard focusability, Enter and Space key activation, and role="button" in the accessibility tree — for free, without any ARIA or JavaScript. This is why "use semantic HTML first" is the foundational rule of accessibility development: native semantics provide accessibility by default, while custom elements built with divs and ARIA require you to recreate every behavior manually.

Document structure elements provide landmark navigation that screen reader users rely on. `<header>` represents the site header with role="banner". `<nav>` represents navigation with role="navigation". `<main>` represents the primary content with role="main". `<aside>` represents complementary content with role="complementary". `<footer>` represents the footer with role="contentinfo". These landmarks let screen reader users jump directly to the main content without tabbing through navigation, which is the semantic equivalent of a "skip to main content" link.

Heading elements (`<h1>` through `<h6>`) create an outline of the page that screen reader users navigate by pressing the H key. They should reflect a logical document hierarchy, not be chosen for visual size. Never use a heading just to make text bold and large — use CSS for visual styling and headings for structural meaning. Conversely, never skip headings or use them out of order to achieve visual hierarchy.

Lists (`<ul>`, `<ol>`, `<dl>`) communicate grouping and quantity. A screen reader announces "list, 5 items" when entering a `<ul>`, helping users understand the scope of content. Navigation menus, step-by-step processes, definition terms, and grouped items all benefit from appropriate list markup. Using divs with CSS to create visual lists loses this structural information from the accessibility tree.

Interactive elements have specific semantic choices: `<button>` for actions (submit, toggle, open modal), `<a href>` for navigation to a new URL or page section, `<input>`, `<select>`, and `<textarea>` for form controls. Using a `<button>` when you mean a link or a `<a>` when you mean a button is a semantic error that confuses screen reader users and breaks keyboard expectations (Enter activates links; Enter and Space activate buttons).

### Key Points
- Semantic HTML provides role, keyboard behavior, and accessibility tree semantics without ARIA or JavaScript
- Landmark elements (header, nav, main, aside, footer) enable direct section navigation for screen reader users
- Heading hierarchy (h1-h6) must reflect document structure, not visual appearance — used for outline navigation
- Lists communicate grouping and count; use them for navigation menus, steps, and grouped items
- Use `<button>` for actions, `<a href>` for navigation; never substitute one for the other

### Follow-up Prompts
- When is it appropriate to use a `<div>` or `<span>` instead of a semantic element?
- How do you structure a complex card component with an image, title, description, and action link semantically?
- What semantic element should you use for the main call-to-action on a marketing landing page?

### Difficulty: intermediate
### Tags: accessibility, semantic-html, landmarks, headings, a11y, html

---

## Q8: Form Accessibility

### Question
What are the accessibility requirements for web forms, including labels, errors, and descriptions?

### Model Answer
Forms are the primary way users interact with web applications, and inaccessible forms prevent users from completing essential tasks — signing up, logging in, purchasing, or submitting information. Accessible forms require correct labeling, clear error handling, logical structure, and appropriate input typing.

Every form control — input, textarea, select, checkbox, radio button — must have a programmatically associated label. The most reliable method is the `<label>` element with a `for` attribute matching the control's `id`. Wrapping a control inside a `<label>` (implicit association) also works but has broader browser compatibility when explicit association is used. The label is what screen readers announce when the control receives focus: "Email address, edit text" versus just "edit text" for an unlabeled field. Placeholder text is not a label — it disappears when the user starts typing and is not announced as the field's name by all screen readers.

For groups of related controls — radio buttons and checkboxes — use `<fieldset>` and `<legend>`. The legend provides the group label that is announced with each individual option: "Preferred contact method, Email, radio button, 1 of 3." Without the fieldset/legend pattern, each radio button is announced in isolation without the group context.

Error handling is one of the most frequently failed form accessibility requirements. When a form submission fails validation, three things must happen: the user must know that errors occurred (announced or visible), each field with an error must have the error message associated programmatically (via `aria-describedby` pointing to the error text, or by moving focus to the error summary), and the error message must be clearly written in plain language explaining what went wrong and how to fix it. Using only color to indicate errors (red border alone) violates WCAG 1.4.1.

The `required` attribute should be used on required fields, and `aria-required="true"` is the ARIA equivalent for custom controls. The HTML `required` attribute also triggers native browser validation. Input `type` attributes should match the expected data: `type="email"` for email addresses (triggers mobile email keyboard and enables native validation), `type="tel"` for phone numbers, `type="number"` for numeric values, `type="date"` for dates. These trigger appropriate input methods on mobile devices and provide semantic context to assistive technologies.

Additional descriptions that supplement but do not replace labels — password requirements, character limits, format hints — should be associated via `aria-describedby`. Unlike `aria-label` which replaces the accessible name, `aria-describedby` appends the referenced text as a description, announced after the control's name: "Password, edit text, Must contain at least 8 characters including one number."

### Key Points
- Every form control needs a programmatically associated `<label>` — placeholder text is not a substitute
- Group radio/checkbox controls with `<fieldset>` and `<legend>` for group context
- Error messages must be programmatically associated to their field via `aria-describedby` or focus moved to error summary
- Never use color alone to indicate errors; always pair with text, icons, or other non-color indicators
- Use appropriate `type` attributes (email, tel, number, date) for semantic meaning and mobile keyboard optimization

### Follow-up Prompts
- How do you handle real-time validation (validating as the user types) in an accessible way without being disruptive?
- What is the correct approach for making a required field indicator (asterisk) accessible to screen readers?
- How do you implement an accessible autocomplete/combobox input for a city search field?

### Difficulty: intermediate
### Tags: accessibility, forms, labels, errors, aria, wcag, a11y

---

## Q9: Accessible Modals and Dialogs

### Question
What makes a modal dialog accessible, and what are the complete requirements for implementing one correctly?

### Model Answer
Modal dialogs present unique accessibility challenges because they layer over the existing page content and require significant focus management and ARIA to communicate their purpose correctly. The requirements span several dimensions: correct semantic markup, focus behavior, keyboard interaction, and background content management.

The dialog element itself must use either the native `<dialog>` element (now well-supported across browsers) or `role="dialog"` on a container element. It must have an accessible name provided via `aria-label` (for short, descriptive names) or `aria-labelledby` pointing to the dialog's heading element. A dialog without an accessible name is announced as "dialog" with no context about its purpose. For alert dialogs that require immediate user response (delete confirmations, error notifications), `role="alertdialog"` communicates higher urgency.

When the modal opens, focus must move into it. The correct focus target depends on the dialog content: if the dialog has a short message with one primary action (a confirmation dialog), focus the primary action button. If the dialog has a form, focus the first form control. If the dialog has a long description the user should read first, focus the dialog's heading or a descriptive element (made focusable with `tabindex="-1"`). Never focus the close button by default if there is substantive content to read first.

Focus must be trapped within the modal while it is open. Tab cycles through focusable elements within the dialog; Shift+Tab cycles backward. Pressing Tab after the last focusable element wraps to the first, and vice versa. This prevents keyboard users from interacting with the page behind the modal, which would be confusing (especially since the background should be hidden from assistive technologies).

Background content should be hidden from assistive technologies with `aria-hidden="true"` on the root application container when a modal is open. This prevents screen reader users from navigating outside the dialog even if focus is trapped. Without `aria-hidden`, screen reader users can still access background content using virtual cursor navigation (reading mode), which breaks the modal's containment contract.

Closing the modal must be possible via the Escape key — this is a universal user expectation for dialogs. A visible close button (X or "Close") is also required. When the modal closes, focus must return to the element that triggered it, typically the button that opened the dialog.

### Key Points
- Use `<dialog>` or `role="dialog"` with `aria-label` or `aria-labelledby` for the dialog name
- On open: move focus into the modal (first control or primary action); on close: return focus to trigger
- Trap Tab/Shift+Tab within the dialog while it is open
- Apply `aria-hidden="true"` to background content to prevent virtual cursor navigation outside the modal
- Escape key must close the dialog; visible close button required

### Follow-up Prompts
- How does the native `<dialog>` element compare to a custom `role="dialog"` implementation for accessibility?
- How do you handle a confirmation dialog that is triggered from within another modal?
- What is the correct behavior if the element that opened the modal is no longer in the DOM when the modal closes?

### Difficulty: intermediate
### Tags: accessibility, modals, dialogs, focus-management, aria, a11y

---

## Q10: Alt Text Best Practices

### Question
What are the guidelines for writing effective alt text for images, and how do you handle different types of images?

### Model Answer
Alternative text (alt text) is the text description of an image that is read by screen readers and displayed when an image fails to load. It is one of the most fundamental accessibility requirements and one of the most commonly misimplemented. The goal of alt text is to convey the same information or function that the image provides to sighted users — not to describe the image visually in a vacuum.

The most important principle is that alt text must convey the image's purpose in context, not just describe its visual appearance. An image of a red "Submit" button needs alt text of "Submit" — not "Red button with white text." A graph showing revenue growth needs alt text that conveys the key takeaway: "Bar chart showing revenue growth from $2M in Q1 to $4.5M in Q4 2024" — not "Image of a bar chart." The alt text should serve the same informational purpose as the image does for a sighted user reading the surrounding content.

Decorative images — purely visual elements that add no information to the surrounding content, like background textures, spacer images, or icons that are redundant with adjacent text — should have empty alt text: `alt=""`. This signals to screen readers that the image should be completely ignored. Without this, the screen reader announces the file name (often something unhelpful like "img_2847.jpg") or "image." Note that empty alt and omitting the alt attribute entirely are different: omitting `alt` causes some screen readers to announce the file name; `alt=""` correctly conveys decorative intent.

Functional images — images used as interactive controls like a search icon as a button or a logo that is also a link — need alt text that describes the function, not the appearance. A search icon button's alt should be "Search," not "Magnifying glass." A company logo that links to the home page should have alt text "Company Name - Home" to convey both identity and function.

Complex images — charts, graphs, maps, diagrams — require more consideration. Brief alt text (the title or main takeaway) should be in the `alt` attribute; the full data or interpretation should be available through a separate `<figure>` with `<figcaption>`, a description below the image, or a data table. WCAG 2.1 requires both a short text alternative and a long description for complex informational images.

Context matters enormously. The same photo of a storefront might need "Exterior of the Main Street location showing wheelchair-accessible entrance ramp" on a "Find a store" page, but `alt=""` if it is purely decorative on an "About Us" page where the text already describes the location. Reassess alt text when the surrounding content changes.

### Key Points
- Alt text should convey the same information or function the image provides, not a literal visual description
- Decorative images: `alt=""` (empty, not omitted) to signal screen readers to skip them
- Functional images (linked icons, buttons): describe the function, not the appearance ("Search", not "magnifying glass")
- Complex images (charts, diagrams): short alt for main takeaway + long description in figcaption or adjacent content
- Context determines appropriate alt text — the same image may need different text in different contexts

### Follow-up Prompts
- How do you provide alt text for an image that contains text, such as a promotional banner with a sale headline?
- When should you use `role="presentation"` instead of `alt=""`?
- How do you handle SVG icons — should they use alt text, title elements, or ARIA labels?

### Difficulty: intermediate
### Tags: accessibility, alt-text, images, wcag, screen-readers, a11y

---
