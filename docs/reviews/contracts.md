# Contract review boundaries

Decisions 181, 209 and 237 approve identified schema/semantic planning scope;
implementation, platform feasibility and exact new material mechanisms remain separate.
Use the [decision log](../decisions.md) for authority and the current sources below.

| Area | Current source and disposition |
| --- | --- |
| Document/storage rules | [constraints](../database/constraints.md), [regional coordinates](../database/regional-coordinates.md), [removal](../database/removal.md) and shared schema definitions; approved policy/shape with runtime gates |
| Typed native boundary | [commands](../interfaces/native.md) and [queries/effects](../interfaces/native-queries.md); approved baseline, not generated/compiled native code |
| Regional engine boundary | [proposal](../interfaces/regional.md); exact signatures and precision envelope still require review |
| Ownership and recovery | [recovery](../architecture/recovery.md), [coordination](../architecture/incremental-collaboration.md), [platform adapters](../architecture/platform-ipc-defaults.md) |
| Capacities | [limits](../architecture/limits.md), [budget review](engineering-budgets.md); selected starting values are not measured acceptance |
| First durable library | [scope](durable-library-scope.md), [interface](../interfaces/durable-library.md), [bootstrap](../database/empty-library.md), [design](../design/durable-library.md); implementation approval pending |
| Browser persistence | [storage proposal](../architecture/browser-storage.md); production adoption blocked by preservation failures |

One authoritative Rust coordinator mutates each drawing; clients own independent
interaction/presentation state. Native adapters do not duplicate editing, saving or
recovery policy. Ordinary native durability uses WAL + FULL without F_FULLFSYNC;
browser storage requires its independently reviewed adapter and evidence.

Pending RAM is not durable. Lost replies require identity-fenced outcome reconciliation;
missing receipts are Unknown. Preserve conflicting work, reject stale authority and keep
unresolved dependent commands paused. Future cloud preserves versions rather than silently
merging their semantics. No cloud implementation is selected by these contracts.

Before production implementation, complete applicable ABI compilation, hostile-input and
fault cases, signed/sandboxed IPC feasibility, native access-grant identity, browser storage
preservation, exact numerical limits and identified UI review. A proposal, static check or
schema approval does not establish runtime correctness, durable storage or native parity.
