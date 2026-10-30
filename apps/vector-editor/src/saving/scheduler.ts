import { imageCleanup } from "./image-cleanup";
import { assetApi } from "./asset-api";
import { measurements } from "./measure";
import type { SaveCore, State, SaveWaiter } from "./types";
import type { Storage } from "./adapter";
import { submit, inputPending } from "./prepare";
import { idleYield } from "./idle-yield";
export function scheduler(core: SaveCore, store: Storage) {
  const waiters = new Map<bigint, SaveWaiter>(),
    listeners = new Set<(state: State) => void>();
  const { metrics, measure } = measurements();
  const cleanImages = imageCleanup(core, store);
  let timer: ReturnType<typeof setTimeout> | undefined,
    maintenanceTimer: ReturnType<typeof setTimeout> | undefined,
    running: Promise<void> | undefined;
  let failure: Error | undefined,
    closed = false,
    urgent = false;
  let target = core.delta_durable(),
    cleaned = target,
    activeToken = 0,
    maintenanceWanted = true;
  const state = (): State => ({
    phase: closed
      ? "closed"
      : failure || core.delta_status() !== 0
        ? "error"
        : running && core.delta_revision() > core.delta_durable()
          ? "saving"
          : core.delta_revision() > core.delta_durable()
            ? "pending"
            : "saved",
    revision: core.delta_revision(),
    durable: core.delta_durable(),
    error: failure?.message || (core.delta_status() !== 0 ? "save-capacity" : undefined),
  });
  const notify = () => {
    for (const listener of listeners) listener(state());
  };
  const idle = idleYield(() => urgent),
    yieldWork = idle.wait;
  function stopMaintenanceWake() {
    clearTimeout(maintenanceTimer);
    maintenanceTimer = undefined;
  }
  function scheduleMaintenance() {
    if (failure || closed || !maintenanceWanted || timer || maintenanceTimer) return;
    const delay = Math.max(16, cleanImages.delay());
    maintenanceTimer = setTimeout(() => {
      maintenanceTimer = undefined;
      startPump();
    }, delay);
  }
  const settle = () => {
    for (const [revision, waiter] of waiters)
      if (revision <= cleaned) {
        waiters.delete(revision);
        waiter.resolve();
      }
  };
  async function cleanup() {
    let pending = 1;
    while (pending) {
      await yieldWork();
      const start = performance.now();
      let calls = 0;
      do {
        pending = measure("cleanup", () => core.idle_cleanup(16));
      } while (pending === 1 && ++calls < 64 && performance.now() - start < 1 && !inputPending());
      if (pending !== 0 && pending !== 1) throw Error("save-cleanup");
    }
    cleaned = core.delta_durable();
    settle();
  }
  async function pump() {
    await cleanup();
    while (core.delta_durable() < target) {
      activeToken ||= measure("freeze", () => core.idle_begin());
      if (!activeToken) throw Error("save-capacity");
      await submit(core, store, activeToken, yieldWork, measure);
      activeToken = 0;
      maintenanceWanted = true;
      notify();
      await cleanup();
    }
    if (maintenanceWanted && !urgent && !inputPending()) {
      await yieldWork();
      if (core.delta_revision() === core.delta_durable()) {
        try {
          maintenanceWanted = await cleanImages.step();
          target = core.delta_revision();
        } catch {
          maintenanceWanted = false;
        } // Durable saves remain valid; maintenance is retryable.
      }
    }
  }
  function startPump() {
    if (running || closed) return;
    running = pump()
      .catch((error: unknown) => {
        failure = error instanceof Error ? error : Error("save-failed");
        for (const waiter of waiters.values()) waiter.reject(failure);
        waiters.clear();
      })
      .finally(() => {
        running = undefined;
        urgent = false;
        notify();
        if (!failure && waiters.size) startPump();
        else scheduleMaintenance();
      });
    notify();
  }
  async function maintenanceCall<T>(call: () => Promise<T>): Promise<T> {
    for (let active = running; active; active = running) await active;
    if (closed || failure) throw failure || Error("save-closed");
    maintenanceWanted = true;
    const task = call();
    running = task.then(
      () => {},
      () => {},
    );
    try {
      return await task;
    } finally {
      running = undefined;
      if (waiters.size && !closed && !failure) startPump();
      else scheduleMaintenance();
    }
  }
  const api = {
    ...{ metrics, state },
    subscribe(listener: (value: State) => void) {
      listeners.add(listener);
      listener(state());
      return () => {
        listeners.delete(listener);
      };
    },
    changed() {
      stopMaintenanceWake();
      notify();
      if (closed || failure || core.delta_status() !== 0 || timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        void api.flush().catch(() => {});
      }, 1000);
    },
    flush(exit = false): Promise<void> {
      if (closed || failure || core.delta_status() !== 0)
        return Promise.reject(failure || Error(closed ? "save-closed" : "save-capacity"));
      clearTimeout(timer);
      stopMaintenanceWake();
      timer = undefined;
      const revision = core.delta_revision();
      target = target > revision ? target : revision;
      urgent ||= exit;
      if (exit) idle.wake();
      if (revision <= cleaned) {
        if (!exit) scheduleMaintenance();
        return Promise.resolve();
      }
      let waiter = waiters.get(revision);
      if (!waiter) {
        if (waiters.size >= 64) return Promise.reject(Error("save-capacity"));
        let yes!: () => void, no!: (error: Error) => void;
        const promise = new Promise<void>((resolve, reject) => {
          yes = resolve;
          no = reject;
        });
        waiter = { promise, resolve: yes, reject: no };
        waiters.set(revision, waiter);
      }
      startPump();
      return waiter.promise;
    },
    ...assetApi(store, maintenanceCall, cleanImages.request),
    maintain: () => maintenanceCall(() => store.maintain()),
    maintenanceStatus: () => maintenanceCall(() => store.maintenanceStatus()),
    async retry() {
      if (core.delta_status() !== 0) throw Error("save-capacity");
      if (running) await running;
      await store.recover();
      failure = undefined;
      return api.flush(true);
    },
    async close() {
      await api.flush(true);
      closed = true;
      stopMaintenanceWake();
      clearTimeout(timer);
      if (running) await running;
      await store.close();
      notify();
    },
  };
  scheduleMaintenance();
  return api;
}
