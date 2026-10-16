# Linux, web and optional Android routes — S00G research v1

Checked 2026-10-16. Lead owns Linux/web planning and assigns implementation owners before those ports.
Build reliability owns packaging evidence. These are candidate channels, not release selections.
Every row is pending implementation/verification; recheck policy at packaging start and before submission.

| ID / channel | Applicability and requirement | Linefield action/evidence |
| --- | --- | --- |
| OTHER-01 Flathub | Functional maintained app, suitable stable ID, legal redistribution/license metadata, supported runtime and narrow sandbox permissions. Current policy also requires meaningful development history and offline source builds of the app and bundled runtime dependencies. [Requirements](https://docs.flathub.org/docs/for-app-authors/requirements) | Human channel decision, source/license provenance, supported Flatpak build with declared dependency sources (audit Rust/Skia prebuilt downloads), actual portal/file/AX/device tests; a new scaffold is not ready |
| OTHER-02 Flathub agent restrictions | Current rules prohibit AI-generated/assisted manifests and agent submission/review interactions; require disclosure of included generated material. [Requirements: Generative AI policy](https://docs.flathub.org/docs/for-app-authors/requirements#generative-ai-policy) | Human-authored packaging and human submission/review if this channel is selected; stop agent packaging/submission work and recheck rules first. This research is not a submission |
| OTHER-03 Flatpak sandbox | Portal-mediated selected-file access avoids broad filesystem grants; review permissions for actual device/GPU needs. [Sandbox permissions](https://docs.flatpak.org/en/latest/sandbox-permissions.html) | Test sandboxed SQLite library and import/export/restart access; no assumption that a host path remains an authorized capability |
| OTHER-04 Snap Store | Store upload review, confinement and declared interfaces apply. Classic confinement requires explicit review; don't choose it merely to bypass restrictions. [Publishing](https://snapcraft.io/docs/releasing-your-app/), [confinement](https://snapcraft.io/docs/explanation/security/snap-confinement/) | Scoped package/interface review and install/update/uninstall evidence; no enrollment/publishing approved |
| OTHER-05 distro packages/direct Linux | No single universal Linux-store policy. Exact distro inclusion, runtime dependencies, license and update responsibilities depend on selected channel | Owner selects route later; build reliability supplies reproducible artifacts/provenance and clean-host tests. This row is project planning, not a researched distro eligibility claim |
| OTHER-06 browser/PWA | Ordinary website has no universal app-store approval. Chrome install promotion has HTTPS/manifest and engagement criteria; other browsers differ, and manual installation is distinct. [Chrome criteria](https://web.dev/articles/install-criteria) | Test each supported browser's install/offline/update/storage behavior. Installation does not certify durable storage, native API parity or offline readiness |
| OTHER-07 store-packaged web | Optional Store/PWA/TWA wrappers inherit their selected store rules as well as web constraints | Separate channel/architecture review before adding wrappers; none selected |
| OTHER-08 F-Droid | Candidate because of open-source direction; FLOSS licensing/build provenance, dependency restrictions and functional maintenance apply. [Inclusion policy](https://f-droid.org/docs/Inclusion_Policy/) | Review actual Rust/Skia/Android toolchain and binaries against source-build rules, signing/update identity and notices; no promise of acceptance from an open-source label |
| OTHER-09 other Android stores/direct APK | Samsung, Amazon and regional distribution are possible future channel investigations, not reviewed eligibility | Choose audience/devices first, then research exact rules, signatures/update continuity and developer verification; no unsupported blanket compliance claim |

For web, review SEC-13 origin isolation, hostile imported files, bounded storage and truthful durability
status; hosting logs/CDNs/telemetry can change privacy declarations even if drawing logic stays local.
No service worker, persistence backend, hosting service, analytics or domain is selected by this review.
PWA asset updates must not silently migrate or discard drawings: exact compatibility/update policy
belongs in the future web contract and real browser tests, not in an installation checkbox.

Flathub's present policy materially constrains our normal agentic packaging workflow. Preserve human
review and provenance; do not conceal generated content or route agent work through a human account.
This is a channel-specific limitation, not a ban on planning Linux support or native Linux development.
