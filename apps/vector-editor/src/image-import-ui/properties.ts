import type { ImageCore } from "../image-core";
import { t } from "../../../web/src/locale";
export function imageProperties(core: ImageCore, selected: () => number[], changed: () => void) {
  const label = document.createElement("label");
  label.id = "image-properties";
  label.hidden = true;
  const input = document.createElement("input");
  input.id = "image-opacity";
  input.type = "range";
  input.min = "0";
  input.max = "100";
  input.step = "1";
  label.append(t("image.opacity"), input);
  document.querySelector("#selection-controls")!.append(label);
  let target: number | undefined;
  input.onchange = () => {
    if (target === undefined) return;
    if (!core.image_opacity(target, Number(input.value) / 100)) {
      input.setCustomValidity(t("image.visibleLimit"));
      input.reportValidity();
    } else {
      input.setCustomValidity("");
      changed();
    }
  };
  return () => {
    const ids = selected();
    target = ids.length === 1 && core.image_exists(ids[0]) ? ids[0] : undefined;
    label.hidden = target === undefined;
    if (
      target !== undefined &&
      document.activeElement !== input &&
      core.image_read(target, 0n, 0, 0n, 0)
    )
      input.value = String(
        Math.round(new Float64Array(core.memory.buffer, core.image_output_ptr(), 15)[8] * 100),
      );
  };
}
