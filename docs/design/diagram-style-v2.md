# Linefield diagram style v2 — visual refinement proposal

Status: **adopted**, decisions238–239. Current diagram style values are authored once in
shared/diagrams/style.tokens.json (DTCG2025.10); shared definitions generate SVG review artifacts.
This document describes the approved appearance. Original approval bytes remain at Git e08f304.
The earlier [v1](diagram-style-v1.md) is historical; retained semantic conventions still apply.
The editable [SVG review board](diagram-style-v2/review-board.svg) is 1440 × 1160 units.

## What improves

1. **A shorter editorial composition.** One panoramic ownership view establishes context;
   sequence and outcome views sit beside each other. The board is 24% shorter than v1 while
   retaining the 14 px minimum; sequence labels move from 16 to 14 px. Each panel answers a
   different question instead of repeating a full-width row.
2. **Stronger hierarchy, quieter framing.** A 40 px headline, 26 px section headings and 20 px
   node titles create clear reading levels. White panels sit on a pale canvas; tinted color is
   concentrated in ownership cards. The large outer white frame and oversized status pills are gone.
3. **Useful visual identity.** Small hand-drawn role icons distinguish presentation, command
   authority and storage. Labels carry their full meaning; icons are redundant and decorative.
   A repeated 36 px icon tile gives cards a recognisable rhythm without borrowing product UI.
4. **Cleaner connectors.** Ownership messages run horizontally between aligned cards; sequence
   time runs downward; outcomes branch downward. Arrow labels occupy deliberate gaps. The unknown
   state has an amber outline and explicit text, while evidence status stays in a separate legend.
5. **Less competing emphasis.** The footer legend uses quiet symbols and words rather than five
   filled pills. Status remains distinct through text and shape; tint never means approval.

## v2 tokens and composition

All semantic distinctions, status meanings, source ownership and review requirements from v1
remain. This table specifies visual overrides and additions for v2; unspecified color tokens
retain their v1 values. Shared application theme files remain untouched.

| Role | v2 rule |
| --- | --- |
| Board | 1440 units wide; height follows content; this board is 1160 high |
| Page margin / panel gap | 72 / 32 units; panel inset 32 |
| Grid | 1296-unit content width; lower views 792 and 472 with 32-unit gap |
| Typography | Headline 40/48, section 26/34, node 20/28, body 16/24, label 14/20 |
| Weight | 600 for hierarchy and labels; 400 for body; no light-weight text |
| Font | `-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif` |
| Radius | Panels 24; main cards 16; state cards 14; small participant cards 12 |
| Card padding | Multiline 24; compact single-line 24 horizontal / 12 vertical |
| Compact card minimum | 48 units for 16 px body labels; 56 for 20 px node titles |
| Icon tile | 36 × 36; 10-unit radius; 18-unit icon; 1.7-unit stroke |
| Icon tile fills | Presentation `#EAE8F4`; command `#E4EDF6`; storage `#E2F0E8` |
| Node borders / arrows | `#718096`, 1.5 / 2 units; meaningful boundaries remain visible |
| Panel border | `#E1E6ED`, 1 unit; decorative only, supported by headings and spacing |
| Sequence guides | `#718096`, 1.5 units; dash 4 / gap 8; never message arrows |
| Small status legend | Symbol + written label on canvas; no surrounding pill required |

Flat fills only: no gradient, glow, glass or filter shadow. Icons are inline SVG geometry with
no external assets. A neutral command glyph avoids confusing validation responsibility with
the approval-status check. Icon labels remain authoritative.

## Semantics and accessible delivery

- The ownership view is illustrative. Its async labels do not adopt a worker topology or change
  the actual SQLite synchronous-call contract. A real architecture diagram must use actual
  contract-defined execution boundaries, lifetime and message labels.
- Dashed lines mean participant lifetime only. All causal message arrows and outcome branches
  are solid. A lost reply is a trigger for Unknown, not proof of failure or permission to retry.
- A conditional confirmed reply needs proof. Preserve existing bytes and reconcile uncertain
  outcomes before retry. The board adds no persistence mechanism or automatic retry policy.
- Current / Approved-not-built / Proposed / Blocked / Historical status retains v1 definitions.
  The entire board is illustrative and proposed; legend samples do not assign implementation
  status to its components. State names describe behavior, never architecture approval.
- Keep text at least 14 px in SVG units, selectable, with system fonts and generous widths.
  Use an opaque light canvas in dark viewers. Provide a full-size SVG link: a 720 px embedded
  preview halves the text, so the preview alone is not a readable full-size diagram.
- Include title, description and this text equivalent. No scripts, remote fonts, embedded HTML,
  hidden interaction or animation. English internal diagrams are not product localization evidence.
- Maintain v1 contrast targets: normal text 4.5:1 and meaningful edges 3:1. Role icon shapes are
  redundant with labels; they must not become the only information channel.

## Board text equivalent

The top example groups a view's disposable presentation state, a single command authority and
a durable-store role. Copied and validated requests are labeled asynchronous for illustration.
The sequence shows request, commit attempt, proof-bearing reply and conditional confirmed reply.
An adjacent state graph begins Pending and branches to Confirmed when proof arrives or Unknown
when a reply is lost. Unknown outcomes preserve existing bytes and reconcile before retry.
Below, a separate evidence legend distinguishes implemented/current, approved but unbuilt,
proposed, blocked and historical documentation. Group colors carry no adoption meaning.

## Approval and review boundary

Decisions238–239 adopt these visual rules for generated architecture/workflow/schema diagrams.
They do not approve example architecture, app UI, a production component or schema behavior.
Canonical style tokens and shared definitions drive generation; do not edit generated outputs.
Original boards are historical approval snapshots. Routine conforming documentation needs no
new owner approval; material architecture changes retain their existing gates. Designer visual
inspection and independent semantic review supplement XML/layout/drift checks.
