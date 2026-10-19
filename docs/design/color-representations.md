# Color storage, picker representations and future wide gamut

Status: documentation extension requested 2026-10-16. Initial canonical floating-point sRGB
remains selected. Future picker designs and wider color-space support are not implemented or
approved by this note; identified design/format/ABI review precedes those features.

## Current boundary

Decision 232 removes mandatory native picker appearance, not the existing color behavior or
conversion/validation contract. A concrete replacement remains to review; wheel-based proposals
are retired. OS-managed panels remain native where applicable.

Host-rendered picker -> explicit color-space conversion -> typed shared color-setting command ->
validated canonical sRGB -> current tool preferences -> properties captured by each new stroke.

RGB sliders, hex and future HSB/HSV controls can edit the same color. Store one authoritative
unpremultiplied floating-point RGBA value, not competing RGB and HSV columns. Pen preferences
are local defaults; completed strokes keep their own color. Native/AppKit color objects never
enter Rust documents. Never assume native device RGB or Display P3 components are sRGB.
Keep conversion functions separate from native widgets, with cross-host conformance fixtures.
Exact DTOs/conversion ownership and tolerances belong in S02 review; no new ABI is chosen here.

Picker mode and latent hue/saturation are presentation state, initially proposed as session-local.
Gray cannot reconstruct hue, and black cannot reconstruct hue/saturation. Preserve appropriate
latent state while editing rather than resetting controls through an RGB round trip. Mode changes
alone must not alter the canonical color, dirty state or Undo history. Retaining picker positions
across launches would need an explicit local-preference design, not additional stroke columns.
Future tools reuse this color contract where applicable without imposing Pen settings on all tools.
Active-interaction guards still reject tool/style changes, including delayed native callbacks.

## OKLCH and Display P3 are separate choices

OKLCH describes lightness, chroma and hue; Display P3 is a particular RGB color space/gamut.
Neither a picker label nor three floating-point columns establishes wide-gamut support.
OKLCH can describe colors outside sRGB and outside P3. Hue is indeterminate for zero chroma.
An sRGB document can use an OKLCH picker only with a reviewed target-gamut indication and an
explicit gamut-mapping/admission policy. Do not silently reinterpret or clamp channel values.

Future recommendation: retain a document working RGB color space, use a typed color-space tag
at conversion boundaries, and convert picker coordinates into that working space. The existing
document.color_space field is fixed to srgb today. Supporting display_p3 later requires a reviewed
format version/migration and corresponding catalog-preference space semantics; changing a tag
without transforming existing channel values changes artwork and is incorrect.
Do not preemptively add mixed per-stroke spaces, arbitrary ICC profiles or speculative tables.
If preserving arbitrary out-of-P3 OKLCH values becomes a requirement, revisit the working
representation explicitly; normalized P3 channels alone are not sufficient.

That milestone must decide gamut mapping, rendering/compositing space, surface configuration,
display-profile conversion, import behavior, color-managed thumbnails and PNG profile/output
policy. Stored source colors must survive a narrow-gamut display; map presentation without
rewriting originals. Appearance varies with display capability/calibration, so numerical
conversion tests alone are not visual acceptance. Unsupported document formats remain safely
rejected under the existing compatibility contract. No renderer replacement is implied.

## Planned acceptance

- COLOR-REP-001: RGB/HSB fixtures, invalid/nonfinite rejection, hue wrap, gray/black latent state,
  alpha-zero RGB preservation and no repeated-open/conversion drift.
- COLOR-REP-002: picker modes feed identical shared commands; guarded interactions reject
  changes; existing strokes unaffected; save/reopen preserves floating-point channels.
- COLOR-GAMUT-001 (future): sRGB/P3/OKLCH known vectors, explicit gamut mapping and meaningful
  tolerances; correct tagged render/thumbnail/export; unsupported-format rejection.
- UI review: both en/uk labels, localized number entry, AX, gamut notices and native behavior.
  Future controls still need owner-approved design review and real native E2E on each implemented host.

Reference: [W3C CSS Color](https://www.w3.org/TR/css-color/) defines the distinct representations
and gamut conversion issues. It is background, not a decision to use CSS or its runtime on native hosts.
