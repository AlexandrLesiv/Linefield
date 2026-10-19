# Appearance verification

The shared Linefield theme supplies the same styling at every Web viewport. Component styles use
local Vanilla Extract classes. Browser/OS preferences choose light/dark; accessibility preferences
and focus behavior remain effective. Native resource consumption is separate.

## Behavior and presentation checklist

| Acceptance | Expected behavior | Test source under apps/web/tests |
| --- | --- | --- |
| THEME-01/04/06/07 | Semantic roles, readable critical pairs, authorized palettes and invalid-reference rejection | Static theme validation; no equivalent E2E claim for all listed cases |
| THEME-05 | Display paper/compositing agree in gallery, travel and drawing | theme-paper.spec.ts |
| WEB-UP01–03 | Undo shell/artwork/title backing blend together while shell stays opaque; reduced motion/appearance changes settle | undo-paper.spec.ts |
| WEB-TH01/02, WEB-F02, WEB-H02 | Hover does not resize; focus remains visible; touch has no sticky hover; dialog pressed/hover states remain distinct | touch-hover.spec.ts; feedback.spec.ts; header-feedback.spec.ts |
| WEB-ME01/02, WEB-SE01/02 | Source elevation persists through menu/Rename and detached travel, then clears or settles on interruption/resize | menu-elevation.spec.ts; surface-elevation.spec.ts |
| WEB-BD01–03, WEB-ONE02 | Continuous scrim, no outside click-through/orphan overlay; secondary click stays browser-owned | action-backdrop.spec.ts |
| WEB-STYLE-01/02 | Local styles remain independent of query hooks; touch dialog primary/secondary backgrounds remain distinct | style-isolation.spec.ts |

Compare light/dark and normal/reduced motion at start, midpoint and handoff, then observe unforced
playback separately. Inspect focused and resting controls. Keep exact geometry assertions rather
than accepting new screenshots to hide drift. Include forced colors/enlarged text where applicable.

## Paper and shared resources

Light paper is white; dark paper is off-white. Sample images contain baked-in white, so isolated
darken compositing softens display without changing source bytes. It can cap pale highlights: this
is a prototype display treatment, not a color-critical editing/export policy. Keep that boundary
visible before introducing real artwork editing. [Shared theme sources](../../../../shared/theme/README.md)
own semantic roles and generated resources; agents should read those sources.

Native theme generation is available, but generated resources do not establish host integration,
OS increased contrast/reduced transparency, runtime behavior or native material fidelity. Do not
restore earlier claims that generation is still unimplemented. Browser-only Apple material/compose
experiments do not define the current responsive interface.

Primary-action default/background and on-surface semantic roles remain a follow-up before future
recoloring: the current catalog defines primary hover/pressed roles, not those additional roles.
Resolve the mapping through the shared theme contract rather than introducing local palette values.
GPU/frame pacing, screen-reader use and physical-device appearance remain unverified by screenshots.
