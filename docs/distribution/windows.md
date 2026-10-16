# Windows distribution — S00G research v1

Checked 2026-10-16. Microsoft policy 7.19 is operative; landing-page 7.20 is published but effective
2026-10-22. Recheck at channel selection and submission; never treat publication date as effective date.
[7.19](https://learn.microsoft.com/en-us/windows/apps/publish/store-policy-archive/store-policy-7-19),
[7.20](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies),
[history](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies-change-history).
windows_ui owns host requirements; build_reliability owns artifacts/signatures; UX/UI owns flows/claims;
lead integrates and reviewer audits. All evidence pending, no Windows app/package or channel selected.

| ID / channel or trigger | Requirement and implication | Evidence needed |
| --- | --- | --- |
| WIN-01 Store MSIX candidate | Valid identity/manifest and architecture packages; Store re-signs accepted MSIX, so this route does not require buying a CA signing certificate. Recommended candidate for later WinUI3 release, not selected. [MSIX requirements](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements) | Manifest/archive inspection, certification, clean install/update/uninstall per advertised architecture |
| WIN-02 Store EXE/MSI alternative | Versioned immutable HTTPS installer, standalone/offline and silent install; trusted signatures for installer/contained PE files. Store does not sign these for us. [Installer requirements](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msi/app-package-requirements) | Hosting/version/signature inventory including native DLLs; installer and update tests |
| WIN-03 direct distribution | Publisher owns delivery/update strategy. MSIX requires publisher signing; trusted Authenticode recommended for EXE/MSI, not a claim unsigned desktop apps universally cannot execute. [Distribution](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/choose-distribution-path) | Owner selects strategy; signatures do not guarantee no SmartScreen warning |
| WIN-04 runtime dependencies | Windows App SDK framework-dependent versus self-contained deployment changes prerequisites/footprint/servicing. Rust/Skia binaries must match architecture; AnyCPU does not make native code portable. [Deployment](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/deploy-overview) | Actual x64/ARM64 builds where claimed, clean-host dependencies and rollback/migration evidence |
| WIN-05 privileges | MSIX packaging does not automatically put WinUI3 in AppContainer; desktop execution typically medium-integrity/full trust. [Capabilities](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/app-capability-declarations) | Reviewed manifest, file/IPC authority and least privilege. Windows sandbox model remains material review, not inherited from Mac |
| WIN-06 Store privacy | 7.19 section 10.5.1 covers Win32/Desktop Bridge privacy policy even offline. Describe local content/recovery/diagnostics and actual dependencies. Section 10.5.4 cryptographic protection needs actual-data assessment; no silent SQLCipher adoption or compliance assertion. [Policy](https://learn.microsoft.com/en-us/windows/apps/publish/store-policy-archive/store-policy-7-19) | Factual policy/data inventory and sensitive-data handling review; no app-level encryption choice is not blanket Store clearance |
| WIN-07 usability/listing | Accurate functionality, language/devices/screenshots; testable app, clean uninstall, security/responsiveness and applicable rights. [Policy](https://learn.microsoft.com/en-us/windows/apps/publish/store-policy-archive/store-policy-7-19) | Native E2E/AX/Narrator/UIA, scale/contrast, performance and listing evidence; no untested claims |
| WIN-08 ratings | Complete applicable age-rating process and update with relevant features/content. [Ratings](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/age-ratings?pivots=store-installer-msix) | Owner-reviewed questionnaire, not guessed rating; assess upcoming policy at submission |

Accounts, payments, telemetry, sharing and cloud change applicability later; do not add them to satisfy
hypothetical requirements. Open source does not waive IP/dependency obligations. Exact project license,
minimum OS/SDK, shipping architectures, account/legal identity and selected channel remain decisions.
Local preview does not need Store enrollment or certificate purchase. Recheck requirements after any
material SDK, data, capability or packaging change and before release. No distribution is authorized.
