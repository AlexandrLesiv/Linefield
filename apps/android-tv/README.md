# Android TV and Google TV

Status: documentation placeholder only, explicitly requested 2026-10-16. No application source or build/dependency files.

Scope: View-only drawing presentation with remote/D-pad navigation, focus, loading and supported pan/zoom. Shared read-only capabilities must reject editing, not merely hide tools. Google TV is covered by this Android TV host, not a second editing engine.

Owner: android_ui, with ux_designer and ui_designer and rendering_performance review as needed. Reuse shared Rust semantics and reviewed Android integration; platform UI/input/lifecycle remains specific.

Implementation follows macOS and the reviewed task/design. See [P10](../../tasks/P10.md), [platform plan](../../docs/platforms.md) and [root instructions](../../AGENTS.md). Folder existence is not verified device support.
