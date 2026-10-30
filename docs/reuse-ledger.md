# Reuse ledger

## TEXT-01 bundled font

Noto Sans Regular is bundled unchanged from the official `notofonts/noto-fonts`
repository at `ffebf8c1ee449e544955a7e813c54f9b73848eac`, path
`hinted/ttf/NotoSans/NotoSans-Regular.ttf`. Destination:
`shared/fonts/NotoSans-Regular-v1.ttf` (569208 bytes), SHA-256
`b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5`.
The upstream SIL Open Font License 1.1 is distributed alongside it as
`NotoSans-OFL.txt`; no font modification or reserved-name reuse is performed.
The web build copies these shared files to its public font assets; native hosts
can bundle the same source. This supplies a stable default drawing font without
network font loading.
TEXT-01 owns fresh layout/render/save/export verification; obtaining the font
does not establish those checks as passed. Concepts interaction observations are
behavioral references only; no Concepts code, artwork or font is copied.

Reference: /Users/oleksandr/projects/native-sketch at 3b580873ded3fea63d0220a53d7c5ece66c5d897.

Only review documents and adapted workflow/agent instructions are copied in this scaffold. No application source, tests, dependencies or binaries have been copied.

Before source reuse record: old commit/path, new path, license/attribution, reason, semantic changes, removed dependencies, acceptance IDs and newly executed results. Existing results never certify Linefield. See [inventory](reuse-ledger.md).
