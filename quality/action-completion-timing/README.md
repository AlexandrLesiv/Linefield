# DX00 report completion timing — 2026-10-18

CT-08 / DX-ACTION-010 and retained DX-ACTION-004 cancellation: job finish time previously preceded final revision metadata collection. The internal report finalizer now samples UTC completion and elapsed monotonic time after that collection. Duration retains the original job start and excludes serialization/stdout delivery. The report schema, available actions and cancellation policy are unchanged.

A controlled promise verifies that clock sampling waits for metadata, happens exactly once and includes the pending phase in normal and cancelled cases. No sleeps or wall-clock thresholds. Existing cancellation and output-failure coverage remains. Initial test authoring required adapting the deferred promise to the existing TypeScript library target; no compiler configuration changed.

check.log records80 passing tests (10theme28localization28action14probe) and all required static/resource/size gates. locales-check.json records a real installed-tool action passing with matching before/after source fingerprints and finalized timing. That one action verifies CLI integration; other action executions retain earlier evidence, not a new five-action run.

manifest.json identifies exact source/contract hashes, host and independent review. No application source, native/browser runtime, service, dependency, privileged operation or foreground automation changed. Existing intentional uncommitted work is preserved.
