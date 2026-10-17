import { globalStyle } from "@vanilla-extract/css";
globalStyle(".rename-dialog", {
  padding: "24px",
  border: "1px solid var(--line)",
  borderRadius: "14px",
  background: "var(--surface)",
  color: "var(--text)",
  width: "min(360px, calc(100vw - 32px))",
});
globalStyle(".rename-dialog::backdrop", {
  background: "transparent",
});
globalStyle(".rename-dialog h2", {
  margin: "0 0 24px",
  fontSize: "18px",
});
globalStyle(".rename-dialog label", {
  display: "grid",
  gap: "8px",
  fontSize: "14px",
});
globalStyle(".rename-dialog input", {
  width: "100%",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid var(--line)",
  background: "var(--background)",
});
globalStyle(".dialog-actions", {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
});
globalStyle(".dialog-actions button", {
  padding: "8px 14px",
  border: "1px solid var(--line)",
  borderRadius: "8px",
  background: "var(--surface)",
});
globalStyle(".dialog-actions .primary", {
  background: "var(--text)",
  color: "var(--background)",
});
globalStyle(".error", {
  color: "var(--error)",
});

globalStyle(".dialog-actions button", {
  minHeight: "44px",
  minWidth: "44px",
  transition: "background-color 120ms",
});
globalStyle(".dialog-actions button:not(.primary):hover:not(:active)", {
  "@media": { "(hover: hover) and (pointer: fine)": { background: "var(--buttonHover)" } },
});
globalStyle(".dialog-actions .primary:hover:not(:active)", {
  "@media": { "(hover: hover) and (pointer: fine)": { background: "var(--primaryHover)" } },
});
globalStyle(".dialog-actions button:not(.primary):active", {
  background: "var(--buttonPressed)",
});
globalStyle(".dialog-actions .primary:active", {
  background: "var(--primaryPressed)",
});
const appleAction =
  ':root:is([data-platform="ios"], [data-platform="ipados"]) .dialog-actions button';
globalStyle(`${appleAction}:hover:not(:active)`, {
  "@media": { "(hover: hover) and (pointer: fine)": { background: "var(--buttonHover)" } },
});
globalStyle(`${appleAction}:active`, {
  background: "var(--buttonPressed)",
});
