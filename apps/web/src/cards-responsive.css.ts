import { globalStyle } from "@vanilla-extract/css";
globalStyle(".drawing-name, .more", {
  "@media": {
    "(hover: hover) and (pointer: fine) and (min-width: 640px)": {
      opacity: "0",
      transition: "opacity 130ms",
    },
  },
});
globalStyle(
  '.drawing-card:is(:hover, :focus-within, [data-menu-open]) :is(.drawing-name, .more), .more[aria-expanded="true"]',
  {
    "@media": {
      "(hover: hover) and (pointer: fine) and (min-width: 640px)": {
        opacity: "1",
      },
    },
  },
);
globalStyle(".drawing-grid", {
  "@media": {
    "(max-width: 959px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "24px",
      padding: "16px 24px",
    },
  },
});
globalStyle(".drawing-grid", {
  "@media": {
    "(max-width: 639px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: "20px",
      padding: "16px 20px 110px",
    },
  },
});
globalStyle(".drawing-card", {
  "@media": {
    "(max-width: 639px)": {
      aspectRatio: "auto",
    },
  },
});
globalStyle(".drawing-tile", {
  "@media": {
    "(max-width: 639px)": {
      height: "auto",
    },
  },
});
globalStyle(".artwork", {
  "@media": {
    "(max-width: 639px)": {
      aspectRatio: "4/3",
      flex: "none",
    },
  },
});
globalStyle(".drawing-name", {
  "@media": {
    "(max-width: 639px)": {
      opacity: "1",
    },
  },
});
globalStyle(".new-cell", {
  "@media": {
    "(max-width: 639px)": {
      display: "none",
    },
  },
});
globalStyle(".mobile-create", {
  "@media": {
    "(max-width: 639px)": {
      display: "block",
      position: "fixed",
      bottom: "max(24px, env(safe-area-inset-bottom))",
      right: "max(20px, env(safe-area-inset-right))",
      zIndex: "2",
      padding: "16px 22px",
      border: "1px solid var(--line)",
      borderRadius: "20px",
      background: "var(--surface)",
      color: "var(--text)",
      boxShadow: "0 4px 18px #0003",
    },
  },
});
globalStyle(".empty .new-cell", {
  "@media": {
    "(max-width: 639px)": {
      display: "block",
    },
  },
});
globalStyle(".empty .mobile-create", {
  "@media": {
    "(max-width: 639px)": {
      display: "none",
    },
  },
});

globalStyle(".drawing-card, .new-cell", {
  "@media": { "(min-width: 640px)": { maxWidth: "420px" } },
});
