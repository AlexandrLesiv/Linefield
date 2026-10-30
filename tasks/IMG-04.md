# IMG-04 — recover abandoned image ownership

Owner authorized safe recovery of abandoned import/export assets, preserving all
data and drawing performance, with checks/reviews and a separate preview. Keep
65428 and all existing frozen previews unchanged; do not merge. This task stacks
on IMG-03 commit 8dbce16 / PR38 on branch codex/img04-asset-recovery.

## Contract

Asset ownership must not expire based on elapsed time, hidden tabs or worker
restart. The host acquires a per-lease browser Web Lock before requesting durable
staging or an export hold. The caller creates the unpredictable lease identity
before sending the request, so a lost response cannot hide ownership from it.
The lock belongs to the consuming main-thread session, not the storage worker.

Shared Rust defines the schema and checked SQL operations; the browser adapter
implements the Web Lock lifetime and serialized worker transport. A bounded idle
worker probe uses nonblocking exclusive lock acquisition to prove that an owner
is absent. Hold that proof lock through conditional lease deletion, with exact
document/revision fencing. Original-byte deletion still requires the existing
validated checkpoint roots and durable recovery-journal cleanup.

Unpublished cancellation and completed export release may relinquish ownership
even when the storage reply fails. A published import with uncertain completion
retains ownership and its publication revision through idempotent retry. Even a
successful publication acknowledgement does not release the owner lock until a
verified durable save receipt covers that revision: an unsaved live main thread
must remain protected across another writer's takeover. Live exports survive storage-worker
restart. Crashed documents release browser locks naturally. Normal document
close must not release a still-active export's ownership prematurely.

Version the ownership protocol in storage. Older leases that never held an owner
lock are not evidence of abandonment merely because no new-protocol lock exists.
Preserve uncertain legacy exports rather than inventing an expiry rule. No
rendering, input, decoded-pixel, file-size, GPU or Undo-history limits change.

## Acceptance

- Lost stage response before publication: no canonical image lost, abandoned
  original eventually reclaimed after worker recovery in the same session.
- Lost publication acknowledgement: accepted image remains protected, saves and
  reloads exactly; retry settles ownership without duplicating publication.
- Lost export-hold response and failed release: abandoned holds reclaim safely.
- Active export across worker restart/takeover: ownership remains protected;
  paused/hidden/slow consumers never expire.
- Page crash during export/import: fresh verified recovery reclaims unreachable
  originals while retaining every saved reference and history requirement.
- Legacy migration, interrupted cleanup and quota failure fail conservatively.
- Bounded queues/probes and drawing priority; measured pen/mouse sample retention
  and frame/dispatch responsiveness during recovery/cleanup.
- Static/build/generated checks, independent technical/design review, frozen
  actual-app preview and unmerged PR. Record measurements and limitations honestly.

## Implementation and measured checkpoint

Schema7 adds an explicit owner-lock name without copying original image bytes.
Main and worker use a Rust-generated lock namespace. The host tracks at most64
live capabilities; uncertain ownership is never evicted to make room. Save and
restore release published ownership only after Rust validates the durable receipt
or restored document. Export/import cancellation releases only its own identity.
The worker probes one indexed lease per step; a live owner requests a one-second
idle retry, which is scheduling backoff and never an ownership expiration.
Digest-only rooted-lease release was removed: a duplicate image can still need
its own live protection even when another current document reference exists.

The initial actual-app integration check passed import/editing/Undo/Redo, camera,
context recovery, save/reload and SVG. The first takeover race check preserved a
live unsaved image and export across worker loss/new writer grant, kept the image
after the export ended, and reclaimed it only after the owning page ended.

Performance checkpoint on Apple M2 Pro/16GB, macOS27.0.1, Chrome156.0.8078.79,
1280×900 CSS/DPR2: three paired baseline/import/warm trials using a32MiB PNG with
4096² decoded pixels. All nine strokes retained241 accepted samples and exact
saved/reloaded data; durable imports left zero live owner capabilities. Frame
median16.7ms, p99/max16.8ms; no50ms main-thread stalls. Maximum dispatch delay
3.4ms overall/2.7ms during import. Import readiness median4361ms (4334–4600),
metadata save/verification median727ms (721–854). The prior IMG03 same workload
had readiness median4422ms and save median757ms; these small differences are not
evidence of a speedup. Timing includes test delivery and drawing-priority waits.
This is injected pen/mouse input, not physical Wacom latency or peak-memory data.

Legacy exports created before schema7 remain conservative: they contain no
consumer-lifetime identity, and migration cannot invent evidence that their
reader ended. The new protocol fixes recovery for newly created ownership. No
timer-based deletion, rendering changes or quality reduction is introduced.

## Final acceptance

Browser recovery witnesses pass for lost stage/hold/release replies, lost
publication acknowledgement, and a forged receipt (ownership stays held until a
valid retry receipt). A shared original remains protected when a previous durable
root is retired while an older live session still owns an unsaved duplicate.
Ending that session triggers automatic reclamation without another edit.
Schema6-to7 upgrade preserves the saved16MiB original's exact SHA-256 and size;
injected quota/deletion failures roll back, and restart/retry retains saved data.
Normal import/editing/Undo/Redo, pan/zoom, graphics-context recovery, reload and
appearance-preserving SVG checks pass. Static TypeScript, scoped lint, generated
contracts and production builds pass. Independent technical/design review found
no outstanding blocker, with the explicit legacy exception above.

Additional lease-deletion fault injection preserved both the lease and original
on rollback; retry revisited the same cursor and reclaimed safely. The separate
drawing-during-recovery run preserved241 samples and prior raw data, with maximum
frame16.8ms, dispatch4.3ms and no50ms long tasks. The no-edit rescan witness is a
separate run, not inferred from the drawing workload.

Reproduction: `image-owner-races.mjs`, `image-owner-replies.mjs`,
`image-owner-duplicate.mjs`, `image-owner-transaction.mjs`, `image-cleanup-upgrade.mjs`,
`image-integration-app.mjs`, and `image-integration-performance.mjs` under
`apps/web/tests`. Local evidence stays in ignored `.build-cache/img04`.
New frozen preview: `http://127.0.0.1:65429/`. Preview65428 remains unchanged.
PR is stacked on PR38; do not merge either as part of this task.
