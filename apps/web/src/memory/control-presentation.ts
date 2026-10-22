import type { StateValue, MappingValue } from "./bridge.ts";

// Host presentation only: Rust still supplies every style/capability/view value.
export function controlPresentation(width: HTMLInputElement | null) {
  const number = new Intl.NumberFormat(navigator.language);
  const percent = new Intl.NumberFormat(navigator.language, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const label = width?.closest("label")?.querySelector(".property-value");
  let previous: readonly (string | number | boolean)[] = [];
  return {
    label,
    number,
    percent,
    invalidate() {
      previous = [];
    },
    changed(s: StateValue, v: MappingValue, tool: string) {
      const next = [
        s.width,
        s.red,
        s.green,
        s.blue,
        s.interaction !== 0n,
        s.canUndo,
        s.canRedo,
        s.canBeginInk,
        v.zoom,
        v.angle,
        tool,
      ];
      if (next.every((value, index) => value === previous[index])) return false;
      previous = next;
      return true;
    },
  };
}

export function disabledActivation(event: Event) {
  if (!(event.target instanceof Element) || !event.target.closest("[aria-disabled=true]"))
    return false;
  if (!(event instanceof KeyboardEvent)) return true;
  if (event.key === "Enter" || event.key === " ") return true;
  return (
    event.target instanceof HTMLInputElement &&
    event.target.type === "range" &&
    /^(Arrow(Left|Right|Up|Down)|Home|End|PageUp|PageDown)$/.test(event.key)
  );
}
