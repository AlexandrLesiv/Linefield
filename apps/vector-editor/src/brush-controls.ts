import { createPressureControls } from "./pressure";

/** Browser control state only. Rust validates and freezes the returned settings
 * when a stroke begins; this adapter never rewrites document or sample data.
 */
export function createBrushControls() {
  const pressure = createPressureControls();
  const opacity = document.querySelector<HTMLInputElement>("#opacity")!;
  const opacityValue = document.querySelector<HTMLOutputElement>("#opacity-value")!;
  const width = document.querySelector<HTMLInputElement>("#width")!;
  const color = document.querySelector<HTMLInputElement>("#color")!;
  const fixed = document.querySelector<HTMLInputElement>("#fixed-width")!;
  const brush = document.querySelector<HTMLSelectElement>("#brush")!;
  const brushWidths = [6, 3, 12];
  let previousBrush = 0;
  opacity.addEventListener("input", () => {
    opacityValue.textContent = `${opacity.value}%`;
    opacity.setAttribute("aria-valuetext", `${opacity.value}%`);
  });
  return {
    read() {
      return {
        ...pressure.settings(),
        width: Number(width.value),
        color: Number.parseInt(color.value.slice(1), 16),
        opacity: Number(opacity.value) / 100,
        fixedWidth: fixed.checked,
        brush: Number(brush.value),
      };
    },
    receive: pressure.receive,
    render: pressure.render,
    /** Install after the tool handlers, preserving startup and event ordering. */
    connectTools() {
      brush.addEventListener("change", () => {
        brushWidths[previousBrush] = Number(width.value);
        previousBrush = Number(brush.value);
        width.value = String(brushWidths[previousBrush] ?? 6);
        width.dispatchEvent(new Event("input"));
        document.querySelector<HTMLButtonElement>("#pen")!.click();
      });
      width.addEventListener("input", () => {
        document.querySelector("#widthValue")!.textContent = width.value;
      });
    },
  };
}
