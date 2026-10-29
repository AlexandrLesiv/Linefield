import { client } from "/client.js";
import { pack, decodeSaved } from "/transport.js";
import { digest } from "/cases.js";
export async function runLoadChecks() {
  const c = client(),
    context = { document: "drawing", incarnation: "load1", grant: "writer1" },
    checks = [];
  const call = (kind, options = {}) => c.call(kind, { ...context, ...options });
  await c.call("open", { pool: "loadchecks" });
  await call("receipt-init");
  const payload = pack([new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])]);
  await call("receipt-apply", {
    operation: "operation1",
    base: "0",
    result: "1",
    payload,
    digest: await digest(payload),
  });
  const original = await call("receipt-load");
  if ((await decodeSaved(original))[0].streams[1][1] !== 5) throw Error("load baseline");
  checks.push("stored-framing-roundtrip");
  for (const [label, sql] of [
    ["corrupt-body", "UPDATE save_batches SET payload=x'00000000'"],
    ["overflow-revision", "UPDATE save_batches SET result='18446744073709551616'"],
    ["noncanonical-revision", "UPDATE save_batches SET result='01'"],
    ["base-gap", "UPDATE save_batches SET base='1'"],
    ["head-mismatch", "UPDATE save_head SET revision='2'"],
    ["invalid-operation", "UPDATE save_batches SET operation=''"],
  ]) {
    await c.call("sql", { sql });
    const data = await call("receipt-load");
    let refused = false;
    try {
      await decodeSaved(data);
    } catch {
      refused = true;
    }
    const hex = Array.from(payload, (b) => b.toString(16).padStart(2, "0")).join("");
    await c.call("sql", {
      sql: `UPDATE save_batches SET operation='operation1',base='0',result='1',payload=x'${hex}'; UPDATE save_head SET revision='1'`,
    });
    if (!refused) throw Error(label);
    checks.push(label);
  }
  await c.call("close");
  c.terminate();
  return checks;
}
