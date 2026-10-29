import { client } from "/client.js";
import { validateReceipt, decodeSaved } from "/transport.js";
export async function storage(pool, injected) {
  const identity = { document: "drawing", incarnation: "idle1", grant: "writer1" };
  let c = client(),
    expected,
    used = false,
    commits = 0;
  const assertOpen = (value) => {
    if (!value.admitted) throw Error("storage unavailable");
  };
  assertOpen(await c.call("open", { pool }));
  await c.call("receipt-init", identity);
  async function recover() {
    c.terminate();
    c = client();
    assertOpen(await c.call("open", { pool, guarded: true }));
  }
  return {
    async begin(token, base, result, streams) {
      expected = {
        ...identity,
        operation: `batch${token}`,
        base: String(base),
        result: String(result),
      };
      await c.call("idle-start", { context: expected, streams });
    },
    async parts(parts) {
      await c.call(
        "idle-parts",
        { parts },
        parts.map((p) => p.bytes.buffer),
      );
    },
    async commit() {
      const sealed = await c.call("idle-seal");
      if (
        Object.keys(expected).some((key) => sealed[key] !== expected[key]) ||
        !/^[0-9a-f]{64}$/.test(sealed.digest)
      )
        throw Error("seal mismatch");
      expected = { ...expected, digest: sealed.digest };
      let receipt;
      commits++;
      if (injected && !used && (!injected.startsWith("pause-") || commits > 1)) {
        used = true;
        if (injected === "storage-error") {
          await c.call("idle-commit", { injectFailure: true });
        }
        const notice = c.fault(),
          pending = c
            .call("idle-commit", { fault: injected.replace("pause-", "") })
            .catch(() => {});
        await notice;
        if (injected.startsWith("pause-")) {
          window.terminationReady = true;
          return new Promise(() => {});
        }
        await recover();
        await pending;
        receipt = await c.call("receipt-reconcile", expected);
        if (receipt.outcome === "unknown") throw Error("unknown-outcome");
      } else receipt = await c.call("idle-commit");
      validateReceipt(receipt, expected);
    },
    recover,
    async load() {
      return decodeSaved(await c.call("receipt-load", identity));
    },
    async close() {
      await c.call("close");
      c.terminate();
    },
  };
}
