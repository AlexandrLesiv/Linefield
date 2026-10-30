# INPUT-04 — recover a pending drawing on a fresh separate-device press

Owner approved this narrow recovery and truthful Saved status on 2026-10-30.
Stack on INPUT-02 commit 0f13b74. INPUT-03 was rejected and is not a dependency.
Keep 65379 and all existing frozen previews unchanged. No merge authorized.

## Ownership and behavior

CT-02/CT-03/CT-05/CT-07: browser adapter owns contact admission and status;
Rust retains accepted samples, stroke transactions, history and durable revisions.
No rendering, storage format, pressure, sampling, worker or timeout changes.

A fresh primary tip-only canvas press from the other mouse/pen source may complete
the old drawing only after release is pending and actual pointer capture is gone.
The press must be newer than both the last owner event and pending-release event.
Commit accepted old samples before starting a separate stroke; never append the
new device position to the old stroke. Clear old ownership before releasing capture.
Existing same-source recovery remains unchanged. Foreign motion, hover, release,
secondary presses and presses before this pending state cannot take ownership.
Existing explicit cancellation/blur behavior is outside this amendment.

Saved means there is no active unsaved interaction, no storage error and current
revision is durable. Diagnostics distinguish this document state from storage-adapter
progress. A previously durable revision does not make pending stroke samples saved.

## Acceptance and edge cases

- INPUT-04-A: pen-to-mouse and mouse-to-pen fresh-press recovery preserves raw samples
  and separate stroke identity; one Undo per stroke and exact Redo.
- INPUT-04-B: foreign motion/up, stale or secondary presses, retained capture and
  outside-canvas presses cannot adopt the pending contact.
- INPUT-04-C: late old-device events cannot end the new stroke; capture admission
  failure must not erase the already committed old stroke.
- INPUT-04-D: pending UI/export state is truthful even when revision equals durable;
  recovered drawings survive save/reload and failure/retry.
- INPUT-04-E: existing mouse/pen release, identity and recovery scenarios remain valid.

Browser-injected pen events verify application ordering, not physical Wacom delivery.
Run scoped static/build checks, independent source/interaction review and a separate
frozen integrated preview. Store raw captures and generated evidence outside Git.

## Verification checkpoint

Frozen integrated preview: http://127.0.0.1:65382/ (SAVE08 gallery plus INPUT04).
Editor bundle `index-loijNG7k.js`, SHA256
`d05d9755bec67e7e19b4fd05a5714658e6c91343316730cab694c3e02bb9178b`.
65379 editor hash remains `5611e607e5ccb70fb9f70230b658e277af1bfd48e5118899cec8053eb145f4d3`.

Four new browser scenarios pass (both device directions, with/without new capture
failure), including exact raw samples, separate Undo, stale/foreign event guards,
truthful pending status, injected save failure/retry and exact durable reload.
Tests: `apps/web/tests/vector-pending-device.mjs` and its event helper.
The unchanged contact-recovery suite (16 cases), release-recovery suite (22 cases)
and pen-identity suite (2 cases) also pass on the same frozen editor bundle.
Editor/web type checks, save-boundary generation, scoped helper/test lint/format,
diff whitespace and integrated editor/web builds pass. Whole-main lint reports the
unchanged baseline no-shadow diagnostic at main.ts:356 (verified against base0f13b74);
this is not a new input-fix warning or an all-repository lint pass.
Independent source/interaction review found no blocking issue; physical Wacom
verification remains a manual check on this frozen build.
