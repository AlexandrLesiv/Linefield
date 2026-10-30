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
