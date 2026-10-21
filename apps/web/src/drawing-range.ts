import {
  propertyValue,
  propertyTrack,
  drawingProperty,
  propertyWidth,
  propertyOpacity,
  propertySmoothing,
  propertyInput,
} from "./drawing-controls.css.ts";
import { element } from "./dom.ts";
import { t } from "./locale.ts";
import { drawingIcon } from "./drawing-icons.ts";
import { record } from "./diagnostics.ts";
const propertyStyles = {
  width: propertyWidth,
  opacity: propertyOpacity,
  smoothing: propertySmoothing,
};
export type Property = "width" | "opacity" | "smoothing";
export function drawingRange(property: Property, initial: number, update: () => void) {
  const label = element(
    "label",
    `drawing-property property-${property} ${drawingProperty} ${propertyStyles[property]}`,
  );
  const name = t(`canvas.${property}`);
  label.title = name;
  const input = element("input", propertyInput);
  input.type = "range";
  input.min = property === "width" ? "1" : "0";
  input.max = property === "width" ? "32" : "100";
  input.step = "1";
  input.value = String(initial);
  input.setAttribute("aria-label", name);
  input.addEventListener("focus", () => {
    if (input.matches(":focus-visible")) {
      label.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    }
  });
  const value = element("span", `property-value ${propertyValue}`);
  value.setAttribute("aria-hidden", "true");
  const number = new Intl.NumberFormat(navigator.language);
  const percent = new Intl.NumberFormat(navigator.language, { style: "percent" });
  let start: number | null = null;
  let cancelled = false;
  let keyboardAdjustment = false;
  let accepted = initial;
  const render = () => {
    const numeric = Number(input.value);
    const text = property === "width" ? number.format(numeric) : percent.format(numeric / 100);
    value.textContent = text;
    input.setAttribute("aria-valuetext", text);
    update();
  };
  const cancel = () => {
    if (start === null) return;
    input.value = String(start);
    accepted = start;
    start = null;
    cancelled = true;
    render();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    record("adjustment-cancelled");
  };
  input.addEventListener("pointerdown", () => {
    keyboardAdjustment = false;
    start = Number(input.value);
    cancelled = false;
  });
  input.addEventListener("input", () => {
    if (cancelled && !keyboardAdjustment) {
      input.value = String(accepted);
      return;
    }
    render();
  });
  input.addEventListener("change", () => {
    if (cancelled && !keyboardAdjustment) {
      input.value = String(accepted);
      return;
    }
    accepted = Number(input.value);
    start = null;
    render();
    record("property-changed");
  });
  input.addEventListener("pointerup", () => {
    if (!cancelled) accepted = Number(input.value);
    start = null;
  });
  input.addEventListener("pointercancel", () => {
    cancel();
  });
  input.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "Escape" && start !== null) {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    } else if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "PageUp",
        "PageDown",
      ].includes(event.key)
    ) {
      if (start !== null) event.preventDefault();
      else keyboardAdjustment = true;
    }
  });
  input.addEventListener("keyup", () => {
    keyboardAdjustment = false;
  });
  input.addEventListener("pointermove", () => {
    keyboardAdjustment = false;
  });
  input.addEventListener("blur", cancel);
  const track = element("span", `property-track ${propertyTrack}`);
  track.append(input);
  label.append(drawingIcon(property), value, track);
  return { label, input, cancel, render };
}
