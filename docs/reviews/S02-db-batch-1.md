# S02 database decision batch 1 — 2026-10-16

Status: owner choices recorded; documentation only. Exact answer: “DB1: A; DB2: A; DB3: A; DB4: B”.

| Question | Selected policy | Still pending |
| --- | --- | --- |
| DB1 / D1 | Three databases, conservative catalog-loss recovery; no fourth control database | Trustworthy restoration procedure and explicit degraded-state transitions |
| DB2 / D7 | Persistent activity counter; timestamps remain independent | Precise durable allocation/retry/recovery sequence and bounds |
| DB3 / D6 | Multiple bounded rename receipts, generation/expiration rules | Numeric limits and exact retention/admission policy |
| DB4 / D8 | Rust formats localized default names, no native effect/reply | Typed language input, reviewed en/uk messages and shared fixtures |

The initial Version 3 table approval is preserved in S02-table-structure-approval-2026-10-16.md. The catalog counter amendment replaces drawings.effective_sort_time_utc_us with activity_order and adds library.activity_highwater; 14 tables/105 fields/8 references in the combined review. This is the documentation consequence of DB2, not tested migration DDL or blanket approval of the ABI. Existing activity triggers are unchanged. Unknown historical order cannot be recovered from a counter after catalog loss.

Default-name messages are a narrow exception to native wording ownership; ordinary native controls/errors/parsing stay native. First English name remains Untitled, then Untitled 2. Preserve allocated-number gaps and existing stored names after language changes.

Pending next batch: D2 drawing lifetime ownership, D3 authenticated cross-process rename candidate, D4 copied typed boundary and D5 readiness notification. Application implementation remains unauthorized. No runtime tests performed.

## Verification and hosted update

Official pinned CLI validation passed. Canonical/combined table field/type/key/nullability parity passed using the current DBML parser: 14 tables, 105 fields; Rust agent TOML parsed. An initial auxiliary check used the older parser entry point, which rejects reference colors; rerunning through the current compiler passed without modifying schema/presentation to hide the incompatibility.

Independent read-only reviewer s02_packet_review found no actionable issues in the decision alignment. No application tests ran. Private dbdocs publication succeeded and browser verified Version 5 with selected DB1–DB4 notes and 105 fields. Existing sharing was not changed. No local rendered diagram directory was created.

Next question batch: [ownership and interfaces](S02-db-batch-2.md). Source hashes for this update: ../../quality/S02-db-batch-1.json.
