import { globalStyle } from "@vanilla-extract/css";
const apple = ':root:is([data-platform="ios"], [data-platform="ipados"])';
const control = `${apple} :is(.iphone-create, .back, .mobile-actions .mobile-create)`;
globalStyle(control, {
  color: "var(--text)",
  background: "color-mix(in srgb, var(--surface) 85%, transparent)",
  border: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
  boxShadow:
    "0 3px 12px color-mix(in srgb, var(--text) 12%, transparent), inset 0 1px 0 color-mix(in srgb, var(--surface) 55%, transparent)",
  backdropFilter: "blur(16px) saturate(1.1)",
  transition: "background-color 120ms, border-color 120ms",
});
globalStyle(`${apple} :is(.back, .mobile-actions .mobile-create)`, {
  borderRadius: "999px",
  minHeight: "44px",
  minWidth: "44px",
});
globalStyle(`${control}:hover:not(:active)`, {
  "@media": { "(hover: hover) and (pointer: fine)": { background: "var(--buttonHover)" } },
});
globalStyle(`${control}:active`, { background: "var(--buttonPressed)" });
globalStyle(control, {
  "@media": {
    "(prefers-reduced-transparency: reduce), (prefers-contrast: more)": {
      background: "var(--surface)",
      borderColor: "var(--line)",
      backdropFilter: "none",
      boxShadow: "none",
    },
    "(forced-colors: active)": {
      background: "ButtonFace",
      color: "ButtonText",
      borderColor: "ButtonText",
      backdropFilter: "none",
      boxShadow: "none",
    },
  },
});

const containers = `${apple} body :is(.app-toolbar, .mobile-actions, .canvas-title)`;
globalStyle(containers, {
  "@media": {
    "(prefers-reduced-transparency: reduce), (prefers-contrast: more)": {
      background: "var(--surface)",
      color: "var(--text)",
      backdropFilter: "none",
    },
    "(forced-colors: active)": {
      background: "Canvas",
      color: "CanvasText",
      backdropFilter: "none",
    },
  },
});
