export function client(source = "/worker.js") {
  const worker = new Worker(`${source}?sqlite3.dir=/vendor`);
  let sequence = 0;
  const pending = new Map();
  worker.onerror = (event) => {
    for (const handler of pending.values()) {
      clearTimeout(handler.timer);
      handler.reject(new Error(`Worker load: ${event.message}`));
    }
    pending.clear();
  };
  worker.onmessage = ({ data }) => {
    const handler = pending.get(data.id);
    if (!handler) return;
    clearTimeout(handler.timer);
    pending.delete(data.id);
    if (data.error) handler.reject(new Error(data.error));
    else handler.resolve(data.value);
  };
  return {
    call(kind, values = {}) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Timeout: ${kind}`));
        }, 15000);
        pending.set(id, { resolve, reject, timer });
        worker.postMessage({ id, kind, ...values });
      });
    },
    terminate() {
      worker.terminate();
      for (const handler of pending.values()) {
        clearTimeout(handler.timer);
        handler.reject(new Error("Fixture worker terminated"));
      }
      pending.clear();
    },
  };
}
export function equal(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
