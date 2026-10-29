export function client() {
  const worker = new Worker("/storage-worker.js?sqlite3.dir=/vendor");
  let next = 0,
    fault;
  const pending = new Map();
  function settleFault(error, value) {
    if (!fault) return;
    clearTimeout(fault.timer);
    const waiter = fault;
    fault = undefined;
    if (error) waiter.reject(error);
    else waiter.resolve(value);
  }
  worker.onmessage = ({ data }) => {
    if (data.faultPoint) {
      settleFault(null, data.faultPoint);
      return;
    }
    const item = pending.get(data.id);
    if (!item) return;
    pending.delete(data.id);
    clearTimeout(item.timer);
    if (data.error) {
      const error = Error(data.error);
      item.reject(error);
      settleFault(error);
    } else item.resolve(data.value);
  };
  function terminate() {
    worker.terminate();
    settleFault(Error("terminated"));
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(Error("terminated"));
    }
    pending.clear();
  }
  worker.onerror = (event) => {
    event.preventDefault();
    terminate();
  };
  worker.onmessageerror = terminate;
  return {
    call(kind, options = {}) {
      return new Promise((resolve, reject) => {
        const id = ++next,
          timer = setTimeout(() => {
            pending.delete(id);
            const error = Error("timeout");
            reject(error);
            settleFault(error);
          }, 15000);
        pending.set(id, { resolve, reject, timer });
        try {
          worker.postMessage({ id, kind, ...options });
        } catch (error) {
          clearTimeout(timer);
          pending.delete(id);
          reject(error);
          settleFault(error);
        }
      });
    },
    fault() {
      return new Promise((resolve, reject) => {
        if (fault) {
          reject(Error("fault already armed"));
          return;
        }
        const timer = setTimeout(() => settleFault(Error("fault-point timeout")), 15000);
        fault = { resolve, reject, timer };
      });
    },
    terminate,
  };
}
