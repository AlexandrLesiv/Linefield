# Browser prototype evidence

This directory owns browser-only acceptance reports, review records and source/build manifests for the [live web prototype](../README.md). Shared contracts, cross-platform reviews and repository-tooling evidence remain in [root quality](../../../quality/README.md). Browser platform previews do not certify native device behavior.

## Retention

Version small reports, acceptance records and source/build hash manifests. PNG, JPEG, WebP, GIF and video captures under web-* run folders are disposable local artifacts and Git-ignored. Keep app fixtures in apps/web/public and intentional design references in docs/design/references versioned. Shared review or CI should publish captures as retained run artifacts; artifact hosting is not configured here.

## Historical relocation

On 2026-10-17, all 13 root quality/web-* directories moved here with their existing names. All 176 files, including ignored captures, were retained byte-for-byte (6,528,501 bytes). Historical logs, JSON reports, source manifests and run READMEs preserve original recorded paths and commands; interpret their quality/web-* artifact locations as apps/web/quality/web-* after relocation. Their recorded source hashes and execution claims describe the original runs, not this move. Active documentation and capture destinations use the new location.

Capture links resolve only where their local or uploaded artifacts were retained. Do not edit old reports merely to make historical commands appear current.

## Latest verification

See [menu source elevation](web-menu-shadow/README.md) for the latest scoped fix (12 focused cases plus quality checks/build), and [clean header](web-clean-header/README.md) for the preceding full 126-case browser run. These are different source snapshots; the full suite was not rerun after the menu-shadow fix. Current handoff and remaining gaps: [RESUME](../../../docs/RESUME.md).
