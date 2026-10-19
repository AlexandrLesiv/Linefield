# Browser storage readiness

**Neither tested browser-storage candidate is cleared for production adoption.** The synthetic
experiment found a payload-preservation failure in the same-worker SAH pool and left ownership
fencing unproved for ordinary OPFS. No real drawing, production persistence or recovery system
was implemented by the experiment. This is an unresolved finding record, not a current test run.

## Confirmed preservation failure

With SQLite Wasm 3.54.1, a healthy 20,480-byte synthetic opaque file was copied before one pool
metadata byte was damaged. Fresh SAH-pool initialization succeeded with no mapped names,
logged “Disassociating file with bad digest,” and truncated the file to 4,096 bytes. Its SQLite
payload was lost despite `clearOnInit:false` and `preserveOnInitFailure:true`. The latter option
only affects a separate failed-initialization cleanup path; it does not protect all existing bytes.

Original diagnostic byte identities, retained for recognizing the archived synthetic canary:

- Before SHA-256: `24cac60e7ba65467e015ac4e01e82b2ea49e316f55a664253f7dd25689fc3039`.
- After SHA-256: `ad7facb2586fc6e966c004d7d1d16b024f5805ff7cb47c7a85dabd8b48892ca7`.

The runner's successful exit meant it recorded the fault, not that storage was safe. Five healthy
pool lifecycle cases did not establish corrupt-file, quota, close or initialization-failure safety.
No workaround, custom VFS or automatic destructive recovery is approved by this finding.

## Unproved ownership and recovery

Ordinary OPFS demonstrated selected commit/reopen, worker exclusion, termination and restart
cases. A proxy was paused before a real flush; no old-proxy flush start was observed after parent
termination and successor ownership during the bounded observation. This does **not** prove
STORE-W9: already-issued browser I/O and a proxy paused before acquiring a sync handle, then
resuming after its successor closes, remain uncovered. A no-event observation is not fencing.

The post-commit termination fixture already knew COMMIT succeeded; it did not simulate a genuine
lost reply. Workers sharing one page did not establish multi-tab attachment. Firefox failed to
launch its profile before storage execution; that is an unrun lane, not proof of incompatibility.
The limited WebKit run did not establish parity with the Chrome cases.

## Evidence required before adoption

| Gate | Still needed |
| --- | --- |
| STORE-W1 | Firefox runtime and complete dependency/license/advisory assessment |
| STORE-W2 / W9 | Multi-tab ownership, old-worker/proxy retirement and pending-handle authority |
| STORE-W3 | Genuine lost-reply receipt reconciliation |
| STORE-W4 | Non-destructive corruption handling, quota/I/O/flush faults and reconstruction |
| STORE-W5 | Scope ordering, orphan claims, frozen owners and generation fencing |
| STORE-W6 | Bounded queue/copy/Wasm/proxy memory and capacity evidence |
| STORE-W7 | Durable localized UI, history and recovery behavior |
| STORE-W8 | Refusal, eviction and actual durability limits; restart alone is insufficient |
| STORE-W10 | Client hosting, rename projection repair and catalog reconstruction |

A proposed pre-initialization inspection/quarantine mechanism must preserve damaged or ambiguous
bytes under the same exclusive ownership. Its metadata rules, atomicity, failure behavior and
upstream compatibility require concrete review before implementation/adoption. Do not rerun old
fault fixtures against user data or infer a production Saved guarantee.

The isolated [browser-storage harness](../../scripts/probes/README.md) remains reproducible
source for this unresolved product decision. Run `node scripts/probes/browser-storage/acquire.ts`
first, then `node scripts/probes/browser-storage/run.ts` for ordinary OPFS, or
`node scripts/probes/browser-storage/pool-run.ts` for the synthetic pool diagnostic. The ordinary
runner accepts an optional `firefox` filter. Runs require a local listener and installed headless
browsers; use isolated synthetic profiles only. Dependencies and reports go to ignored
`.build-cache/browser-storage`. Preserve unresolved evidence before rerunning; never interpret
a diagnostic completion as adoption approval.
See [storage contract](../../docs/architecture/browser-storage.md),
[durable-library scope](../../docs/reviews/durable-library-scope.md) and
[storage task](../../tasks/S02-P01.md). The proposed SQL constraints still require coverage through future authorized durable-library
E2E flows. Removed standalone SQL checks are not current validation evidence.

The library proposal also still needs genuine lost-reply, multi-tab, runtime accessibility and
proficient Ukrainian review evidence. Static design review does not satisfy those gates.
