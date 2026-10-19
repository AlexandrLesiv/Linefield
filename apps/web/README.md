# Linefield live web prototype

Vite + strict TypeScript + semantic HTML + Vanilla Extract. Shared semantic light/dark colors live in shared/theme; the web adapter supplies CSS variables without duplicating palette values. Generated en/uk resources come from the shared semantic catalog in shared/localization; see its README for authoring and platform generation. Owner-authorized Web gallery design prototype; current choices and limitations are in [the design record](../../docs/design/live-web-prototype.md).

From the repository root:

- pnpm install --ignore-scripts --frozen-lockfile
- pnpm web:dev — http://127.0.0.1:65142/
- pnpm check — shared locale validation/tests, strict types, lint, formatting and source size
- pnpm web:build — production bundle in apps/web/dist
- pnpm --filter @linefield/web exec playwright install webkit — install the pinned WebKit test browser; Chrome must also be installed locally
- pnpm web:test — headless Chrome interaction/negative tests plus WebKit touch-feedback coverage

Resize the browser and use its OS/theme preference or developer-tools emulation. Every viewport uses the same Web gallery pattern. Legacy `?preview=1` and `?platform=…` links have no special effect; the platform picker, Reset samples and simulation controls are removed. All live cards use ellipsis menus, preserving browser right-click/long press. Narrow populated layouts use the fixed New drawing button; wide or empty layouts use the dashed New tile. Three centered tracks adapt to two and one as the viewport narrows; a custom overlay scrollbar reserves no layout space. Review menu-to-Rename, same-slot Delete/Undo and whole-card/artwork expansion/return. Drawings use /drawing/<id> paths; deploy the production bundle with an entry-document fallback for those paths.

All sample changes are in memory and reset on reload. Known drawing paths reopen fresh samples; New is a transient blank preview and never adds gallery entries. Web is now the first implementation platform; macOS remains the primary product target (decision231). This current prototype is not yet the Rust/Wasm drawing editor or persistent storage implementation. Those remain gated by P05, reviewed interfaces and native/design review requirements. No dependency on the old project or design experiments is required to run/build.

The shared night scheme uses charcoal surfaces and softer off-white display paper. Original artwork files remain unchanged. Rename controls retain shared hover/pressed feedback. This is one responsive browser UI; it no longer simulates native SDK appearance or viewer capabilities.

Decision227: trusted data-only TypeScript is the authoring format for the shared locale and theme catalogs. Build-time generators retain their existing native/web output formats, runtime validation and deterministic output checks. Native host integration remains separate; see [shared resource plan](../../docs/design/shared-resources-plan.md).

Run reports and screenshots remain in ignored local output or task PR attachments. See [quality requirements](../../docs/quality.md). App unit checks run with pnpm web:unit; browser checks run with pnpm web:test.

## Selected drawing-screen prototype

P05-D01 implements the owner-selected slim left rail and contextual top settings. Five modes and ranges are disposable UI state; only the isolated stroke sample changes. Sample/blank artwork remains static. Color/settings are visibly unavailable, zoom is a fixed readout, and the screen explicitly says artwork is not editable. Back/history return to the unchanged gallery; idle Escape stays on the drawing. Browser/OS theme and English/Ukrainian locale selection remain automatic.

Drawing and localization cases live in tests/. These browser checks do not establish a drawing engine, persistence, native support or linguistic approval.
