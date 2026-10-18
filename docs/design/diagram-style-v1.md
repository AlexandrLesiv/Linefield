# Linefield diagram style v1 — approval proposal

Prepared 2026-10-19 by the combined UI/UX designer. **Proposed; not yet adopted.**
The owner preferred the hand-authored [SVG comparison](diagram-comparison/durable-create.svg).
This packet proposes a consistent documentation style derived from that example, with clearer
reading order and distinct architectural, runtime and approval meanings. It does not approve
the architecture illustrated by its examples or change application UI.

Review artifact: [style board](diagram-style-v1/review-board.svg), 1440 × 1536 SVG units.
The board is its own editable source. Its examples demonstrate notation; they do not supersede
the storage contracts or establish an implemented durable service.

## Proposed scope and authority

Apply this style to newly authored project diagrams: architecture, ownership, sequences,
recovery/state machines, build flows and task/Git explanations. Use native SVG as the default
authoring and review format. Keep one source of truth per diagram. Current diagrams use the generated v2 pipeline under decision239. This earlier style is historical.

Decision239 now uses shared definitions and generated SVG for schema review too. This earlier
style document is historical; charts and scientific plots retain appropriate plotting tools.

These documentation tokens are separate from [shared application themes](../../shared/theme/README.md).
Both follow the [foundations](foundations.md) principles of semantic roles, restrained chrome and
visible meaning independent of color. The lavender/blue/mint diagram groups are documentation
colors, not proposed application palette additions. No host component or artwork color changes.

## Composition and type

| Token / rule | v1 value |
| --- | --- |
| Standard board | 1440 units wide; height grows with content; prefer focused sheets over one huge map |
| Compact focused diagram | 960 units wide, same type scale; use when the relationship fits comfortably |
| Outer margin / white sheet inset | 48 / 40 units |
| Spacing scale | 8, 16, 24, 32, 40, 48, 64 units; align cards and text to shared guides |
| Main title | 36 px, weight 600, line-height 44; sentence case |
| Section title | 24 px, weight 600, line-height 32 |
| Node title | 18 px, weight 600, line-height 26 |
| Body / node detail | 16 px, weight 400, line-height 24 |
| Metadata / connector label | 14 px minimum, weight 400 or 600, line-height 20 |
| Font stack | `-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif` |
| Sheet / group / node radius | 24 / 16 / 12 units |
| Node inner padding | Multiline: 24 units; compact single-line: 24 horizontal / 12 vertical, height at least 52 |
| Connector clearance | At least 16 units from unrelated nodes or labels; 32 preferred between rows |
| Strokes | 1 for decorative groups; 1.5 for nodes/boundaries; 2 for meaningful connectors |

Use platform fonts already available; no download or dependence on an installed Inter font.
Keep text selectable, use explicit `<tspan>` line breaks, and reserve width for fallback metrics.
Do not shrink text to fit: widen, wrap, shorten or split the diagram. Monospace is reserved for
short exact identifiers, using `ui-monospace, Menlo, Consolas, monospace`, at least 14 px.

One reading direction per view: top to bottom for flow and state diagrams; left to right for
dependency/component views. In sequence diagrams participant columns remain horizontal and
time always advances downward. Label a backward/recovery transition explicitly. Do not reverse
one column's flow merely to simplify a connector, as the first comparison's Present column did.

## Color tokens

| Role | Hex / use |
| --- | --- |
| `diagram.canvas` | `#F7F8FA` outer background |
| `diagram.sheet`, `diagram.node` | `#FFFFFF` opaque canvas and cards |
| `diagram.text` | `#233148` titles, node labels and primary text |
| `diagram.text.secondary` | `#59677C` supporting copy; do not use faint gray for meaningful labels |
| `diagram.border.decorative` | `#E1E6ED` sheet/group separators; never sole meaningful boundary |
| `diagram.edge`, `diagram.boundary` | `#718096` meaningful arrows and node/ownership boundaries |
| `diagram.group.intent` | surface `#F7F7FE`; accent/text `#59547D` |
| `diagram.group.work` | surface `#F5F9FD`; accent/text `#466B8E` |
| `diagram.group.result` | surface `#F3FAF7`; accent/text `#386B57` |
| `diagram.caution` | surface `#FFFAEF`; text/edge `#785520` |
| `diagram.status.current` | surface `#EEF7F1`; text/icon `#386B57` |
| `diagram.status.approved` | surface `#EFF4FA`; text/icon `#466B8E` |
| `diagram.status.proposed` | surface `#F1F3F7`; text/icon `#59677C` |
| `diagram.status.blocked` | surface `#FFF0ED`; text/icon `#9C3B32` |
| `diagram.status.historical` | surface `#F1F3F7`; text/icon `#59677C` |

Lavender, blue and mint group phases or responsibilities. **Mint is not a pass or approval.**
Use at most three group colors per diagram, with a written group heading. Place evidence status
in a separately labeled badge. Meaningful text targets at least 4.5:1 contrast; structural
boundaries and connectors target at least 3:1 against adjacent surfaces. Decorative separators
may be softer because headings, spacing and meaningful boundaries carry the relationship.
Do not lower these targets to preserve a tint. Contrast checks do not establish complete
accessibility; inspect the actual rendered board and its text equivalent.

Use an opaque light canvas in both light and dark documentation viewers. Do not automatically
invert SVG colors. A separate night documentation palette is deferred until there is a reviewed
need; this does not change the application's required light/dark/contrast themes. Default to
flat fills; no gradients, glass, glow or decorative icons. A subtle shadow is optional for a
hero overview, never required to distinguish a node or state; the v1 board uses no shadow.

## Components, arrows and semantics

| Element | Representation and required wording |
| --- | --- |
| Component / operation | Rounded card; name plus one short responsibility or action |
| Ownership boundary | Solid outlined container with explicit owner/execution-context header |
| Transaction boundary | Solid container with `TRANSACTION` header and stated commit point |
| External/trust boundary | Solid container with `EXTERNAL` or `UNTRUSTED` header; never rely on shape alone |
| Durable data | Ordinary card labeled `DURABLE DATA`; session/cache data use equally explicit lifetime labels |
| Ordered message / dependency | Solid arrowhead and solid line; verb/data label; mark `sync`, `async` or `dependency` |
| Sequence participant lifetime | Thin dashed vertical guide without arrowhead; only this uses dashes |
| Uncertainty / failure branch | Solid amber arrow, written trigger, amber recovery card; no implied retry arrow |
| State transition | Solid arrow, trigger/guard label; state cards name stable observable states |
| Annotation | Text or lightly tinted note; leader has no arrowhead and is explicitly a note |

All causal edges are **solid**, including asynchronous messages and uncertain outcomes. Dashes
mean sequence lifetime guides only. Do not overload dashed edges to mean future, async, optional,
untrusted and failed. Use literal words and badges for those distinctions. Return messages are
solid, directed and labeled `reply`; omission of a reply is not proof of successful completion.

Route arrows behind cards and keep arrowheads outside target borders. Prefer orthogonal routes
with gently rounded corners. Place an opaque label backing only when needed; never hide an
intersection that should be rerouted. No decorative arrows or crossings through text. When a
line crosses an execution boundary, its label states copied/borrowed data or references a contract
that establishes lifetime. A diagram cannot invent ownership, commit or acknowledgement policy.

## Evidence status is separate from runtime state

| Badge text / icon | Meaning |
| --- | --- |
| `CURRENT` / filled circle | Implemented, with linked exact-build evidence; not a blanket claim that every test passed |
| `APPROVED · NOT BUILT` / check | Exact proposal approved; implementation not claimed |
| `PROPOSED` / hollow diamond | Review option without adoption approval |
| `BLOCKED` / outlined square with cross | Known gate unresolved; explain reason and supporting evidence |
| `HISTORICAL` / horizontal line | Superseded reference; link replacement |

State cards such as Pending, Confirmed and Unknown describe runtime behavior, never approval.
In mixed diagrams badge each affected node/group and put `MIXED STATUS` in the header. If the
entire diagram has one status, a header badge is enough. A `CURRENT` connector cannot silently
join a proposed component. Approval and verification remain separate in the companion text.

## Accessibility, distribution and review

Every SVG includes `viewBox`, explicit width/height, `role="img"`, unique referenced `<title>`
and `<desc>`, and meaningful source order. Include a Markdown text equivalent alongside it.
Do not outline text, embed fonts, use scripts, remote assets, `foreignObject`, event handlers or
interactive widgets. Static diagrams have no focus/keyboard interaction, animation or motion
preference; embedded hyperlinks are documented in companion Markdown rather than hidden in SVG.

Inspect at full size and at the intended documentation width. At 720 px display width a 1440-unit
board halves its fonts; provide a clearly labeled full-size SVG link and keep essential conclusions
in readable Markdown. Split a diagram or offer a compact view if routine reading needs repeated
zooming. A PNG preview may accompany SVG but must not replace the editable source or text equivalent.

English is the repository's source language for internal diagrams. Preserve Unicode identifiers;
do not call an English architecture board application localization evidence. When a diagram is
localized, reflow labels and recheck metrics rather than translating into fixed-width boxes.

One review packet includes two checklists:

- **Meaning:** source/CT/INV/task links, actual vs proposed facts, single mutation owner when
  relevant, lifetime and async boundaries, commit/ack separation, failure/recovery path, truthful
  evidence status and stated omissions. Technical specialist and independent reviewer check it.
- **Presentation:** named tokens, readable type, consistent direction, uncrossed labeled arrows,
  adequate contrast/spacing, no clipped text, text equivalent, complete SVG title/description,
  full-size link and inspected render. Combined designer checks behavior and presentation together.

## Style-board text equivalent

The board shows three notation examples, all illustrative. In the ownership example a host view
sends a copied request asynchronously to a command-owner boundary. The view owns presentation;
the command-owner label identifies the sole mutation owner without defining a new topology.
The sequence shows a request followed by a commit attempt and a conditional confirmed reply;
an unknown outcome retains bytes and reconciles before retry. Its dashed lines are participant
lifetimes, not async arrows. A runtime state strip branches from Pending to Confirmed on proof or
Unknown on lost acknowledgement. Separate badges demonstrate Current, Approved-not-built,
Proposed, Blocked and Historical evidence status, unrelated to the three decorative stage tints.

## Adoption and requested approval

Approve **diagram style v1**, including this specification and `review-board.svg`, for future
project diagrams. Approval covers notation, typography, colors and presentation; it does not
approve example architecture, a production component, a new tool installation or a schema.

After approval, record this exact style version in the visual-architecture workflow. Apply
the style when creating or substantively revising a diagram, beginning with ownership/storage
and durable-library sequences. Preserve historical approved snapshots; do not mass-restyle them.
New versions link old versions and record any semantic changes separately from visual changes.
Do not add a second approval registry: record owner adoption in `docs/decisions.md` when received.
Routine conforming documentation needs no new approval; changes to the style's semantic notation
or material architecture remain explicit review items. No automatic SVG gate is claimed installed.
