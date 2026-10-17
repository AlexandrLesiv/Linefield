# Opt-in platform previews — 2026-10-17

Decision230 / WEB-PC01–03: normal web entry omits platform selector and label, including after navigation/reload. Explicit ?preview=1 or valid ?platform links enable existing review controls. Invalid/unrelated queries do not. Selector changes still preserve URL/history. Reset samples and simulation notice remain.

Base revision fa38072da22015a965da145d6635e4e6da8ba8d7 plus dirty tree. [Source manifest](../../../../quality/theme-resources/source-hashes.json). macOS27.0.1 arm64; Chrome155.0.8059.80 and headless WebKit27.2. Full suite126passed,0failed/skipped (125Chrome,1WebKit); browser.log/json retained. Existing selector-interaction tests now explicitly opt into review mode, preserving original assertions; new tests cover defaultabsence. Production build passes: index-BnKIHAmk.js46.41kB, index-GUGOXPPH.css17.52kB. Root source/catalog gates pass.

Designer review passed normal1280px/390px appearance and keyboard focus; see review.md and local ignored screenshots. Fresh code reviewer independently passed3picker tests, no remaining findings. No native-device/screen-reader acceptance claimed. Shared native-resource generation evidence is in root quality/theme-resources; web evidence remains application-owned.
