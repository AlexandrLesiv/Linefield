# SAVE-04 bounded preparation and retirement boundary

Experimental feature `save-idle` includes the prior checkpoint features. Build only into
`.build-cache/save04-rust-target`; existing preview assets and production ABI remain unchanged.
The parent save-idle probe owns scheduling, continuous input, exit requests and storage faults.
`idle-checks.js` owns boundary correctness; `idle-performance.js` supplies isolated phase timing.

`idle_begin()` freezes base/result and moves the pending byte Vec and source BTreeMap into one
builder without traversing them. Later completed edits accumulate separately. A fixed outer
allocation holds at most391 source blocks. Each `idle_step(token,budget)` moves at most64 sources,
encoding each eight-byte descriptor while appending its reference to a256-entry source block.
Each descriptor block is at most2048 bytes. No giant source collect or metadata concatenation
occurs. Stream0 virtually joins the fixed header, descriptor blocks and original pending bytes;
a65520-byte read copies at most33 descriptor blocks. Source streams retain SAVE-03 encoding.

Only a sealed batch exposes streams. `idle_ack(token,base,result)` validates the exact retained
batch and the existing sticky-overflow policy, then moves it into one retirement slot. It does
not destroy its sources or mark later completed revisions saved. A newer batch may prepare while
retirement runs, but its acknowledgement retries after the retirement slot becomes free.
Acknowledgement still depends on the trusted host's validated storage receipt; tests that
synthetically acknowledge data are performance fixtures, not evidence of durability.

`idle_cleanup(budget)` processes at most64 logical units: one shared source reference, one
<=256-point block from a uniquely owned source, or one empty source container. `Rc::try_unwrap`
separates last-owner Point destruction into those blocks. Only after all elements are drained
are the empty outer containers and trivial pending-byte allocation released. Allocator wall
time is measured, including the isolated final deallocation call; logical bounds are not a
hard real-time guarantee. No unacknowledged source is retired, cancelled or silently discarded.

API results:

- `idle_status`: bit1 preparing, bit2 sealed, bit4 retirement pending.
- `idle_begin`: nonzero generation, or0 rejected/busy.
- `idle_step`:0 invalid,1 pending,2 sealed; valid budgets1–64.
- `idle_base/idle_target`: u64 values; invalid token returns u64::MAX.
- `idle_stream_count`:0 until sealed; `idle_chunk/idle_chunk_ptr` match prior chunk semantics.
- `idle_ack`:1 accepted,0 rejected/busy; never inferred from a timer.
- `idle_cleanup`:0 empty/finished,1 pending,u32::MAX invalid budget.

Cleanup operates only on the acknowledged retirement slot, so delayed cleanup calls cannot
release uncommitted work. Old prepare and restore publication reject while idle owns work;
idle begin rejects a retained old-style batch. This prevents accidental full destruction through
a compatibility/reset path. Old checkpoint APIs remain available when idle owns no resources.

The correctness fixture compares9000-source bytes across both descriptor and body chunk boundaries,
checks frozen N while N+1 changes, stale identities, busy acknowledgements and reset exclusion.
It also removes the engine's source ownership through real Undo and redo-branch discard, requiring
3911 budget-one cleanup calls for a million-point last-owner source. This distinguishes bounded
Point destruction from merely decrementing still-shared references.

Performance calls use separate yielded tasks and distinguish fixture creation, freeze, preparation,
metadata encoding, acknowledgement, cleanup and final allocator release. The measurement driver
is not the host idle scheduler. Browser timing includes quantization and scheduling variability;
zero readings mean below resolution. Wasm linear memory is not process RSS or save-only memory.
Cold reload, completion-hook costs for large operations, recoverable journal overflow, production
storage streaming and Rust-owned full receipt identity remain separate unresolved work.
