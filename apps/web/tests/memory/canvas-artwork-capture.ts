import type { Page } from "@playwright/test";
// Functional capture only: expose the entire artwork rectangle without overlaid chrome
// or its focus decoration. No canvas pixels, dimensions, input or editor state change.
export async function canvasArtwork(page: Page) {
  const previous = await page.evaluate(() => {
    const chrome = document.querySelector(".drawing-chrome"),
      canvas = document.querySelector("canvas");
    if (!(chrome instanceof HTMLElement) || !canvas) throw Error("capture surfaces missing");
    const saved = { chrome: chrome.getAttribute("style"), canvas: canvas.getAttribute("style") };
    chrome.style.visibility = "hidden";
    canvas.style.outline = "none";
    return {
      ...saved,
      applied:
        getComputedStyle(chrome).visibility === "hidden" &&
        getComputedStyle(canvas).outlineStyle === "none",
    };
  });
  try {
    if (!previous.applied) throw Error("capture styles not applied");
    return await page.locator("canvas").screenshot();
  } finally {
    await page.evaluate((saved) => {
      const chrome = document.querySelector(".drawing-chrome"),
        canvas = document.querySelector("canvas");
      if (!(chrome instanceof HTMLElement) || !canvas) throw Error("capture surfaces departed");
      for (const [node, value] of [
        [chrome, saved.chrome],
        [canvas, saved.canvas],
      ] as const) {
        if (value === null) node.removeAttribute("style");
        else node.setAttribute("style", value);
      }
    }, previous);
  }
}
