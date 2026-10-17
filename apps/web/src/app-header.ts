import { composeIcon } from "./icons.ts";
import { button, element } from "./dom.ts";
import { t } from "./locale.ts";
import { labels, platforms, previewControlsEnabled } from "./model.ts";
import type { Platform } from "./model.ts";

export function createAppHeader(
  platform: Platform,
  reset: () => void,
  create: (origin: HTMLElement) => void,
) {
  const toolbar = element("header", "app-toolbar");
  const product = element("div", "product-header");
  const add = button("", "iphone-create", () => create(add));
  add.append(composeIcon());
  add.setAttribute("aria-label", t("drawing.create"));
  add.hidden = platform !== "ios";
  product.append(element("h1", "", "Linefield"));
  const controls = element("div", "preview-controls");
  const label = element("label", "", t("preview.platform"));
  const selector = element("select");
  selector.setAttribute("aria-label", t("preview.platform"));
  for (const item of platforms) {
    const option = element("option", "", labels[item]);
    option.value = item;
    selector.append(option);
  }
  selector.value = platform;
  label.append(selector);
  controls.append(label);
  controls.append(button(t("preview.reset"), "reset", reset));
  controls.append(element("span", "simulation-note", t("preview.simulation")));
  toolbar.append(product);
  if (previewControlsEnabled()) toolbar.append(controls);
  toolbar.append(add);
  return { toolbar, selector, add };
}
