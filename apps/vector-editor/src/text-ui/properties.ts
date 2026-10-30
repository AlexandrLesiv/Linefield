import { commitText, type PrepareText } from "./commit";
import { t } from "../../../web/src/locale";
import type { Core } from "../core";
import type { Camera } from "../camera";
import { checkedTextCore } from "../text-boundary";
import { checkedSaveCore } from "../saving/types";
import { textRecord, textContent, TEXT_HANDLE } from "../text/records";
/** Native controls dispatch one canonical edit on change, rather than mutating rendered styles. */
export function textProperties(
  core: Core,
  camera: Camera,
  ids: () => number[],
  changed: () => void,
  prepare: PrepareText,
) {
  const text = checkedTextCore(core),
    save = checkedSaveCore(core);
  const color = document.querySelector<HTMLInputElement>("#color")!,
    opacity = document.querySelector<HTMLInputElement>("#opacity")!;
  let signature = "";
  function selected() {
    const chosen = ids();
    return chosen.length === 1 && chosen[0] >= TEXT_HANDLE && chosen[0] < 0x80000000
      ? chosen[0]
      : null;
  }
  const error = document.createElement("p");
  error.id = "text-style-error";
  error.hidden = true;
  error.setAttribute("role", "alert");
  document.querySelector("header")!.append(error);
  let applying = false;
  for (const control of [color, opacity])
    control.addEventListener("change", async () => {
      const id = selected();
      if (id === null || applying || !core.selection_eligible(id, 0)) return;
      const record = textRecord(text, camera, id, core.layer_render_revision());
      if (!record) return;
      const value = textContent(text, record),
        targetColor = Number.parseInt(color.value.slice(1), 16),
        targetOpacity = Number(opacity.value) / 100;
      applying = true;
      error.hidden = true;
      try {
        if (targetColor !== record.color)
          await commitText(
            core,
            text,
            camera,
            {
              id,
              record,
              original: value,
              revision: save.delta_revision(),
              rx: camera.regionX,
              ry: camera.regionY,
              x: 0,
              y: 0,
              layer: 0,
              color: targetColor,
              opacity: targetOpacity,
            },
            value,
            prepare,
            new AbortController().signal,
          );
        else {
          const bytes = new TextEncoder().encode(value);
          new Uint8Array(core.memory.buffer, text.text_input_ptr(), bytes.length).set(bytes);
          if (
            !text.text_edit(
              id,
              record.revision,
              save.delta_revision(),
              bytes.length,
              targetColor,
              targetOpacity,
              record.width,
              record.height,
              record.inkX,
              record.baseline,
            )
          )
            throw Error("text-style");
        }
      } catch {
        error.textContent = t("text.failed");
        error.hidden = false;
      } finally {
        applying = false;
        signature = "";
        changed();
      }
    });
  return () => {
    const id = selected(),
      next = `${id}:${core.layer_render_revision()}`;
    if (next === signature) return;
    signature = next;
    if (id === null) return;
    const record = textRecord(text, camera, id, core.layer_render_revision());
    if (!record) return;
    color.value = "#" + record.color.toString(16).padStart(6, "0");
    opacity.value = String(record.opacity * 100);
    opacity.dispatchEvent(new Event("input"));
  };
}
