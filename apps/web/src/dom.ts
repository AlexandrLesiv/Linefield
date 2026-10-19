import { buttonControl } from "./button.css.ts";
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = tag === "button" ? `${className} ${buttonControl}` : className;
  node.textContent = text;
  return node;
}
export function button(label: string, className: string, action: () => void): HTMLButtonElement {
  const node = element("button", className, label);
  node.type = "button";
  node.addEventListener("click", action);
  return node;
}
export function reducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
