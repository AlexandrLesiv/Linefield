# Approved donor browser scenarios

These three fixtures originate from the complete approved handoff's `evidence/latest-validation` directory (2026-10-20). They run only in fresh isolated browser documents through `vector-approved-acceptance.mjs`, never against a user's live drawing. They exercise DOM pointer/command/rendering/history paths; the private diagnostic API observes results and switches rendering variants for parity. Temporary pointer-capture and readback instrumentation is restored by the fixtures.

Adaptations: formatting and removing an unused local assignment while retaining its `lab.layers.create()` call for repository lint. No assertions, tolerances, workloads or behavior changed. The runner records each executed fixture's source hash. These are finite browser checks, not proof of physical Wacom latency, comprehensive platform support, regional precision, or final architecture acceptance.
