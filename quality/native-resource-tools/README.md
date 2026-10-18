# Native resource-tool failure reporting — 2026-10-18

S01/S00B, LOC-NATIVE-01/02 and retained THEME-13. Locale syntax checks previously ignored nonzero/non-ENOENT version-probe errors, performed unbounded version probes and printed raw compiler errors/paths. They now share the existing theme helper, extracted to scripts/resource-tool.ts with a compatibility re-export. No new command or dependency is introduced.

Only missing probe executables report not-run. Failed probes stop before compilation; nonzero/execution failures use allowlisted tool/stage/exit/signal/reason fields. Tool output is capped at128KiB; calls request termination after30seconds. This inherited synchronous helper does not guarantee a hard wall-clock deadline if a process ignores termination, and does not manage descendant processes. Success output is discarded by the locale caller; theme keeps its existing allowlisted version extraction.

Three added tests execute disposable Node tool fixtures through the actual locale CLI, confirm probe/compile failure and compilation-marker behavior, reject excessive output and assert private sentinel/path exclusion. Existing THEME-13 covers missing tools and helper failures. Fixture execution evidence is macOS; no Windows executable-fixture claim.

check.log records87 passing tests (14theme31localization28action14probe) and all root/web type, lint, format, resource-drift and source-size gates. locales.log records8XML and4gettext files passing installed syntax checks (libxml20913, GNU gettext1.0). theme.log records3XML/XAML files parsed and aapt2.20-13193326 resource compilation passed. Apple asset compilation, WinUI compilation and GTK runtime are explicitly not-run. None is native application E2E, linked-app or linguistic acceptance.

manifest.json records exact changed source hashes, host, preserved generated resources and independent review. Existing uncommitted work remains intact; no browser, foreground automation, escalation, installation or system configuration change occurred.
