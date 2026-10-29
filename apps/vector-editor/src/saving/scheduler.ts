import type { SaveCore, State } from "./types";
import type { Storage } from "./adapter";
import { submit, inputPending } from "./prepare";
type Waiter = { promise: Promise<void>; resolve(): void; reject(error: Error): void };
export function scheduler(core: SaveCore, store: Storage) {
  const waiters = new Map<bigint, Waiter>(),
    listeners = new Set<(state: State) => void>();
  const metrics: { phase: string; ms: number }[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined, running: Promise<void> | undefined;
  let failure: Error | undefined,
    closed = false,
    urgent = false,
    wake: (() => void) | undefined;
  let target = core.delta_durable(),
    cleaned = target,
    activeToken = 0;
  const state = (): State => ({
    phase: closed
      ? "closed"
      : failure || core.delta_status() !== 0
        ? "error"
        : running
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
  const measure = <T>(phase: string, call: () => T): T => {
    const start = performance.now(),
      value = call();
    metrics.push({ phase, ms: performance.now() - start });
    if (metrics.length > 2048) metrics.splice(0, metrics.length - 2048);
    return value;
  };
  const yieldWork = () =>
    new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          wake = undefined;
          resolve();
        }
      };
      if (urgent || !window.requestIdleCallback) setTimeout(finish, 0);
      else {
        const id = requestIdleCallback(finish, { timeout: 50 });
        wake = () => {
          cancelIdleCallback(id);
          setTimeout(finish, 0);
        };
      }
    });
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
      notify();
      await cleanup();
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
      });
    notify();
  }
  const api = {
    metrics,
    state,
    subscribe(listener: (value: State) => void) {
      listeners.add(listener);
      listener(state());
      return () => {
        listeners.delete(listener);
      };
    },
    changed() {
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
      timer = undefined;
      const revision = core.delta_revision();
      target = target > revision ? target : revision;
      urgent ||= exit;
      if (exit) wake?.();
      if (revision <= cleaned) return Promise.resolve();
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
      clearTimeout(timer);
      await store.close();
      notify();
    },
  };
  return api;
}
