# S00B localization boundary follow-up — 2026-10-18

Test-only scope under decision235: CT-09, INV-11, SU-20; I18N-RESOURCE-001/I18N-LOCALE-001 and integer plural fixture portion of I18N-UK-002. No production source, catalogue wording, generated resource content or dependency changed. Build-reliability supplied scoped case recommendations; lead owns tests; independent review passed.

Five new Node tests in scripts/localization/plural-boundaries.test.ts pass. The independent reviewer checked the arithmetic integer-category oracle against [Unicode CLDR48 cardinal plural rules](https://www.unicode.org/cldr/charts/48/supplemental/language_plural_rules.html); this reference is the test expectation, not a claim about the installed ICU data version (recorded separately in manifest.json):

- LOC-13 (en and uk): every integer0..199, explicit higher boundaries including2147483640..2147483647, plus512 fixed-seed generated counts.727 unique counts per language, seed7960. Independent modulo grammar determines categories; expected categories never call Intl.PluralRules. Failure messages retain count/language/seed. These bounded examples are not exhaustive signed32-bit domain proof.
- LOC-14: exact literals distinguish numeric region from UI plural language, including Ukrainian1234→few:1.234 with German region and English1001→other:1 001 with Ukrainian region.
- LOC-15: previously uncovered negative-fraction/negative-infinity/unsafe-large-number and numeric-for-string type rejection.
- LOC-16: repeated placeholders and reordered argument keys preserve empty strings, placeholder-looking text, replacement metacharacters, combining Unicode, markup-looking text and line/tab content without mutation or recursive replacement.

Full pnpm check passes10 theme +19 localization +23 action/configuration +10 probe tests (62total), with zero failures/skips plus root/web types, lint, format and source-size gates. check.log lists exact discovered IDs. New tests exercise the actual web formatter in Node; they do not claim new generator coverage. Existing parse/generate tests remain in the same root run.

Existing pnpm locales:native-check separately passes8 XML resources with xmllint/libxml20913 and4 gettext resources with GNU gettext-tools1.0, using actual plus existing synthetic catalogues. native-syntax.log records scope/results. This is syntax checking, not native host rendering, formatting or app execution. No tools installed or global settings changed.

manifest.json records exact changed-test/formatter/resource-generator/catalogue hashes, base revision with dirty-tree caveat, host/Node/ICU versions, timestamp, seed and counts. Browser tests remain unrun because of the already-recorded local-server EPERM; no repeated browser attempt or escalation occurred. These tests do not establish physical assistive technology, layout, OS launch negotiation, native parsing/IME, linguistic quality or DOM insertion safety. Fractional plural counts remain outside the selected integer contract.
