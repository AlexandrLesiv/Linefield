import { gallery as galleryStyle, srOnly, prototypeLabel } from "./styles.css.ts";
import { createAppHeader } from "./app-header.ts";
import { element } from "./dom.ts";
import { t } from "./locale.ts";
export function createGalleryShell(app: HTMLElement) {
  const toolbar = createAppHeader(),
    gallery = element("main", `gallery ${galleryStyle}`);
  const status = element("p", srOnly);
  status.setAttribute("role", "status");
  const notice = element("p", prototypeLabel, t("save.local"));
  app.append(toolbar, gallery, notice, status);
  const card = (id: string | null) =>
    id ? gallery.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`) : null;
  return { toolbar, gallery, status, notice, card };
}
