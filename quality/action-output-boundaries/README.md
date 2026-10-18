# DX00 output boundary coverage — 2026-10-18

Test-only follow-up for CT-07/08, INV-09 and DX-ACTION-003/004/005. No production behavior, dependency or action contract changed. Build-reliability supplied the scoped coverage recommendations.

Four direct-child tests cover the inclusive combined stdout/stderr ceiling, one-byte overflow, UTF-8 byte accounting and content exclusion, unsolicited signal termination, and cancellation-listener cleanup across success/failure/output-limit/spawn-failure while preserving an existing listener. Fixtures naturally finish writes; overflow does not assert a timing-dependent exit signal. No server, desktop interaction or escalation was used.

Evidence: check.log records the full root check; manifest.json pins test and production adapter/contract sources, base revision and actual runtime/host. Independent review status is recorded there. This is local direct-child coverage on the recorded host, not descendant-process, Zed runtime, browser or native application evidence.
