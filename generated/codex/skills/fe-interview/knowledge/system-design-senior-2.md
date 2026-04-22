# System Design - Senior Interview Questions (Part 2)
### Language: en

## Q11: Design a Spreadsheet Editor (Like Google Sheets)

### Question
Design a browser-based collaborative spreadsheet editor. Cover the data model, formula evaluation engine, rendering strategy for large grids, real-time collaboration, and undo/redo.

### Model Answer
A spreadsheet editor is one of the most technically demanding frontend system design problems because it combines a custom data model, a computation engine, a high-performance renderer, and real-time collaboration — all in the browser.

The core data model is a sparse map from cell address (e.g., `{row: 3, col: 7}`) to cell state (`{rawValue: string, computedValue: any, style: CellStyle, formula?: string}`). A full 2D array would be prohibitively large (Google Sheets supports 10M cells). Using a Map keyed by a canonical string like `"R3C7"` or a nested object `{[row]: {[col]: Cell}}` allows O(1) access while only storing non-empty cells. Sheet metadata (column widths, row heights, frozen rows/columns, named ranges) lives separately.

The formula evaluation engine requires a dependency graph. When cell A1 contains `=B1+C1`, A1 depends on B1 and C1. When B1 changes, A1 must recalculate. The engine maintains a directed acyclic graph (DAG) of dependencies. On cell edit, perform a topological sort of affected cells (cells that depend on the changed cell, transitively) and evaluate them in dependency order. Circular reference detection is handled during graph construction — report an error rather than infinitely recalculating. The formula parser tokenizes and builds an AST; a recursive evaluator walks the AST resolving cell references against the current state. This can be done synchronously for small dependency chains but should be moved to a Web Worker for large recalculation passes.

Rendering a large grid efficiently requires virtualization. A sheet with 1000 rows and 50 columns cannot render all 50,000 cells as DOM nodes. The renderer calculates which rows and columns are visible in the current viewport using scroll position and cumulative row/column sizes, and renders only those cells plus a small overscan buffer. Canvas rendering (used by Google Sheets and Airtable) outperforms DOM rendering for this use case: a single `<canvas>` draws all cell borders, text, and backgrounds imperatively. The canvas renderer maintains a logical-to-pixel coordinate map based on cumulative row/column sizes and redraws only dirty regions on scroll or data change.

Real-time collaboration uses Operational Transformation (OT) or CRDTs. For spreadsheets, OT is more common: each operation (set cell value, insert row, delete column) is represented as a JSON operation. The server orders operations and transforms concurrent operations so they apply correctly regardless of arrival order. The `json-ot` or a custom OT implementation handles spreadsheet-specific transformations (inserting a row above a cell reference must update that reference). CRDTs are emerging as an alternative — Yjs supports arbitrary data structures and has been used in spreadsheet implementations — but spreadsheet CRDTs for formula cell references are still an active research area.

Undo/redo uses the Command pattern with an inverse-operation stack. Each operation produces a reverse operation: `setCellValue(A1, "hello")` reverses to `setCellValue(A1, "")`. The undo stack holds reverse operations; redo stack holds forward operations. In collaborative contexts, local undo must only undo the current user's operations — not other users' changes. This requires tagging operations with user identity and filtering the undo stack accordingly.

### Key Points
- Sparse map data model (Map of cell address → cell state) supports large grids without memory waste
- Formula engine uses a dependency DAG with topological sort for recalculation; move large recalculation passes to a Web Worker
- Canvas-based rendering with viewport virtualization handles large grids; only visible cells are drawn
- Real-time collaboration via OT with server-ordered operations; CRDTs (Yjs) are an emerging alternative
- Command pattern with inverse operations for undo/redo; tag operations by user for collaborative local undo

### Follow-up Prompts
- How would you handle circular references in the formula dependency graph, and how does Google Sheets allow iterative calculation?
- How does canvas text rendering handle cell overflow (text wider than column width) and truncation?
- How would you implement collaborative cursors (showing other users' selected cells) alongside the OT sync layer?

### Difficulty: advanced
### Tags: system-design, spreadsheet, canvas-rendering, OT, CRDT, formula-engine, virtualization

---

## Q12: Design a Video Player with Adaptive Bitrate Streaming

### Question
Design a browser-based video player that supports adaptive bitrate streaming (ABR). Cover the manifest parsing, segment fetching strategy, quality selection algorithm, buffer management, and UI architecture.

### Model Answer
Adaptive bitrate streaming solves the fundamental problem that network conditions vary: a fixed bitrate stream either wastes bandwidth on fast connections or buffers on slow ones. ABR protocols (HLS, DASH) encode video at multiple quality levels and allow the player to switch between them segment by segment based on measured bandwidth and buffer health.

The architecture centers on a media pipeline with several cooperating components. The manifest parser (HLS `.m3u8` or DASH `.mpd`) fetches and parses the manifest, extracting available quality renditions (bitrates, resolutions) and the segment URL patterns. For live streams, the manifest is refetched periodically as new segments are appended. The segment fetcher downloads media segments (typically 2-6 seconds of video) for the current and upcoming playback position, pushing them into the SourceBuffer via the Media Source Extensions (MSE) API.

The ABR algorithm is the intelligence of the player. Common approaches: throughput-based ABR estimates available bandwidth from recent segment download times (segment size / download duration) and selects the highest quality rendition that can be downloaded faster than playback speed. Buffer-based ABR (BOLA algorithm) uses buffer fullness as the primary signal — if the buffer is healthy (>10s), select higher quality; if draining (<5s), drop quality. Hybrid algorithms (Netflix's Pensieve, Dash.js's DYNAMIC algorithm) combine both signals. The ABR module outputs a target quality level that the fetcher uses for each new segment.

Buffer management prevents both starvation (buffer empty, playback pauses) and over-buffering (wastes memory, delays quality adaptation). The player maintains a target buffer range (e.g., 15-30 seconds ahead). The fetcher runs continuously, downloading segments to keep buffer within range. If the buffer drops below a panic threshold (2-3 seconds), the ABR algorithm forces a quality drop regardless of bandwidth estimate. The MSE `SourceBuffer` has limited capacity — the player must evict old (already-played) segments to avoid `QuotaExceededError`.

The UI architecture separates concerns: the `<video>` element handles decoding and rendering; the player controller manages state (playing, buffering, seeking, quality); the UI layer (controls bar, quality selector, buffering spinner) observes player state via events and renders reactively. The controls bar should be a separate absolutely-positioned overlay that does not affect video layout. Quality indicators should show both the currently playing quality (from `video.getVideoPlaybackQuality()`) and the requested quality. For React-based players, a custom hook (`useVideoPlayer`) wraps the imperative MSE API in a reactive interface.

Seeking in ABR requires special handling. Seeking to a timestamp may require discarding buffered segments that no longer cover the seek target (if seeking backwards past the buffer), then fetching the segment at the target position, and waiting for the SourceBuffer to be ready. This "seek gap" causes the buffering spinner to appear. Pre-fetching segments around common seek targets (chapter marks, ad boundaries) reduces seek latency.

### Key Points
- ABR works by encoding video at multiple bitrates and switching quality per segment based on bandwidth and buffer health
- Media Source Extensions (MSE) API enables JavaScript-controlled media segment feeding to the `<video>` element
- ABR algorithm inputs: bandwidth estimate (throughput-based), buffer level (buffer-based), or hybrid — outputs quality rendition selection per segment
- Buffer management: target 15-30s ahead, evict played segments to prevent MSE quota errors, emergency quality drop below panic threshold
- Separate UI overlay from `<video>` element; expose player state reactively via events or custom hooks for framework integration

### Follow-up Prompts
- How does the Media Source Extensions API work at a low level — what is a SourceBuffer and how do you append segments to it?
- How would you implement DRM (Widevine/FairPlay) encrypted video playback using the Encrypted Media Extensions API?
- How would you design an analytics system that captures Quality of Experience (QoE) metrics like rebuffer events, quality switches, and startup time?

### Difficulty: advanced
### Tags: system-design, video-player, adaptive-streaming, HLS, DASH, MSE, ABR, buffer-management

---

## Q13: Design a Frontend Notification System

### Question
Design a notification system for a web application that handles in-app toast notifications, a notification center (bell icon with history), real-time delivery, and cross-tab synchronization.

### Model Answer
A notification system has two distinct surfaces: transient toast notifications (ephemeral, appear and disappear automatically) and a persistent notification center (bell icon, unread count, history list). These have different requirements but share a common notification data model and delivery pipeline.

The notification data model: `{ id: string, type: 'success'|'error'|'warning'|'info'|'system', title: string, body: string, timestamp: Date, read: boolean, actions?: NotificationAction[], metadata?: Record<string, unknown> }`. Notifications are immutable once created; reading them is a separate state transition. This model serves both surfaces.

The notification state manager is the central piece. It maintains: the current list of all notifications (paginated, newest first), the unread count, and a queue of pending toasts. The state is most naturally managed with a Zustand or Redux slice. Key operations: `addNotification(notification)` appends to the list and enqueues a toast if `showToast: true`; `markRead(id)` / `markAllRead()` updates read status; `dismiss(id)` removes from the toast queue without deleting from history. The store is the single source of truth.

Real-time delivery uses WebSocket or Server-Sent Events (SSE). SSE is simpler for one-directional server-to-client delivery (notifications only flow from server to client). A `NotificationService` class manages the SSE connection with automatic reconnection (`EventSource` handles this natively, but you need to handle auth token refresh on reconnect). On receiving a notification event, the service calls `store.addNotification()`. For applications already using WebSocket (chat, presence), notifications ride the same connection.

Cross-tab synchronization is critical: when the user has multiple tabs open, receiving a notification in one tab should update the unread count in all tabs. Two approaches: `BroadcastChannel` API sends a message to all same-origin tabs when a notification is received or marked read. The other tabs update their local store state from the BroadcastChannel message. Alternatively, `localStorage` events fire across tabs when storage changes — a simpler but less explicit mechanism. BroadcastChannel is preferred for clarity.

The toast renderer is an independent component that subscribes to the toast queue. It renders toasts in a portal (to escape stacking contexts and z-index issues) at a fixed screen position (top-right or bottom-right). Each toast has a configurable auto-dismiss timer (managed with `setTimeout`, cleared on hover for accessibility). Maximum concurrent toast count (typically 3-5) prevents overwhelming the screen; excess toasts queue and appear as earlier ones dismiss. Toasts support keyboard dismissal and meet WCAG 2.1 AA requirements by using `role="alert"` for live region announcements.

### Key Points
- Separate transient toasts (ephemeral queue) from persistent notification center (history list) — different UI surfaces, shared data model
- Central Zustand/Redux store manages notification state; `addNotification` drives both surfaces
- SSE for real-time delivery (simpler than WebSocket for unidirectional push); automatic reconnection on network interruption
- `BroadcastChannel` API synchronizes read/unread state and new notifications across open tabs
- Toast renderer uses a portal at fixed screen position with auto-dismiss timers, max concurrent count, and `role="alert"` for accessibility

### Follow-up Prompts
- How would you implement notification preferences (per-type mute, email vs. in-app) and ensure the frontend respects them without re-fetching on every notification?
- How would you handle the case where the user is offline — queuing missed notifications for delivery when they reconnect?
- What accessibility requirements (ARIA, keyboard navigation, focus management) apply to a notification center dropdown?

### Difficulty: advanced
### Tags: system-design, notifications, toast, SSE, WebSocket, BroadcastChannel, real-time, state-management

---

## Q14: Design a Chat Application with Real-Time Features

### Question
Design a frontend chat application supporting one-on-one and group messaging, real-time message delivery, typing indicators, read receipts, message reactions, and offline support.

### Model Answer
Chat is a canonical real-time frontend design problem. The core complexity is managing optimistic updates (messages appear immediately before server confirmation), eventual consistency (messages may arrive out of order), and multiple real-time event types beyond messages (typing, presence, reactions, read receipts).

The data model centers on conversations and messages. `Conversation: { id, type: 'dm'|'group', participantIds, lastMessage, unreadCount }`. `Message: { id, conversationId, senderId, content, timestamp, status: 'sending'|'sent'|'delivered'|'read', reactions: Reaction[], replyTo?: string }`. Message status tracks the delivery lifecycle. The client generates a temporary `clientId` for optimistic messages before the server assigns a permanent `id` — reconciliation maps `clientId` to server `id` on confirmation.

The WebSocket connection is the backbone. A singleton `ChatSocket` manages connection lifecycle, reconnection with exponential backoff, message queuing during disconnect, and event routing. Incoming events are dispatched to typed handlers: `MESSAGE_RECEIVED`, `TYPING_START`, `TYPING_STOP`, `MESSAGE_STATUS_UPDATE`, `REACTION_ADDED`, `USER_PRESENCE_CHANGE`. The socket layer is infrastructure; it does not contain application logic. Each event handler updates the Zustand/Redux store, which drives all UI updates reactively.

Optimistic updates make the UX feel instant. When the user sends a message: immediately append it to the conversation with status `sending` and a `clientId`; send via WebSocket; on server acknowledgment (with server-assigned `id` and `timestamp`), reconcile by replacing the optimistic entry. On failure, mark status `failed` and show a retry option. The store handles the `clientId` → `serverId` mapping to prevent duplicate display.

Typing indicators use debounced socket events. On each keypress in the input, send a `TYPING_START` event (debounced to avoid flooding: send once per 2s of continuous typing). Send `TYPING_STOP` on input blur or when the user stops typing for 3 seconds. The receiver shows "Alice is typing..." with an animated ellipsis. Typing state expires automatically after 5 seconds client-side to handle cases where TYPING_STOP is missed.

Infinite scroll for message history uses a combination of bi-directional scroll and pagination. On mount, load the latest 50 messages. As the user scrolls up past a threshold, fetch the previous 50 messages and prepend them. Maintain scroll position during prepend (the classic scroll anchor problem: calculate the height added by new messages and adjust `scrollTop` to compensate). The `ScrollRestoration` API or manual scroll anchoring prevents the viewport from jumping when messages are prepended.

Offline support queues outgoing messages in IndexedDB. When the socket reconnects, drain the queue in order. Incoming messages during offline periods are fetched on reconnect via a REST "missed messages" endpoint using the timestamp of the last received message. The app should show a clear "reconnecting" / "offline" indicator — never silently discard messages.

### Key Points
- Optimistic message insertion with `clientId` reconciled to server `id` on confirmation makes sending feel instant
- Singleton WebSocket with reconnection/backoff/queue manages connection lifecycle; dispatches typed events to store handlers
- Typing indicators: debounced TYPING_START events, client-side expiration timeout as safety net for missed TYPING_STOP
- Bi-directional infinite scroll with scroll anchoring (adjust `scrollTop` to compensate for prepended height) for message history
- Offline queue in IndexedDB + "missed messages" REST fetch on reconnect ensures no message loss

### Follow-up Prompts
- How would you implement end-to-end encryption for messages in the browser using the Web Crypto API?
- How does the `scrollTop` adjustment technique work for prepending messages, and what is the `overflow-anchor` CSS property?
- How would you design the notification system for a chat app — specifically, how do you decide when to show a desktop notification vs. in-app badge?

### Difficulty: advanced
### Tags: system-design, chat, real-time, WebSocket, optimistic-updates, offline, typing-indicators, IndexedDB

---

## Q15: Design an Analytics Dashboard

### Question
Design a frontend analytics dashboard with multiple chart types, date range filtering, real-time metric updates, drill-down capability, and export functionality.

### Model Answer
An analytics dashboard combines data visualization, complex state management, performance optimization for large datasets, and real-time updates. The key design challenge is creating a flexible, composable architecture that can accommodate diverse chart types and data shapes without becoming unmaintainable.

The dashboard composition model uses a widget-based architecture. Each widget is an independently configurable unit: `{ id, type: 'line-chart'|'bar-chart'|'metric-card'|'table'|'funnel', dataSource: DataSourceConfig, title: string, layout: GridPosition, filters: FilterConfig[] }`. Widgets are arranged in a responsive grid (CSS Grid or react-grid-layout for draggable dashboards). Each widget is independently responsible for fetching its data, handling loading/error states, and rendering. This isolation means one failing chart does not break others.

The data fetching layer uses React Query (TanStack Query) or SWR with dashboard-level filter context. A `useDashboardFilters` hook provides the current date range, segment, and dimension filters. Each widget composes dashboard filters with its own widget-level filters to construct an API query key. When the user changes the date range, all widget queries invalidate simultaneously. React Query's `useQuery` with `keepPreviousData: true` ensures charts show stale data while refetching rather than flashing a loading state — critical for responsive filter interaction.

Chart rendering uses a library like Recharts (React-based), Victory, or direct D3 integration. For performance with large datasets (line charts with thousands of data points), data downsampling is essential. The Largest-Triangle-Three-Buckets (LTTB) algorithm reduces a time series to a target number of points while preserving visual shape. This runs client-side as a pre-processing step before passing data to the chart library. SVG-based charts perform well up to ~1000 points; for larger datasets, Canvas-based charts (Chart.js with Canvas renderer, or custom Canvas drawing) maintain smooth interaction.

Real-time metric updates for live dashboards use SSE or WebSocket subscriptions. Metric cards (showing current active users, conversion rate in the last 5 minutes) need sub-minute updates. Line charts showing rolling windows (last 30 minutes) append new data points and shift the window. The update strategy matters for animation: appending a point and letting the chart smoothly scroll (using `recharts` animation with `isAnimationActive` on new data) provides the expected "live chart" visual. Debounce rapid updates (if the server pushes multiple events per second) to the last event in each render frame via `requestAnimationFrame`.

Drill-down navigation builds on the same widget architecture. A click on a bar in a "revenue by country" chart navigates to a filtered view of a lower-level dashboard or a data table. The drill-down context is pushed to URL state (using the router's query params) so the view is shareable and bookmarkable. Breadcrumbs show the drill-down path. The data table at the end of a drill-down supports column sorting, column show/hide, and virtual scrolling for large result sets using TanStack Virtual.

Export functionality must work for both chart images and raw data. Chart-to-PNG export uses `html2canvas` or, preferably, SVG serialization (`new XMLSerializer().serializeToString(svgElement)` converted to a Blob URL). CSV export serializes the chart's data model (not the rendered SVG) for accuracy. PDF export of a full dashboard uses a headless rendering service (Puppeteer on the server) that renders the dashboard and generates a PDF — client-side PDF generation via jsPDF is viable for simple cases but lacks layout fidelity for complex dashboards.

### Key Points
- Widget-based architecture with independent data fetching per widget; failure isolation prevents one broken chart from affecting others
- TanStack Query with `keepPreviousData: true` for filter-driven refetching without loading flash; all widgets share dashboard filter context
- LTTB downsampling reduces large time series to renderable point counts while preserving visual shape
- Real-time updates via SSE/WebSocket with `requestAnimationFrame`-debounced appends and smooth chart animation
- Drill-down state in URL query params for shareability; export via SVG serialization (charts) and data model serialization (CSV)

### Follow-up Prompts
- How would you implement a dashboard builder where users can add, remove, resize, and configure widgets — and persist their layout?
- What is the LTTB downsampling algorithm and how would you implement it in TypeScript?
- How would you handle timezone-aware date ranges in an analytics dashboard used by a global team?

### Difficulty: advanced
### Tags: system-design, analytics, dashboard, charts, real-time, TanStack-Query, data-visualization, drill-down

---

## Q16: Design a Drag-and-Drop Page Builder

### Question
Design a browser-based drag-and-drop page builder (like Webflow or Squarespace). Cover the component tree data model, drag-and-drop mechanics, canvas rendering, undo/redo, and code generation.

### Model Answer
A page builder is a meta-UI: an application that builds other UIs. The core complexity is maintaining an abstract representation of the page (the document tree) while providing an intuitive visual editing surface with precise drag-and-drop interactions.

The document tree is a nested JSON structure: `{ id, type: 'section'|'container'|'text'|'image'|'button'|..., props: Record<string, any>, style: CSSProperties, children: Node[] }`. This mirrors the DOM tree but is framework-agnostic. The tree is the single source of truth — the canvas renders from it, the code generator outputs from it, and undo/redo operates on its history. Immutable tree operations (add node, remove node, update props, move node) are pure functions that produce new tree instances, making history trivial (store snapshots or patches).

Drag-and-drop has two modes: dragging from the component palette (inserting a new element) and dragging existing elements within the canvas (reordering or reparenting). The HTML Drag-and-Drop API is insufficient for complex builders due to limited control over drag images and drop targeting. Libraries like `dnd-kit` or `react-beautiful-dnd` provide the hooks-based primitives needed. A custom approach using `pointermove`/`pointerup` events gives maximum control: on drag start, create a floating "ghost" element at the pointer position; on drag over, calculate the nearest drop target and insertion position (before/after children based on pointer Y position relative to each child's center); on drop, dispatch a `MOVE_NODE` or `INSERT_NODE` action.

Drop zone highlighting is a key UX detail. The canvas must visually indicate where the dragged element will land. This requires a "drop indicator" overlay — a blue line showing insertion position between elements, or a highlighted container for reparenting drops. Calculating the correct insertion index given the current pointer position requires iterating over the target container's children and comparing the pointer Y coordinate to each child's midpoint.

The canvas rendering strategy has two approaches. DOM-based rendering: render the document tree directly as React components, with a selection/editing overlay. This is simpler and leverages browser layout, but DOM event handling conflicts between "builder mode" clicks (select element) and "element mode" clicks (follow link) require intercepting events. Canvas-based rendering (Figma's approach) draws everything to Canvas — precise control but requires reimplementing text layout, image rendering, and interaction from scratch. Most page builders use DOM rendering with event interception for pragmatic reasons.

Code generation transforms the document tree into valid HTML/CSS or a component library's JSX. A recursive visitor pattern walks the tree: each node type has a code generator function that emits the appropriate HTML/JSX with props and styles. Tailwind-based builders map style properties to Tailwind class names. Component-library-based builders (generating Radix UI or MUI components) require a mapping from builder component types to library components. The generated code should be clean enough to be used directly, not require reformatting.

### Key Points
- Document tree as nested JSON is the single source of truth; immutable operations enable trivial undo/redo via snapshot or patch history
- `dnd-kit` or custom pointer events for drag-and-drop; calculate insertion position from pointer Y relative to children midpoints
- Drop indicator overlay (line between elements or container highlight) provides visual feedback during drag
- DOM-based canvas with event interception is most practical; canvas-based rendering gives more control but requires reimplementing layout
- Code generation via recursive visitor pattern; map tree nodes to HTML/JSX/Tailwind output

### Follow-up Prompts
- How would you implement multi-select (selecting and moving multiple elements simultaneously) in the drag-and-drop system?
- How does Figma achieve pixel-perfect canvas rendering while still supporting text editing and complex interactions — what is the hybrid approach?
- How would you design the undo/redo system to handle collaborative editing where multiple users may be making changes simultaneously?

### Difficulty: advanced
### Tags: system-design, page-builder, drag-and-drop, dnd-kit, document-tree, undo-redo, code-generation

---

## Q17: Design a Rich Text Editor (Like Notion)

### Question
Design a browser-based rich text editor with block-based structure, collaborative editing, slash commands, inline formatting, embeds, and keyboard navigation.

### Model Answer
Rich text editors are notoriously complex because the browser's native `contenteditable` has inconsistent behavior across browsers and is insufficient for the structured, block-based editing model that modern editors (Notion, Coda, Confluence) require. The modern approach uses a custom document model with a thin rendering layer over `contenteditable`, or avoids `contenteditable` entirely.

The document model is a flat array of blocks: `Block: { id, type: 'paragraph'|'heading1'|'bulleted-list'|'numbered-list'|'code'|'image'|'divider'|'callout'|..., content: InlineNode[], properties: Record<string, any> }`. Each block has a type and a content array of inline nodes (spans with text and marks: bold, italic, code, link, mention). This flat block model (vs. a deeply nested tree) simplifies operations: inserting a block is array splice, moving a block is splice + insert, merging blocks is content concatenation. The Slate.js, TipTap (ProseMirror-based), and BlockNote libraries all implement variants of this model.

Input handling is the most complex part. The editor intercepts all keyboard events on the `contenteditable` root and maps them to document operations. Enter in a paragraph: insert a new paragraph block after the current one. Backspace at the start of a block: merge with the previous block (or delete if it is an empty block). Tab in a bulleted list: increase indentation level. The editor maintains a cursor model (block index + text offset) independently of the browser selection — browser selection is derived from the editor state, not the other way around. This prevents `contenteditable`'s inconsistent cursor behavior from corrupting the model.

Slash commands trigger an autocomplete popup. When the user types `/` at the start of an empty block, intercept the keyboard input, show a floating command palette (positioned below the caret using `Range.getBoundingClientRect()`), and filter commands as the user types. On selection, replace the block's content and transform the block type. The command palette is a separate React component rendered in a portal.

Collaborative editing is typically implemented with Yjs — a CRDT library that handles conflict-free merging of concurrent edits. Yjs's `Y.Array` represents the block list; each block's content is a `Y.Text` with inline formatting as formatting ranges. Yjs synchronizes via WebSocket (`y-websocket`) or WebRTC (`y-webrtc`). The editor binds its state to the Yjs document: local changes update the Yjs document and remote changes (received via sync) update the editor state. Cursors from other users are tracked as Yjs awareness state and rendered as colored cursor overlays.

Embeds (video, code blocks with syntax highlighting, images with captions) are block types with specialized renderers. Code blocks use a library like Prism.js or Monaco for syntax highlighting; the raw text is stored in the block model and highlighted on render. Images store the URL and optional caption; inline editing of captions uses a nested contenteditable. YouTube/Figma embeds use an `<iframe>` with a fixed aspect ratio container. Paste handling detects pasted URLs matching embed patterns and offers to convert them to embed blocks.

### Key Points
- Flat block array model with inline node content is simpler to operate on than a deeply nested tree; matches Notion/Coda/Confluence architecture
- Editor intercepts all keyboard events and maps to model operations; maintains cursor state independently of browser selection
- Slash commands: intercept `/` at block start, floating command palette positioned via `Range.getBoundingClientRect()`, replaces block on selection
- Yjs CRDT enables conflict-free collaborative editing; bind Yjs documents to editor state with awareness for cursor presence
- Embed blocks render specialized components (Monaco for code, iframe for external embeds) while storing raw data in the document model

### Follow-up Prompts
- How does ProseMirror's approach to defining a schema constrain valid document structures and what does this buy you over a schema-less model?
- How would you implement drag-to-reorder blocks with visual drop indicators without disrupting the text cursor?
- What are the tradeoffs between OT and CRDTs (specifically Yjs) for rich text collaboration?

### Difficulty: advanced
### Tags: system-design, rich-text-editor, Yjs, CRDT, collaborative-editing, Slate, ProseMirror, contenteditable

---

## Q18: Design a Map Application

### Question
Design a browser-based map application with tile loading, marker clustering, route display, search, and offline support.

### Model Answer
A map application is a specialized visualization problem. The browser canvas (or WebGL) renders a continuous 2D space tiled from server-rendered map images, overlaid with interactive vector elements (markers, routes, polygons). Libraries like Mapbox GL JS (WebGL-based), Leaflet (Canvas/SVG-based), and Google Maps JavaScript API abstract the tile rendering — but understanding the underlying model is important for performance and customization.

The tile system uses a quadtree coordinate scheme: the world map is divided into a grid at each zoom level, where each zoom level contains 4x more tiles than the previous. A tile at `{z: 14, x: 2453, y: 6098}` covers a specific geographic bounding box. The map renderer calculates which tiles cover the current viewport at the current zoom level, fetches them (HTTP/2 parallel fetch with aggressive caching: `Cache-Control: public, max-age=604800`), and renders them in a CSS grid or as WebGL textures. Panning shifts the tile grid; zooming transitions between zoom levels (often animated with CSS transform scale before new tiles load).

Marker clustering is essential for maps with thousands of points. Rendering 10,000 `<div>` markers causes severe DOM performance issues. `Supercluster` (by Mapbox) implements a hierarchical k-means clustering algorithm that groups nearby points by geographic proximity at each zoom level. The result at any zoom level is a manageable set of clusters (each with a count and a representative point) plus individual points that don't belong to a cluster. As the user zooms in, clusters split into sub-clusters or individual markers. The clustering runs in a Web Worker to avoid blocking the main thread on large datasets.

Route display uses GeoJSON `LineString` features rendered as vector layers (Mapbox GL JS's `addLayer` with `type: 'line'`). Routes from a directions API return encoded polylines (Google's polyline algorithm or GeoJSON). Animated route drawing (drawing the line progressively like a navigation app) uses SVG `stroke-dasharray` animation or WebGL shader-based animation. Route snapping (ensuring the route follows roads) is computed server-side; the client only renders the polyline.

Search uses a geocoding API (Mapbox Geocoding, Google Places Autocomplete). The search input fires autocomplete queries with 300ms debounce. Results are displayed in a dropdown; selecting a result pans/zooms the map to the location and drops a pin. Reverse geocoding (address from coordinates) on map click or user location (`navigator.geolocation`) follows the same pattern.

Offline support for maps is layered. Tile caching: a Service Worker caches tile responses using the Cache API, allowing previously viewed areas to render offline. The cache must be bounded (50-100MB) and use an LRU eviction policy for old tiles. Vector tile offline packs (Mapbox's offline regions API) allow downloading tiles for a geographic area explicitly. User markers and route data are stored in IndexedDB for offline access. The app detects offline state via `navigator.onLine` / `online`/`offline` events and shows a degraded mode indicator, allowing map interaction with cached tiles.

### Key Points
- Tile system: quadtree coordinates (`z/x/y`), fetch tiles covering current viewport, aggressive caching with long `max-age`
- Supercluster for marker clustering runs in a Web Worker; hierarchically groups markers per zoom level for DOM performance
- Routes rendered as GeoJSON LineString via Mapbox GL JS layers; encoded polylines decoded client-side
- Search: geocoding API with debounced autocomplete, reverse geocoding for click/location
- Offline: Service Worker caches tiles with LRU eviction, IndexedDB for user data; explicit tile pack downloads for known offline areas

### Follow-up Prompts
- How does WebGL-based rendering in Mapbox GL JS achieve better performance than SVG/Canvas rendering in Leaflet for dense datasets?
- How would you implement custom cluster icons that reflect the data distribution within a cluster (e.g., pie chart clusters showing category breakdown)?
- What is the Mapbox Vector Tile specification and how do vector tiles differ from raster tiles?

### Difficulty: advanced
### Tags: system-design, maps, tiles, clustering, Mapbox, WebGL, offline, geolocation, Service-Worker

---

## Q19: Design an E-Commerce Product Page

### Question
Design the frontend architecture of a high-performance e-commerce product page handling variant selection, inventory state, add-to-cart, reviews, recommendations, and social proof.

### Model Answer
An e-commerce product page is a high-stakes performance design problem — milliseconds of LCP improvement have documented conversion rate impact. The architecture must balance rich interactivity (variant selection, cart, reviews) with aggressive performance optimization and SEO requirements.

The rendering strategy should be SSR (or ISR for cacheable products). The page must be crawlable and render meaningful content at first paint for SEO. Using Next.js ISR with `revalidate: 60`, the page is pre-rendered and served from the CDN with near-zero TTFB; inventory and pricing are refreshed every 60 seconds. For products where pricing is truly real-time (flash sales, dynamic pricing), SSR with edge caching (short TTL) is more appropriate. The HTML must include the product schema markup (`application/ld+json`) for Google's rich results.

Variant selection (size, color, material) drives a client-side state machine. The selected variant determines the displayed price, images, inventory status, and add-to-cart availability. The state: `{ selectedOptions: Record<string, string>, selectedVariant: Variant | null, variantAvailability: Record<string, 'available'|'low-stock'|'out-of-stock'> }`. Variant availability is fetched from a real-time inventory API on page mount (SSR data may be stale) and updated via WebSocket or polling. Unavailable size/color combinations disable the corresponding option buttons with `aria-disabled` and visual treatment.

Add-to-cart uses optimistic update with cart state managed in a global store (Zustand, Redux Toolkit) synchronized with the server cart (cookie-based or user session). On "Add to Cart" click: immediately update cart count in the header (optimistic), send the mutation, handle success (confirm the count) or failure (revert with error toast). For guest users, cart state persists in `localStorage`; on login, the guest cart is merged with the authenticated server cart.

The image gallery for the hero product images is the LCP element. It must be pre-loaded aggressively: `<link rel="preload" as="image" href="...">` for the first image, `fetchpriority="high"` on the `<img>` tag, and correct `srcset`/`sizes` for responsive images. Subsequent gallery images use lazy loading. A zoom feature (hover or click to enlarge) uses CSS `transform: scale()` on the image or an overlay with a higher-resolution image loaded on demand.

Reviews are a natural candidate for partial hydration or lazy loading. The review section is below the fold on most devices; it can be rendered server-side as static HTML and hydrated lazily (when scrolled into view via Intersection Observer) or loaded as a separate client-side component after the above-fold content is interactive. The review submission form is client-side only. Review pagination (load more) uses cursor-based pagination rather than offset for consistency as new reviews are added.

### Key Points
- ISR (revalidate: 60) for cacheable products with CDN delivery; SSR with short TTL for real-time pricing/inventory
- Variant selection state machine: selected options → resolved variant → availability, price, images; inventory refreshed client-side for accuracy
- Add-to-cart: optimistic update of cart count, mutation with revert on failure; merge guest localStorage cart on authentication
- Hero image as LCP: `<link rel="preload">` + `fetchpriority="high"` + correct `srcset`; subsequent images lazy-loaded
- Reviews: lazy-hydrated below fold (Intersection Observer), static HTML for SEO, client-side-only submission form

### Follow-up Prompts
- How would you implement a "notify me when back in stock" feature that integrates with the real-time inventory WebSocket system?
- How does the JSON-LD product schema markup affect Google's rich results and what fields are most important for e-commerce SEO?
- How would you A/B test the add-to-cart button placement and measure its impact on conversion rate using the performance and analytics infrastructure?

### Difficulty: advanced
### Tags: system-design, e-commerce, product-page, ISR, SSR, variant-selection, LCP, optimistic-update

---

## Q20: Design a Real-Time Collaborative Whiteboard

### Question
Design a browser-based real-time collaborative whiteboard (like Miro or FigJam) supporting simultaneous multi-user drawing, shapes, sticky notes, selection, and infinite canvas.

### Model Answer
A collaborative whiteboard combines the hardest aspects of multiple frontend problems: high-performance canvas rendering (like a map), real-time collaboration (like a chat app), and complex interaction design (like a page builder). The result is one of the most technically demanding frontend system design problems.

The canvas rendering must use WebGL or Canvas 2D, not DOM, for performance. A whiteboard with thousands of objects cannot render each as a DOM element — the DOM's layout and paint overhead would make scrolling and zooming unusable. The scene graph is a flat array of objects (`{ id, type: 'path'|'rect'|'ellipse'|'text'|'image'|'sticky', geometry, style, ownerId, zIndex }`). The renderer iterates the scene graph and draws each object to a Canvas or WebGL surface. Konva.js provides a Canvas 2D scene graph abstraction; Pixi.js and Three.js work for WebGL. For the highest-performance implementations (Figma, Miro), a custom WebGL renderer with instanced rendering for common shapes achieves the smoothest experience.

The infinite canvas is implemented with a viewport transform: a 2D affine transformation matrix `{ translateX, translateY, scale }` that maps canvas (screen) coordinates to world (document) coordinates. All object positions are stored in world coordinates. The renderer applies the viewport transform as a canvas `setTransform()` call before drawing. Panning updates translateX/translateY; zooming updates scale and adjusts translate to zoom toward the pointer. Hit testing (which object is at a screen coordinate) inverts the transform to get world coordinates and checks each object's geometry.

The real-time sync layer uses Yjs with y-websocket for CRDT-based conflict-free collaboration. The scene graph maps to a `Y.Map` of object IDs to `Y.Map` objects representing each object's properties. Yjs handles concurrent edits: two users moving the same object simultaneously produces a deterministic merged result (last-write-wins per property). Awareness (Yjs's ephemeral state) tracks each user's cursor position, selection, and display name — rendered as colored cursor overlays with names.

Drawing (freehand paths) requires special treatment for performance during stroke. While the user is drawing, the in-progress stroke is rendered locally only (not yet in the Yjs document) as a series of canvas line segments appended on each `pointermove` event. On stroke completion (`pointerup`), the path is simplified (Ramer–Douglas–Peucker algorithm reduces the number of points while preserving shape) and committed to the Yjs document, syncing to all collaborators. This prevents flooding the sync layer with hundreds of intermediate path points per stroke.

Selection and multi-select use a selection rectangle (rubber-band select) hit testing against all object bounding boxes. Selected objects show handles (resize, rotate). Move operations translate selected objects' positions in the Yjs document. Transform handles use a 2D transform matrix for resize/rotate to maintain aspect ratio and handle rotation correctly. Keyboard shortcuts (Ctrl+Z undo, Ctrl+G group, Delete to remove) are handled by a keyboard shortcut manager that maps to Yjs document operations.

### Key Points
- WebGL or Canvas 2D scene graph rendering (Konva, Pixi, or custom) for performance — DOM rendering does not scale to thousands of objects
- Infinite canvas via viewport transform matrix; all object positions in world coordinates, renderer applies transform before drawing
- Yjs CRDT with y-websocket for conflict-free sync; awareness for cursor presence; object properties as Y.Map for per-property merging
- Freehand drawing: render in-progress stroke locally only, simplify with Ramer-Douglas-Peucker on completion, then commit to Yjs
- Selection: rubber-band hit test against bounding boxes; move/transform operations update Yjs document directly

### Follow-up Prompts
- How does the Ramer–Douglas–Peucker path simplification algorithm work and why is it important for freehand drawing performance?
- How would you implement "locking" an object so other collaborators cannot move it, using Yjs's awareness or document state?
- What are the rendering performance implications of implementing undo/redo via Yjs's built-in undo manager vs. a custom command stack?

### Difficulty: advanced
### Tags: system-design, whiteboard, collaborative, canvas, WebGL, Yjs, CRDT, infinite-canvas, real-time

---
