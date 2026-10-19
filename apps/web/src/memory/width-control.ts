export function widthControl(input: HTMLInputElement, surface: HTMLElement, read: () => number) {
  const number = new Intl.NumberFormat(navigator.language);
  let staged = false;
  let cancelled = false;
  const present = () => {
    const text = number.format(input.valueAsNumber);
    input.setAttribute("aria-valuetext", text);
    const value = surface.querySelector(".property-width .property-value");
    if (value) value.textContent = text;
    surface
      .querySelector(".stroke-preview path")
      ?.setAttribute("stroke-width", String(Math.min(input.valueAsNumber / 4, 16)));
  };
  const cancel = () => {
    input.value = String(read());
    staged = false;
    cancelled = true;
    present();
  };
  const start = () => {
    staged = true;
    cancelled = false;
  };
  const change = () => {
    if (cancelled) cancel();
    else staged = false;
  };
  const update = () => {
    if (cancelled) cancel();
    else {
      staged = true;
      present();
    }
  };
  const blur = () => {
    if (staged) cancel();
  };
  const focus = () => {
    if (input.matches(":focus-visible"))
      input
        .closest("label")
        ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  };
  const key = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      cancel();
      event.preventDefault();
      event.stopPropagation();
    } else cancelled = false;
  };
  input.addEventListener("pointerdown", start);
  input.addEventListener("input", update);
  input.addEventListener("change", change);
  input.addEventListener("pointercancel", cancel);
  input.addEventListener("blur", blur);
  input.addEventListener("keydown", key);
  input.addEventListener("focus", focus);
  present();
  return {
    present,
    accepted: () => !cancelled,
    dispose() {
      input.removeEventListener("pointerdown", start);
      input.removeEventListener("input", update);
      input.removeEventListener("change", change);
      input.removeEventListener("pointercancel", cancel);
      input.removeEventListener("blur", blur);
      input.removeEventListener("keydown", key);
      input.removeEventListener("focus", focus);
    },
  };
}
