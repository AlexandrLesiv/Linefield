import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65285/");
  await page.locator(".new-tile").click();
  const host = page.frameLocator("iframe");
  await host.locator("#brush").waitFor();
  const frame = page.frames().find((candidate) => candidate.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  const box = await host.locator("canvas").boundingBox();
  await page.mouse.move(box.x + 200, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 600, box.y + 350, { steps: 20 });
  await page.mouse.up();
  const snapshot = () =>
    frame.evaluate(() => ({
      points: Array.from({ length: lab.core.raw_length(0) }, (_, i) =>
        [0, 1, 2].map((field) => lab.core.raw_point(0, i, field)),
      ),
      view: lab.view(),
      dimensions: [document.querySelector("canvas").width, document.querySelector("canvas").height],
    }));
  const before = await snapshot();
  let previous;
  for (const scheme of ["dark", "light"]) {
    await page.emulateMedia({ colorScheme: scheme });
    await frame.waitForFunction(
      (value) => document.documentElement.style.colorScheme === value,
      scheme,
    );
    const outer = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue("--surface").trim(),
    );
    const inner = await frame.evaluate(() => ({
      panel: getComputedStyle(document.documentElement).getPropertyValue("--editor-panel").trim(),
      color: getComputedStyle(document.body).backgroundColor,
    }));
    if (
      inner.panel.toLowerCase() !==
      (outer.length === 4
        ? "#" + [...outer.slice(1)].map((c) => c + c).join("")
        : outer
      ).toLowerCase()
    )
      throw Error(
        `Editor panel does not match Linefield theme: ${JSON.stringify({ inner, outer })}`,
      );
    await page.screenshot({ path: `.build-cache/restart/theme-${scheme}.png` });
    if (previous === inner.color) throw Error("Theme did not update");
    previous = inner.color;
    if (JSON.stringify(await snapshot()) !== JSON.stringify(before))
      throw Error("Theme changed drawing/view/canvas size");
  }
  await host.locator("#undo").click();
  if ((await frame.evaluate(() => lab.core.visible(0))) !== 0)
    throw Error("History failed after theme change");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS shared light/dark tokens, live theme changes, unchanged data/view/dimensions and Undo",
  );
} finally {
  await browser.close();
}
