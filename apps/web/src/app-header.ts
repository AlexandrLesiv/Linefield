import { appToolbar, productTitle } from "./styles.css.ts";
import { element } from "./dom.ts";

export function createAppHeader(): HTMLElement {
  const toolbar = element("header", `app-toolbar ${appToolbar}`);
  const product = element("div", `product-header`);
  product.append(element("h1", productTitle, "Linefield"));
  toolbar.append(product);
  return toolbar;
}
