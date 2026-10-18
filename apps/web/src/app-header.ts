import { element } from "./dom.ts";

export function createAppHeader(): HTMLElement {
  const toolbar = element("header", "app-toolbar");
  const product = element("div", "product-header");
  product.append(element("h1", "", "Linefield"));
  toolbar.append(product);
  return toolbar;
}
