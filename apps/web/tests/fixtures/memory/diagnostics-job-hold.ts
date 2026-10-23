import { PreparationExecutor } from "../../../src/memory/preparation-executor.ts";
// Actual-app fault seam: one real yielded page, no synthetic jobs or altered source data.
document.addEventListener("fixture-job-hold", (event) => {
  if (!(event instanceof CustomEvent)) return;
  const mode: unknown = event.detail;
  if (mode !== "fallback" && mode !== "replacement" && mode !== "paused") return;
  delete document.body.dataset.fixtureHeldJob;
  delete document.body.dataset.fixtureJobReleased;
  delete document.body.dataset.fixtureFirstJobCause;
  const original = PreparationExecutor.prototype.pages;
  let held = false;
  PreparationExecutor.prototype.pages = async function* (input, urgent, observation) {
    const iterator = original.call(this, input, urgent, observation);
    let restore = () => {};
    try {
      for (;;) {
        const result = await iterator.next();
        if (result.done) return;
        const replacement = document.body.dataset.fixtureReplacementRequests?.split(",") ?? [];
        const selected =
          mode === "fallback"
            ? urgent === true
            : mode === "replacement"
              ? replacement.includes(result.value.request.toString())
              : urgent !== true;
        if (!held && selected) {
          held = true;
          PreparationExecutor.prototype.pages = original;
          document.body.dataset.fixtureHeldJob = JSON.stringify({
            request: result.value.request.toString(),
            generation: this.diagnosticGeneration,
            urgent: urgent === true,
          });
          if (observation) {
            const cause = observation.cause;
            observation.cause = (value) => {
              document.body.dataset.fixtureFirstJobCause ??= value;
              cause.call(observation, value);
            };
            restore = () => {
              observation.cause = cause;
            };
          }
          await new Promise<void>((resolve) => {
            const release = (signal?: Event) => {
              clearTimeout(timer);
              document.removeEventListener("fixture-job-release", release);
              window.removeEventListener("pagehide", release);
              document.body.dataset.fixtureJobReleased = signal?.type ?? "timeout";
              resolve();
            };
            const timer = setTimeout(release, 2000);
            document.addEventListener("fixture-job-release", release, { once: true });
            window.addEventListener("pagehide", release, { once: true });
          });
        }
        yield result.value;
      }
    } finally {
      try {
        await iterator.return(undefined);
      } finally {
        restore();
      }
    }
  };
});
