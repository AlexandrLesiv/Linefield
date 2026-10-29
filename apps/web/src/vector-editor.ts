import { suspendEditorSession } from "./editor-session.ts";
import { element, button } from "./dom.ts";
import { t } from "./locale.ts";
import * as styles from "./vector-editor.css.ts";
let editor: HTMLIFrameElement | undefined;
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
  const title = element("span", "", name);
  const disclosure = element("span", "", t("memory.retained"));
  root.append(control, title, disclosure);
  return {
    root,
    back: control,
    setReady(ready: boolean) {
      root.hidden = !ready;
      frame.hidden = !ready;
    },
    dispose() {
      suspendEditorSession(frame.contentWindow);
      frame.hidden = true;
    },
  };
}
