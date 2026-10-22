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

M03 transactional tails add explicitly display-only source snapshots (SEC-03/09/13,
CT-03/04/06). Their generated named APIs validate owner/session/mapping, fixed raster anchor,
source incarnation, captured-neighbor bound, parent ticket/page and sequence. Ordinary current
geometry, canonical page-cache reuse and readiness queries must reject their proof kind even
when the captured count happens to match. Cancel/history/lifecycle invalidation is permanent;
Undo followed by Redo cannot revive a handle. Test both allocation orders against the combined
eight frame/tail receipt cap and the fixed two-tail-slot/1 KiB metadata bound.

The host retains one front and one building tail, with one latest scalar request, one pending
ticket and one transient page. Publish by synchronous whole-mask replacement; empty replacement
also clears old support. Captured CPU completeness is not current source, GPU validation or
physical presentation. Frozen-source progress must continue under new input without allowing
old content to acknowledge the newest frame. Resource accounting uses actual 9P/12P target
payload and residual geometry within the same 192 MiB aggregate, including retiring generations.
Test distinct sampler/write textures, partial allocation cleanup and stale callbacks after
Cancel/End/pan/resize/restore/fatal. Healthy release disposes child descriptors; terminal-fatal
host cleanup must never call the poisoned editor, including through wrapper finalizers.

## Bounded developer diagnostics

Decision243 authorizes P05-DIAG01's bounded opt-in diagnostic UI/export (CT-06/07,
SEC-02/03/09/13). Its schema uses
allowlisted temporary correlations, counts and clock domains, without artwork, raw input,
names, paths, credentials or automatic network transfer. Detailed capture and export buffers
are separately bounded and measured; overload/sink failure cannot fail an edit. Test privacy
canaries, user-action-only export, callback overhead, explicit partial/dropped state and no
pointer/focus interception. Approval of the plan is not current implementation/evidence.

Copy only finite bounded numeric values, fixed enums and checked build/ephemeral identifiers;
never retain editor snapshots, mutable foreign wrappers or arbitrary metadata/error objects.
Discard unknown fields without retaining the caller object; reject invalid allowlisted values
before retention. Content canaries must not survive copying or export. Correlation is diagnostic
metadata, never permission to mutate or certify a frame. Terminal state forbids new Wasm queries.
An idle failed editor may inspect/export/clear an existing host-only report. New capture is
disabled; terminal transition freezes an existing capture as partial. Diagnostic availability
never authorizes drawing or recreates an editor owner.

Capture-limit and failure notifications cannot synchronously invoke subscribers/layout from
input callbacks. Freeze the bounded store immediately, then coalesce presentation off the input
path. Export prepares bounded chunks with host-task yields; interaction-epoch changes, Clear,
capture replacement, hidden/departure and terminal transitions fence completion, even without
an interaction-epoch change. A stale async result cannot initiate a
download. Fresh explicit idle action is required; failed download preserves the report for
retry, and temporary URLs/buffers have bounded release. No recursive fault logging or retry loop.

Actual-app DIAG-01–06 must test malformed/canary input, overload, exact boundaries, export
failure/races, hidden/accepted versus rejected departure, terminal cleanup, stale metrics,
overlay fit and input/focus priority. Review off/on performance separately from software event
traces; accounted/logical bytes do not establish physical JS or driver residency.
