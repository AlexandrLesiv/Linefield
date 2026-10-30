import { commitText, type Draft, type PrepareText } from "./commit";
import type { Core } from "../core";
import type { Camera } from "../camera";
import { checkedTextCore } from "../text-boundary";
import { checkedSaveCore } from "../saving/types";
import { textRecord, textContent, TEXT_HANDLE } from "../text/records";
import { textLayout } from "../text/layout";
import { textSheet } from "./sheet";
import { t } from "../../../web/src/locale";
export function installText(
  core: Core,
  camera: Camera,
  host: {
    ids(): number[];
    settings(): { color: number; opacity: number };
    active(): boolean;
    prepare: PrepareText;
    select(id: number): void;
    changed(): void;
    note(kind: string, bytes?: number): void;
  },
) {
  const text = checkedTextCore(core),
    save = checkedSaveCore(core),
    sheet = textSheet();
  const button = document.createElement("button"),
    edit = document.createElement("button");
  button.id = "text-tool";
  button.textContent = t("text.tool");
  button.setAttribute("aria-pressed", "false");
  document.querySelector("#slice")!.after(button);
  edit.id = "text-edit";
  edit.textContent = t("text.edit");
  edit.hidden = true;
  document.querySelector("#selection-controls")?.append(edit);
  if (!edit.isConnected) document.querySelector("header")!.append(edit);
  let draft: Draft | null = null,
    pending: AbortController | undefined;
  let working = false,
    generation = 0;
  const dirty = () => !!draft && sheet.input.value !== draft.original;
  function dismiss() {
    pending?.abort();
    pending = undefined;
    working = false;
    sheet.input.readOnly = false;
    sheet.done.disabled = sheet.composing();
    host.note("text-cancel");
    draft = null;
    generation++;
    sheet.dialog.close();
    host.changed();
  }
  sheet.cancel.onclick = dismiss;
  sheet.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (!sheet.composing()) dismiss();
  });
  sheet.input.addEventListener("input", () => {
    sheet.status.hidden = !dirty();
    host.changed();
    const value = sheet.input.value;
    void textLayout(value).then(
      (layout) => {
        if (sheet.input.value === value) sheet.fallback.hidden = !layout.fallback;
      },
      () => {},
    );
  });
  function open(id: number | null, x = 0, y = 0) {
    if (host.active() || draft) return;
    const record = id === null ? null : textRecord(text, camera, id, core.layer_render_revision());
    if (id !== null && (!record || !core.selection_eligible(id, 0))) return;
    const original = record ? textContent(text, record) : "",
      settings = host.settings();
    draft = {
      id,
      record,
      original,
      revision: save.delta_revision(),
      rx: camera.regionX,
      ry: camera.regionY,
      x,
      y,
      layer: core.layer_active(),
      color: record?.color ?? settings.color,
      opacity: record?.opacity ?? settings.opacity,
    };
    sheet.open(id !== null, original);
    host.note("text-open", record?.length ?? 0);
    host.changed();
  }
  sheet.done.onclick = async () => {
    if (!draft || working || sheet.composing()) return;
    if (draft.id !== null && sheet.input.value === draft.original) {
      dismiss();
      return;
    }
    if (!sheet.input.value.trim()) {
      if (draft.id === null) {
        dismiss();
        return;
      }
      sheet.error.textContent = t("text.empty");
      return;
    }
    const current = draft,
      token = ++generation,
      content = sheet.input.value;
    working = true;
    sheet.input.readOnly = true;
    sheet.done.disabled = true;
    const controller = new AbortController();
    pending = controller;
    try {
      host.note("text-preparing");
      const result = await commitText(
        core,
        text,
        camera,
        current,
        content,
        host.prepare,
        controller.signal,
      );
      if (draft !== current || token !== generation || controller.signal.aborted) return;
      host.note(current.id === null ? "text-create" : "text-edit", result.bytes);
      draft = null;
      sheet.dialog.close();
      host.select(result.id);
      host.changed();
    } catch (error) {
      if (draft !== current || token !== generation) return;
      const message = error instanceof Error ? error.message : "";
      sheet.error.textContent = t(
        message.includes("limit") || message.includes("budget")
          ? "text.limit"
          : message.includes("stale")
            ? "text.stale"
            : "text.failed",
      );
      host.note("text-rejected");
    } finally {
      if (pending === controller) {
        working = false;
        sheet.input.readOnly = false;
        sheet.done.disabled = sheet.composing();
        pending = undefined;
      }
    }
  };
  edit.onclick = () => {
    const ids = host.ids();
    if (ids.length === 1) open(ids[0]);
  };
  return {
    open: (x: number, y: number) => open(null, x, y),
    dirty,
    opened: () => !!draft,
    update(textTool: boolean) {
      const ids = host.ids(),
        onlyText = ids.length > 0 && ids.every((id) => id >= TEXT_HANDLE && id < 0x80000000);
      edit.hidden = ids.length !== 1 || !onlyText;
      for (const id of ["width", "brush", "fixed-width"])
        (document.getElementById(id) as HTMLInputElement).disabled = textTool || onlyText;
    },
  };
}
