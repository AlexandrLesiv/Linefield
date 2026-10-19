# S02 v2 security design delta
Status: proposed mitigations, not implemented controls. Sensitive design requires owner approval and independent review of the final snapshot, then implementation-specific review before merge. Existing SEC IDs retained; day-zero record immutable.

| Risk | Changed exposure / invariant | Proposed mitigation | Evidence needed |
| --- | --- | --- | --- |
| SEC-01/02 | More fields, receipts and hostile input capacity | Closed SQLite schema, fixed SQL, finite values/UUID lengths, bounded admission and decomposed projections | S02V2-01/17/20/22; schema fuzz |
| SEC-03 | Client handles, copied buffers, host directory descriptor | Generation/thread checks, borrowed-memory preconditions, explicit dup/close, typed structs not pointer IPC | S02V2-11/13 + descriptor lifetime native probe |
| SEC-04 | Rename-only peers now can edit; expired receipt replay | Authenticated connection separately from claimed IDs; live replay floors/window; old generations query-only; no timeout authority | S02V2-03/04/05/06/09; two-process signed sandbox probe |
| SEC-05/06 | Incarnation does not prevent raw file swap; resumed grant access | Stable managed-file/parent identity and held ownership; exact consent recheck; uncertain publication pauses | S02V2-18/21; native grant/destination proof remains open |
| SEC-07/08 | Concurrent admission/maintenance/recovery across DB files | Short mutation coordinator, durable intents, conservative lost-authority handling, protected copies | S02V2-15–19; kill each durable checkpoint |
| SEC-09 | Receipts/digests/client IDs can leak private activity | Empty receipt table in newly constructed portable output; no private fields in logs; raw byte canaries | S02V2-20/23; redaction review |
| Availability | Malicious/slow peer pins receipts, readers, queues | Per-client and aggregate reservations; fail admission without dropping accepted work; reserved recovery lane | S02V2-06/15/22 |

Trust limitations: peer principal/authentication adapter must be proven; UUIDs and directory descriptors presented by arbitrary untrusted code are not automatically valid grants. Local FFI caller remains trusted to supply valid addresses. External writers with raw filesystem access can violate cooperative ownership. No encryption/server/cloud security selected here.
No network uploads of diagnostics or drawing contents. Existing approved private historical schema review publication contains schema/notes only. CLI credential policy unchanged.
Review status and final hashes: the recorded approval in decisions.md. Planned tests are not executed evidence.
