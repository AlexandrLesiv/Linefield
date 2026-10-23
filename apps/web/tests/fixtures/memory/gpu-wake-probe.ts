// Controlled browser faults around a real GL owner; no production timer/GL hooks.
export function gpuWakeProbe(gl: WebGL2RenderingContext) {
  const timeout = window.setTimeout,
    clear = window.clearTimeout;
  const realNow = performance.now.bind(performance),
    timeDescriptor = Object.getOwnPropertyDescriptor(performance, "now");
  const visibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
  const fence = gl.fenceSync.bind(gl),
    wait = gl.clientWaitSync.bind(gl);
  const error = gl.getError.bind(gl),
    remove = gl.deleteSync.bind(gl);
  let now = realNow(),
    hidden = false,
    hold = true,
    polls = 0,
    errors = 0,
    deletes = 0,
    fired = 0,
    signaled = 0,
    peak = 0;
  let parked = false;
  const fences = new Set<WebGLSync>(),
    held = new Set<WebGLSync>();
  const tasks = new Map<number, () => void>(),
    cancelled: (() => void)[] = [],
    delays: number[] = [];
  Object.defineProperty(performance, "now", { configurable: true, value: () => now });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
  Object.defineProperty(window, "setTimeout", {
    configurable: true,
    value: (handler: TimerHandler, delay?: number, ...args: unknown[]) => {
      if (typeof handler !== "function" || ![4, 8, 16, 32].includes(delay ?? 0))
        return timeout(handler, delay, ...args);
      const run = () => Reflect.apply(handler, window, args);
      const id = timeout(() => {
        if (parked) return;
        tasks.delete(id);
        fired++;
        run();
      }, delay);
      tasks.set(id, run);
      delays.push(delay ?? 0);
      if (delays.length > 512) throw Error("bounded wake probe exceeded");
      peak = Math.max(peak, tasks.size);
      return id;
    },
  });
  Object.defineProperty(window, "clearTimeout", {
    configurable: true,
    value: (id?: number) => {
      if (id !== undefined) {
        const task = tasks.get(id);
        if (task && cancelled.length < 8) cancelled.push(task);
        tasks.delete(id);
      }
      clear(id);
    },
  });
  gl.fenceSync = (condition, flags) => {
    const sync = fence(condition, flags);
    if (sync) {
      fences.add(sync);
      if (hold) held.add(sync);
    }
    if (fences.size > 2) throw Error("third GPU reader");
    return sync;
  };
  gl.clientWaitSync = (sync, flags, duration) => {
    if (flags !== 0 || duration !== 0) throw Error("blocking GPU wait");
    polls++;
    const status = wait(sync, flags, duration);
    if (!held.has(sync) && (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED))
      signaled++;
    return held.has(sync) ? gl.TIMEOUT_EXPIRED : status;
  };
  gl.getError = () => {
    errors++;
    return error();
  };
  gl.deleteSync = (sync) => {
    deletes++;
    if (sync) {
      fences.delete(sync);
      held.delete(sync);
    }
    remove(sync);
  };
  return {
    park: (value: boolean) => {
      parked = value;
    },
    pause: (ms = 40) => new Promise<void>((resolve) => timeout(resolve, ms)),
    advance: (ms: number) => {
      now += ms;
    },
    visible: (value: boolean) => {
      hidden = !value;
      document.dispatchEvent(new Event("visibilitychange"));
    },
    releaseOne: () => {
      const first = held.values().next().value;
      if (first) held.delete(first);
    },
    releaseAll: () => {
      hold = false;
      held.clear();
    },
    hold: () => {
      hold = true;
    },
    staleCallbacks: () => {
      for (const run of cancelled.splice(0)) run();
    },
    snapshot: () => ({
      polls,
      errors,
      deletes,
      fired,
      signaled,
      peak,
      pendingTasks: tasks.size,
      readers: fences.size,
      delays: [...delays],
    }),
    restore: () => {
      window.setTimeout = timeout;
      window.clearTimeout = clear;
      gl.fenceSync = fence;
      gl.clientWaitSync = wait;
      gl.getError = error;
      gl.deleteSync = remove;
      if (timeDescriptor) Object.defineProperty(performance, "now", timeDescriptor);
      else Reflect.deleteProperty(performance, "now");
      if (visibility) Object.defineProperty(document, "visibilityState", visibility);
      else Reflect.deleteProperty(document, "visibilityState");
    },
  };
}
