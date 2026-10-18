# Locale record validation — 2026-10-18

S01/S00B, CT-09 / INV-11 / SU-20, LOC-PROTO-01–03. The literal data grammar accepts a prototype-setting object literal. Previously, a locale map with zero own entries could inherit a declared translation and pass schema validation despite serializing to an empty object. Current generation explicitly looks up IDs and preserved that inherited value; this is not evidence of lost generated translations.

The existing schema record guard now rejects custom prototypes and retains ordinary/null-prototype dictionaries. Three tests cover the literal reproducer, each nested schema boundary in a plural/override fixture, and byte-identical generation plus unchanged input for null dictionaries. This is trusted repository data correctness, not protection against getters, proxies, concurrent mutation or global prototype tampering. The source grammar is unchanged.

Full check.log:75 tests (10theme28localization27action10probe), root/web types, lint, formatting, resource drift and200-line gates pass. All41 generated locale/theme resource hashes match the preceding writer-validation evidence. No browser/native runtime was rerun; unchanged resource bytes retain prior syntax evidence only. Exact source/host details and independent review disposition are in manifest.json. Existing uncommitted work is preserved.
