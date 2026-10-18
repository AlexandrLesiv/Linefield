# Retained attempt history

1. Sandbox network preflight: `fetch` failed with ENOTFOUND sqlite.org. No archive acquired.
2. Explicitly authorized acquisition outside sandbox:728897bytes; pinned SHA3 matched.
3. First runner attempt: failed before browser launch because Node could not import named exports
   from Playwright's CommonJS entry. Corrected to a default import; strict type check passed.
4. Second runner attempt: stopped by lead with SIGINT/exit130 after no useful bounded result.
   Inspection found absent sqlite3.dir worker URL hint, causing vendor asset resolution to the
   wrong directory. This is a fixture defect, not a storage failure. No pass evidence retained.
5. The next runner adds explicit vendor directory, bounded evaluation/RPC/lock waits and console
   diagnostics, plus independently reviewed pre-flush instrumentation. Its exact final outcome is
   recorded separately in results.json; prior attempts are not erased or called passes.

The initial unsuccessful attempts did not produce complete source-hash manifests. Their exact
build is therefore not reconstructable from a retained snapshot; the defect descriptions above
are diagnostic history, not acceptance evidence. Final executable source hashes accompany results.
