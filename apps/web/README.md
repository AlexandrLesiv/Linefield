# Linefield live web prototype

Vite + strict TypeScript + semantic HTML + Vanilla Extract. Shared semantic light/dark colors live in shared/theme; the web adapter supplies CSS variables without duplicating palette values. Generated en/uk resources come from the shared semantic catalog in shared/localization; see its README for authoring and platform generation. Owner-authorized Native Gallery design prototype; current choices and limitations are in [the design record](../../docs/design/live-web-prototype.md).

From the repository root:

- pnpm install --ignore-scripts --frozen-lockfile
- pnpm web:dev — http://127.0.0.1:65142/
- pnpm check — shared locale validation/tests, strict types, lint, formatting and source size
- pnpm web:build — production bundle in apps/web/dist
- pnpm --filter @linefield/web exec playwright install webkit — install the pinned WebKit test browser; Chrome must also be installed locally
- pnpm web:test — headless Chrome interaction/negative tests plus WebKit touch-feedback coverage

Resize the browser and use its OS/theme preference or developer-tools emulation. The whole review-controls section (platform picker, Reset samples and Browser simulation) is omitted from normal web entry. Open `/?preview=1` (or an explicit valid `/?platform=ios` link) to show these controls for review. It previews presentation and view-only capability; it does not emulate a native SDK. On Web, review overflow morph, direct menu-to-Rename, staged deletion/Undo and tile expansion/return. Browser right-click/long-press remains untouched. Native desktop previews use pointer context menus; iPhone/Android previews use finger-following swipe only in single-column layouts, full-card sliding Delete/Undo and a compact fading Rename form. iPad and wider phone layouts use ellipsis controls. Three centered minmax tracks adapt to browser dimensions; a custom overlay scrollbar reserves no layout space. The platform selector never rewrites the URL. Drawings use /drawing/<id> paths; deploy the production bundle with an entry-document fallback for those paths.

All sample changes are in memory and reset on reload. Known drawing paths reopen fresh samples; New is a transient blank preview and never adds gallery entries. Web is now the first implementation platform; macOS remains the primary product target (decision231). This current prototype is not yet the Rust/Wasm drawing editor or persistent storage implementation. Those remain gated by P05, reviewed interfaces and native/Figma requirements. No dependency on the old project or design experiments is required to run/build.

iPhone creation uses a bottom-right circular glass compose button, replacing the temporary top action and the old bottom strip. iPad retains its prior creation treatment. Rename controls expose hover/pressed feedback using the shared semantic color states.

The shared night scheme uses charcoal surfaces and softer off-white display paper. Original artwork files remain unchanged. The Apple control material is a browser approximation with opaque accessibility fallbacks; it does not implement native Liquid Glass.

Decision227: trusted data-only TypeScript is the authoring format for the shared locale and theme catalogs. Build-time generators retain their existing native/web output formats, runtime validation and deterministic output checks. Native host integration remains separate; see [shared resource plan](../../docs/design/shared-resources-plan.md).

Browser verification reports and artifact-retention policy live in [quality](quality/README.md). Shared reviews remain in the repository root quality directory.
