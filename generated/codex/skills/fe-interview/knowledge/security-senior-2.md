# Security - Senior Interview Questions (Part 2)
### Language: en

## Q11: What Are the Security Pitfalls of JWT and How Do You Mitigate Them?

### Question
Describe the most critical JWT security vulnerabilities — including the algorithm confusion attack, weak secret attacks, and improper validation — and explain how to implement JWTs securely.

### Model Answer
JSON Web Tokens are widely used for authentication and authorization, but their flexibility introduces several well-documented attack vectors that have caused real-world breaches. Understanding these is essential for any senior frontend engineer working with authentication systems.

The algorithm confusion (or "alg:none") attack exploits libraries that trust the algorithm specified in the JWT header without verifying it against expected algorithms. An attacker modifies a valid JWT's header to set `"alg": "none"` and removes the signature. Naive libraries that accept any algorithm accept this as valid, granting the attacker arbitrary token content. The fix is explicit algorithm allowlisting: always specify exactly which algorithms are acceptable on the server side (`{ algorithms: ['RS256'] }`) and reject tokens with any other algorithm, including `none`. Libraries like `jsonwebtoken` support this via the `algorithms` option in `jwt.verify()`.

The RS256-to-HS256 confusion attack is more subtle. RS256 uses asymmetric keys: the server signs with a private key and verifies with a public key. If an attacker changes the `alg` header to `HS256` and signs the token with the *server's public key* (which they may have obtained from a JWKS endpoint), a vulnerable server using the same public key as the HS256 secret will accept the token as valid. This is catastrophic because the attacker controls the token content. The fix is the same: explicit algorithm allowlisting and never accepting algorithm negotiation from the token itself.

Weak secret attacks apply to HS256 tokens. If the HMAC secret is short, predictable, or derived from known information, attackers can brute-force it offline. HS256 tokens can be cracked with tools like `hashcat` using high-speed GPU computation if the secret is weak. The fix: use cryptographically random secrets of at least 256 bits for HS256, or prefer RS256/ES256 (asymmetric) which are immune to secret brute-forcing since the private key is never shared.

On the frontend, JWT handling has its own security considerations. Storing JWTs in `localStorage` exposes them to any XSS attack that executes JavaScript on your page — XSS can exfiltrate the token and impersonate the user indefinitely. Storing tokens in `HttpOnly; Secure; SameSite=Strict` cookies prevents JavaScript access, mitigating XSS extraction (though CSRF becomes the concern, mitigated by SameSite and explicit CSRF tokens for state-changing operations). The debate continues, but the current security consensus favors `HttpOnly` cookies for token storage over `localStorage`.

JWT validation on the client side must never be trusted for authorization decisions. The client may decode a JWT (Base64URL decode the payload) to read claims for UI purposes (displaying the username, checking role for showing/hiding UI elements), but authorization enforcement must happen on the server. The client-side role check is a UX convenience, not a security control. A user can manually decode and fake claims — servers must validate the signature and enforce permissions independently.

### Key Points
- Allowlist specific algorithms explicitly (`{ algorithms: ['RS256'] }`) — never accept algorithm from the token header; reject `alg:none`
- RS256 (asymmetric) is preferred over HS256 for services: immune to secret brute-forcing and supports key rotation without shared secret
- Store JWTs in `HttpOnly; Secure; SameSite=Strict` cookies to prevent XSS extraction; add CSRF tokens for state-changing requests
- Client-side JWT decoding for UI is fine; authorization enforcement must always be server-side with signature verification
- Set short expiry (`exp`) on access tokens (15 minutes) and use refresh tokens in secure storage for renewal

### Follow-up Prompts
- How would you implement token refresh with access token (short-lived, in-memory) and refresh token (long-lived, HttpOnly cookie) without causing race conditions on concurrent requests?
- What is the JWKS (JSON Web Key Set) endpoint and how does it enable key rotation without breaking existing valid tokens?
- How does the `SameSite=Lax` vs `SameSite=Strict` cookie attribute differ in terms of CSRF protection and what are the UX tradeoffs?

### Difficulty: advanced
### Tags: security, JWT, authentication, algorithm-confusion, XSS, CSRF, HttpOnly-cookie

---

## Q12: How Do You Use the Web Crypto API for Secure Client-Side Cryptography?

### Question
Describe the Web Crypto API, what operations it supports, when client-side cryptography is appropriate, and provide examples of secure key generation and encryption.

### Model Answer
The Web Crypto API (`window.crypto.subtle`) provides browser-native cryptographic primitives operating in a secure context (HTTPS). Unlike JavaScript cryptography libraries (CryptoJS, Forge), the Web Crypto API uses native implementations that are not exposed to JavaScript's memory model and are significantly harder to side-channel attack. The `subtle` naming is intentional — it signals that the API is powerful but easy to misuse.

The API supports: key generation (`generateKey`), key derivation (`deriveKey`, `deriveBits` — PBKDF2, HKDF, ECDH), key import/export (`importKey`, `exportKey`), encryption/decryption (`encrypt`, `decrypt` — AES-GCM, AES-CBC, RSA-OAEP), signing/verification (`sign`, `verify` — HMAC, ECDSA, RSA-PSS), and hashing (`digest` — SHA-256, SHA-384, SHA-512). All operations are asynchronous and return Promises. The `CryptoKey` object wraps key material and cannot be serialized to JavaScript directly — you must call `exportKey` explicitly, which can be prevented with `extractable: false`.

A common correct use case is end-to-end encrypted messaging. Each user generates an ECDH key pair: `await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey'])`. The public key is exported and shared with the server; the private key stays in the browser (non-extractable). When Alice sends a message to Bob, she derives a shared symmetric key using `deriveKey` with her private key and Bob's public key (ECDH exchange). She encrypts the message with AES-GCM: `await crypto.subtle.encrypt({ name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) }, sharedKey, messageBytes)`. The IV (initialization vector) must be unique per encryption — use `crypto.getRandomValues` to generate it, and transmit it alongside the ciphertext (IVs are not secret). Bob reverses the process using his private key and Alice's public key to derive the same shared key.

Password-based encryption requires key derivation to stretch the password. PBKDF2 is available in Web Crypto: derive a key from a user's password with a high iteration count (at least 100,000 for PBKDF2-SHA-256) and a random salt (generated with `getRandomValues`, stored alongside the encrypted data). This makes offline brute-force attacks expensive. Argon2 (memory-hard, preferred for password hashing) is not available in Web Crypto — for password authentication, use server-side Argon2; for client-side encryption keyed from a password, PBKDF2 is the available option.

When is client-side cryptography appropriate? For E2E encryption where the server must never see plaintext (messaging apps, password managers, encrypted notes). For signing operations where the private key must never leave the device. For certificate-based operations. It is NOT appropriate as a substitute for server-side authentication (never use client-side password hashing as the authentication mechanism — the hash becomes the password), and NOT for security-sensitive operations where the server must be the authority. The browser is an untrusted environment — if your application is compromised via XSS, the attacker can intercept plaintext before encryption or keys after derivation. Cryptography in the browser protects against server-side breaches, not against compromised clients.

### Key Points
- Web Crypto API (`crypto.subtle`) provides native cryptographic primitives; all operations are async, resistant to side-channel attacks compared to JS libraries
- Use `crypto.getRandomValues()` for all randomness (IVs, salts, nonces) — never `Math.random()`
- AES-GCM with a unique 12-byte IV per encryption is the standard symmetric cipher; ECDH for key exchange; PBKDF2 for password-based key derivation
- `extractable: false` on `CryptoKey` prevents key material from being exported — use for private keys that should never leave the browser
- Client-side crypto protects against server-side breaches (E2E), not against XSS compromising the browser environment

### Follow-up Prompts
- How would you persist a non-extractable `CryptoKey` across browser sessions without being able to export the raw key material?
- How does AES-GCM authenticated encryption prevent ciphertext tampering and what happens if you decrypt with a wrong key or corrupted ciphertext?
- What is the difference between `deriveKey` and `deriveBits` in Web Crypto and when would you use each?

### Difficulty: advanced
### Tags: security, Web-Crypto, AES-GCM, ECDH, PBKDF2, E2E-encryption, cryptography

---

## Q13: How Does iframe Sandboxing Work and What Are the Security Implications?

### Question
Explain the `sandbox` attribute on `<iframe>` elements, what capabilities it restricts, when to use specific permissions, and how it interacts with CSP and cross-origin policies.

### Model Answer
The `sandbox` attribute on `<iframe>` enables a fine-grained permission model for embedded content, restricting potentially dangerous capabilities that third-party or untrusted content might otherwise exercise. When `sandbox` is present without any value (`<iframe sandbox>`), it applies the most restrictive set of restrictions: no scripts, no forms, no popups, no plugins, no top-level navigation, no same-origin access — the iframe is treated as having a unique opaque origin regardless of its actual origin.

The sandbox restrictions, when fully applied, include: blocking JavaScript execution (`allow-scripts` re-enables it), blocking form submission (`allow-forms`), blocking window opening and popups (`allow-popups`), preventing the frame from navigating the top-level browsing context (`allow-top-navigation`), treating the origin as unique/opaque (`allow-same-origin`), preventing pointer lock (`allow-pointer-lock`), and blocking modals like `alert()` and `confirm()` (`allow-modals`). Each of these has an `allow-*` token that lifts the specific restriction.

A critical security pitfall is the combination of `allow-scripts` and `allow-same-origin`. If both are present and the iframe loads same-origin content, the sandboxed page's JavaScript can access the parent frame's DOM (same-origin same browsing context) and can modify its own sandbox attributes via `document.domain` or by navigating to a page that removes the sandbox. This is documented by the spec: "Note: Setting both the allow-scripts and allow-same-origin keywords together allows the embedded page to simply remove the sandbox attribute and then reload itself, effectively breaking out of the sandbox entirely." Never combine these two permissions for untrusted content.

Common practical use cases with correct permission sets: User-generated HTML/preview (untrusted content, render visually): `sandbox="allow-same-origin"` — allows CSS and images but no scripts. OAuth popup flow embedded in iframe: `sandbox="allow-scripts allow-forms allow-popups allow-same-origin"` — allows the auth flow to work. Third-party widget (trusted but isolated): `sandbox="allow-scripts allow-same-origin allow-popups"`. Payment iframe (Stripe, Braintree): these typically use their own domain in the `src`, so `allow-same-origin` would not break sandbox if the parent is on a different origin — the vendor's sandbox requirements are documented.

iframes interact with Content Security Policy. The parent page's CSP `frame-src` or `child-src` directive controls which origins can be loaded in iframes. This is independent of the sandbox attribute. Both layers work together: CSP controls which origins appear, sandbox controls what loaded content can do. For maximum isolation of third-party content, combine `frame-src` restrictions (only allow the specific third-party origin) with appropriate sandbox permissions (no more than needed).

The `allow` attribute for Permissions Policy (formerly Feature Policy) is a separate mechanism on iframes that controls access to browser features like camera, geolocation, fullscreen, and payment. `<iframe allow="payment; fullscreen">` grants these capabilities explicitly; by default, cross-origin iframes cannot access most sensitive APIs. This is distinct from `sandbox` — both should be applied for comprehensive iframe security.

### Key Points
- `<iframe sandbox>` without values applies maximum restriction: no scripts, no forms, no same-origin access, unique opaque origin
- Never combine `allow-scripts` + `allow-same-origin` for untrusted content — the combination allows sandbox escape
- Use `frame-src` CSP directive to control which origins can appear in iframes, complementing sandbox attribute restrictions
- The `allow` attribute controls Permissions Policy (camera, geolocation, payment) — separate from `sandbox`, both should be applied
- Minimal permission principle: grant only the specific `allow-*` tokens required for the iframe's function, nothing more

### Follow-up Prompts
- How does `postMessage` work for secure communication between a parent page and a sandboxed iframe, and what origin validation is required?
- How would you use `sandbox` to safely render user-generated HTML in an iframe preview without allowing script execution or form submission?
- What is `credentialless` iframe mode (COEP credentialless) and how does it simplify cross-origin isolation requirements?

### Difficulty: advanced
### Tags: security, iframe, sandbox, CSP, cross-origin, permissions-policy, XSS

---

## Q14: What is the Trusted Types API and How Does It Prevent DOM XSS?

### Question
Explain the Trusted Types API, the category of DOM XSS vulnerabilities it prevents, how to implement a Trusted Types policy, and how to enforce it via CSP.

### Model Answer
DOM-based XSS occurs when JavaScript takes attacker-controlled data (from URL parameters, `localStorage`, `postMessage`) and writes it to a dangerous DOM sink — properties and methods that interpret strings as HTML or code: `innerHTML`, `outerHTML`, `document.write()`, `eval()`, `setTimeout(string)`, `element.href` (for `javascript:` URLs). Unlike reflected or stored XSS where the server injects malicious content, DOM XSS happens entirely in the browser via JavaScript. Static analysis can find some occurrences, but maintaining a codebase free of dangerous sinks as it grows is difficult without enforcement.

The Trusted Types API (Chrome 83+) enforces that dangerous DOM sinks only accept `TrustedHTML`, `TrustedScript`, or `TrustedScriptURL` objects — not raw strings. When Trusted Types is enforced (via CSP), any attempt to pass a raw string to `innerHTML` throws a `TypeError`. This converts a class of runtime vulnerabilities into compile-time-visible errors during development and blocks runtime exploitation in production.

A Trusted Types policy is created with `trustedTypes.createPolicy(name, rules)`. The `rules` object has sanitizer functions: `createHTML(string)`, `createScript(string)`, `createScriptURL(string)`. These functions receive untrusted input and must return sanitized output. The canonical implementation uses DOMPurify inside the policy: `createPolicy('app', { createHTML: (input) => DOMPurify.sanitize(input) })`. The policy returns a `TrustedHTML` object that `innerHTML` will accept. Crucially, the policy centralizes all HTML sanitization in one place — you audit the policy, not every `innerHTML` call across the codebase.

Enforcement is via CSP: `Content-Security-Policy: require-trusted-types-for 'script'` enforces that all script-injectable sinks require Trusted Types objects. `trusted-types app dompurify` (or `trusted-types *` for migration) specifies allowed policy names. The `trusted-types` directive controls which policies can be created — use a named allowlist in production to prevent attacker-created policies.

Migration of an existing codebase to Trusted Types is done incrementally. Start with `Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; report-uri /csp-violations` to log violations without blocking. Fix violations one by one: each `innerHTML = string` becomes `innerHTML = appPolicy.createHTML(string)`. Framework libraries are the largest source of violations — Angular, React (via the DOM adapter), and Lit have Trusted Types compatibility built in or via adapters. Third-party libraries that use dangerous sinks require either wrapping in a policy or vendor-specific fixes.

The Google security team used Trusted Types to eliminate DOM XSS from all Google products. The key insight is that the API converts a distributed security problem (every developer must remember to sanitize) into a centralized policy problem (a small number of policy implementations that can be audited thoroughly). The `default` policy (`trustedTypes.createPolicy('default', ...)`) acts as a catch-all for violations not handled by named policies during migration.

### Key Points
- Trusted Types enforces that DOM XSS sinks (`innerHTML`, `eval`, etc.) only accept `TrustedHTML`/`TrustedScript` objects, not raw strings
- Create a named policy with `trustedTypes.createPolicy('app', { createHTML: (s) => DOMPurify.sanitize(s) })` to produce accepted types
- Enforce via CSP: `require-trusted-types-for 'script'`; use `Content-Security-Policy-Report-Only` first for incremental migration
- Centralizes all HTML sanitization into auditable policy implementations rather than distributed `innerHTML` calls
- Major frameworks (Angular, React, Lit) have Trusted Types compatibility; third-party library violations are the main migration challenge

### Follow-up Prompts
- How does DOMPurify integrate with Trusted Types and what is the `RETURN_TRUSTED_TYPE` option?
- How would you configure a webpack or Vite build to lint for `innerHTML` assignments that bypass Trusted Types during development?
- What is the `default` Trusted Types policy and why is using it in production a security risk?

### Difficulty: advanced
### Tags: security, Trusted-Types, DOM-XSS, CSP, DOMPurify, innerHTML, sanitization

---

## Q15: What is the Reporting API and How Do You Use It for Security Policy Monitoring?

### Question
Explain the Reporting API, how it collects CSP, COOP, COEP, and deprecation violations, and how you would build a reporting pipeline for production security monitoring.

### Model Answer
The Reporting API is a browser mechanism for delivering structured violation and deprecation reports to an endpoint you control, as a replacement for the older `report-uri` CSP directive. It provides a unified reporting channel for multiple report types: CSP violations (`csp-violation`), Cross-Origin Opener Policy violations (`coop`), Cross-Origin Embedder Policy violations (`coep`), network errors (`network-error`), deprecations, interventions, and crash reports. The browser queues reports and sends them as JSON POST requests, batching multiple reports efficiently rather than sending one request per violation.

The Reporting API is configured via the `Reporting-Endpoints` HTTP header: `Reporting-Endpoints: default="https://example.com/reports"`. Legacy browsers use `report-uri` on CSP; modern browsers support both. CSP is then configured with `report-to default` to route CSP violations to the named endpoint. COOP and COEP headers similarly support `report-to` directives.

CSP violation reports are the most immediately useful for security monitoring. A CSP violation report contains: `blocked-uri` (what was blocked), `violated-directive` (which CSP rule triggered), `document-uri` (which page), `source-file` and `line-number` (where in the code). In Report-Only mode (`Content-Security-Policy-Report-Only`), violations are reported but not blocked — this enables CSP rollout without breaking functionality. A production CSP monitoring workflow: deploy Report-Only CSP, collect violations for 2-4 weeks, analyze blocked URIs to identify legitimate resources that need to be allowlisted, then switch to enforcing mode with a clean policy.

COEP (Cross-Origin Embedder Policy) violations are reported when your page loads cross-origin resources without proper CORS headers when `require-corp` is set. These are essential for debugging cross-origin isolation issues before enabling `SharedArrayBuffer` (required for Atomics, used by Partytown and Emscripten WASM). Reviewing COEP reports identifies which third-party resources need CORP headers added (or CORS configured) before cross-origin isolation can be enforced.

Building a reporting pipeline: the endpoint receives JSON POST requests with an array of reports. Parse and route each report by `type`. Store raw reports in a database (time-series or document store). Build a dashboard showing violation frequency by directive, blocked origin, and page. Alert on spikes in CSP violations (potential injection attack) or novel blocked URIs (possible new attack vector or broken deploy). Filter out known false positives (browser extensions, ISP injection, certain bot user agents) that generate noise.

The Reporting API's network transport has reliability characteristics: browsers batch and retry reports, but reports may be lost if the browser closes before delivery. For critical security events (CSP violations in production), supplement with server-side security logging. The `report-to` and `Reporting-Endpoints` approach is newer and better, but `report-uri` has broader browser support and should be provided as a fallback during the transition period.

### Key Points
- Reporting API provides a unified endpoint for CSP violations, COOP/COEP violations, deprecations, and network errors via `Reporting-Endpoints` header
- CSP Report-Only mode (`Content-Security-Policy-Report-Only`) collects violations without blocking, enabling safe policy rollout
- COEP violation reports identify cross-origin resources blocking cross-origin isolation deployment (required for SharedArrayBuffer/Atomics)
- Build a violation dashboard: store reports in time-series DB, alert on spikes (potential attacks) and novel blocked URIs
- Provide both `report-to` (modern) and `report-uri` (legacy fallback) directives for broad browser coverage

### Follow-up Prompts
- How would you build a CSP that protects against XSS while allowing Google Analytics, Stripe, and Intercom — which often require `unsafe-inline`?
- What is the difference between `report-uri` and `report-to` in CSP directives, and which browsers support which?
- How would you use CSP violation reports to detect a supply-chain attack where an npm package starts injecting scripts?

### Difficulty: advanced
### Tags: security, Reporting-API, CSP, COEP, COOP, violation-reporting, monitoring

---

## Q16: What is the Permissions Policy Header and How Do You Use It?

### Question
Explain the Permissions Policy HTTP header (formerly Feature Policy), which browser features it controls, how it applies to iframes, and how to implement a secure policy for a production web application.

### Model Answer
The Permissions Policy header (renamed from Feature Policy in 2020) is an HTTP header that allows server operators to selectively enable, disable, or restrict powerful browser features for a document and its embedded iframes. Unlike CSP which primarily prevents code injection, Permissions Policy controls which browser capabilities are accessible — preventing misuse of features like the camera, geolocation, or payment APIs even if the page or an embedded third party tries to use them.

The header syntax: `Permissions-Policy: camera=(), microphone=(), geolocation=(self), fullscreen=(self "https://player.example.com")`. The `()` empty allowlist disables the feature entirely (for the page and all its iframes). `(self)` allows only the same-origin document to use the feature. `(self "https://trusted.example.com")` allows the current origin and a specific third-party origin. `*` (all origins) and the absence of a directive (default behavior) vary by feature — some features default to `*` (allowed everywhere), others to `(self)` or `()` (blocked by default in cross-origin contexts).

For a production web application that does not use camera/microphone/geolocation, blocking these features via Permissions Policy adds defense-in-depth against supply-chain attacks. If a compromised npm package or injected script tries to access the camera, the Permissions Policy blocks it at the browser level, independent of JavaScript sandboxing. The header: `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self), usb=(), serial=(), bluetooth=()` — a restrictive baseline that disables sensitive hardware and network APIs.

Permissions Policy for iframes works bidirectionally. An iframe only has access to a feature if both the parent's Permissions Policy grants the iframe the feature AND the iframe's `allow` attribute grants it. The iframe's `allow` attribute is a delegation mechanism: the parent can only grant features it itself has access to. `<iframe allow="payment; fullscreen">` delegates payment and fullscreen to the iframe, but only if the parent page is allowed those features. This layered model means an iframe cannot gain more permissions than the parent.

The integration with cross-origin isolation is worth noting. Some features (SharedArrayBuffer, high-resolution timers, `performance.measureUserAgentSpecificMemory()`) require cross-origin isolation (`COOP: same-origin` + `COEP: require-corp`). Permissions Policy controls a different dimension: which features are allowed, not whether the execution environment is isolated. Both are needed for secure, capable applications.

Auditing your current Permissions Policy: Chrome DevTools Application tab shows the Permissions Policy in effect. The `document.featurePolicy.allowedFeatures()` API (deprecated but available) lists allowed features. For a comprehensive audit, test each sensitive feature by attempting to use it and observing whether it is blocked. The Reporting API can be used with Permissions Policy — violations are reported when a blocked feature is attempted, useful for monitoring third-party script behavior.

### Key Points
- Permissions Policy header restricts browser capabilities (camera, geolocation, payment, USB) independent of CSP — defense-in-depth against supply-chain attacks
- Syntax: `feature=()` blocks entirely, `feature=(self)` allows same-origin, `feature=(self "https://trusted.com")` allows specific origins
- iframes require both parent Permissions Policy grant AND iframe `allow` attribute — delegation cannot exceed parent's own permissions
- Apply a restrictive default: disable all hardware APIs (camera, mic, USB, Bluetooth) unless actively needed; enable only for specific trusted origins
- Use Reporting API with Permissions Policy violations to detect if embedded third-party scripts attempt to use blocked features

### Follow-up Prompts
- How would you configure Permissions Policy for a video conferencing feature that needs camera and microphone access only on specific routes?
- How does the `document-domain` Permissions Policy feature relate to the deprecation of `document.domain` setter and what migration is needed?
- What is the `cross-origin-isolated` feature in Permissions Policy and when is it required?

### Difficulty: advanced
### Tags: security, Permissions-Policy, Feature-Policy, iframe, supply-chain, browser-features, CSP

---

## Q17: Explain COEP, COOP, and CORP Headers and Their Relationship to Cross-Origin Isolation

### Question
Describe the COEP, COOP, and CORP HTTP headers, what cross-origin isolation is, why it is required for certain browser APIs, and what the deployment challenges are.

### Model Answer
Cross-origin isolation is a browser security state achieved by deploying two specific headers together: Cross-Origin-Opener-Policy (COOP) and Cross-Origin-Embedder-Policy (COEP). When a page is cross-origin isolated, it gains access to powerful APIs that were restricted due to the Spectre CPU side-channel attack — specifically, `SharedArrayBuffer`, `performance.measureUserAgentSpecificMemory()`, and high-resolution timers. The browser restricts these APIs because they could be used to build timing attacks exploiting speculative execution vulnerabilities in modern CPUs.

COOP (`Cross-Origin-Opener-Policy: same-origin`) controls the browsing context group. When a page opens a popup (`window.open()`) or is opened as a popup, normally the opener and opened window share the same browsing context group, allowing `window.opener` access. COOP same-origin isolates the page in its own browsing context group: cross-origin windows opened from it cannot access `window.opener`, and it cannot access theirs. This prevents a malicious cross-origin popup from sharing the same process and exploiting memory. The result is that cross-origin windows are process-isolated.

COEP (`Cross-Origin-Embedder-Policy: require-corp`) requires that all subresources loaded by the page have either explicit CORS permission (`crossorigin` attribute + CORS headers) or a `Cross-Origin-Resource-Policy` header. If a subresource lacks these, loading it fails. This ensures every resource on the page has opted in to being embedded, preventing a malicious page from using the isolation context to exfiltrate cross-origin resource data via timing attacks.

CORP (`Cross-Origin-Resource-Policy`) is a response header set on resources, not the page. It declares who may embed this resource: `same-origin` (only same-origin pages), `same-site` (same-site pages), or `cross-origin` (any origin). For a page to achieve COEP, all its cross-origin subresources must have `CORP: cross-origin` or CORS headers. This is the primary deployment challenge — third-party resources (CDN assets, fonts, analytics images, embedded media) often lack CORP headers, causing them to fail loading under COEP.

The deployment challenges are significant. You must audit all resources loaded by your page. First-party resources on your CDN: add `Cross-Origin-Resource-Policy: same-site` or `cross-origin` as appropriate. Third-party resources (Google Fonts, Cloudflare Analytics, Stripe.js, YouTube embeds): many do not have CORP headers, and you cannot add them yourself. Strategies: use `COEP: credentialless` (Chrome 96+) which allows cross-origin resources to load without credentials and without CORP — a more permissive mode that still achieves cross-origin isolation. Alternatively, proxy cross-origin resources through your own origin. Or use Reporting API to collect COEP violation reports and systematically work through each blocked resource.

The primary use case for cross-origin isolation in frontends today is Partytown (needs SharedArrayBuffer for Atomics.wait()) and WebAssembly applications using threads or Atomics. If you are not using these, cross-origin isolation may not be worth the significant deployment complexity.

### Key Points
- Cross-origin isolation requires both `COOP: same-origin` and `COEP: require-corp` headers to unlock `SharedArrayBuffer` and high-resolution timers
- COOP isolates the browsing context group (prevents cross-origin `window.opener` access); COEP requires all subresources to opt-in via CORP or CORS
- CORP is set on resources themselves (`Cross-Origin-Resource-Policy: cross-origin`) to allow cross-origin embedding — the main deployment challenge
- `COEP: credentialless` (Chrome 96+) provides a less strict path to cross-origin isolation without requiring CORP on all third-party resources
- Use COEP Reporting API violations to audit which resources block cross-origin isolation before enforcing

### Follow-up Prompts
- How does `COEP: credentialless` differ from `COEP: require-corp` and what are the security tradeoffs?
- How would you enable cross-origin isolation on a Next.js application deployed on Vercel that embeds Stripe and YouTube iframes?
- Why does Partytown require `SharedArrayBuffer` and therefore cross-origin isolation — what does it use `Atomics.wait()` for?

### Difficulty: advanced
### Tags: security, COEP, COOP, CORP, cross-origin-isolation, SharedArrayBuffer, Spectre, headers

---

## Q18: How Do You Prevent Prototype Pollution in JavaScript Applications?

### Question
Explain prototype pollution — what it is, how it leads to security vulnerabilities, common vectors in frontend code, and defensive programming techniques to prevent it.

### Model Answer
Prototype pollution is a vulnerability where an attacker can modify the prototype of JavaScript's base objects (`Object.prototype`, `Array.prototype`) through seemingly innocuous operations, affecting all subsequent objects in the application. Because JavaScript uses prototype-based inheritance, pollution of `Object.prototype` propagates properties to every object created with `{}` literal syntax, enabling logic bypass, property injection, and in server-side contexts, remote code execution.

The classic pollution vector is a recursive merge or deep clone function that does not validate keys: `function merge(target, source) { for (let key in source) { if (typeof source[key] === 'object') merge(target[key], source[key]); else target[key] = source[key]; } }`. If `source` is `{"__proto__": {"isAdmin": true}}`, the recursive merge writes to `Object.prototype`, making `({}).isAdmin` return `true` for every subsequent object in the application. This bypasses authorization checks like `if (user.isAdmin)` even for non-admin users.

Common vectors in frontend code include: `JSON.parse()` of untrusted input followed by deep merging into application state; lodash's `_.merge()` or `_.set()` (patched in later versions, but old versions are prevalent); query string parsers that create nested objects from `?a[__proto__][admin]=1`; and Redux state mergers that recursively combine state and action payloads without key validation.

Prevention starts with key validation in merge functions. When processing user-controlled keys, block dangerous property names: `if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;`. This is the fix lodash and other libraries applied in their patches. Object.create(null) creates objects with no prototype (`{}.__proto__` is `Object.prototype`; `Object.create(null).__proto__` is `undefined`), making them immune to prototype pollution — useful for dictionaries/maps: `const lookup = Object.create(null)`.

`Object.freeze(Object.prototype)` in application bootstrap code prevents any modification to `Object.prototype` — any attempt throws a TypeError in strict mode. This is a belt-and-suspenders defense but may break third-party libraries that legitimately extend prototypes (polyfills). A less blunt approach is `Object.seal(Object.prototype)` which prevents new property addition but allows modification of existing properties.

The `Map` data structure is the best replacement for `{}` as a key-value store when keys are user-controlled, because `Map` does not use prototype lookup for key access — `map.get('__proto__')` just returns the stored value, never the prototype chain. For JSON schema validation at ingestion points (before merging user data into application state), libraries like Ajv (with strict mode) or Zod reject unexpected properties including `__proto__`.

Detection: npm audit and Snyk identify known prototype pollution vulnerabilities in dependencies. During testing, `expect(({}).polluted).toBeUndefined()` after processing user-controlled input catches pollution. Google's `--frozen-intrinsics` V8 flag (Node.js only) freezes all built-in prototypes at startup.

### Key Points
- Prototype pollution occurs when user-controlled keys like `__proto__` propagate to `Object.prototype` via unguarded deep merge operations
- Validate keys in merge functions: skip `__proto__`, `constructor`, `prototype` keys; check lodash/other library versions for patches
- `Object.create(null)` creates prototype-free objects immune to pollution — use for user-controlled key dictionaries
- `Object.freeze(Object.prototype)` at application bootstrap prevents all modifications but may break polyfills
- Prefer `Map` over `{}` for user-controlled key-value storage; validate JSON schema at ingestion points with Zod/Ajv

### Follow-up Prompts
- How would you write a safe deep clone function that is immune to prototype pollution?
- What is the difference between prototype pollution and property injection — can property injection happen without polluting the prototype?
- How does `__proto__` pollution in the browser differ from Node.js in terms of impact and exploitability?

### Difficulty: advanced
### Tags: security, prototype-pollution, JavaScript, deep-merge, Object.prototype, XSS, supply-chain

---

## Q19: What is ReDoS and How Do You Prevent Regular Expression Denial of Service?

### Question
Explain ReDoS (Regular Expression Denial of Service), what makes a regex vulnerable, how to detect and fix vulnerable patterns, and what tooling helps prevent them.

### Model Answer
ReDoS (Regular Expression Denial of Service) is a vulnerability where specially crafted input causes a regular expression to take exponential time to evaluate, hanging or crashing the JavaScript engine. While primarily a server-side concern in Node.js (a single ReDoS can block the entire event loop), it can also cause browser UI freezes and, in service workers, can deny service to page functionality.

The root cause is catastrophic backtracking in regex engines that use backtracking algorithms (NFA-based, like most JavaScript regex engines). Catastrophic backtracking occurs with ambiguous regex patterns where multiple paths through the automaton can match the same input. The classic vulnerable pattern is `(a+)+` — the inner `a+` and outer `+` can both match the same characters in exponentially many ways. Input like `"aaaaaaaaab"` (n `a`s followed by a non-matching character) forces the engine to try every combination of groupings before failing. For n=30, this can take seconds; for n=50, minutes.

Vulnerable pattern categories: alternation with overlapping options `(a|aa)+`, nested quantifiers `(a+)+`, `(a*)*`, patterns where the quantifier and alternation can both consume the same characters. The general rule: if the same characters can be matched by multiple alternatives or nested repetitions, the pattern may be vulnerable.

Detection tools: `vuln-regex-detector`, `safe-regex` (npm package), and `recheck` analyze regex patterns for ReDoS potential. The `recheck` library is particularly comprehensive and integrates with ESLint via `eslint-plugin-regexp` which flags vulnerable quantifier patterns. OWASP maintains a list of vulnerable regex patterns. Snyk's vulnerability database tracks ReDoS CVEs in popular libraries — lodash, moment.js, and validator.js have all had ReDoS vulnerabilities in specific regex patterns.

Prevention strategies: First, avoid complex nested quantifiers. Rewrite `(a+)+` as `a+` (equivalent without backtracking). Use possessive quantifiers or atomic groups where supported — JavaScript does not natively support possessive quantifiers yet (they are in the TC39 proposal stage), but the `re2` library (available in Node.js, not browsers) uses a linear-time RE2 algorithm that cannot exhibit catastrophic backtracking. Second, bound input length before regex evaluation: `if (input.length > 1000) throw new Error('Input too long')`. Third, use linear-time alternatives where possible: for email validation, a simple `input.includes('@')` + basic structural check beats a complex RFC 5321 regex for the common case. Full RFC-compliant email regex patterns are notorious ReDoS vectors.

For user-input validation in the browser, the combination of input length limits and safe regex patterns provides adequate protection. The `safe-regex` package can be integrated into your build process to scan all regex literals in the codebase. For Node.js backends, running the event loop in a Worker thread for regex-heavy operations (like input validation) isolates ReDoS impact from the main event loop.

### Key Points
- ReDoS causes exponential regex evaluation time via catastrophic backtracking with ambiguous patterns (nested quantifiers, overlapping alternation)
- Vulnerable pattern fingerprints: `(a+)+`, `(a|aa)+`, `(a*)*` — any pattern where multiple sub-expressions can match the same characters
- Use `eslint-plugin-regexp` and `safe-regex` to detect vulnerable patterns in CI; check dependencies via Snyk for ReDoS CVEs
- Input length limits before regex evaluation bound worst-case execution time regardless of pattern vulnerability
- `re2` (Node.js) uses linear-time regex without backtracking — use for server-side validation of user-controlled input with complex patterns

### Follow-up Prompts
- How would you rewrite a vulnerable email validation regex to be ReDoS-safe without losing validation accuracy?
- What is the difference between NFA and DFA regex engines and why does the NFA approach enable catastrophic backtracking?
- How does `eslint-plugin-regexp` detect vulnerable quantifier patterns statically?

### Difficulty: advanced
### Tags: security, ReDoS, regex, denial-of-service, performance, input-validation, ESLint

---

## Q20: How Do You Implement Secure Frontend Logging Without Leaking Sensitive Data?

### Question
Describe the security and privacy risks of frontend logging, what data must never appear in logs, and how to architect a secure logging system that provides useful debugging information without creating exposure.

### Model Answer
Frontend logging serves legitimate purposes: debugging production errors, tracing user flows for support, monitoring performance anomalies, and auditing security events. However, careless logging creates serious risks: PII in logs violates GDPR/CCPA, credentials or tokens in logs enable account takeover if logs are exfiltrated, and detailed error messages leak application internals to potential attackers.

The first principle is data classification. Before sending any data to a logging endpoint, classify it: PII (names, emails, addresses, phone numbers, IP addresses in some jurisdictions), sensitive identifiers (user IDs should be pseudonymous in logs — use session IDs or hashed user IDs rather than raw user IDs), financial data (card numbers, bank accounts — never log), authentication data (passwords, tokens, session cookies — never log, even partially), and health or other special-category data. Any data in these categories must be redacted or excluded from logs.

Structured logging with a sanitization layer is the architectural solution. Instead of `console.log({ user, formData })`, all log calls go through a `logger.info({ event, ...sanitizedContext })` function. The logger applies a sanitization pass before transmission: strip known-sensitive field names (`password`, `token`, `secret`, `authorization`, `credit_card`, `ssn`, any field matching `/key|secret|token|auth|pass|credential/i`), truncate long strings (URLs longer than 200 characters often contain query parameters with sensitive data), and redact values matching patterns (email addresses, credit card number patterns, JWT format).

Error logging requires special care. `Error.stack` traces are useful for debugging but may contain file paths, function names, and sometimes variable names that reveal internal architecture. In production, send stack traces server-side where they are logged securely and not exposed to end users. For client-side error monitoring (Sentry, Datadog RUM), configure sensitive data scrubbing: Sentry's `beforeSend` hook allows inspecting and modifying every event before transmission, removing or masking breadcrumb data, request bodies, and user context. Always configure the `denyUrls` pattern to exclude third-party error noise.

URL logging is a frequently overlooked risk. Full URLs often contain sensitive query parameters: `?reset_token=abc123`, `?email=user@example.com`, `?session=xyz`. Log the URL path only, or apply a query parameter allowlist (only log known-safe params). Request/response body logging for API calls must strip authentication headers and response data that may contain user information.

The logging infrastructure itself must be secured. Log endpoints should require authentication (prevent log injection by unauthorized clients). Logs should have retention limits (90 days is common; check your jurisdiction's requirements). Access to logs should be role-based with audit logging of who accessed what. For GDPR compliance, implement log purge on user deletion requests (the right to erasure). Using a structured format (JSON) for all logs enables automated PII scanning tools to audit log contents for accidental sensitive data inclusion.

### Key Points
- Never log passwords, tokens, session cookies, credit card numbers, or health data — not even partially or hashed (redact field entirely)
- Route all logs through a sanitization layer that strips known-sensitive field names and patterns before transmission
- Configure error monitoring SDKs (Sentry `beforeSend`) to scrub sensitive data; log URL paths only, not full URLs with query parameters
- Pseudonymize user identifiers in logs (session ID, hashed user ID) rather than raw user IDs or emails
- Apply data retention limits, role-based log access with audit trail, and log purge for GDPR deletion requests

### Follow-up Prompts
- How would you configure Sentry's `beforeSend` hook to strip all email addresses and JWT tokens from error reports?
- What is log injection and how do you prevent malicious user input from corrupting log structure or injecting fake log entries?
- How would you build a frontend logging pipeline that satisfies GDPR requirements for a service operating in the EU?

### Difficulty: advanced
### Tags: security, logging, PII, GDPR, Sentry, data-classification, privacy, error-monitoring

---
