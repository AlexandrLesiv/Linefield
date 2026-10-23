import type { Page } from "@playwright/test";
export async function installCandidateTurnHold(page: Page) {
  await page.addInitScript(() => {
    const timeout = window.setTimeout;
    const held: (() => void)[] = [];
    Object.defineProperty(window, "setTimeout", {
      value: (handler: TimerHandler, delay?: number, ...args: unknown[]) => {
        if (
          delay === 0 &&
          typeof handler === "function" &&
          document.documentElement.dataset.holdCandidateTurn === "true"
        )
          return timeout(() => {
            if (held.length >= 32) throw Error("controlled candidate turn bound");
            held.push(() => handler(...args));
            document.documentElement.dataset.candidateTurns = String(held.length);
          }, 0);
        return timeout(handler, delay, ...args);
      },
    });
    document.addEventListener("release-candidate-turn", () => {
      document.documentElement.dataset.holdCandidateTurn = "false";
      for (const run of held.splice(0)) timeout(run, 0);
      document.documentElement.dataset.candidateTurns = "0";
    });
    document.addEventListener("step-candidate-turn", () => {
      const run = held.shift();
      if (run) timeout(run, 0);
      document.documentElement.dataset.candidateTurns = String(held.length);
    });
  });
}
