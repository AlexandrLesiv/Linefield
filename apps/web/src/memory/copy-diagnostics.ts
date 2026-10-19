import { button } from "../dom.ts";
import { back } from "../canvas.css.ts";
import { t } from "../locale.ts";
import { inputDiagnostics } from "./input-diagnostics.ts";
import { diagnosticSnapshot } from "./diagnostics.ts";
import { diagnosticsControl } from "./view.css.ts";
import { pointerDiagnostics } from "./pointer-diagnostics.ts";
export function copyDiagnosticsControl() {
  const control = button(t("memory.copyDiagnostics"), `${back} ${diagnosticsControl}`, () => {
    const summary = {
      format: "linefield-manual-input-v1",
      build: new URL(import.meta.url).pathname.split("/").at(-1),
      input: inputDiagnostics(),
      pointerLifecycle: pointerDiagnostics(),
      runtime: diagnosticSnapshot(),
    };
    void navigator.clipboard.writeText(JSON.stringify(summary, null, 2)).then(
      () => {
        control.textContent = t("memory.diagnosticsCopied");
      },
      () => {
        control.textContent = t("memory.diagnosticsFailed");
      },
    );
  });
  control.dataset.memoryDiagnostics = "";
  return control;
}
