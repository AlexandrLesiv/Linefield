import { client } from "/client.js";
export async function digest(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function run() {
  const checks = [],
    context = { document: "drawing", incarnation: "incarnation1", grant: "writer1" };
  let c = client();
  const call = (kind, data = {}) => c.call(kind, { ...context, ...data });
  const assert = (ok, label) => {
    if (!ok) throw Error(label);
    checks.push(label);
  };
  const reject = async (data, reason) => {
    try {
      await call("receipt-apply", data);
      throw Error("unexpected success");
    } catch (e) {
      assert(String(e).includes(reason), reason);
    }
  };
  await c.call("open", { pool: "receipts" });
  await call("receipt-init");
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const batch = {
    operation: "operation1",
    base: "0",
    result: "1",
    payload: bytes,
    digest: await digest(bytes),
  };
  const notice = c.fault();
  const unknown = call("receipt-apply", { ...batch, fault: "after-commit" }).catch(() => {});
  await notice;
  c.terminate();
  await unknown;
  c = client();
  await c.call("open", { pool: "receipts", guarded: true });
  const receipt = await call("receipt-reconcile", batch);
  assert(receipt.outcome === "committed", "lost-reply-body-bound-reconciliation");
  const { validateReceipt } = await import("/transport.js");
  validateReceipt(receipt, { ...context, ...batch });
  for (const key of ["document", "incarnation", "grant", "operation", "base", "result", "digest"]) {
    let refused = false;
    try {
      validateReceipt({ ...receipt, [key]: "wrong" }, { ...context, ...batch });
    } catch {
      refused = true;
    }
    assert(refused, `stale-receipt-${key}-rejected`);
  }
  await call("receipt-apply", batch);
  assert((await call("receipt-load")).batches.length === 1, "duplicate-is-idempotent");
  const changed = new Uint8Array([4, 3, 2, 1]);
  await reject({ ...batch, payload: changed, digest: await digest(changed) }, "conflicting-body");
  await reject({ ...batch, base: "1", result: "2" }, "conflicting-body");
  await reject({ ...batch, incarnation: "replacement" }, "authority");
  await reject({ ...batch, grant: "retired" }, "authority");
  await reject({ ...batch, operation: "operation2", base: "0", result: "2" }, "base-conflict");
  await reject(
    { ...batch, operation: "operation2", base: "1", result: "2", digest: "bad" },
    "digest",
  );
  await reject({ ...batch, result: "18446744073709551616" }, "revision");
  assert(
    (await call("receipt-reconcile", { ...batch, operation: "missing" })).outcome === "unknown",
    "missing-receipt-is-unknown",
  );
  const next = { ...batch, operation: "operation2", base: "1", result: "2" };
  const before = c.fault(),
    pending = call("receipt-apply", { ...next, fault: "before-commit" }).catch(() => {});
  await before;
  for (const kind of ["receipt-reconcile", "receipt-load"]) {
    const rejection = await call(kind, next).then(
      () => "unexpected",
      (e) => String(e),
    );
    assert(rejection.includes("busy"), `uncommitted-${kind}-rejected`);
  }
  c.terminate();
  await pending;
  c = client();
  await c.call("open", { pool: "receipts", guarded: true });
  const loaded = await call("receipt-load");
  assert(
    loaded.revision === "1" && loaded.batches.length === 1,
    "precommit-death-keeps-previous-revision",
  );
  assert(
    loaded.batches[0][4].byteLength === bytes.byteLength &&
      loaded.batches[0][4].every((v, i) => v === bytes[i]),
    "reloaded-payload-exact",
  );
  await call("receipt-rotate", { nextGrant: "writer2" });
  await reject(next, "authority");
  context.grant = "writer2";
  const reuse = await call("receipt-rotate", { nextGrant: "writer1" }).then(
    () => "unexpected",
    (e) => String(e),
  );
  assert(reuse.includes("grant-reuse"), "grant-ABA-rejected");
  assert(
    (await call("receipt-reconcile", batch)).outcome === "committed",
    "new-grant-reconciles-old-body",
  );
  await call("receipt-apply", next);
  assert((await call("receipt-load")).revision === "2", "new-owner-can-advance");
  await c.call("close");
  c.terminate();
  return { checks };
}
