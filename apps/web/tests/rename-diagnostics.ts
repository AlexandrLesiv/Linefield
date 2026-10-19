import type { Page, TestInfo } from "@playwright/test";

/** Test-only bounded observations; event recording can affect race timing. */
export async function withRenameDiagnostics(
  page: Page,
  info: TestInfo,
  expected: string,
  run: () => Promise<void>,
): Promise<void> {
  let navigations = 0;
  const navigation = () => {
    navigations += 1;
  };
  page.on("framenavigated", navigation);
  const recorder = await page.evaluateHandle((expectedName) => {
    const controller = new AbortController();
    const events: {
      type: string;
      target: string;
      trusted: boolean;
      closing: boolean;
      expectedInput: boolean;
      originalInput: boolean;
      valid: boolean;
    }[] = [];
    let dropped = 0;
    for (const type of ["pointerdown", "pointerup", "pointercancel", "click", "submit", "cancel"]) {
      document.addEventListener(
        type,
        (event) => {
          const dialog = document.querySelector<HTMLDialogElement>(".rename-dialog");
          if (!dialog) return;
          const input = dialog.querySelector("input");
          const target = event.target;
          const category =
            target instanceof HTMLButtonElement && dialog.contains(target)
              ? target.type === "submit"
                ? "submit"
                : "cancel"
              : target === input
                ? "input"
                : target === dialog
                  ? "dialog"
                  : "other";
          if (events.length === 64) {
            events.shift();
            dropped += 1;
          }
          events.push({
            type,
            target: category,
            trusted: event.isTrusted,
            closing: dialog.dataset.closing === "true",
            expectedInput: input?.value === expectedName,
            originalInput: input?.value === "Coastal house",
            valid: input?.validity.valid ?? false,
          });
        },
        { capture: true, signal: controller.signal },
      );
    }
    return { events, dropped: () => dropped, stop: () => controller.abort() };
  }, expected);
  let failed = false;
  try {
    await run();
  } catch (error: unknown) {
    failed = true;
    throw error;
  } finally {
    page.off("framenavigated", navigation);
    const observations = await recorder
      .evaluate((record) => {
        record.stop();
        return { events: record.events, dropped: record.dropped() };
      })
      .catch(() => ({ unavailable: "Document replaced or page closed" }));
    if (failed) {
      await info.attach("rename-events", {
        body: JSON.stringify({ navigations, observations }, null, 2),
        contentType: "application/json",
      });
    }
    await recorder.dispose();
  }
}
