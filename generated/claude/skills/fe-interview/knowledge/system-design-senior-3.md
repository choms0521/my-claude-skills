# System Design - Senior Interview Questions (Extended 2)
### Language: en

## Q21: Explain how DNS works and its role in web architecture

### Question
How does the Domain Name System (DNS) work? Walk through the full resolution process from a user typing a URL to the browser receiving an IP address. What are the different record types, and how does DNS affect web application architecture?

### Model Answer
DNS is the internet's phone book — it translates human-readable domain names (like `example.com`) into IP addresses (like `93.184.216.34`) that computers use to route traffic. Every web request begins with a DNS lookup, making it a foundational piece of web infrastructure.

When a user types `www.example.com` into their browser, the resolution process follows a hierarchical chain. First, the browser checks its own DNS cache. If not found, it queries the operating system's resolver cache. If still not found, the OS sends a query to the configured **recursive resolver** (typically provided by the ISP or a public resolver like Google's `8.8.8.8` or Cloudflare's `1.1.1.1`). The recursive resolver is responsible for walking the DNS hierarchy on the client's behalf.

The recursive resolver first contacts a **root name server** (one of 13 root server clusters worldwide, labeled A through M). The root server does not know the IP for `www.example.com`, but it knows which servers are authoritative for the `.com` top-level domain (TLD) and returns a referral. The resolver then contacts a `.com` **TLD name server**, which returns a referral to the authoritative name servers for `example.com`. Finally, the resolver contacts the **authoritative name server** for `example.com`, which returns the actual IP address. The resolver caches this result according to the TTL (Time To Live) value and returns it to the client.

Key DNS record types: **A records** map a domain to an IPv4 address. **AAAA records** map to IPv6. **CNAME records** create an alias from one domain to another (e.g., `www.example.com` CNAME to `example.com`). **MX records** specify mail servers. **TXT records** hold arbitrary text data (used for SPF, DKIM email authentication, domain verification). **NS records** delegate a domain to specific name servers. **SRV records** specify host and port for specific services.

DNS profoundly affects web architecture in several ways. **DNS-based load balancing** returns different IP addresses for the same domain to distribute traffic across multiple servers. Simple round-robin DNS rotates through a list of IPs. Weighted DNS assigns different probabilities to each IP. Geographic DNS (GeoDNS) returns the IP of the nearest data center based on the resolver's location. **DNS failover** monitors server health and removes unhealthy IPs from rotation, providing basic high availability.

**TTL management** is a critical operational concern. A high TTL (e.g., 86400 seconds / 24 hours) reduces DNS query load but means changes propagate slowly — if you need to redirect traffic during an incident, clients may use the stale IP for up to 24 hours. A low TTL (e.g., 60 seconds) enables fast failover but increases DNS query volume. A common strategy: keep TTL at 300 seconds (5 minutes) normally, lower it to 60 seconds before a planned migration, perform the migration, then raise TTL back.

### Key Points
- DNS resolution follows a hierarchical chain: browser cache → OS cache → recursive resolver → root servers → TLD servers → authoritative servers
- Key record types: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), TXT (verification/auth), NS (delegation)
- DNS-based load balancing distributes traffic via round-robin, weighted, or geographic (GeoDNS) IP rotation
- TTL controls cache duration — high TTL reduces query load but slows propagation; low TTL enables fast failover
- DNS is a single point of failure in web architecture — use redundant authoritative servers and monitor resolution latency

### Follow-up Prompts
- How does DNS prefetching (`<link rel="dns-prefetch">`) improve page load performance?
- What is DNS-over-HTTPS (DoH) and how does it improve privacy?
- How would you handle a DNS failover strategy for a multi-region application deployment?

### Difficulty: advanced
### Tags: system-design, DNS, name resolution, load balancing, TTL, infrastructure, networking

---

## Q22: What is a CDN and how does it improve performance?

### Question
What is a Content Delivery Network (CDN)? How does it work, what types of content does it serve, and what are the key architectural considerations when integrating a CDN into a web application?

### Model Answer
A CDN is a geographically distributed network of servers (called edge nodes or Points of Presence — PoPs) that cache and serve content from locations physically close to end users. The primary goal is to reduce latency by minimizing the physical distance data must travel. Without a CDN, a user in Tokyo requesting a resource from a server in Virginia experiences round-trip times of 150-200ms per request. With a CDN edge node in Tokyo, that drops to 5-20ms.

CDNs operate on a **pull model** or **push model**. In the pull model (most common), the CDN does not have the content initially. When a user requests a resource, the edge node checks its cache. On a cache miss, it fetches the resource from the **origin server**, caches it, and serves it. Subsequent requests for the same resource from the same region are served directly from the edge cache (cache hit). In the push model, content is proactively uploaded to CDN nodes — used for large static assets like video files.

The types of content CDNs serve span a spectrum. **Static assets** — images, CSS, JavaScript bundles, fonts, videos — are the classic CDN use case. These are highly cacheable with long TTLs (days or weeks) and benefit most from edge caching. **Dynamic content** can also be served through a CDN using shorter TTLs or `stale-while-revalidate` cache strategies. Modern CDNs like Cloudflare Workers and AWS CloudFront Functions can even execute JavaScript at the edge, enabling dynamic HTML generation close to users (edge computing).

Cache invalidation is the hardest problem in CDN architecture. When you deploy a new version of your JavaScript bundle, the old version may be cached at hundreds of edge nodes worldwide. Strategies include: **cache-busting filenames** (e.g., `app.a3b2c1.js` — each build produces a unique filename, so the old cache is never hit), **explicit purge APIs** (the CDN provides an API to invalidate specific URLs or wildcard patterns), and **TTL-based expiration** (set short TTLs for frequently changing content). Cache-busting filenames are the gold standard because they are deterministic and avoid race conditions — the new HTML references the new filename, and the old cached file is simply never requested again.

**Cache-Control headers** drive CDN behavior. `Cache-Control: public, max-age=31536000, immutable` tells the CDN (and browsers) to cache for one year and never revalidate — used for content-hashed static assets. `Cache-Control: no-cache` means the CDN must revalidate with the origin on every request (via `If-None-Match`/`ETag`). `Cache-Control: no-store` prevents caching entirely — used for sensitive, personalized content.

Architectural considerations: use a separate domain or subdomain for CDN assets (`cdn.example.com` or `assets.example.com`) to avoid cookie overhead on asset requests. Enable HTTP/2 or HTTP/3 on the CDN for multiplexed connections. Configure proper CORS headers on the CDN for cross-origin font and API requests. Monitor cache hit ratios — a low ratio indicates misconfigured cache headers or high content cardinality.

### Key Points
- CDNs reduce latency by serving content from edge nodes geographically close to users (5-20ms vs. 150-200ms)
- Pull model: edge caches on first request; push model: content proactively distributed — pull is standard for web applications
- Cache-busting filenames (`app.hash.js`) are the gold standard for static asset invalidation — deterministic, no race conditions
- `Cache-Control` headers drive behavior: `immutable` for hashed assets, `no-cache` for revalidation, `no-store` for sensitive content
- Monitor cache hit ratio; use a separate domain for assets to avoid cookie overhead; enable HTTP/2 or HTTP/3

### Follow-up Prompts
- How does `stale-while-revalidate` work in Cache-Control headers and how does it improve perceived performance?
- What is edge computing and how do Cloudflare Workers or Lambda@Edge extend the CDN concept beyond caching?
- How would you design a CDN strategy for a multi-language, multi-region site with both static and dynamic content?

### Difficulty: advanced
### Tags: system-design, CDN, caching, performance, Cache-Control, edge computing, latency, infrastructure

---

## Q23: Explain load balancing strategies and algorithms

### Question
What is load balancing? Explain the different load balancing algorithms, the distinction between Layer 4 and Layer 7 load balancing, and how load balancers enable high availability and scalability.

### Model Answer
A load balancer distributes incoming network traffic across multiple backend servers to ensure no single server is overwhelmed, to maximize throughput, and to provide fault tolerance. If one server goes down, the load balancer routes traffic to the remaining healthy servers. Load balancers are a fundamental building block of scalable web architecture.

**Layer 4 (transport layer) load balancing** operates at the TCP/UDP level. It routes traffic based on IP addresses and port numbers without inspecting the actual content of the request. L4 load balancing is fast (minimal processing overhead) and protocol-agnostic, but it cannot make routing decisions based on HTTP headers, URL paths, or cookies. It simply forwards TCP connections to a backend server. Example: AWS Network Load Balancer.

**Layer 7 (application layer) load balancing** inspects the HTTP request content and can make intelligent routing decisions based on URL path, HTTP headers, cookies, query parameters, or request body. This enables sophisticated patterns: route `/api/*` requests to API servers and `/static/*` to asset servers; route requests with a `country=JP` header to Japanese-region servers; implement sticky sessions based on a session cookie. L7 load balancing adds processing overhead (it must terminate the TCP connection and parse HTTP) but provides much more flexibility. Examples: AWS Application Load Balancer, Nginx, HAProxy.

Key load balancing algorithms:

**Round Robin** distributes requests sequentially across servers (1→A, 2→B, 3→C, 4→A...). Simple and fair when servers have equal capacity, but does not account for varying request complexity or server health.

**Weighted Round Robin** assigns weights to servers based on capacity. A server with weight 3 receives three times the traffic of a server with weight 1. Useful when servers have different hardware specifications.

**Least Connections** routes each request to the server with the fewest active connections. This naturally adapts to varying request durations — slow requests accumulate connections on a server, so subsequent requests route elsewhere. Best for workloads with variable request processing times.

**Least Response Time** routes to the server with the fastest recent response time and fewest active connections. This combines load awareness with performance awareness.

**IP Hash** hashes the client's IP address to deterministically route them to the same server. This provides basic session affinity without cookies but breaks when a client's IP changes (mobile networks) or when servers are added/removed (rehashing).

**Consistent Hashing** improves on IP Hash by minimizing redistribution when servers are added or removed. Only a fraction of keys are remapped, making it suitable for caching layers.

Health checks are critical. The load balancer periodically sends health check probes (HTTP GET to a `/health` endpoint) to each server. If a server fails consecutive health checks, it is removed from the rotation. When it recovers, it is re-added. Health checks should verify not just that the process is running but that it can serve requests (check database connectivity, cache availability).

### Key Points
- Layer 4 load balancing routes by IP/port (fast, protocol-agnostic); Layer 7 routes by HTTP content (flexible, content-aware)
- Round Robin for equal servers; Weighted Round Robin for mixed capacity; Least Connections for variable request durations
- Consistent Hashing minimizes key redistribution when servers are added/removed — ideal for caching layers
- Health checks must verify application-level readiness, not just process liveness
- Load balancers enable horizontal scaling (add servers behind the LB) and high availability (automatic failover on server failure)

### Follow-up Prompts
- How do you implement sticky sessions with a load balancer, and what are the drawbacks?
- What is the difference between active-passive and active-active load balancer configurations for high availability?
- How does consistent hashing work, and why does it minimize redistribution compared to modular hashing?

### Difficulty: advanced
### Tags: system-design, load balancing, algorithms, Layer 4, Layer 7, high availability, scalability, health checks

---

## Q24: What is a reverse proxy and how does it differ from a load balancer?

### Question
What is a reverse proxy? How does it differ from a forward proxy and a load balancer? What additional capabilities does a reverse proxy provide beyond traffic routing?

### Model Answer
A reverse proxy sits between clients and backend servers, accepting requests on behalf of the servers and forwarding them to the appropriate backend. The client communicates only with the reverse proxy and is unaware of the backend servers' existence. This is the opposite of a forward proxy, which sits between clients and the internet, acting on behalf of the client (e.g., corporate proxies that filter outbound traffic).

The distinction between a reverse proxy and a load balancer is nuanced. A load balancer is specifically concerned with distributing traffic across multiple servers. A reverse proxy is a broader concept — it can do load balancing, but it also provides many additional capabilities. In practice, reverse proxies like Nginx, HAProxy, and Envoy function as both reverse proxies and load balancers simultaneously.

**Security and anonymity** is a primary benefit. The reverse proxy hides the identity and topology of backend servers from the internet. Clients see only the proxy's IP address. Backend servers can use private IP addresses and are not directly accessible from the public internet. This reduces the attack surface significantly. The reverse proxy can also implement rate limiting, IP allowlisting/blocklisting, and Web Application Firewall (WAF) rules as a centralized security layer.

**SSL/TLS termination** offloads the computationally expensive encryption/decryption from backend servers. The reverse proxy handles the HTTPS connection with the client (maintaining certificates, performing TLS handshakes) and forwards unencrypted HTTP to backend servers over the internal network. This centralizes certificate management (one place to update certificates) and reduces CPU load on application servers. Traffic between the proxy and backends can optionally use internal TLS for defense in depth.

**Caching** at the reverse proxy layer reduces load on backend servers. The proxy caches responses for frequently requested resources and serves them directly without contacting the backend. This is similar to a CDN but located in the same data center as the application. Nginx's `proxy_cache` and Varnish are commonly used for this purpose.

**Compression** (gzip or Brotli) can be handled by the reverse proxy, removing this CPU cost from application servers. The proxy compresses responses before sending them to clients, reducing bandwidth consumption.

**Request routing and URL rewriting** allows the reverse proxy to direct requests to different backend services based on URL path, headers, or other criteria. This is essential in microservice architectures: `/api/users/*` routes to the user service, `/api/orders/*` to the order service, while clients see a single domain. The reverse proxy acts as an API gateway.

**Connection handling optimization**: the reverse proxy can maintain persistent connections (keep-alive) to backend servers while accepting many short-lived client connections. It can also buffer slow client requests and send them to the backend as a complete request, freeing backend server threads from waiting on slow uploads.

### Key Points
- A reverse proxy acts on behalf of servers (hides backends); a forward proxy acts on behalf of clients (hides clients)
- Load balancing is one function of a reverse proxy — reverse proxies also provide SSL termination, caching, compression, and routing
- SSL/TLS termination centralizes certificate management and offloads encryption from application servers
- In microservice architectures, the reverse proxy serves as an API gateway, routing requests to different services by path
- Connection buffering and keep-alive pooling optimize backend server utilization

### Follow-up Prompts
- How does Nginx handle reverse proxying to upstream servers, and what is the `proxy_pass` directive?
- What is the difference between an API gateway and a reverse proxy in a microservice architecture?
- How would you configure a reverse proxy for WebSocket connections, which require persistent bidirectional connections?

### Difficulty: advanced
### Tags: system-design, reverse proxy, forward proxy, load balancer, SSL termination, Nginx, API gateway, security

---

## Q25: Explain database sharding - strategies, advantages, and challenges

### Question
What is database sharding? Explain the different sharding strategies, when sharding is appropriate, and the operational challenges it introduces.

### Model Answer
Database sharding is a horizontal scaling strategy that partitions data across multiple database instances (shards), where each shard holds a subset of the total data. Unlike vertical scaling (buying a bigger server) or read replicas (distributing read load), sharding distributes both reads and writes across multiple servers, enabling a database to scale beyond the capacity of a single machine.

**Key-based (hash) sharding** applies a hash function to a partition key (e.g., `user_id`) and uses modular arithmetic to assign each record to a shard. `shard_number = hash(user_id) % num_shards`. This distributes data evenly across shards. The downside: adding or removing shards changes the modulus, requiring redistribution of most data. Consistent hashing mitigates this by remapping only a fraction of keys when the shard count changes.

**Range-based sharding** assigns data to shards based on value ranges. For example, users with IDs 1-1M go to shard 1, 1M-2M to shard 2. This is simple and supports range queries within a shard efficiently. The problem is uneven data distribution (hot spots) — if newer users are more active, the latest shard handles disproportionate load. Time-based range sharding (one shard per month) suffers similarly — the current month's shard receives all writes.

**Directory-based sharding** maintains a lookup table that maps each partition key to a specific shard. This is the most flexible — you can place any record on any shard and rebalance by updating the directory. The directory itself becomes a single point of failure and a potential bottleneck, requiring replication and caching.

**Geographic sharding** assigns data to shards based on geographic region. European users' data lives in EU shards, US users in US shards. This improves latency for region-local queries and helps with data sovereignty regulations (GDPR requiring EU data to stay in EU). Cross-region queries are expensive.

The challenges of sharding are significant. **Cross-shard queries** (JOINs across shards) are complex and slow — they require querying multiple shards, merging results in the application layer, and cannot use database-level optimizations. Designing the schema to minimize cross-shard queries is essential. **Referential integrity** cannot be enforced across shards by the database; the application must handle it. **Rebalancing** (moving data between shards when load is uneven) is operationally complex and typically requires application-level tooling. **Transaction support** across shards requires distributed transaction protocols (2-phase commit) which are slow and complex, or you accept eventual consistency.

Before sharding, exhaust simpler alternatives: query optimization, connection pooling, read replicas, caching layers, and vertical scaling. Sharding introduces permanent architectural complexity and should be a deliberate, well-planned decision.

### Key Points
- Sharding horizontally partitions data across multiple database instances, distributing both read and write load
- Hash sharding distributes evenly but complicates resharding; range sharding supports range queries but risks hot spots
- Directory-based sharding offers maximum flexibility but the directory is a single point of failure
- Cross-shard JOINs, referential integrity, distributed transactions, and rebalancing are major operational challenges
- Exhaust simpler scaling strategies (indexing, caching, read replicas, vertical scaling) before committing to sharding

### Follow-up Prompts
- How does consistent hashing reduce data redistribution when adding or removing shards?
- How do databases like CockroachDB or Vitess handle automatic sharding and resharding?
- What schema design principles minimize the need for cross-shard queries?

### Difficulty: advanced
### Tags: system-design, sharding, database, horizontal scaling, partitioning, consistent hashing, distributed systems

---

## Q26: What is the CAP theorem and its implications for distributed systems?

### Question
Explain the CAP theorem. What are consistency, availability, and partition tolerance in the context of distributed systems? Why can you only guarantee two of the three, and how do real-world systems make this trade-off?

### Model Answer
The CAP theorem, formulated by Eric Brewer in 2000 and formally proven by Gilbert and Lynch in 2002, states that a distributed data store can provide at most two of the following three guarantees simultaneously: **Consistency**, **Availability**, and **Partition Tolerance**.

**Consistency** means every read receives the most recent write or an error. All nodes in the system see the same data at the same time. If you write a value to node A, an immediately subsequent read from node B returns that value. This is linearizability — the strongest consistency guarantee.

**Availability** means every request receives a non-error response, without the guarantee that it contains the most recent write. The system always responds, even if the data might be stale.

**Partition Tolerance** means the system continues to operate despite arbitrary message loss or failure of part of the network. Network partitions (where nodes cannot communicate with each other) are inevitable in distributed systems — cables get cut, switches fail, data centers lose connectivity.

The key insight: since network partitions are unavoidable in real distributed systems, you must tolerate partitions (P is mandatory). The actual choice is between **CP** (consistency + partition tolerance) and **AP** (availability + partition tolerance) — what to sacrifice during a partition.

**CP systems** prioritize consistency. During a partition, nodes that cannot confirm they have the latest data will refuse requests (returning errors or timeouts) rather than serve stale data. Example: a banking system where showing an incorrect account balance is worse than briefly being unavailable. HBase, MongoDB (with majority read concern), and Zookeeper are CP-leaning. During a network partition, the minority partition becomes unavailable.

**AP systems** prioritize availability. During a partition, all nodes continue serving requests even if they cannot synchronize. This means different nodes may return different (stale) values. When the partition heals, the system reconciles conflicting data. Cassandra, DynamoDB, and CouchDB are AP-leaning. They use techniques like vector clocks, last-write-wins, or application-level conflict resolution to handle divergent data.

It is important to note that the CAP trade-off applies only during a partition. When the network is healthy, a well-designed system provides both consistency and availability. Modern systems like Google's Spanner push the boundaries by using GPS-synchronized clocks (TrueTime) to provide near-linearizable consistency with high availability, accepting that during actual partitions, consistency takes priority.

The PACELC theorem extends CAP: when there is a **P**artition, choose between **A**vailability and **C**onsistency; **E**lse (during normal operation), choose between **L**atency and **C**onsistency. This captures the everyday trade-off that even without partitions, strong consistency requires synchronous replication which adds latency.

### Key Points
- CAP theorem: a distributed system can guarantee at most two of Consistency, Availability, and Partition Tolerance
- Network partitions are inevitable, so the real choice is CP (refuse stale reads) vs. AP (always respond, possibly stale)
- CP systems (HBase, Zookeeper): sacrifice availability during partitions to ensure data correctness
- AP systems (Cassandra, DynamoDB): sacrifice consistency during partitions to remain responsive, reconcile later
- PACELC extends CAP to include the latency-consistency trade-off during normal (non-partition) operation

### Follow-up Prompts
- How does DynamoDB handle conflict resolution in an AP system — what is last-write-wins and what are its limitations?
- How does Google Spanner achieve near-linearizable consistency with global distribution using TrueTime?
- What is the difference between linearizability and eventual consistency in practical terms for application developers?

### Difficulty: advanced
### Tags: system-design, CAP theorem, distributed systems, consistency, availability, partition tolerance, PACELC

---

## Q27: Explain caching strategies (cache-aside, write-through, write-behind, refresh-ahead)

### Question
What are the main caching strategies used in system design? Explain cache-aside, write-through, write-behind, and refresh-ahead patterns, including their trade-offs and appropriate use cases.

### Model Answer
Caching is the most impactful performance optimization in system design — it reduces latency, offloads database load, and improves throughput. The caching strategy determines how data flows between the application, the cache, and the database, and each strategy makes different trade-offs between consistency, complexity, and performance.

**Cache-Aside (Lazy Loading)** is the most common pattern. The application manages the cache explicitly. On read: check the cache first; if the data is present (cache hit), return it. If not (cache miss), read from the database, store the result in the cache, and return it. On write: write to the database, then invalidate (delete) the corresponding cache entry. The next read will repopulate the cache.

```
Read: App → Cache (hit?) → if miss → DB → write to Cache → return
Write: App → DB → invalidate Cache
```

Advantages: only requested data is cached (no wasted memory), the cache naturally fills with frequently accessed data, and cache failures are non-fatal (reads fall through to the database). Disadvantages: the first request for any data is always a cache miss (cold start), and there is a brief window between the database write and cache invalidation where stale data may be read. Redis and Memcached are typically used as the cache layer in this pattern.

**Write-Through** writes data to the cache and the database synchronously as part of the same operation. Every write goes through the cache to the database. Reads always hit the cache. This ensures the cache is never stale — consistency is strong. The downside is write latency: every write must wait for both cache and database writes to complete. Additionally, data that is written but rarely read still occupies cache space. Write-through is suitable for read-heavy workloads where consistency is critical and writes are infrequent.

**Write-Behind (Write-Back)** writes data to the cache immediately and asynchronously flushes to the database later (in batches or after a delay). This dramatically improves write performance because the application only waits for the cache write. The cache acts as a write buffer. However, data can be lost if the cache node fails before flushing to the database. This strategy suits high-write-throughput scenarios where some data loss risk is acceptable — analytics event collection, logging, non-critical counters. Implementing durability guarantees (write-ahead logs on the cache node) mitigates but does not eliminate data loss risk.

**Refresh-Ahead** proactively refreshes cache entries before they expire. The system predicts which entries will be accessed soon (based on recent access patterns) and reloads them from the database in the background before their TTL expires. This eliminates cache miss latency for frequently accessed data. The challenge is accurate prediction — refreshing data that is not actually requested wastes database resources. This pattern is implemented by cache libraries like Caffeine (JVM) or can be built with background workers that monitor access patterns.

In practice, systems often combine strategies. A common architecture: cache-aside for general reads, write-through for critical data that must be consistent, and refresh-ahead for hot keys that should never experience a cache miss (e.g., a trending product page).

### Key Points
- Cache-Aside: application manages cache explicitly; most common, tolerant of cache failures, but has cold-start misses
- Write-Through: synchronous write to cache and DB; strong consistency but higher write latency
- Write-Behind: async DB write after cache write; lowest write latency but risks data loss on cache failure
- Refresh-Ahead: proactive background refresh before TTL expiry; eliminates miss latency for hot data but wastes resources on misprediction
- Real systems combine strategies: cache-aside for general use, write-through for critical consistency, refresh-ahead for hot keys

### Follow-up Prompts
- How do you handle cache stampede (thundering herd) when a popular cache entry expires and hundreds of requests simultaneously query the database?
- What is the difference between cache invalidation and cache eviction, and what eviction policies (LRU, LFU, TTL) are commonly used?
- How would you implement a distributed cache-aside pattern with Redis, including handling race conditions between writes and invalidations?

### Difficulty: advanced
### Tags: system-design, caching, cache-aside, write-through, write-behind, refresh-ahead, Redis, performance

---

## Q28: Database replication - master-slave vs master-master

### Question
What is database replication? Explain master-slave and master-master replication architectures, their trade-offs, and when to use each.

### Model Answer
Database replication creates and maintains copies of the same data across multiple database servers. The primary goals are high availability (if one server fails, others continue serving), read scalability (distribute read queries across replicas), and geographic distribution (place data closer to users in different regions).

**Master-Slave (Primary-Replica) replication** is the most common architecture. A single master server handles all write operations. One or more slave (replica) servers asynchronously receive a copy of the master's write-ahead log (WAL) or binary log and replay those writes to maintain an identical dataset. Read queries can be distributed across all replicas, effectively multiplying read capacity.

The replication can be **synchronous** (the master waits for at least one replica to confirm the write before acknowledging to the client) or **asynchronous** (the master acknowledges immediately and replicas catch up later). Synchronous replication guarantees no data loss on master failure but adds write latency. Asynchronous replication is faster but if the master fails before replicas catch up, recent writes are lost (**replication lag**).

Replication lag is the central challenge. A user writes a record, then immediately reads it — if the read hits a replica that has not yet received the write, they see stale data. Solutions: read-after-write consistency (route reads for data the user just wrote to the master), monotonic reads (pin a user to the same replica for a session), and monitoring replication lag with alerts.

Master failover (promoting a replica to master when the master fails) can be manual or automatic. Automatic failover (via tools like Orchestrator for MySQL, or Patroni for PostgreSQL) detects master failure, selects the most up-to-date replica, promotes it, and reconfigures other replicas and the application to point to the new master. This process must handle split-brain scenarios where the old master recovers and both believe they are master.

**Master-Master (Multi-Master) replication** allows writes on any node. Each master replicates its writes to all other masters. This eliminates the single write bottleneck and provides write availability during any single node failure — there is no failover needed because all nodes accept writes.

The fundamental challenge of multi-master is **write conflicts**. If two masters simultaneously update the same row, their changes must be reconciled. Conflict resolution strategies: **last-write-wins** (use timestamps, simpler but can silently discard writes), **application-level resolution** (the application merges conflicting versions, complex but correct), and **conflict-free replicated data types (CRDTs)** which are data structures designed to merge automatically without conflicts.

Multi-master is appropriate when: you need write availability across multiple regions (each region has a local master), or when your data model naturally partitions (different masters handle different data subsets, reducing conflict probability). It is inappropriate when strong consistency is required — the consistency model is inherently eventual.

### Key Points
- Master-Slave: single write point, multiple read replicas; simple but write bottleneck and failover complexity
- Synchronous replication: no data loss on failure but higher latency; asynchronous: faster but risk of data loss
- Replication lag causes stale reads — mitigate with read-after-write consistency and replica pinning
- Master-Master: any node accepts writes; eliminates write bottleneck but introduces write conflict resolution complexity
- Multi-master conflict resolution: last-write-wins (simple, lossy), application-level merge (complex, correct), or CRDTs (automatic)

### Follow-up Prompts
- How does PostgreSQL streaming replication work, and what is the role of the write-ahead log (WAL)?
- What is a split-brain scenario in master-slave failover, and how do fencing mechanisms prevent it?
- How does CockroachDB implement multi-active availability while maintaining strong consistency?

### Difficulty: advanced
### Tags: system-design, replication, master-slave, master-master, high availability, consistency, failover, database

---

## Q29: Explain consistency patterns (weak, eventual, strong)

### Question
What are the different consistency patterns in distributed systems — weak consistency, eventual consistency, and strong consistency? How does each work, and what are the real-world implications for application design?

### Model Answer
Consistency patterns define the guarantees a distributed system provides about when writes become visible to reads. The spectrum ranges from strong (immediate visibility) to weak (no guarantees), with significant implications for both system design and application-level code.

**Strong consistency** guarantees that after a write completes, all subsequent reads from any node return the updated value. The system behaves as if there is a single copy of the data. This is linearizability — operations appear to take effect atomically at some point between their invocation and completion. Achieving strong consistency in a distributed system requires coordination between nodes on every write, typically through consensus protocols like Raft or Paxos.

The cost of strong consistency is latency and availability. Each write must be acknowledged by a majority of nodes before it is considered committed (in Raft, a write requires confirmation from ⌊n/2⌋ + 1 nodes). Cross-region strong consistency is particularly expensive — if nodes are in Virginia and Frankfurt, every write incurs at least one transatlantic round trip (~80ms). Google Spanner achieves global strong consistency using GPS-synchronized TrueTime clocks to assign globally ordered timestamps, but even Spanner has measurable write latency overhead.

Use cases: financial transactions (account balances must be accurate), inventory management (cannot sell the last item twice), leader election, configuration stores (Zookeeper, etcd).

**Eventual consistency** guarantees that if no new writes occur, all replicas will eventually converge to the same value. There is no guarantee about how long convergence takes — it could be milliseconds or seconds. During the convergence window, different readers may see different values. This is the consistency model of most AP systems (Cassandra, DynamoDB, DNS).

Eventual consistency enables high availability and low latency because writes do not require coordination — a write can be acknowledged as soon as one node persists it. Replicas synchronize in the background. The application must be designed to tolerate stale reads. Common patterns: display cached data with a "last updated" timestamp, show optimistic updates that may be rolled back, and use background reconciliation for conflicts.

Real-world examples: social media feeds (seeing a post a few seconds late is acceptable), DNS propagation (TTL-bounded staleness), shopping cart contents (Amazon's Dynamo paper popularized eventual consistency for shopping carts — merging conflicting carts by taking the union of items).

**Weak consistency** provides no guarantee that subsequent reads will see a written value. After a write, there is a best-effort attempt to propagate but no convergence guarantee. Data may be lost if the node holding it fails. This is acceptable for use cases where data loss or staleness is tolerable: video chat and VoIP (dropped packets are not retransmitted — the conversation continues), real-time gaming (player positions are approximated), and memcached (cache eviction means data disappears, and the application falls back to the database).

Between these extremes, several practical consistency models exist. **Read-your-writes consistency** ensures a user always sees their own writes (even if other users see stale data) — implemented by routing reads for recently-written data to the primary. **Monotonic read consistency** ensures a user never sees older data after seeing newer data — implemented by pinning the user to the same replica. **Causal consistency** ensures operations that are causally related are seen in the correct order by all nodes, while concurrent operations may be seen in different orders.

### Key Points
- Strong consistency: all reads see the latest write; requires coordination (consensus protocols), costs latency and availability
- Eventual consistency: replicas converge eventually; high availability and low latency, but application must tolerate stale reads
- Weak consistency: no convergence guarantee; suitable for ephemeral data (video chat, gaming, caching)
- Practical middle-ground models: read-your-writes, monotonic reads, causal consistency provide useful guarantees without full linearizability
- Choose based on business requirements: financial data demands strong; social feeds tolerate eventual; live streaming tolerates weak

### Follow-up Prompts
- How does the Raft consensus algorithm achieve strong consistency, and what happens during a leader election?
- How would you implement read-your-writes consistency in a system with a primary database and read replicas?
- What are CRDTs and how do they enable conflict-free eventual consistency for specific data structures?

### Difficulty: advanced
### Tags: system-design, consistency, eventual consistency, strong consistency, distributed systems, Raft, CAP, linearizability

---

## Q30: What are message queues and how do they enable asynchronous processing?

### Question
What are message queues? Explain how they work, the different messaging patterns, and how they enable asynchronous, decoupled system architectures.

### Model Answer
A message queue is a middleware component that stores messages sent by producers and delivers them to consumers for processing. The queue decouples the producer (who sends work) from the consumer (who processes it) in both time and space — the producer does not need to know which consumer will process the message, and the consumer does not need to be running when the message is sent. This decoupling is fundamental to building scalable, resilient distributed systems.

The basic flow: a producer publishes a message to a queue. The message sits in the queue until a consumer retrieves it, processes it, and acknowledges completion. If the consumer crashes before acknowledging, the message returns to the queue and is redelivered to another consumer. This at-least-once delivery guarantee ensures no messages are lost (but messages may be processed more than once, so consumers must be idempotent).

**Point-to-point (queue) pattern**: a message is consumed by exactly one consumer. Multiple consumers compete for messages from the same queue (competing consumers pattern), enabling horizontal scaling of processing. If 10 consumers listen on a queue, each message is processed by one of them. This is the pattern for task queues: image processing, email sending, report generation. Technologies: RabbitMQ queues, AWS SQS, Redis lists.

**Publish-Subscribe (pub/sub) pattern**: a message published to a topic is delivered to all subscribers. Each subscriber receives its own copy. This enables event-driven architectures: when an order is placed, the order service publishes an `OrderCreated` event. The inventory service, notification service, and analytics service each receive the event independently and process it according to their own logic. Technologies: Apache Kafka topics, AWS SNS, Redis pub/sub, RabbitMQ exchanges with fanout.

**Key concepts**: **Message durability** — persistent messages are written to disk so they survive broker restarts (Kafka retains messages on disk by default). **Message ordering** — some systems guarantee FIFO ordering within a partition/queue (Kafka, SQS FIFO), others do not (standard SQS provides best-effort ordering). **Dead letter queues (DLQ)** capture messages that fail processing after a configured number of retry attempts, preventing poison messages from blocking the queue. **Backpressure** — when consumers cannot keep up with producers, the queue grows. Monitoring queue depth is essential; alerts on growing queue depth indicate either insufficient consumer capacity or a processing bug.

Message queues enable several critical architectural patterns. **Load leveling**: absorb traffic spikes in the queue rather than overwhelming backend services. A flash sale generates 10x the normal order volume, but the order processing service consumes at its normal rate — the queue buffers the burst. **Retry with backoff**: failed processing attempts are retried after increasing delays (1s, 5s, 30s, 5m) before moving to the DLQ. **Saga pattern**: long-running distributed transactions are broken into a sequence of local transactions coordinated by messages — each step publishes a message triggering the next step, with compensating transactions for rollback.

**Kafka** deserves special mention as it blurs the line between a message queue and a distributed log. Kafka retains all messages for a configurable period (days, weeks, or indefinitely). Consumers track their position (offset) in the log and can replay messages from any point. This enables event sourcing, stream processing, and rebuilding state from the event history — capabilities traditional message queues do not provide.

### Key Points
- Message queues decouple producers and consumers in time and space, enabling asynchronous, resilient architectures
- Point-to-point (competing consumers) for task distribution; pub/sub (topic/fanout) for event-driven broadcasting
- At-least-once delivery requires idempotent consumers; dead letter queues capture poison messages after retry exhaustion
- Load leveling absorbs traffic spikes; the queue buffers bursts while consumers process at steady rate
- Kafka functions as both a message queue and a distributed log — supports replay, event sourcing, and stream processing

### Follow-up Prompts
- How do you ensure exactly-once processing semantics in a system with at-least-once message delivery?
- What is the difference between Apache Kafka and RabbitMQ in terms of architecture, use cases, and message retention?
- How would you implement the saga pattern using message queues to coordinate a distributed transaction across microservices?

### Difficulty: advanced
### Tags: system-design, message queues, async processing, Kafka, RabbitMQ, pub/sub, event-driven, distributed systems

---
