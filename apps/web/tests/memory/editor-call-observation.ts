import type { Page } from "@playwright/test";
export async function observeEditorCalls(page: Page) {
  await page.addInitScript(() => {
    const instantiate = WebAssembly.instantiateStreaming;
    WebAssembly.instantiateStreaming = async (source, imports) => {
      const result = await instantiate(source, imports);
      const exports = { ...result.instance.exports };
      if (typeof exports.memoryCreate !== "function") return result;
      for (const [name, value] of Object.entries(exports)) {
        if (typeof value !== "function") continue;
        document.documentElement.dataset.wrappedCalls = `${
          Number(document.documentElement.dataset.wrappedCalls ?? 0) + 1
        }`;
        exports[name] = (...args: unknown[]) => {
          const dataset = document.documentElement.dataset;
          dataset.engineCalls = `${Number(dataset.engineCalls ?? 0) + 1}`;
          if (dataset.afterTrap !== undefined)
            dataset.afterTrap = `${Number(dataset.afterTrap) + 1}`;
          try {
            if (
              (name === "memoryUndo" && dataset.trapStage === "injected command") ||
              (name === "memoryReleasePage" && dataset.trapStage === "release-page") ||
              (name === "memoryReleasePreparation" && dataset.trapStage === "release-ticket") ||
              (name === "reply_code" && dataset.armedStage === "injected getter") ||
              (name === "__wbg_reply_free" && dataset.armedStage === "injected destructor")
            )
              throw new WebAssembly.RuntimeError("isolated command-boundary exception");
            const valueReturned: unknown = Reflect.apply(value, undefined, args);
            if (name === "memoryUndo" && dataset.trapStage) dataset.armedStage = dataset.trapStage;
            return valueReturned;
          } catch (error) {
            dataset.afterTrap ??= "0";
            throw error;
          }
        };
      }
      Object.defineProperty(result.instance, "exports", { value: exports });
      return result;
    };
  });
}
