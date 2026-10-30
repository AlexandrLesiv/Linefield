import { call, kill, newClient } from "./vector-library-storage-helpers.mjs";
export async function stage(f, sizes, invalid = false, operationId = crypto.randomUUID()) {
  return f.page.evaluate(
    async ({ index, identity, lengths, bad, operation }) => {
      const streams = lengths.map((n, j) =>
        Uint8Array.from({ length: n }, (_, i) => (i + j) % 251),
      );
      const payload = new Uint8Array(4 + lengths.length * 4 + lengths.reduce((a, b) => a + b, 0));
      const view = new DataView(payload.buffer);
      view.setUint32(0, lengths.length, true);
      let at = 4;
      for (const stream of streams) {
        view.setUint32(at, stream.length, true);
        at += 4;
        payload.set(stream, at);
        at += stream.length;
      }
      const digest = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", payload)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      const context = {
        ...identity,
        operation,
        base: "0",
        result: "1",
        digest: bad ? "0".repeat(64) : digest,
      };
      await clients[index].call("begin", { context, streams: streams.length });
      for (let stream = 0; stream < streams.length; stream++)
        for (let chunk = 0; chunk <= streams[stream].length; chunk += 65520) {
          const bytes = streams[stream].slice(chunk, chunk + 65520);
          await clients[index].call("parts", {
            parts: [{ stream, bytes, last: bytes.length < 65520 }],
          });
        }
      return context;
    },
    { index: f.client, identity: f.identity, lengths: sizes, bad: invalid, operation: operationId },
  );
}
export async function seal(f) {
  let result;
  do {
    result = await call(f.page, f.client, "seal");
  } while (result.pending);
  return result;
}
export async function reopen(f) {
  await kill(f.page, f.client);
  await f.page.waitForFunction(
    (id) =>
      navigator.locks
        .query()
        .then((x) => !x.held.some((l) => l.name === `linefield:v1:drawing:${id}`)),
    f.document,
  );
  f.client = await newClient(f.page);
  f.identity = await call(f.page, f.client, "open", {
    document: f.document,
    grant: f.identity.grant,
  });
}
