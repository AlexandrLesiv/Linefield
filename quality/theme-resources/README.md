# Native theme resources — 2026-10-17

Decision230, THEME-10–13. Shared23 semantic roles resolve into29 ignored generated files for Apple, Android, WinUI and GTK, including both appearances and all alpha channels. Current colors unchanged; native application inclusion is not implemented. See [authoring/inclusion guide](../../shared/theme/README.md).

Revision: fa38072da22015a965da145d6635e4e6da8ba8d7 plus preserved dirty worktree; source-hashes.json identifies the integration source and generated-hashes.json identifies all output bytes. Platform: macOS27.0.1 build26A434 arm64, Node24 nativeTypeScript.

Passed: pnpm check (10theme/resource tests +14locale/authoring tests, type/lint/format/size,29-file resource drift), pnpm theme:native-check (3XML/XAML parsed with xmllint; Androidaapt2 2.20-13193326 SDK36.0.0 resource compilation). Reproducible native checks use disposable fixtures and report missing tools separately. Generation tests cover exact role/mode/channel conversion, collisions, deterministic output, no-op timestamps, missing/stale/extra output and restoration.

Independent reviewer found and resolved a runner issue: a broken installed compiler was initially treated as absent. Final negative subprocess probe exit17 correctly fails with allowlisted android/probe/exit metadata and no private output or fallback. Reviewer independently reran resource tests, XML/Android compilation and3picker browser cases; no remaining actionable findings. No baselines weakened.

Not run: Apple asset compilation (actool unavailable here and not part of portable runner), WinUI compilation, GTK CSS runtime loading, native app linking/consumption, native accessibility/device acceptance. XML syntax success does not certify WinUI compilation. Generated Light/Dark resources require host-owned accessibility/system-color mappings. No nativeUI foreground session used.

Browser integration: [web-preview-controls](../../apps/web/quality/web-preview-controls/README.md),126 tests passed. No merge/publish performed.
