export function storageClient() {
  const worker = new Worker("/vector-editor/saving/worker.js?sqlite3.dir=/vector-editor/saving");
  let serial = 0,
    stopped = false;
  let pending:
    | {
        id: number;
        resolve(value: unknown): void;
        reject(error: Error): void;
        timer: ReturnType<typeof setTimeout>;
      }
    | undefined;
  const terminate = () => {
    stopped = true;
    worker.terminate();
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(Error("storage-interrupted"));
      pending = undefined;
    }
  };
  worker.onmessage = ({ data }) => {
    if (!pending || data.id !== pending.id) return;
    const request = pending;
    pending = undefined;
    clearTimeout(request.timer);
    if (data.error) request.reject(Error(data.error));
    else request.resolve(data.value);
  };
  worker.onerror = (event) => {
    event.preventDefault();
    terminate();
  };
  worker.onmessageerror = terminate;
  return {
    async call<T>(
      kind: string,
      fields: Record<string, unknown> = {},
      transfer: Transferable[] = [],
    ): Promise<T> {
      if (stopped || pending) throw Error("storage-unavailable");
      return new Promise<T>((resolve, reject) => {
        const id = ++serial;
        const timer = setTimeout(terminate, 15000);
        pending = { id, timer, resolve: (value) => resolve(value as T), reject };
        try {
          worker.postMessage({ ...fields, id, kind }, transfer);
        } catch {
          terminate();
        }
      });
    },
    terminate,
  };
}
