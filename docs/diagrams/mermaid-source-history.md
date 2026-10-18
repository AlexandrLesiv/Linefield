# Original Mermaid sources — migration history

These five source blocks are retained verbatim as text when current documents switch to native
SVG. They are historical source, not a second editable authority. Other historical/approval
documents retain their original blocks in place. See migration-v2.md for the full16-block map.

## docs/developer-experience.md

```text
flowchart LR
    Zed[Zed project tasks] --> CLI[Node .ts actions]
    Terminal[Command line] --> CLI
    CLI --> Tools[Cargo, Xcode and later platform tools]
    Tools --> Reports[Versioned evidence and metrics]
    Reports --> Local[Future local workbench views]
    Reports --> Static[Future static CI report views]
    Docs[Tasks, decisions and design review approval records] --> Local
    Docs --> Static
```

## docs/workflow/git-strategy.md

```text
flowchart LR
    M[Reviewed main] --> T[Bounded task branch]
    T --> C[Implementation, docs and tests]
    C --> R[Specialist and independent review]
    R --> V[Verify exact integration candidate]
    V --> A[Owner approves main integration]
    A --> N[Updated main]
    N --> T
```

## docs/internationalization.md

```text
flowchart LR
    Rust[Rust command result: stable kind and typed values] --> Presenter[Native or web presenter]
    Resources[Platform message resources and locale] --> Presenter
    Presenter --> UI[Localized text, numbers and accessibility]
    Field[Localized numeric field] --> Parse[Host parser: full-string validation]
    Parse --> Command[Typed numeric Rust command]
    Command --> Rust
    Rust --> File[Locale-independent document schema]
```

## docs/testing/shared-e2e.md

```text
flowchart TD
    Catalog[Shared scenario catalog and fixture definitions] --> Mac[macOS native driver]
    Catalog --> Mobile[iOS and Android native drivers]
    Catalog --> Desktop[Windows and Linux native drivers]
    Catalog --> Web[Browser driver]
    Catalog --> Viewers[TV and Watch viewer drivers]
    Mac --> UI[Real controls, gestures and lifecycle]
    Mobile --> UI
    Desktop --> UI
    Web --> UI
    Viewers --> UI
    UI --> Assertions[Shared semantic assertions plus platform checks]
    Assertions --> Report[Common evidence report]
```

## docs/architecture/incremental-collaboration.md

```text
flowchart TD
  A["Local client A: UI and input preview"] --> T["Typed incremental operations"]
  B["Local client B: UI and input preview"] --> T
  T --> C["Authoritative Rust document coordinator"]
  C --> D["Ordered changes and acknowledgements"]
  D --> A
  D --> B
  C --> P["Bounded persistence worker → local SQLite"]
  P --> S["Durable revision acknowledgement"]
  S --> C
  P -. "Future coherent snapshots + conditional publication" .-> Cloud["Cloud adapter"]
```
