# Security - Senior Interview Questions
### Language: en

## Q1: Explain XSS — DOM-based, reflected, and stored — and how to prevent each.

### Question
Describe the three types of Cross-Site Scripting (XSS) attacks, how each works technically, the conditions that enable them, and the defense mechanisms specific to each type.

### Model Answer
XSS is an injection attack where an attacker causes a victim's browser to execute malicious JavaScript in the context of a trusted website. The three types differ in how the payload is delivered and persisted.

**Stored XSS (Persistent XSS):** The malicious script is stored on the server (database, comment system, user profile) and served to all users who view that content. Attack flow: attacker submits `<script>alert(document.cookie)</script>` as a comment → server stores it → every user who loads that page executes the script in the context of the site. This is the most dangerous type because it affects all users automatically without requiring each to be tricked individually. Prevention: server-side output encoding/escaping before inserting user content into HTML. Content Security Policy as defense-in-depth. Sanitize stored HTML with a whitelist-based library (DOMPurify) before storage or before rendering.

**Reflected XSS (Non-Persistent XSS):** The payload is in the URL or request and is immediately reflected back in the response without being stored. Attack flow: attacker crafts `https://site.com/search?q=<script>...</script>` → victim clicks the link → server reflects the query parameter into the HTML without encoding → script executes. Prevention: encode all user-controlled data before reflecting it into HTML responses. Never insert request parameters directly into HTML. Set `X-XSS-Protection` header (legacy) — but rely primarily on CSP.

**DOM-based XSS:** The vulnerability exists entirely in client-side JavaScript, with no server involvement in the injection. The payload flows from a source (URL fragment, `document.location`, `localStorage`) to a sink (`innerHTML`, `eval()`, `document.write()`). Example: `document.getElementById('output').innerHTML = location.hash.slice(1)` — the attacker sends `https://site.com/#<img src=x onerror=alert(1)>`. The server never sees the payload. Prevention: never use `innerHTML`, `outerHTML`, `document.write()`, or `eval()` with untrusted input. Use `textContent` instead of `innerHTML` for inserting text. Use `createElement` and `setAttribute` to build DOM programmatically. Sanitize with DOMPurify before using `innerHTML` if HTML insertion is genuinely needed.

**Universal defenses:** Content Security Policy disables inline scripts and restricts script sources. `HttpOnly` cookies prevent JavaScript from reading session cookies even if XSS is exploited. Trusted Types API (Chrome) enforces that all DOM sink assignments go through a sanitization policy — making DOM XSS impossible to introduce accidentally.

### Key Points
- Stored XSS persists in the database and affects all users; reflected XSS is in the URL and requires tricking the victim; DOM XSS is purely client-side
- Always use `textContent` instead of `innerHTML` for text insertion — it never parses HTML
- DOMPurify is the standard library for sanitizing HTML that must be inserted as markup
- Content Security Policy is the most important defense-in-depth measure against all XSS types
- Trusted Types API eliminates entire classes of DOM XSS by enforcing sanitization at the sink level

### Follow-up Prompts
- How does the Trusted Types API work, and how do you configure a Trusted Types policy in React?
- How would you use a CSP `nonce` to allow specific inline scripts while blocking injected scripts?
- How would you audit a large codebase for DOM XSS vulnerabilities — what sources and sinks do you search for?

### Difficulty: advanced
### Tags: XSS, DOM-XSS, stored-XSS, reflected-XSS, DOMPurify, Trusted-Types, security

---

## Q2: How does Content Security Policy (CSP) work and how do you configure it?

### Question
Explain Content Security Policy in depth — how it works, the key directives, how to deploy it without breaking existing functionality, report-only mode, nonces, and common pitfalls.

### Model Answer
Content Security Policy is an HTTP response header (or `<meta>` tag) that instructs the browser to only execute or load resources from explicitly approved sources. It is the most powerful browser-native defense against XSS and data injection attacks.

**How CSP works:** The browser parses the `Content-Security-Policy` header and enforces its directives as it processes the page. Any resource load or script execution that violates the policy is blocked, and optionally reported to a configured endpoint. CSP operates on a whitelist model — everything is blocked unless explicitly allowed.

**Key directives:**
- `default-src 'self'` — fallback for all resource types; `'self'` means same origin only
- `script-src 'self' https://cdn.example.com` — allowed sources for JavaScript; inline scripts blocked unless `'unsafe-inline'` is included (which largely defeats XSS protection)
- `style-src 'self' 'unsafe-inline'` — inline styles are often necessary; including `'unsafe-inline'` here is less dangerous than in `script-src`
- `img-src 'self' data: https:` — image sources; `data:` allows base64 images; `https:` allows any HTTPS image
- `connect-src 'self' https://api.example.com` — restricts fetch/XHR destinations
- `frame-ancestors 'none'` — prevents the page from being embedded in an iframe (clickjacking protection, supersedes X-Frame-Options)
- `report-uri /csp-report` (deprecated) / `report-to` — endpoint for policy violation reports

**Nonces for inline scripts:** A cryptographic nonce (random base64 string, regenerated per request) is added to the CSP header: `script-src 'nonce-{random}'`. The same nonce is added as an attribute to trusted inline scripts: `<script nonce="{random}">...</script>`. The browser only executes inline scripts with a matching nonce. Attackers cannot predict the nonce. This is the correct approach to allowing inline scripts without `'unsafe-inline'`. Next.js and other frameworks support nonce-based CSP generation.

**Hash-based CSP:** For static inline scripts that don't change, compute the SHA-256 hash of the script content and include it in the CSP: `script-src 'sha256-{hash}'`. The browser computes the hash of each inline script and allows it only if it matches an approved hash.

**Report-Only mode for deployment:** Use `Content-Security-Policy-Report-Only` during rollout — the policy is enforced in reporting-only mode (violations are reported but not blocked). This allows you to discover what would break before enforcing the policy. Collect reports for 1-2 weeks before switching to enforcement mode.

**Common pitfalls:** `'unsafe-inline'` in `script-src` negates most XSS protection. `'unsafe-eval'` allows `eval()` and `new Function()` — required by some legacy libraries but should be avoided. Wildcard `*` in `script-src` allows any script source. Not setting `default-src` leaves unspecified resource types unrestricted.

### Key Points
- CSP is a whitelist: everything is blocked unless explicitly approved
- Never use `'unsafe-inline'` in `script-src` — use nonces or hashes instead
- Deploy in `Report-Only` mode first to collect violations before enforcing
- `frame-ancestors 'none'` provides clickjacking protection (replaces X-Frame-Options)
- Nonces must be cryptographically random and unique per request — never reuse or hardcode them

### Follow-up Prompts
- How do you configure CSP for a React SPA served by a CDN, where responses are not dynamically generated?
- How does the `strict-dynamic` directive simplify CSP configuration for applications with many script dependencies?
- How would you collect and analyze CSP violation reports to distinguish real violations from browser extensions?

### Difficulty: advanced
### Tags: CSP, Content-Security-Policy, nonce, XSS-prevention, security-headers

---

## Q3: Explain CORS — how it works and common misconfigurations.

### Question
Describe the CORS mechanism in depth — preflight requests, the relevant headers, the Same-Origin Policy it extends, credentialed requests, and the security implications of common misconfigurations.

### Model Answer
CORS (Cross-Origin Resource Sharing) is a browser security mechanism that controls how web pages in one origin can request resources from a different origin. It extends the Same-Origin Policy to allow controlled cross-origin access.

**Same-Origin Policy (SOP):** Browsers enforce that JavaScript from `https://app.com` can only make requests to `https://app.com` (same protocol, host, and port). Any request to a different origin is blocked by default. CORS is the mechanism for servers to opt-in to cross-origin access.

**Simple vs preflighted requests:** Simple requests (GET, POST with certain content types) are sent directly; the browser checks the response's `Access-Control-Allow-Origin` header. If the header is missing or doesn't match the requesting origin, the response is blocked. Preflighted requests — those using non-simple methods (PUT, DELETE, PATCH) or custom headers — first send an `OPTIONS` request to ask permission. The server responds with allowed methods, headers, and origin. If approved, the actual request proceeds.

**Key CORS headers:**
- `Access-Control-Allow-Origin: https://app.com` — the specific origin allowed (or `*` for public APIs)
- `Access-Control-Allow-Methods: GET, POST, PUT` — allowed HTTP methods
- `Access-Control-Allow-Headers: Content-Type, Authorization` — allowed request headers
- `Access-Control-Max-Age: 86400` — how long preflight response is cached (reduces preflight round trips)
- `Access-Control-Allow-Credentials: true` — allows cookies/auth headers on cross-origin requests

**Credentialed requests:** When a fetch includes `credentials: 'include'`, the browser sends cookies and Authorization headers cross-origin. For this to work, the server must set `Access-Control-Allow-Credentials: true` AND `Access-Control-Allow-Origin` must be a specific origin (not `*`). Using `*` with credentials is rejected by the browser.

**Critical misconfigurations:**

1. **Reflecting the Origin header blindly:** Some servers dynamically set `Access-Control-Allow-Origin` to whatever the request's `Origin` header contains, allowing any origin. This completely defeats CORS and allows any site to make credentialed requests.

2. **Wildcard `*` with credentials:** As noted, browsers reject this. But some developers then reflect the origin to work around it — creating the above vulnerability.

3. **Trusting subdomain matches with regex:** A regex like `/^https:\/\/.*\.example\.com$/` allows `https://evil.example.com` (if attackers can register a subdomain) or may be exploited with `https://notexample.com` depending on the regex.

4. **Allowing null origin:** `Access-Control-Allow-Origin: null` is sent by sandboxed iframes and local files. Never allowlist `null` as it is easily exploited.

5. **Overly broad allowed headers:** Permitting custom headers from any origin can facilitate request forgery.

### Key Points
- CORS is enforced by the browser — it does not protect server-to-server requests
- Never reflect the request's Origin header blindly as the allowed origin
- `Access-Control-Allow-Origin: *` cannot be combined with `Access-Control-Allow-Credentials: true`
- Preflight caching (`Access-Control-Max-Age`) reduces OPTIONS request overhead significantly
- Validate Origin against an explicit allowlist, not a regex, to prevent subdomain bypass attacks

### Follow-up Prompts
- How would you debug a CORS error where the preflight succeeds but the actual request fails?
- How do CORS headers interact with CDN caching — what happens if a CDN caches a response with `Access-Control-Allow-Origin: https://app-a.com` and serves it to a user from `https://app-b.com`?
- How does the browser's CORS enforcement differ for `<img>`, `<script>`, and `fetch()` requests?

### Difficulty: advanced
### Tags: CORS, Same-Origin-Policy, preflight, security, misconfigurations

---

## Q4: How do CSRF tokens and SameSite cookies protect against CSRF attacks?

### Question
Explain Cross-Site Request Forgery (CSRF) — how it works, why cookies alone are insufficient protection, and how CSRF tokens and the SameSite cookie attribute mitigate the attack.

### Model Answer
CSRF (Cross-Site Request Forgery) tricks a user's browser into making an authenticated request to a site they are logged into, without their knowledge. The attack exploits the browser's automatic cookie inclusion on cross-origin requests.

**How CSRF works:** A user is logged into `bank.com` with a session cookie. The user visits `evil.com`, which contains: `<img src="https://bank.com/transfer?to=attacker&amount=1000">` or a hidden form that auto-submits. The browser fetches that URL (or submits the form) and automatically includes the bank.com session cookie. The server sees a valid authenticated request and processes the transfer. The attacker never sees the response — they only need the request to be made.

**Why cookies alone are insufficient:** Browsers send cookies on cross-origin requests that match the cookie's domain. Session cookies were traditionally set without restrictions, making CSRF trivially exploitable.

**CSRF tokens:** The synchronizer token pattern generates a random token per session (or per request for stronger security) and includes it in forms as a hidden field or in headers for AJAX requests. The server validates that the submitted token matches the server-stored token. Since the attacker's site cannot read the token (due to SOP), they cannot forge a valid request. Implementation: the server sets a CSRF token in the session on first load; the frontend reads it from a meta tag or cookie and includes it as `X-CSRF-Token` header on state-changing requests.

**Double Submit Cookie pattern:** A variation where the CSRF token is set as a non-HttpOnly cookie and the client reads it with JavaScript, then sends it as a request header. The server verifies the header matches the cookie. Exploits the fact that cross-origin scripts cannot read cookies, but the legitimate same-origin JavaScript can.

**SameSite cookie attribute** is the modern primary defense:
- `SameSite=Strict`: The cookie is never sent on cross-site requests — not even when following a link from another site. Strong but can break legitimate cross-site flows (clicking a link to your app from an email).
- `SameSite=Lax` (default in modern browsers): The cookie is sent on top-level navigations (clicking a link) but not on subresource requests (img, fetch, XHR) from cross-site contexts. This prevents most CSRF while preserving normal navigation.
- `SameSite=None; Secure`: Explicitly opts in to cross-site cookie sending (required for third-party cookies, OAuth flows). Must use HTTPS.

**Recommended strategy:** Use `SameSite=Lax` (now the browser default) as the primary defense. Add CSRF tokens for state-changing operations as defense-in-depth, particularly for older browser support. `SameSite=Strict` for high-security endpoints like fund transfers.

### Key Points
- CSRF exploits the browser's automatic cookie inclusion on cross-site requests
- `SameSite=Lax` is the modern primary defense — it is now the browser default
- CSRF tokens (synchronizer token pattern) provide defense-in-depth for older browsers
- `SameSite=Strict` blocks cookie sending even on top-level navigation from other sites
- The Double Submit Cookie pattern works without server-side session storage but requires non-HttpOnly cookies

### Follow-up Prompts
- How does `SameSite=Lax` interact with OAuth authorization code flows, and how do you handle the callback redirect?
- If your API uses only JSON (no form submissions), are CSRF tokens still necessary?
- How would you implement CSRF protection for a SPA that uses JWT in localStorage instead of session cookies?

### Difficulty: advanced
### Tags: CSRF, SameSite, cookies, security, CSRF-tokens

---

## Q5: What is Subresource Integrity (SRI) and when should you use it?

### Question
Explain Subresource Integrity — how it works, how to generate and use SRI hashes, its limitations, and when it provides meaningful security versus when it is unnecessary overhead.

### Model Answer
Subresource Integrity (SRI) is a browser security feature that allows you to verify that resources loaded from third-party servers (CDNs, external APIs) have not been tampered with. The browser computes a cryptographic hash of the fetched resource and compares it to a hash you specified — if they differ, the resource is blocked.

**How it works:** Add an `integrity` attribute to `<script>` or `<link>` tags with a hash of the expected file content: `<script src="https://cdn.example.com/library.js" integrity="sha384-{base64hash}" crossorigin="anonymous"></script>`. The `crossorigin="anonymous"` attribute is required for SRI checks on cross-origin resources (it sends a CORS request without credentials). The browser downloads the resource, computes the SHA hash, and compares to the integrity value. If they don't match, the browser refuses to execute the script or apply the stylesheet.

**Hash generation:** Use `openssl dgst -sha384 -binary library.js | openssl base64 -A` or the SRI Hash Generator tool (srihash.org). You can specify multiple hash algorithms for forward compatibility: `integrity="sha384-abc... sha512-xyz..."` — the browser uses the strongest algorithm it supports.

**When SRI provides meaningful security:**
- Loading libraries from public CDNs (jsDelivr, cdnjs, unpkg) — protects against CDN compromise
- Embedding third-party widgets (payment forms, maps) from external hosts
- Including analytics scripts where the provider controls the file
- Protecting against supply chain attacks where a CDN's version of a library is tampered with

**Limitations:**
- SRI only works for resources with a fixed, predictable content. It is incompatible with dynamically generated responses.
- Any resource loaded with a version tag that the CDN updates transparently (e.g., `library@3.x.js`) cannot use SRI — the hash would change.
- SRI protects against CDN compromise but not against attacks on the library's own source code before CDN distribution (e.g., malicious npm publish).
- For resources your own infrastructure serves, SRI adds no security value — your server is already the trust anchor.

**When SRI is unnecessary or impractical:**
- Self-hosted resources (your own CDN/server) — you already control the content
- Dynamically generated API responses
- Resources that are frequently updated (the maintenance cost of updating SRI hashes on every release is high)

**Combining SRI with CSP:** CSP's `require-sri-for` directive (experimental) can require SRI on all scripts or styles. This is a strong defense-in-depth measure for high-security applications.

### Key Points
- SRI verifies the cryptographic integrity of third-party resources — blocks tampered files
- `crossorigin="anonymous"` is required on the element alongside `integrity`
- SRI is most valuable for public CDN-hosted libraries and third-party scripts you do not control
- SRI cannot be used with dynamically generated or frequently updated resources
- Self-hosted resources do not benefit from SRI — trust is already established through your own infrastructure

### Follow-up Prompts
- How would you automate SRI hash updates when a dependency is upgraded in your build pipeline?
- How does SRI interact with CSP's `require-sri-for` directive, and how mature is that feature?
- If a CDN is compromised and starts serving a malicious version of a library, what attack scenarios does SRI prevent and which does it not?

### Difficulty: advanced
### Tags: SRI, subresource-integrity, CDN-security, supply-chain, security

---

## Q6: Explain OAuth 2.0 and OIDC flows for Single-Page Applications.

### Question
Describe OAuth 2.0 and OpenID Connect (OIDC) flows appropriate for SPAs. Explain the Authorization Code flow with PKCE, why the Implicit flow is deprecated, how to handle tokens securely, and the token refresh strategy.

### Model Answer
Authentication and authorization in SPAs requires careful design because SPAs are public clients — they cannot securely store a client secret, as all code is visible in the browser.

**Why the Implicit Flow is deprecated:** The Implicit flow was designed for public clients and returned the access token directly in the URL fragment. This exposed tokens in browser history, server logs, and the `Referer` header. Modern browsers support PKCE, which provides a secure alternative. The OAuth 2.0 Security Best Current Practice document deprecated Implicit flow in 2019.

**Authorization Code Flow with PKCE (Proof Key for Code Exchange):**
1. The SPA generates a random `code_verifier` (high-entropy random string) and computes `code_challenge = BASE64URL(SHA256(code_verifier))`.
2. The SPA redirects to the authorization server with `code_challenge`, `code_challenge_method=S256`, `response_type=code`, `client_id`, `redirect_uri`, and `state` (CSRF protection).
3. The user authenticates and grants consent at the authorization server.
4. The authorization server redirects back to the SPA with an authorization `code` in the URL and the `state` parameter.
5. The SPA verifies `state` matches what was sent (CSRF check), then exchanges the `code` + `code_verifier` for tokens via a back-channel POST to the token endpoint.
6. The authorization server verifies `SHA256(code_verifier) === code_challenge` before issuing tokens.
   PKCE prevents authorization code interception attacks — an attacker who steals the code cannot exchange it without the `code_verifier`.

**Token storage security:** The secure storage debate:
- **Memory only (most secure):** Access token stored in a JavaScript variable. Lost on page refresh. Requires a refresh token mechanism to recover.
- **HttpOnly cookie (recommended for refresh tokens):** The refresh token is stored in an HttpOnly, Secure, SameSite=Strict cookie. JavaScript cannot access it. Used by BFF (Backend for Frontend) pattern.
- **localStorage (convenient, less secure):** Vulnerable to XSS — any script can read it. Only acceptable when XSS is fully mitigated.

**Token refresh strategy:** Access tokens are short-lived (5-15 minutes). Use the refresh token to obtain new access tokens silently. In the BFF pattern, the BFF backend handles token refresh and issues session cookies to the SPA. In a pure SPA, use a silent iframe or `fetch` with the refresh token to get new access tokens before expiry. Track token expiry with `setTimeout` or check `exp` claim before each API call.

**OpenID Connect adds identity:** OIDC extends OAuth 2.0 with an `id_token` (a signed JWT containing user identity claims). Always verify the `id_token` signature against the authorization server's public key (`jwks_uri`). Validate `iss`, `aud`, `exp`, `iat`, and `nonce` claims.

### Key Points
- Always use Authorization Code + PKCE for SPAs — never Implicit flow
- `state` parameter prevents CSRF on the redirect; `nonce` prevents id_token replay attacks
- Store refresh tokens in HttpOnly cookies (via BFF pattern) — not in localStorage
- Access tokens should be short-lived (5-15 min); refresh tokens longer with rotation
- Validate all id_token claims including signature, iss, aud, exp, and nonce

### Follow-up Prompts
- How does the Backend for Frontend (BFF) pattern improve SPA security for token handling?
- How would you implement silent token renewal using an invisible iframe with `prompt=none`?
- How do you handle the case where a user's session expires mid-operation — how do you restore state after re-authentication?

### Difficulty: advanced
### Tags: OAuth2, OIDC, PKCE, SPA-auth, tokens, security

---

## Q7: How do you implement secure cookie handling in web applications?

### Question
Describe the security attributes available for HTTP cookies (`HttpOnly`, `Secure`, `SameSite`, `Domain`, `Path`, `__Host-` prefix), how each protects against specific attacks, and the best practices for session cookie configuration.

### Model Answer
Cookies are a primary attack surface for web applications. Misconfigured cookies are the root cause of session hijacking, CSRF, and XSS-assisted attacks. Each cookie attribute mitigates specific threats.

**`HttpOnly`:** Prevents JavaScript from reading the cookie via `document.cookie`. Critical for session cookies — even if an attacker exploits XSS, they cannot steal the session token. Every session cookie must be HttpOnly. Note: it does not prevent the cookie from being sent on requests (including cross-origin requests if `SameSite` is not set).

**`Secure`:** The cookie is only sent over HTTPS connections, never over HTTP. Prevents session hijacking on networks with a passive eavesdropper (e.g., public Wi-Fi without HSTS). Every session cookie must be Secure. Without Secure, an attacker who can intercept HTTP traffic on a network can steal the cookie.

**`SameSite`:** Controls when cookies are sent on cross-site requests:
- `Strict`: Never sent cross-site — strongest CSRF protection but breaks OAuth redirect flows and email link logins
- `Lax` (default in modern browsers): Sent on top-level navigations but not subresource cross-site requests
- `None; Secure`: Always sent cross-site (third-party cookies) — opt-in that requires Secure

**`Domain` attribute:** If set, the cookie is sent to the specified domain and all subdomains. Avoid setting `Domain` unless subdomain access is required — without it, the cookie is host-only. Setting `Domain=example.com` means `evil.example.com` can access the cookie.

**`Path` attribute:** Restricts the cookie to requests matching the path prefix. Provides weak isolation — JavaScript on other paths on the same origin can still access the cookie if HttpOnly is not set.

**`__Host-` prefix:** The most restrictive cookie prefix. A cookie named `__Host-session` must be: set with `Secure`, have no `Domain` attribute (making it host-only, not subdomain-shareable), and have `Path=/`. This prevents subdomain cookie injection attacks. Example: `Set-Cookie: __Host-session=token; Secure; Path=/; SameSite=Lax; HttpOnly`.

**`__Secure-` prefix:** Requires `Secure` attribute but allows `Domain`. Less restrictive than `__Host-`.

**Session cookie best practice configuration:**
```
Set-Cookie: __Host-session={token};
  Secure;
  HttpOnly;
  SameSite=Lax;
  Path=/;
  Max-Age=3600
```

**Cookie theft mitigations beyond attributes:** Bind sessions to additional factors: client IP, User-Agent fingerprint (weakly), or device token. Regenerate session ID after authentication (prevents session fixation). Implement session timeout and absolute expiry. Use short `Max-Age` for sensitive cookies.

### Key Points
- Every session cookie must have `HttpOnly`, `Secure`, and `SameSite=Lax` at minimum
- `__Host-` prefix enforces host-only, Secure, and Path=/ simultaneously — strongest option
- `SameSite=Strict` breaks OAuth and email login links; `Lax` is the practical default
- Avoid setting the `Domain` attribute unless subdomain access is genuinely required
- Regenerate the session ID after every authentication to prevent session fixation attacks

### Follow-up Prompts
- How do you implement cookie security when your application uses multiple subdomains that need to share authentication?
- How does the browser handle `SameSite=Lax` during an OAuth authorization code redirect — is the session cookie sent?
- What is session fixation, and how does regenerating the session ID after login prevent it?

### Difficulty: advanced
### Tags: cookies, HttpOnly, Secure, SameSite, session-security, __Host-prefix

---

## Q8: How do you prevent clickjacking attacks?

### Question
Explain clickjacking attacks — how they work, what damage they can cause, and the defense mechanisms including `X-Frame-Options`, CSP `frame-ancestors`, and JavaScript frame-busting. Discuss the limitations of each approach.

### Model Answer
Clickjacking (UI redress attack) tricks a user into clicking on a hidden element by overlaying a transparent iframe on top of a decoy website. The victim believes they are clicking a button on the attacker's page, but they are actually clicking a button on the legitimate (overlaid) site.

**Attack mechanics:** Attacker creates `evil.com` with a button labeled "Win a prize!" Overlaid on top is a transparent iframe loading `bank.com/transfer-form`. The iframe is sized and positioned so that the "Confirm Transfer" button on bank.com aligns exactly with the "Win a prize!" button. The victim clicks what they think is the prize button but actually confirms a bank transfer. Sophisticated attacks use multiple layers of iframes and precise positioning.

**Damage potential:** Session actions that don't require typed input: following a user, changing account settings, making purchases (one-click buy), enabling dangerous permissions, liking content, deleting data. Any single-click action on an authenticated page is potentially exploitable.

**`X-Frame-Options` header:** `X-Frame-Options: DENY` — prevents any page from embedding this page in an iframe. `X-Frame-Options: SAMEORIGIN` — allows iframes from the same origin only. This header is widely supported but lacks granularity — you cannot specify specific trusted origins. It is being superseded by CSP `frame-ancestors`.

**CSP `frame-ancestors`:** `Content-Security-Policy: frame-ancestors 'none'` — equivalent to `DENY`. `frame-ancestors 'self'` — equivalent to `SAMEORIGIN`. `frame-ancestors https://trusted.com` — allows only `trusted.com`. This directive supports multiple sources and specific origins, making it more flexible than `X-Frame-Options`. When both are present, `frame-ancestors` takes precedence in browsers that support CSP Level 2.

**JavaScript frame-busting (legacy):** `if (window !== window.top) { window.top.location = window.location; }` — detects if the page is in an iframe and breaks out. Unreliable — attackers can use `sandbox` attribute on the iframe to disable JavaScript (`sandbox` without `allow-scripts`), or use `onbeforeunload` to interfere with the redirect.

**Recommended implementation:** Set both `X-Frame-Options: DENY` (for older browser compatibility) and `Content-Security-Policy: frame-ancestors 'none'` (for modern browsers). Do not rely on JavaScript frame-busting as a primary defense.

**Legitimate iframe embedding:** If your content needs to be embeddable by specific partners, use `frame-ancestors https://trusted-partner.com` in CSP. If using `X-Frame-Options`, it cannot target specific origins — you would need CSP only.

### Key Points
- Clickjacking overlays a transparent iframe to hijack single-click actions on authenticated pages
- `frame-ancestors 'none'` in CSP is the modern standard defense — more flexible than `X-Frame-Options`
- Set both `X-Frame-Options: DENY` and CSP `frame-ancestors` for maximum browser coverage
- JavaScript frame-busting is unreliable — easily bypassed with the `sandbox` attribute on the iframe
- `frame-ancestors` supports specific trusted origins; `X-Frame-Options` cannot

### Follow-up Prompts
- How would you protect a payment widget that must be embedded in third-party sites from clickjacking?
- How does the `sandbox` attribute on an iframe affect clickjacking defenses?
- What additional UX measures (beyond headers) can make clickjacking attacks harder even if the iframe restriction is bypassed?

### Difficulty: advanced
### Tags: clickjacking, X-Frame-Options, CSP, frame-ancestors, UI-redress, security

---

## Q9: How do you manage supply chain security for frontend projects?

### Question
Describe the supply chain security risks in JavaScript projects — malicious npm packages, dependency confusion, compromised maintainers — and the tooling and practices used to mitigate them.

### Model Answer
The JavaScript ecosystem's reliance on npm packages creates a massive supply chain attack surface. The average production web app has hundreds of transitive dependencies, each a potential attack vector.

**Attack vectors:**

**Malicious packages:** Typosquatting attacks register packages with names similar to popular ones (`lod4sh`, `react-dom-core`). Developers accidentally install malicious versions that run install-time scripts (`postinstall` in package.json) to exfiltrate environment variables, steal credentials, or establish persistence. Notable examples: `event-stream` (2018), `colors` and `faker` sabotage (2022), `node-ipc` (2022).

**Compromised maintainer accounts:** npm accounts without 2FA are phished. The attacker publishes a new malicious version of a trusted package. Supply chain attacks via compromised maintainers are particularly dangerous because the package retains its reputation.

**Dependency confusion:** An attacker publishes a malicious package to the public npm registry using the same name as an internal private package. If the install resolution prefers public over private, the malicious version is installed.

**Mitigation tooling:**

**`npm audit` / `yarn audit`:** Scan the dependency tree against the npm Advisory Database for known CVEs. Run in CI; fail on high/critical severity. `npm audit fix` auto-applies safe fixes. Limitation: only catches known vulnerabilities — zero-days and novel malicious packages are missed.

**Lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`):** Lockfiles pin exact versions and checksums of all transitive dependencies. Always commit lockfiles. Run `npm ci` (clean install from lockfile) in CI, never `npm install` (which can update within semver ranges). The lockfile prevents a malicious publisher from serving different code to different installs.

**`npm pack` and integrity hashes:** The lockfile contains `integrity` SHA-512 hashes for every package. `npm ci` verifies these hashes against the downloaded packages — tampered packages are rejected.

**Private registry with allowlisting:** Use a private npm registry (Verdaccio, Artifactory, AWS CodeArtifact) as a proxy. The registry allowlists approved packages and scans new versions before caching. Solves dependency confusion by configuring the registry to prefer private packages.

**Socket.dev:** Analyzes package changes for suspicious behavior patterns (new network calls, new file system access, obfuscated code) before you install them. Can be integrated into CI.

**Renovate / Dependabot:** Automate dependency update PRs. Keeps dependencies current, reducing exposure to known CVEs. Review update PRs carefully — check changelogs.

**`.npmrc` `ignore-scripts=true`:** Prevents running install-time scripts (`postinstall`, `preinstall`). Breaks some legitimate packages (native modules that need compilation) but eliminates the primary exfiltration mechanism of malicious packages.

### Key Points
- Always commit and use lockfiles (`npm ci` in CI); they pin cryptographic hashes of all dependencies
- Run `npm audit` in CI and fail on high/critical severity findings
- Use a private npm registry as a proxy to prevent dependency confusion and enable pre-scanning
- `ignore-scripts=true` in `.npmrc` is a high-value defense against malicious postinstall scripts
- Automate dependency updates with Renovate/Dependabot to stay current on security patches

### Follow-up Prompts
- How would you set up a private npm registry to prevent dependency confusion attacks while still accessing public packages?
- How does `npm audit` differ from socket.dev in what it detects, and why are both needed?
- How would you handle an incident where a critical dependency in your production app is found to contain malicious code?

### Difficulty: advanced
### Tags: supply-chain-security, npm-audit, lockfiles, dependency-confusion, security

---

## Q10: How do you manage secrets in frontend applications?

### Question
Describe the challenge of managing secrets in frontend code — what counts as a secret, why frontend secrets are fundamentally different from backend secrets, and the patterns for handling API keys, tokens, and configuration safely.

### Model Answer
Frontend secrets are fundamentally different from backend secrets: any code or configuration delivered to the browser is visible to the user. There is no truly "secret" data on the frontend. The question is how to minimize exposure and apply appropriate controls for different sensitivity levels.

**What is actually a secret in frontend context:**

**Not secret (can be public):** Public API keys for read-only services (Google Maps embed key restricted by HTTP referrer, Stripe publishable key — which is designed to be public), analytics tracking IDs, CDN URLs, feature flag client-side identifiers. These are meant to be client-side and are scoped appropriately by the provider.

**Genuinely secret (must never be in frontend code):** Private API keys, service account credentials, database connection strings, encryption keys, OAuth client secrets, AWS secret access keys, API keys with write permissions or billing implications.

**Why environment variables in a bundled SPA are not secret:** Build tools like Webpack and Vite replace `process.env.VARIABLE_NAME` references with their literal values at build time. The bundled JavaScript contains the literal string. Anyone who inspects the network tab or the source code can read it. There is no runtime security, even if the variable is not logged or displayed in the UI.

**Correct patterns:**

**Backend for Frontend (BFF) / API proxy:** Move API calls that require secrets to a server-side component. The frontend calls `/api/data`; the BFF calls the third-party API with the secret key and returns processed data. The secret never reaches the browser. This is the definitive solution for any truly secret credential.

**Runtime configuration endpoint:** For non-sensitive configuration that varies by environment (API base URLs, feature flags, service identifiers), serve them from a `/config.json` endpoint or inject them into the HTML at server render time, rather than baking them into the build artifact. This enables environment-specific configuration without environment-specific builds.

**Secrets manager at build time (for build-time use only):** For values needed only during CI/CD (signing keys, code push tokens), use CI secrets management (GitHub Actions secrets, HashiCorp Vault). These are injected as environment variables in the build environment but should never be included in the output bundle.

**Preventing accidental exposure:** Use `truffleHog`, `gitleaks`, or `detect-secrets` as pre-commit hooks to prevent secrets from being committed to the repository. Configure build tooling to fail if high-entropy strings matching secret patterns appear in output bundles. Rotate any key that was accidentally exposed immediately.

**Audit frontend bundles:** Periodically search deployed bundles for patterns like API key formats (Bearer tokens, AWS access key patterns) to detect accidental exposure.

### Key Points
- No secret is safe in frontend JavaScript — it is all readable by users and attackers
- `process.env` variables in SPAs are compiled to literal string values in the bundle
- Move all calls requiring real secrets to a BFF/API proxy server layer
- Stripe publishable key, Google Maps API key (with referrer restriction) are designed to be public — these are not secrets
- Use pre-commit hooks (gitleaks, truffleHog) to prevent accidental secret commits to version control

### Follow-up Prompts
- How would you architect the BFF pattern using Next.js API routes to proxy third-party API calls?
- How would you detect if a secret has been accidentally included in a deployed JavaScript bundle?
- If a developer accidentally commits an API key to a public GitHub repository, what is the immediate response procedure?

### Difficulty: advanced
### Tags: secrets-management, BFF, API-keys, environment-variables, security

---
