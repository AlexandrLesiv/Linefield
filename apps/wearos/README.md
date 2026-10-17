# Wear OS host

Status: target/folder requested 2026-10-16; documentation only. No app or SDK dependencies.

Plan a Kotlin Wear OS host with shared Rust document/capability behavior through the reviewed
Android typed boundary. View-only is owner-selected (decision 152); network services, toolkit
and phone-companion requirements remain separate decisions. Editing is out of scope.

Review a watch-specific UI toolkit separately. Google recommends Compose for Wear OS; adopting
it would be a separate Wear-specific toolkit selection beyond phone/tablet Compose Material 3, not an incidental
migration. Select supported toolkit/device versions before implementation. See [P12](../../tasks/P12.md)
and [platform plan](../../docs/platforms.md).

Design for small/round screens, rotary input where available, native Back/focus, accessibility,
English initial resources, reduced motion, offline states and bounded memory/battery work.
Standalone versus companion-dependent operation, document acquisition and later network/auth
are still open. Tiles, complications, watch faces and editing tools are not implied.
