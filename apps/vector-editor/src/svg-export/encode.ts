import { PNG_CHUNK } from "./types";
import type { ExportWorker } from "./rpc";
import type { ExportSession } from "./session";
import type { SvgOutput } from "./output";
/** Pull at most one PNG block; shared Rust validates and emits bounded SVG/base64 bytes. */
export async function encodeImage(
  session: ExportSession,
  worker: ExportWorker,
  output: SvgOutput,
  gate: () => Promise<void>,
  progress: () => void,
) {
  await gate();
  await worker.send({ kind: "png" });
  const c = session.core,
    t = session.token;
  output.append(session.text(c.svg_xml_image_begin(t)));
  for (;;) {
    await gate();
    const reply = await worker.send({ kind: "pull" });
    if (!reply.bytes || reply.bytes.byteLength > PNG_CHUNK || !reply.bytes.byteLength)
      throw Error("svg-png-boundary");
    new Uint8Array(c.memory.buffer, c.svg_png_input_ptr(t), reply.bytes.byteLength).set(
      new Uint8Array(reply.bytes),
    );
    output.append(session.text(c.svg_png_write(t, reply.bytes.byteLength)));
    progress();
    if (reply.done) break;
  }
  output.append(session.text(c.svg_xml_image_end(t)));
}
