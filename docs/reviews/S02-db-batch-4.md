# S02 decision batch 4 — lost acknowledgements and conflict-copy retention

Status: owner selected DB15-A and DB16-C on 2026-10-16 (decisions 173–174). Alternatives remain for review history; no other option selected. DB11–DB14 are A, decisions 169–172. Existing migration-copy retention (decision 40: latest verified pre-upgrade copy) is unchanged. No application implementation, new schema source publication or cloud work authorized.

## DB15 — Durable outcomes for completed editing commands

A (recommended): generalize the existing rename-receipt concept to a bounded private record of relevant completed mutating command outcomes, committed atomically with their drawing changes. A retry with the same operation identity can query the recorded outcome after a lost reply rather than apply twice. Validate arguments, incarnation, identity and authorization; do not trust client claims. No full command payload history, persistent Undo, client journal or CRDT selected. Exact scope/encoding/schema, retention, resource admission, generation handling and export scrubbing need concrete review.
B: keep durable receipts limited to rename; reconcile edits from current durable state only where outcome can be proven. If the outcome is ambiguous, preserve pending work and require explicit recovery rather than automatic retry. Less stored metadata, but less seamless reconnection and more unresolved outcomes.
Under either choice, a missing/pruned record is Unknown, not proof the command never ran. Do not infer unlimited deduplication or unlimited storage.

## DB16 — Retention of future sync conflict copies after resolution

A: retain the displaced protected version until explicit user deletion. Resolving which version is active is not deletion consent. Account copies against a reviewed budget; when required preservation cannot fit, block destructive replacement and ask for storage/cleanup rather than silently evict unique work.
B: retain resolved copies for a reviewed bounded retention period, then automatically prune eligible copies under a disclosed policy. Unresolved versions and copies referenced by active recovery remain protected; clearing a conflict does not by itself prove cleanup eligibility. Exact period/budget needs the concrete packet.
C (recommended for current local scope): defer this cloud-specific retention choice until the cloud milestone; retain decision 166 preservation-first requirements and block destructive resolution without approved preservation/retention behavior.
This is separate from migration copies, export-job snapshots and logs. Cloud implementation and conflict/cleanup UI still require separate scope/design review approval.

After these answers, produce a consolidated concrete proposal for numeric budgets, SQLite configuration, recovery transitions and amended schema/interfaces. Do not re-ask settled choices such as WAL, one-second maximum deliberate save batching, bounded editing during storage failures or latest pre-upgrade-copy retention. Engineering recommendations require rationale and validation plans; no measured limits or runtime pass claims exist yet.
