# Platform communication defaults
Selected 2026-10-16 under the owner's explicit delegation: “choose and document safe optimal defaults for IPC for the platforms.” Decision 182 records the selection; this is documentation, not installation or app implementation. These are conservative starting designs, not measured optimal-performance claims. Store constraints are in [distribution review](../distribution/ipc-compatibility.md).

## Shared rule
Within one process, call the shared Rust commands through the selected typed bindings (or Rust directly). Do not serialize commands merely to cross a language boundary. Across processes, use narrow named native RPC methods translating into the SAME Rust command/query dispatcher. Transport objects never enter durable document state. Client IDs, incarnations, operation IDs, sequence/revision preconditions, receipts and capability checks keep their approved semantics.

One execution owner mutates each document. OS callbacks validate/copy/enqueue; they do not concurrently mutate Rust state. Waiting for a remote reply or storage never blocks the ink callback. Native and worker lifecycle differs by host; a connection, process ID, bus name or timeout alone cannot confer writer authority.

## Selected defaults
| Platform | Normal app communication | When separate processes/contexts participate |
| --- | --- | --- |
| macOS | Swift → generated typed Rust FFI, main-thread editor owner | Typed NSXPC between app peers; discovery-only sandboxed per-user LaunchAgent registered through SMAppService supplies anonymous endpoints |
| Windows | C#/WinUI → typed Rust FFI | Asynchronous local named pipes with established JSON-RPC 2.0 implementation StreamJsonRpc and explicit typed .NET DTO/proxy interfaces; UTF-8 System.Text.Json formatting |
| Linux | GTK/Rust → shared Rust directly | User-session D-Bus, named methods and generated bindings from versioned introspection definitions; first eligible app hosts document coordinator |
| iOS/iPadOS | UIKit scenes → one in-process shared Rust coordinator per document | No desktop-style general app-to-app editing service. Future extensions use Apple's approved extension/App Group mechanisms under their own scoped contract |
| visionOS | Same-process scene/native adapter → Rust | Same conservative Apple-mobile rule; no imported macOS helper architecture |
| Android | Compose/activity → typed JNI → Rust; activities share in-process service/state as needed | Private bound service with generated AIDL/Binder only when an approved feature actually needs another process |
| ChromeOS | Reuse Android or web route | Inherit that route's communication/security model; no third IPC implementation |
| Browser | Main UI ↔ dedicated Rust/Wasm coordinator/storage worker using postMessage | Same-origin/partition BroadcastChannel typed structured-clone records; coordinator worker holds Web Lock for its writable lifetime |
| tvOS/watchOS | In-process read-only Rust/viewer calls | No editable IPC endpoint; approved document acquisition stays separate. iPhone↔WatchConnectivity is cross-device transfer, not local editor RPC |
| Android TV/Google TV/Wear OS | In-process read-only calls through Android adapter | No editable IPC endpoint; private Binder only if a separately approved viewer component requires process isolation |
| Android XR | Android communication model | Editing capabilities remain scoped to its approved feature design; Binder never grants capability merely through transport |

This selection narrowly amends the previous no-extra-service assumption on macOS: one discovery-only helper, no document daemon. Other hosts do not inherit it. It does not add new screens, multiple windows, external-agent permissions, cloud sync or background execution entitlements.

## macOS details
Bundle the helper with the app; sandbox and sign both. Use public SMAppService registration, owned App Group namespace and narrow authenticated endpoint exchange. No root, privileged daemon, manually copied global LaunchAgents files, private bootstrap tricks or automatic unsupported fallback. Request the appropriate user consent before registration and respect disabled/unregistered/requires-approval states.

The helper retains bounded ephemeral endpoint registrations only: no drawing bytes, SQLite connections, command execution, history or durable authority. Existing direct peer connections do not depend on forwarding through it. If discovery fails, pause new remote attachment; local editing can continue where valid authority is held. A stale endpoint does not permit takeover. The library/drawing ownership guard remains authoritative.

No login/startup execution or persistent execution after app quit without consent. Design as demand-driven, no unconditional RunAtLoad/KeepAlive requirement; stop idle broker work and define cleanup/unregister. Rejection/disablement must not prevent ordinary single-process editing. Exact consent/error UI requires design review approval. Signed independent-app tests, entitlement scope, registration/unregistration, peer-signing upgrade rules and store review remain prerequisites. Public SMAppService requires macOS 13+; this constrains this feature, not a declaration that all of Linefield supports 13.

## Windows details
Use local named pipes in the current logon session with restrictive ACLs; packaged pipe naming follows LOCAL namespace guidance. Explicitly reject remote access. Validate server/client identity independently of claimed UUIDs; same user is not the same application. Hold the existing document authority guard in the owning app, not a pipe name. No Windows service or elevated helper by default.

Use StreamJsonRpc's established framing/formatter and explicit allowlisted typed methods, not a new binary codec or arbitrary reflective editor API. Audit actual frame length, JSON depth, collection/batch limits and decoded allocations before acceptance; middleware is not a security policy. No runtime type-name deserialization. Pin/audit the compatible package at Windows implementation. Encode 64-bit counters/revisions/sequences as validated decimal strings in JSON mappings; UUIDs map losslessly to canonical text and back to 16-byte core IDs. No conversion through JavaScript-number precision. Bound sample batches and measure encoding/copy overhead before capacity/performance claims. No speculative shared-memory fast path.

## Linux details
Use the existing user-session bus, not a new system daemon. Acquire stable names and watch unique-owner changes; still hold the drawing lock through outstanding writes. Methods and signals carry bounded versioned fields; signals are advisory, never durable acknowledgement. Sender UID/session membership is not application authentication. Define restrictive peer/capability policy; do not automatically expose mutation to all same-user software. Flatpak builds require narrow owned bus-name permissions/portal-aware file access and a packaging probe. No blanket talk-to wildcard. If bus/policy is unavailable, report unavailable and preserve work; never open an unrestricted fallback socket.

## Mobile and viewers
Prefer no separate process at all. Android bound-service AIDL is conditional; use explicit intents, exported=false for own-app service and validate caller/identity at trust boundaries. Any later inter-app service needs separately approved exposure, signature permission and request capabilities. Binder can call on multiple threads; enqueue to the single Rust owner. Avoid blocking or reentrant calls from native input. Keep payloads below measured/platform transaction limits; no full drawing as one Binder transaction. No foreground/always-running service is implied.

Apple scenes share in-process coordination. Do not assume iOS-family apps can install the macOS helper, run continuously, or communicate through arbitrary XPC services. App Group shared storage is not a live editor endpoint or permission to create a second writer. Extension lifecycle/access requires separate review if introduced. Watch/TV/Wear viewer capabilities are enforced in Rust regardless of caller. Companion file transfer and future network fallback validate snapshots and have separate credentials/consent/sync policy.

## Browser details
Each participating tab has a native web adapter; its candidate dedicated worker acquires the relevant exclusive Web Lock before becoming the document writer. The ACTUAL coordinator/storage worker retains that lock through its writable lifetime and closes its store before orderly release. Other participants are clients. No heartbeat expiry, steal:true, forced takeover of a frozen owner or opportunistic second SQLite writer.

Use postMessage for local UI↔worker, BroadcastChannel for bounded same-origin/partition command/query/outcome records and discovery. BroadcastChannel cannot transfer MessagePorts; do not design an impossible port transfer bootstrap. Standard structured clone carries data, never pointers or functions. Schema/version validation, lossless integers, correlation, acknowledgements, bounded sending windows and receipt recovery remain required. Channel messages are not guaranteed delivery, durable logs or authentication. Browser-managed inbound queues cannot be advertised as hard memory-bounded against malicious same-origin code; use a dedicated app origin and CSP/dependency controls.

No SharedArrayBuffer, service worker as permanent coordinator or SharedWorker requirement by default. This transport does not select a SQLite VFS: dedicated-worker OPFS/Rust-Wasm integration, library catalog coordination, restart/quota/eviction and host suspension still need conformance. If required locking/storage capability is absent, deny unsupported persistent multi-client operation rather than silently weaken durability. Cooperative owner pause can reduce availability; it cannot justify unsafe takeover.

## Shared security, tests and logging
No cross-platform custom command packet protocol. Native RPC schemas/JSON records still require explicit versioning, generated/typed mappings, bounded validation and drift tests. Reject unsupported versions, wrong peers/capabilities, stale owner/incarnation, invalid numeric tags and oversized messages. Do not add a global agent endpoint; future agents need separate identity/permissions even when using the same commands.

Log connect/disconnect/auth-reject/admission/reconcile/overload with ephemeral correlation, reasons and timings only. No payloads, document paths, persistent IDs, signing credentials or per-sample logging. Limit queues, request windows and replies using the platform profile; macOS caps are not automatically mobile/browser profiles.

Required evidence: two real peers; wrong identity; viewer rejection; owner freeze/death; actual lock release; duplicate/lost/reordered outcomes; receipt reconciliation; lossless integer boundaries; payload/depth/capacity overload; downgrade/upgrade; local/remote measured input latency; broker registration/disable/uninstall; app lifecycle and store sandbox/package checks. Full-platform scenarios remain unimplemented. Prior bundled XPC/headless API probes prove only their stated primitives.

## Sources checked 2026-10-16
- [Apple XPC rendezvous](https://developer.apple.com/forums/thread/715338), [SMAppService](https://developer.apple.com/documentation/servicemanagement/smappservice).
- [Windows IPC](https://learn.microsoft.com/en-us/windows/apps/develop/communication/interprocess-communication), [pipe security](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights), [StreamJsonRpc](https://microsoft.github.io/vs-streamjsonrpc/docs/connecting.html).
- [D-Bus specification](https://dbus.freedesktop.org/doc/dbus-specification.html).
- [Android bound services](https://developer.android.com/develop/background-work/services/bound-services), [AIDL](https://developer.android.com/develop/background-work/services/aidl).
- [UIKit scenes](https://developer.apple.com/documentation/uikit/scenes), [WatchConnectivity](https://developer.apple.com/documentation/watchconnectivity).
- [Web Locks standard](https://www.w3.org/TR/web-locks/), [HTML BroadcastChannel](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts).
