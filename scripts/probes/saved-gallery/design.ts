import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import type {
  Browser,
  Page,
} from "../../../node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/index.js";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium } = require("@playwright/test") as {
  chromium: { launch(options: object): Promise<Browser> };
};
const base = process.env.LINEFIELD_PREVIEW_URL ?? "http://127.0.0.1:65353";
const output = ".build-cache/save06-design";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results: object[] = [];
function check(value: unknown, message: string) {
  if (!value) throw Error(message);
}
async function create(page: Page) {
  const button = page.locator(".new-tile:visible, .mobile-create:visible").first();
  await button.focus();
  await page.keyboard.press("Enter");
  await page
    .locator("iframe:not([hidden])")
    .waitFor()
    .catch(async (error) => {
      await page.screenshot({ path: output + "/create-failure.png" });
      console.log({
        url: page.url(),
        body: await page.locator("body").innerText(),
        frames: await page.locator("iframe").evaluateAll((nodes) =>
          nodes.map((n) => ({
            hidden: (n as HTMLIFrameElement).hidden,
            src: (n as HTMLIFrameElement).src,
          })),
        ),
        surfaces: await page.locator(".drawing-surface").count(),
      });
      throw error;
    });
  return new URL(page.url()).pathname.split("/").at(-1)!;
}
async function back(page: Page) {
  await page.locator(".drawing-surface header button").first().click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.waitForFunction(() => document.activeElement?.matches(".drawing-tile"));
}
try {
  for (const locale of ["en-US", "uk-UA"])
    for (const width of [390, 1200])
      for (const scheme of ["light", "dark"] as const) {
        const context = await browser.newContext({
          locale,
          viewport: { width, height: width === 390 ? 844 : 1000 },
          colorScheme: scheme,
          reducedMotion: "reduce",
        });
        const page = await context.newPage(),
          errors: string[] = [];
        page.on("pageerror", (e) => {
          errors.push(e.message);
          console.log("PAGEERROR", e.message);
        });
        await page.goto(base);
        await page.locator(".new-tile").waitFor({ state: "attached" });
        check(
          (await page.locator(".drawing-card").count()) === 0,
          "empty contains no sample drawings",
        );
        console.log("CASE", locale, width, scheme, "first New");
        const first = await create(page);
        await back(page);
        const focusFirst = await page.evaluate(
          () => document.activeElement?.closest<HTMLElement>("[data-id]")?.dataset.id,
        );
        check(focusFirst === first, "Back focuses created drawing");
        console.log("CASE", locale, width, scheme, "second New after Back");
        const second = await create(page);
        await back(page);
        check(second !== first, "New creates a different identity");
        const cards = await page.locator(".drawing-card").evaluateAll((nodes) =>
          nodes.map((node) => {
            const name = node.querySelector<HTMLElement>(".drawing-name")!,
              art = node.querySelector<HTMLElement>(".artwork")!;
            return {
              id: (node as HTMLElement).dataset.id,
              name: name.textContent,
              opacity: getComputedStyle(name).opacity,
              white: getComputedStyle(art).backgroundColor,
              label: node.querySelector("button")!.getAttribute("aria-label"),
            };
          }),
        );
        check(
          cards.length === 2 &&
            cards.every((c) => c.name && c.opacity === "1" && c.white === "rgb(255, 255, 255)"),
          "named white actual cards",
        );
        check(cards[0]?.name !== cards[1]?.name, "titles distinguish white cards");
        check(
          (await page.locator(".more,[aria-haspopup=menu],.removal,.undo").count()) === 0,
          "unsupported actions absent",
        );
        check(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          "no horizontal overflow",
        );
        await page.screenshot({ path: `${output}/${locale}-${width}-${scheme}.png` });
        const open = page.locator(`[data-id="${first}"] .drawing-tile`);
        await open.focus();
        await page.keyboard.press("Enter");
        await page.locator("iframe:not([hidden])").waitFor();
        check(new URL(page.url()).pathname.endsWith(first), "keyboard Open uses exact identity");
        await back(page);
        check(
          (await page.evaluate(
            () => document.activeElement?.closest<HTMLElement>("[data-id]")?.dataset.id,
          )) === first,
          "Back restores opened card focus",
        );
        check(errors.length === 0, "no uncaught errors");
        results.push({ locale, width, scheme, cards, keyboardOpen: true, focus: true, errors });
        await context.close();
      }
  for (const locale of ["en-US", "uk-UA"]) {
    const context = await browser.newContext({
      locale,
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      Object.defineProperty(window, "Worker", {
        configurable: true,
        value: class {
          onerror: ((event: ErrorEvent) => void) | null = null;
          constructor() {
            window.addEventListener(
              "save06-worker-fail",
              () => this.onerror?.(new ErrorEvent("error", { cancelable: true })),
              { once: true },
            );
          }
          postMessage() {}
          terminate() {}
        },
      });
      window.addEventListener("save06-worker-restore", () =>
        Object.defineProperty(window, "Worker", { value: NativeWorker }),
      );
    });
    await page.goto(base);
    const loading = locale === "en-US" ? "Loading saved drawings" : "Завантаження збережених";
    await page.getByText(loading, { exact: false }).waitFor();
    check(
      (await page.locator(".new-tile,.drawing-card").count()) === 0,
      "loading does not present writable empty gallery",
    );
    await page.evaluate(() => window.dispatchEvent(new Event("save06-worker-fail")));
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.textContent?.includes("Existing data") ||
        document.querySelector("main")?.textContent?.includes("Наявні дані"),
    );
    check(
      (await page.locator(".new-tile,.drawing-card").count()) === 0,
      "failure does not present blank replacement",
    );
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "failure wording no overflow",
    );
    await page.screenshot({ path: `${output}/${locale}-failed.png` });
    await page.evaluate(() => window.dispatchEvent(new Event("save06-worker-restore")));
    await page.locator("main button").click();
    await page.locator(".new-tile").waitFor();
    check(
      (await page.locator(".drawing-card").count()) === 0,
      "Retry admits genuine empty gallery",
    );
    results.push({
      locale,
      loading: true,
      failed: true,
      retry: true,
      fault: "injected unavailable Worker API",
    });
    await context.close();
  }
  writeFileSync(
    output + "/results.json",
    JSON.stringify({ base, browser: browser.version(), results }, null, 2),
  );
  console.log(JSON.stringify({ cases: results.length, passed: true }));
} finally {
  await browser.close();
}
