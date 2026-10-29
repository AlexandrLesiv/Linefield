// Controlled navigation waits; browser termination cannot wait for asynchronous work.
export function exitController(engine, saver, input) {
  let generation = 0,
    closing = false,
    closed = false,
    error;
  const unsaved = () => input.active() || engine.delta_revision() > engine.delta_durable();
  const warning = (event) => {
    if (unsaved()) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  const hidden = () => {
    if (document.visibilityState === "hidden")
      saver.flush(engine.delta_revision(), true).catch(() => {});
  };
  addEventListener("beforeunload", warning);
  document.addEventListener("visibilitychange", hidden);
  return {
    async request() {
      if (closed) return true;
      const attempt = ++generation;
      closing = true;
      error = undefined;
      input.blockNew(true);
      try {
        await input.finishActive(); // Keep accepting samples of the existing gesture.
        if (attempt !== generation) return false;
        const target = engine.delta_revision();
        await saver.flush(target, true);
        if (attempt !== generation) return false;
        if (engine.delta_durable() < target) throw Error("not durable");
        closed = true;
        return true;
      } catch (e) {
        if (attempt === generation) {
          error = String(e);
          closing = false;
          input.blockNew(false);
        }
        return false;
      }
    },
    cancel() {
      if (closed) return;
      generation++;
      closing = false;
      input.blockNew(false);
    },
    get state() {
      return { closing, closed, error, unsaved: unsaved() };
    },
    dispose() {
      removeEventListener("beforeunload", warning);
      document.removeEventListener("visibilitychange", hidden);
    },
  };
}
