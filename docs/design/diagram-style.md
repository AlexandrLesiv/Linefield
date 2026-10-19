# Diagram style

Decisions 238–239 adopt this shared documentation style. Author semantic diagram
content in [shared definitions](../../shared/diagrams/README.md); DTCG tokens in
[style.tokens.json](../../shared/diagrams/style.tokens.json) define its appearance.
The [authored reference board](diagram-style/reference.svg) illustrates the visual
language. Its example architecture is illustrative, not implementation approval.

## Composition

Use one clear reading direction per view: dependency/component views left to right,
flow/state views top to bottom, sequences with participants across and time downward.
Prefer focused sheets over a giant graph. Align cards and connectors; place labels in
intentional gaps. Route arrows behind cards, clear their text and keep arrowheads
outside borders. Never imply a connection merely by crossing lines.

| Role | Rule |
| --- | --- |
| Standard board | 1440 units wide; height follows content; compact views may use 960 |
| Page margin / panel gap / inset | 72 / 32 / 32 units |
| Typography | Title 40/48; section 26/34; node 20/28; body 16/24; metadata 14/20 |
| Weight | 600 for hierarchy, 400 for body; no light text |
| Font | System sans-serif stack from the shared tokens; no remote fonts |
| Panels / cards / participants | 24 / 16 / 12 unit corner radius |
| Card padding | 24 units; compact cards use 24 horizontal and 12 vertical |
| Minimum compact height | 48 units for body text, 56 for node titles |
| Icon tile | 36 units, 10-unit radius, 18-unit icon and 1.7-unit stroke |
| Borders / connectors | 1.5 / 2 units; decorative panel boundary 1 unit |
| Sequence guide | 1.5 units; dash 4, gap 8 |

Do not shrink text below 14px to fit. Wrap, widen, shorten or split. Reserve monospace
for exact identifiers. Flat fills only: no gradients, glass, glow or filter shadows.
Use the approved ink/muted/edge/divider/canvas/panel tokens and at most three semantic
group tints. Group color communicates responsibility, never pass or approval.

## Diagram semantics

- Components name their responsibility. Ownership, transaction, trust and lifetime
  boundaries have explicit text; do not infer authority from color or enclosure alone.
- Durable data and session/cache data have written lifetime labels.
- Causal messages, dependencies, replies and state transitions use solid directed
  arrows with verbs, data and relevant guards. State whether a crossing is synchronous,
  asynchronous or a dependency. Copied/borrowed lifetime comes from its contract.
- Dashed lines mean sequence participant lifetime only. They never mean asynchronous,
  uncertain, future or optional behavior. State these distinctions in words.
- Return messages identify the reply. A missing reply is an Unknown trigger, not proof
  of failure or permission to retry. Preserve bytes and reconcile uncertain outcomes.
- Runtime states such as Pending, Confirmed and Unknown are separate from approval.
  Label current, approved-not-built, proposed or blocked scope explicitly. Mixed views
  identify status per group; a component's implementation does not approve its peers.
- Annotations have no arrowhead and do not invent ownership, commit, acknowledgement,
  migration or cleanup rules. Use actual contracts and rejection paths.

## Accessible delivery

Normal text targets 4.5:1 contrast; meaningful edges target 3:1. Decorative separators
may be lighter where headings and spacing independently convey structure. Color and
icons supplement words. Use opaque light canvas even in dark document viewers; do not
invert artwork automatically. Internal English documentation is not product locale evidence.

SVG outputs include a viewBox, explicit size, accessible title/description and meaningful
source order. Text remains selectable. No scripts, remote resources, embedded fonts,
foreignObject, event handlers or animation. Keep a readable prose explanation and link
to the source definition. A scaled embedded image is not a substitute for full-size review.
Generated exports remain local and reproducible; agents read shared definitions and tokens.
Authored UI reference boards are source artifacts, not generated diagram exports.

## Review

Check meaning and presentation together. Semantic review covers CT/INV/task linkage,
ownership, lifetime, ordering, commit boundaries, uncertainty and claimed status.
Visual review covers type, spacing, contrast, connectors, wrapping and actual rendered
output. Generator validation proves neither architecture approval nor layout quality.
Material changes follow owner review; routine conforming documentation does not reopen
approved visual foundations. Diagram styles do not change application themes or artwork.
