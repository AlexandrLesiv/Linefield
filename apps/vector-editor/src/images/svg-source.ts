import type { SvgExportCore } from "../svg-export-core";
import type { ExportWorker } from "../svg-export/rpc";
export async function sendImageOrInk(
  core: SvgExportCore,
  token: number,
  worker: ExportWorker,
  values: Float64Array<ArrayBuffer>,
  last: boolean,
  resolveAsset?: (digest: string) => Promise<Blob>,
) {
  if (values[0] === 3) {
    if (values.length !== 26 || !last || !Number.isSafeInteger(values[21]) || values[21] > 16384)
      throw Error("svg-text-boundary");
    const pointer = core.svg_text_content_ptr(token);
    if (!pointer || pointer + values[21] > core.memory.buffer.byteLength)
      throw Error("svg-text-boundary");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      new Uint8Array(core.memory.buffer, pointer, values[21]),
    );
    await worker.send({ kind: "text", values, text }, [values.buffer]);
    return;
  }
  if (values[0] !== 2) {
    await worker.send({ kind: "packet", values, last }, [values.buffer]);
    return;
  }
  if (values.length !== 24 || !last || !resolveAsset) throw Error("svg-image-boundary");
  const digest = new TextDecoder().decode(
    new Uint8Array(core.memory.buffer, core.svg_image_digest_ptr(token), 64),
  );
  if (!/^[0-9a-f]{64}$/.test(digest)) throw Error("svg-image-identity");
  const blob = await resolveAsset(digest);
  await worker.send({ kind: "image", values, blob }, [values.buffer]);
}
