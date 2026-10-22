# MIG-C1 security and failure delta

P05-M01; decision242. Generated FFI is a typed boundary, not a security sandbox.

| Risk / contracts | Required rejection and observable behavior |
| --- | --- |
| SEC-02 / CT-02/06 | Reject NaN/infinity, wrong types, malformed lengths, detached/shared/resizable arrays before mutation; whole current batch cancels, no partial stroke |
| SEC-03 / CT-03/04 | Wrong owner/session/mapping/interaction/cursor cannot mutate current state or publish stale frame; overflowing IDs never wrap |
| SEC-09 / CT-06/07 | Bound copied pages, jobs, queues, GPU capacities and logs; actual allocation failure preserves completed work and exposes recoverable state |
| SEC-10/11 / CT-08/09 | Local pinned Wasm/worker/assets under narrow CSP; no eval/remote shaders/network/unsafe raw pointer ABI |
| SEC-13 / INV-08/11 | Context/worker loss, late callbacks, resize and teardown dispose generations; incomplete output cannot acknowledge readiness |

Snapshot arrays are host-owned copies. Preparation Wasm contains no editor mutation exports.
Main Rust validates job relevance; a worker cannot authorize edits. Worker messages use explicit
versioned typed records, not arbitrary executable commands. Production excludes fixture mutation
hooks, debug document access and per-sample logs. Diagnostics carry only bounded allowlisted
identities/counts/status/durations, never raw coordinates/content/names/serialized documents.
Capped asynchronous sinks count drops/failures without failing successful edits.

Canonical/history memory is distinct from disposable caches. No document quota is inferred from
soft targets. Cache exhaustion must choose complete streaming or explicit mandatory-resource
failure, never invisible success. One reduced rebuild attempt then user-visible Retry prevents
spin/DoS loops. Browser/OS termination cannot be recovered by in-memory-only state.

Each implementing leaf adds real browser E2E for its exposed malformed/stale/lifecycle/failure
paths and inspects production output for test-hook exclusion. Separate numerical/performance
experiments from E2E claims; no unit or developer-tool suite is introduced.

M03 history continuity adds the generated read-only `memoryFrameDisplayTransform` boundary
(CT-03/04/06, SEC-03/13). It transforms one retained same-session validated raster through Rust
camera arithmetic; it does not certify current source content. Reject wrong owner/session,
stale mapping, released receipts and changed metrics. Historical output cannot authorize edits,
geometry adoption, hit testing or current-frame acknowledgement. Keep strict prefix checks on
all existing semantic/frame-preparation paths. Test those negative outcomes separately from the
positive retained-image journey, including receipt retirement and fatal no-more-export behavior.

M03 cold-admission scheduling adds one bounded waiter/deadline timer before GPU reservation
(SEC-09, CT-06/07). Cancellation/error must wake and retire the gate independently of a stalled
worker reply; no timer, borrowed payload or abandoned reservation may survive teardown. Test
reply/deadline/cancel ordering, group-only stalls and context failure. Existing source relevance,
queue/byte/fence limits and complete-frame validation remain unchanged (SEC-03/13).
