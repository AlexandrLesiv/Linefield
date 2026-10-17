import "./apple-material.css.ts";
import { globalStyle } from "@vanilla-extract/css";

const apple = ':root:is([data-platform="ios"], [data-platform="ipados"])';
globalStyle(".mobile-actions", { display: "none" });
globalStyle(".mobile-actions", {
  "@media": {
    "(max-width: 639px)": {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      padding:
        "4px max(16px, env(safe-area-inset-right)) calc(4px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
      background: "color-mix(in srgb, var(--surface) 65%, transparent)",
      backdropFilter: "blur(20px) saturate(1.2)",
    },
  },
});
globalStyle(".mobile-actions .mobile-create", {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  position: "static",
  border: 0,
  borderRadius: "8px",
  boxShadow: "none",
  padding: "8px",
  minWidth: "44px",
  minHeight: "44px",
  fontWeight: "500",
  background: "transparent",
});
globalStyle(':root[data-platform="ipados"] .drawing-grid', {
  "@media": { "(max-width: 639px)": { paddingBottom: "calc(72px + env(safe-area-inset-bottom))" } },
});
globalStyle(".empty .mobile-actions", { display: "none" });
globalStyle(`${apple} .prototype-label`, {
  "@media": { "(max-width: 639px)": { display: "none" } },
});

const iphone = ':root[data-platform="ios"]';
globalStyle(".product-header", { display: "flex", alignItems: "center", gap: "16px" });
globalStyle(`${iphone} .app-toolbar`, { display: "contents" });
globalStyle(`${iphone} .product-header`, {
  justifyContent: "space-between",
  minHeight: "68px",
  position: "sticky",
  top: 0,
  zIndex: 2,
  padding: "12px max(20px, env(safe-area-inset-right)) 12px max(20px, env(safe-area-inset-left))",
  background: "var(--background)",
});
globalStyle(`${iphone} .preview-controls`, {
  maxWidth: "none",
  flexWrap: "wrap",
  justifyContent: "flex-start",
  gap: "8px",
  padding: "0 max(20px, env(safe-area-inset-right)) 12px max(20px, env(safe-area-inset-left))",
});
globalStyle(".iphone-create:not([hidden])", {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "fixed",
  zIndex: 2,
  right: "max(20px, env(safe-area-inset-right))",
  bottom: "calc(16px + env(safe-area-inset-bottom))",
  width: "56px",
  height: "56px",
  padding: "16px",
  borderRadius: "50%",
});
globalStyle(".drawing-open .iphone-create", { visibility: "hidden" });
globalStyle(`${iphone} .drawing-grid`, {
  paddingBottom: "calc(88px + env(safe-area-inset-bottom))",
});
