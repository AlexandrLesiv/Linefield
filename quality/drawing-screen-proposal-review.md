# P05-D01 proposal v1 review — 2026-10-17

Scope: documentation/design only, base fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7.
No application source, dependency, schema, ABI, generated resource or theme value changed.
Owner approval remains pending; review does not authorize implementation or replace design review.

## Participants and evidence

- competitor_researcher: official Concepts/Apple sources, documented facts separated from unknown
  behavior; no app/device interaction. Findings integrated into the proposal evidence table.
- ui_ux_designer: behavior, adaptive geometry, motion, accessibility and research adaptation;
  final integrated brief coherent after source-attribution and Tab-boundary clarifications.
- rust_engine: actual placeholder engine and web code inspection; Pen/Select scope, client-local
  semantic state versus coordinator, host selector rendering and pending typed contracts.
- macos_ui: AppKit controls over Skia feasible in principle; responder/panel versus deactivation
  distinction and preserved native color control. No native runtime evidence.
- ios_ui: UIKit squeeze preferences/phases/hover, native custom PKToolPicker candidate, system
  Undo-slider consequence and origin-specific focus restoration. No Pencil hardware evidence.
- Fresh reviewer: independent design/security assessment and official-source cross-check;
  no blocking findings after corrections below. No build or test execution claimed.

## Findings and disposition

| Finding | Correction | Result |
| --- | --- | --- |
| P2 ambiguous blur could dismiss on internal focus movement; Cancel focus graph incomplete | Window blur only; selected initial focus, Pen/Select/Cancel roles/order, arrow/Home/End/Tab behavior | Re-reviewed, resolved |
| P2 hidden transition controls and completion focus could interfere with palette | Inert hidden Tools; synchronous departure teardown; destination/focus guarded completion; explicit WEB-D07 event order | Re-reviewed, resolved |
| Language traceability incomplete | I18N-LAUNCH-002/I18N-UK-002 links, resource/source fallback and separate linguistic status | Re-reviewed, resolved |
| Native feasibility details and risk priority missing | Panel ownership caveat, future picker comparison, phase/preference/focus cases and risk classifications | Incorporated; native proof remains pending |

Security assessment agrees with no new trust boundary for the proposed UI-only slice. Future
implementation must prove viewer guards, safe DOM text, lifecycle cleanup and diagnostics privacy;
no production injection hooks or fake engine authority. Real integration triggers boundary review.

## Exact reviewed snapshot

SHA-256 supplied by the independent reviewer:

- docs/design/drawing-screen-proposal.md:
  `938e837704d70f6d01858ffed78a105b1f95e4fed1022eef8b782daa19fdde83`
- tasks/P05-D01.md before updating its two review-status fields:
  `372cbe5bf64ab65f0f58555396a138d8c5b9345a9230b95c3a66b01968aaa384`

The subsequent task edits only link this completed review and record agreement with the security
classification; proposed behavior and cases are unchanged. Handoff/task-board updates index this
packet. All WEB-D cases remain planned/unrun. No native/design review/linguistic/runtime certification.
Owner review is the next gate; implementation and exact-build verification follow approval.
