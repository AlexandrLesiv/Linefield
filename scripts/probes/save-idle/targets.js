export function targets() {
  const pending = new Map();
  return {
    request(revision) {
      if (pending.has(revision)) return pending.get(revision).promise;
      if (pending.size >= 64) return Promise.reject(Error("flush waiter capacity"));
      let resolve, reject;
      const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      pending.set(revision, { promise, resolve, reject });
      return promise;
    },
    settle(durable) {
      for (const [revision, item] of pending)
        if (revision <= durable) {
          pending.delete(revision);
          item.resolve();
        }
    },
    fail(error) {
      for (const item of pending.values()) item.reject(error);
      pending.clear();
    },
    get size() {
      return pending.size;
    },
  };
}
