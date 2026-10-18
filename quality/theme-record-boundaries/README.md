# Theme validation record boundaries — 2026-10-18

S01 / THEME-RECORD-01–04: the prior validator counted own keys but tested required keys using inherited lookup. A record containing only own `dark` and `unexpected`, with inherited `light`, incorrectly passed. This was reproduced before the correction.

The validator now accepts ordinary/null-prototype records and compares the exact enumerable own-key set at root and scheme boundaries. Tests reject inherited and nonenumerable required-key substitutions, even when an extra own key preserves the count; reject custom prototypes with otherwise complete own fields; and verify null dictionaries/reordered keys generate identical resources without input mutation. Existing missing/extra/color/contrast tests remain.

No palette, contrast threshold, shared resolver, app style or generated format changed. This is trusted data-record correctness, not an accessor/proxy/global-prototype sandbox. In particular, this slice does not change shared/theme/resolve.ts or claim that every generator validates arbitrary hostile objects.

Full check.log:84 tests (14theme28localization28action14probe), all root/web type, lint, format, resource drift and source-size gates pass. All41 generated resource hashes and139 recorded D01 source/resource/build entries remain unchanged. Browser/native tests were not rerun. manifest.json records two source hashes, host and independent review. Existing uncommitted work is preserved; no desktop automation, escalation, dependency or system change occurred.

Deferred audit observation: the localization native-tool probe currently lacks the theme checker's bounded/redacted helper and ignores some probe failures. This is a separate potential follow-up; it is not fixed or covered by this theme record slice.
