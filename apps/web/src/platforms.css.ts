import "./apple-toolbar.css.ts";
import { globalStyle } from "@vanilla-extract/css";
globalStyle(
  ':root:is([data-platform="macos"], [data-platform="ios"], [data-platform="ipados"]) .app-toolbar',
  {
    background: "color-mix(in srgb, var(--surface) 65%, transparent)",
    backdropFilter: "blur(20px) saturate(1.2)",
  },
);
globalStyle(':root:is([data-platform="android"], [data-platform="chromeos"])', {
  fontFamily: 'Roboto, "Segoe UI", sans-serif',
});
globalStyle(':root:is([data-platform="android"], [data-platform="chromeos"]) .mobile-create', {
  border: "0",
  borderRadius: "16px",
  background: "var(--new)",
  boxShadow: "0 4px 7px #0003,\n    0 10px 24px #0002",
});
globalStyle(':root:is([data-platform="android"], [data-platform="chromeos"]) .rename-dialog', {
  border: "0",
  borderRadius: "16px",
});
globalStyle(
  ':root:is([data-platform="android"], [data-platform="chromeos"]) .dialog-actions button',
  {
    borderRadius: "8px",
  },
);
globalStyle(':root[data-platform="windows"]', {
  fontFamily: '"Segoe UI", sans-serif',
});
globalStyle(':root[data-platform="windows"] :is(.back, .more, .reset, .dialog-actions button)', {
  borderRadius: "4px",
});
globalStyle(':root:is([data-platform="ios"], [data-platform="ipados"]) .rename-dialog', {
  textAlign: "center",
  padding: "20px 16px 0",
  width: "290px",
});
globalStyle(':root:is([data-platform="ios"], [data-platform="ipados"]) .dialog-actions', {
  margin: "18px -16px 0",
  gap: "0",
  borderTop: "1px solid var(--line)",
});
globalStyle(':root:is([data-platform="ios"], [data-platform="ipados"]) .dialog-actions button', {
  flex: "1",
  border: "0",
  borderRadius: "0",
  background: "transparent",
  color: "var(--text)",
  minHeight: "44px",
});
globalStyle(
  ':root:is([data-platform="ios"], [data-platform="ipados"]) .dialog-actions button + button',
  {
    borderLeft: "1px solid var(--line)",
    fontWeight: "600",
  },
);
globalStyle(':root:is([data-platform="watchos"], [data-platform="wearos"]) .drawing-grid', {
  display: "flex",
  flexDirection: "column",
  height: "calc(100dvh - 140px)",
  overflowY: "auto",
  scrollSnapType: "y mandatory",
  gap: "0",
  padding: "0 24px",
  scrollbarWidth: "none",
});
globalStyle(':root:is([data-platform="watchos"], [data-platform="wearos"]) .drawing-card', {
  flex: "0 0 100%",
  scrollSnapAlign: "start",
  scrollSnapStop: "always",
  minHeight: "0",
  aspectRatio: "auto",
});
globalStyle(':root:is([data-platform="watchos"], [data-platform="wearos"]) .drawing-tile', {
  height: "100%",
});
globalStyle(':root:is([data-platform="watchos"], [data-platform="wearos"]) .artwork', {
  flex: "1",
  aspectRatio: "auto",
});
globalStyle(':root:is([data-platform="watchos"], [data-platform="wearos"]) .drawing-name', {
  opacity: "1",
  textAlign: "center",
  padding: "12px",
});
globalStyle(
  ':root:is([data-platform="tvos"], [data-platform="android-tv"]) .drawing-tile:focus-visible',
  {
    outline: "5px solid var(--text)",
    outlineOffset: "6px",
  },
);
globalStyle(
  ':root:is([data-platform="android"], [data-platform="chromeos"]) :is(.drawing-card, .drawing-tile, .new-cell, .new-tile, .removal, .gallery-menu)',
  { borderRadius: "16px" },
);
globalStyle(
  ':root:is([data-platform="android"], [data-platform="chromeos"]) :is(.rename-dialog input, .more, .reset, .back, .undo, .gallery-menu button)',
  { borderRadius: "8px" },
);
