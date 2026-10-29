import { suspendEditorSession, requestEditorLeave, editorHasUnsaved } from "./editor-session.ts";
import { element, button } from "./dom.ts";
import { t } from "./locale.ts";
import * as styles from "./vector-editor.css.ts";
let editor: HTMLIFrameElement | undefined;
window.addEventListener("beforeunload", (event) => {
  if (editorHasUnsaved(editor?.contentWindow ?? null)) {
    event.preventDefault();
    event.returnValue = "";
  }
});
export const hasVectorSession = () => !!editor;
export function createVectorShell(name: string, back: () => void) {
  if (!editor) {
    editor = document.createElement("iframe");
    editor.src = "/vector-editor/";
    editor.title = t("memory.title");
    editor.className = styles.frame;
    editor.hidden = true;
    document.body.append(editor);
  }
  const frame = editor;
  const root = element("header", styles.header);
  const control = button(t("navigation.back"), "", back);
  const title = element("span", styles.title, name);
  const disclosure = element("span", styles.disclosure, t("save.local"));
  root.append(control, title, disclosure);
  const size = new ResizeObserver(() => {
    if (!root.hidden)
      frame.style.setProperty("--editor-header-height", `${root.getBoundingClientRect().height}px`);
  });
  size.observe(root);
  return {
    root,
    back: control,
    requestLeave: () => requestEditorLeave(frame.contentWindow),
    setReady(ready: boolean) {
      root.hidden = !ready;
      frame.hidden = !ready;
    },
    dispose() {
      size.disconnect();
      suspendEditorSession(frame.contentWindow);
      frame.hidden = true;
    },
  };
}
