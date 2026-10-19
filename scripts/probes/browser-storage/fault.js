import { client, equal } from "./harness.js";
import { channel } from "./config.js";
export async function proxyBarrier(terminate) {
  const events = [];
  const bus = new BroadcastChannel(channel);
  const waiters = new Set();
  const timers = new Set();
  bus.onmessage = ({ data }) => {
    events.push(data);
    for (const waiter of waiters) waiter(data);
  };
  const next = (kind) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        waiters.delete(match);
        reject(new Error(`Proxy ${kind} timeout`));
      }, 10000);
      timers.add(timer);
      const match = (data) => {
        if (data.kind !== kind) return;
        clearTimeout(timer);
        timers.delete(timer);
        waiters.delete(match);
        resolve(data);
      };
      waiters.add(match);
    });
  const a = client();
  let b;
  const lock = `probe:barrier-${terminate}`;
  const file = `/barrier-${terminate}.sqlite`;
  let commit;
  try {
    await a.call("open", { lock, file });
    await a.call("sql", {
      sql: "CREATE TABLE operations(id INTEGER PRIMARY KEY); BEGIN; INSERT INTO operations VALUES(7);",
    });
    const armed = next("armed");
    bus.postMessage({ kind: "arm" });
    await armed;
    const reached = next("reached");
    commit = a.call("sql", { sql: "COMMIT;" }).then(
      () => "committed",
      (error) => String(error),
    );
    const paused = await reached;
    if (terminate) {
      a.terminate();
      await navigator.locks.request(lock, { signal: AbortSignal.timeout(10000) }, () => {});
      events.push({ kind: "successor-lock-granted" });
    }
    const completed = terminate ? null : next("flush-complete");
    bus.postMessage({ kind: "release", proxy: paused.proxy });
    events.push({ kind: "release-sent", proxy: paused.proxy });
    if (completed) await completed;
    if (terminate) {
      b = client();
      await b.call("open", { lock, file });
      equal(await b.call("sql", { sql: "SELECT id FROM operations;" }), []);
      equal(await b.call("sql", { sql: "PRAGMA integrity_check;" }), [["ok"]]);
      equal(
        events.filter((event) => event.proxy === paused.proxy && event.kind === "flush-start"),
        [],
      );
      await b.call("close");
    } else {
      equal(await commit, "committed");
      equal(await a.call("sql", { sql: "SELECT id FROM operations;" }), [[7]]);
      equal(await a.call("sql", { sql: "PRAGMA integrity_check;" }), [["ok"]]);
      await a.call("close");
    }
    return { id: terminate ? "PROBE-07" : "PROBE-07-CONTROL", status: "passed", events };
  } catch (error) {
    return {
      id: terminate ? "PROBE-07" : "PROBE-07-CONTROL",
      status: "failed",
      error: String(error),
      events,
    };
  } finally {
    a.terminate();
    b?.terminate();
    for (const timer of timers) clearTimeout(timer);
    bus.close();
    await commit;
  }
}
