import {
  suspendEditorSession,
  requestEditorLeave,
  editorHasUnsaved,
  closeEditorSession,
} from "./editor-session.ts";
import { element, button } from "./dom.ts";
import { t } from "./locale.ts";
import * as styles from "./vector-editor.css.ts";
let editor: HTMLIFrameElement | undefined;
let documentId: string | undefined;
window.addEventListener("beforeunload", (event) => {
  if (editorHasUnsaved(editor?.contentWindow ?? null)) {
    event.preventDefault();
    event.returnValue = "";
  }
});
export const hasVectorSession = () => !!editor;
export async function createVectorShell(id: string, name: string, back: () => void) {
  if (!editor || documentId !== id) {
    const candidate = document.createElement("iframe");
    candidate.title = t("memory.title");
    candidate.className = styles.frame;
    candidate.hidden = true;
    const initialized = new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        window.removeEventListener("message", receive);
        if (error) reject(error);
        else resolve();
      };
      const receive = (event: MessageEvent) => {
        if (
          event.origin !== location.origin ||
          event.source !== candidate.contentWindow ||
          event.data?.kind !== "linefield-editor-startup"
        )
          return;
        if (event.data.state === "ready") finish();
        if (event.data.state === "failed") finish(Error("editor-startup"));
      };
      const timer = setTimeout(() => finish(Error("editor-startup-timeout")), 30000);
      window.addEventListener("message", receive);
    });
    candidate.src = "/vector-editor/?document=" + encodeURIComponent(id);
    document.body.append(candidate);
    try {
      await initialized;
      if (editor) await closeEditorSession(editor.contentWindow);
    } catch (error) {
      try {
        await closeEditorSession(candidate.contentWindow);
      } catch {
        /* Preserve the previous session. */
      }
      candidate.remove();
      throw error;
    }
    editor?.remove();
    editor = candidate;
    documentId = id;
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

/** Deletion releases only this drawing's cached writer after successful durable flushing. */
export async function releaseVectorSession(id: string): Promise<void> {
  if (!editor || documentId !== id) return;
  const current = editor;
  await closeEditorSession(current.contentWindow);
  current.remove();
  if (editor === current) {
    editor = undefined;
    documentId = undefined;
  }
}
