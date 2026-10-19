# Shared color layers

The owner-approved three-layer structure preserves the existing light/dark appearance.
It is a shared design vocabulary with a web implementation and generated native resources.
Native application consumption remains a separate integration step.

1. **Primitives — `palette.ts`:** literal color values. Neutral and red numbered shades,
   the existing blue focus accent, explicit paper values/alpha variants and black scrim.
   The uneven numbered steps retain every existing shade; they are not a perceptually
   uniform ramp or a guarantee of contrast. No unused success/warning families were added.
2. **Semantic themes — `colors.ts`:** complete light/dark references such as
   `surface.panel`, `text.primary`, `action.destructive.foreground` and `overlay.scrim`.
   `types.ts` defines the required roles and typed palette-reference vocabulary.
   Error and destructive intent remain separate even where they share a primitive.
3. **Platform adapter — `apps/web/src/theme.css.ts`:** explicit mapping to Vanilla Extract
   variables and existing compatibility names. `theme`, `light`, `dark`, and every prior
   CSS variable retain their names and resolved values; `scrim` adds the existing
   dialog dim color (`#0005`, equivalently `#00000055`). App components use semantic
   variables, never numbered palette values.

`resolve.ts` is ordinary reviewed TypeScript implementation, separated from data-only
catalog authoring. It validates exact modes/roles and resolves one-hop references only
into literal hex primitives. Missing references, inherited properties, alias chains and
cycles are rejected. No general-purpose token expression engine is needed. The catalog
source gate still checks every other shared theme/localization TypeScript module for
literal-only exports, so new authoring files do not silently escape the restriction.

`pnpm theme:check` validates resolved keys, hex/alpha formats and 4.5:1 contrast for
critical normal/hover/pressed, paper, error and destructive text pairs.
`pnpm theme:test` includes malformed data, reference rejection and an exact pre-refactor
snapshot of all colors (THEME-01–04, THEME-06–07). Both run within `pnpm check`.
These checks are not complete accessibility or native-device acceptance.

Native resource generation is available; host adapters/consumers remain future work. Decision 232
requires common Linefield app styling rather than mandatory native materials/control appearance.
Hosts retain system appearance selection, accessibility overrides, text/input/focus and OS
integration. Native applications will not execute TypeScript. No Rust style migration or universal
widget library is selected; additional token categories and component styles remain future work.

## Paper presentation

Display paper remains white (`#ffffff`) in light mode and off-white (`#eeeeec`) in dark.
Sample PNGs contain baked-in white: gallery images, Delete/Undo clones and drawing
previews use `darken` compositing against isolated paper containers. This caps bright
backing without asset changes/inversion; bright highlights can change in presentation.
This is a display choice in the memory-only prototype, not document/export data or a
color-critical editing policy. THEME-05 browser checks cover paper/compositing across
motion; real editing needs a reviewed color-fidelity policy.

See [accessibility materials](../../docs/design/accessibility-materials.md) and
[shared resource boundaries](../../docs/design/shared-resources-plan.md). Catalogs stay
trusted data-only TypeScript with no filesystem, network, time or environment behavior.

## Native resources

Run `pnpm theme:generate` after changing the authored palette/semantic themes.
`pnpm theme:resources:check` rejects missing, stale or unexpected output without
repairing it. `pnpm check` bootstraps only an entirely absent generated directory,
then checks it; partially missing/stale output remains a failure. Generated data under
`shared/theme/generated/` is ignored by Git. Repeated generation preserves timestamps
when bytes match; unexpected files must be explicitly removed by their owner.

All 23 semantic roles have both light and dark values. Stable identifiers use the
`linefield_` prefix and snake_case semantic names (for example
`action.destructive.onSurface` → `linefield_action_destructive_on_surface`). Naming
collisions are rejected before writing. No timestamps, environment-dependent colors or
native runtime code enter output. The current colors remain byte-identical.

| Output relative to generated/                                 | Host inclusion (not yet wired into an application)                                                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| apple/LinefieldColors.xcassets                                | Add the catalog to Apple target resources. Each named colorset contains Any/light and Dark sRGB components; use named NSColor/UIColor resources. Shared across Apple families; each target still needs compilation/acceptance. |
| android/values/colors.xml and android/values-night/colors.xml | Add generated/android as a Gradle resource source directory. Consume R.color.linefield_*; Android appearance chooses the night variant.                                                                                        |
| windows/LinefieldColors.xaml                                  | Merge this ResourceDictionary into WinUI application resources. Consume Color values through ThemeResource, or host-owned brushes. Contains explicit Light/Dark dictionaries.                                                  |
| gtk/light.css and gtk/dark.css                                | Load the matching named-color CSS provider when the host appearance changes. Reference @linefield_* from host styles. These are app-prefixed colors, not system theme overrides.                                               |

Shared hex is RRGGBB/RRGGBBAA; Android and WinUI output uses AARRGGBB.
Apple sRGB and GTK rgba retain round-trippable alpha precision. THEME-10–12 test every
role/mode/channel, naming collisions, deterministic bytes, unchanged timestamps,
missing/stale/extra output rejection and recovery. Existing theme/contrast checks run
before generation. Native applications do not execute TypeScript.

Accessibility is deliberately host-owned: generated Light/Dark values do not define a
Windows HighContrast theme or replace system colors, native materials, increased
contrast or reduced-transparency behavior. A host must map these system preferences
before adopting custom colors in controls; see the accessibility materials document.

Format references: [Apple named colors](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/Named_Color.html),
[Apple appearance variants](https://help.apple.com/xcode/mac/current/en.lproj/dev7a4aebe73.html),
[Android colors](https://developer.android.com/guide/topics/resources/more-resources#Color),
[WinUI theme dictionaries](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.resourcedictionary.themedictionaries),
[GTK named colors](https://docs.gtk.org/gtk4/css-properties.html).

`pnpm theme:native-check` reproduces XML validation and Android resource compilation
using disposable fixtures. It discovers aapt2 from PATH, ANDROID_HOME/ANDROID_SDK_ROOT,
or the usual per-user SDK locations. Missing tools and unconfigured native consumers
are reported as not-run, never passed; existing-tool failures fail the command.

Local validation on macOS, 2026-10-17, base fa38072 plus working-tree changes:
`pnpm check` passes; `xmllint --noout` accepts both Android XML files and the WinUI
XAML; Android SDK 36.0.0 aapt2 2.20-13193326 compiles the generated resource directory
into an ignored artifact. This is resource compilation, not Android application linking
or device acceptance. Apple actool is unavailable in the active developer environment;
Apple catalog compilation, WinUI resource compilation, GTK CSS runtime loading and
native application integration were not run. These remain explicit coverage gaps.
