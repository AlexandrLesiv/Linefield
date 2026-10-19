# Shared diagram definitions

`style.tokens.json` is the canonical style source for generated documentation diagrams.
It uses the [Design Tokens Community Group Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/).
This is a W3C Community Group report, **not a W3C Standard**. The diagram namespace preserves
the approved v2 palette and hierarchy; it does not replace application semantic themes or
change artwork colors.

`definitions/*.json` holds data-only diagram text and deliberate geometry. The SVG files in
`docs/diagrams/v2/` are generated outputs. Update definitions or tokens and run:

```
node scripts/diagrams/generate.ts
node scripts/diagrams/generate.ts --check
node --test scripts/diagrams/*.test.ts
```

The generator has no layout dependency or automatic arrangement. A changed definition still
needs visual and semantic review; deterministic generation cannot prove a diagram is readable
or an architecture is approved. Generated SVGs remain standalone, selectable-text documents.
Their renderer owns static style and marker definitions, XML-escapes data, and rejects active
content, external references and arbitrary attributes.

## Reuse contract

- `loadTokens(input)` returns a typed lookup `(path, type) => renderedValue`.
- `renderDiagram(input, tokens)` accepts width/height, accessible title/description, and static
  rect/path/text elements. Each element has allowlisted attributes and optional escaped text.
- Color, radius and boundary attributes reference tokens as `{diagram.color.edge}` or
  `{diagram.size.cardRadius}`. Text uses title/section/node/body/meta roles rather than local
  font declarations. Position, wrapping and connector routes remain explicit data.
- Future platform-specific documentation or design-resource adapters can consume the same
  format and semantic names. No native adapter, widget system or production schema is added
  by this generator. Documentation roles and application roles stay separate namespaces.
- SVG dimensions use logical CSS pixel units at scale1; future adapters must explicitly map
  units, color space and font fallback to the target host. Do not copy raw SVG geometry into
  application layout or treat diagram style approval as application screen approval.

The current consumer intentionally supports only the project-used subset: inherited token
`$type`, sRGB opaque colors, px dimensions, numbers, numeric font weights, font-family arrays,
and whole-token curly-brace aliases with missing/type/cycle validation. It rejects unsupported
values, including JSON Pointer references and other color spaces. Group and token properties
have an explicit allowlist: `$type`, `$value`, `$description` and `$extensions`; unknown semantic
directives such as `$extends` and `$ref` are rejected rather than silently ignored. Metadata
extensions never alter rendering or resolution. It is not advertised as a
complete DTCG processor; expanding support requires explicit adapter behavior and review.

Agents read definitions/*.json and style.tokens.json directly; these are the canonical structure and style sources. Generate SVG locally for visual review. Generated exports are ignored, and previous designs live in Git history. Do not parse SVG when the structured definition answers the question.
