import { scene, planFrame, buffers } from "./planner.mjs";
const next = () => new Promise((resolve) => requestAnimationFrame(resolve));
window.plannerExperiment = async (dense, mode) => {
  const { plan, rawSamples } = await scene(dense),
    worker = new Worker(new URL("./planner-worker.mjs", import.meta.url), { type: "module" }),
    waits = new Map();
  let revision = 1,
    currentCamera = 0,
    sequence = 0,
    pending = 0,
    peakPending = 0,
    stale = 0,
    latest,
    failure;
  const service = [],
    latencies = [],
    main = [],
    frames = [],
    oraclePlanBytes = [],
    oracleSteps = [];
  let last;
  const fail = (error) => {
    failure = error;
    for (const item of waits.values()) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    waits.clear();
  };
  worker.onerror = () => fail(Error("Planner worker failed"));
  worker.onmessageerror = () => fail(Error("Planner transport failed"));
  worker.onmessage = ({ data }) => {
    const key = data.ready ? "ready" : data.id,
      item = waits.get(key);
    if (!item) return;
    waits.delete(key);
    clearTimeout(item.timer);
    if (data.error) item.reject(Error(data.error));
    else item.resolve(data);
  };
  function request(message, key = message.id, transfer = []) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waits.delete(key);
        reject(Error("Planner response timeout"));
      }, 10000);
      waits.set(key, { resolve, reject, timer });
      try {
        worker.postMessage(message, transfer);
      } catch (error) {
        waits.delete(key);
        clearTimeout(timer);
        reject(error);
      }
    });
  }
  const view = (i) => ({
    cx: 500 - i * 7,
    cy: 300 - i * 3,
    zoom: [0.1, 1, 8][Math.floor(i / 16) % 3],
    rotation: i * 0.025,
  });
  try {
    const uploadStart = performance.now(),
      copy = structuredClone(plan),
      transfer = buffers(copy),
      bytes = transfer.reduce((n, b) => n + b.byteLength, 0);
    await request({ kind: "scene", plan: copy, revision }, "ready", transfer);
    const upload = { milliseconds: performance.now() - uploadStart, bytes };
    for (let i = 0; i < 6; i++) {
      const state = view(i * 9),
        expectedPlan = planFrame(plan, state),
        expected = JSON.stringify(expectedPlan);
      oraclePlanBytes.push(expected.length);
      oracleSteps.push(expectedPlan.length);
      const answer = await request({ id: ++sequence, view: state, camera: 0 });
      if (JSON.stringify(answer.result) !== expected) throw Error("Worker plan mismatch");
    }
    const submit = (job) => {
      pending++;
      peakPending = Math.max(peakPending, pending);
      const start = performance.now();
      request({ id: ++sequence, view: job.view, camera: job.camera }).then(
        (data) => {
          pending--;
          service.push(data.serviceMs);
          latencies.push(performance.now() - start);
          if (data.camera !== currentCamera || data.revision !== revision) stale++;
          if (latest) {
            const replacement = latest;
            latest = null;
            submit(replacement);
          }
        },
        (error) => {
          pending--;
          latest = null;
          failure = error;
        },
      );
    };
    for (let i = 0; i < 96; i++) {
      if (failure) throw failure;
      const time = await next();
      if (last !== undefined) frames.push(time - last);
      last = time;
      currentCamera++;
      const state = view(i),
        start = performance.now();
      if (mode === "main") {
        planFrame(plan, state);
        main.push(performance.now() - start);
      } else if (pending) latest = { view: state, camera: currentCamera };
      else submit({ view: state, camera: currentCamera });
    }
    for (let n = 0; n < 600; n++) {
      if (failure) throw failure;
      if (!pending && !latest) break;
      await next();
    }
    if (pending || latest) throw Error("Bounded planner did not settle");
    const answer = request({ id: ++sequence, view: view(0), camera: currentCamera });
    revision++;
    currentCamera++;
    const obsolete = await answer;
    if (obsolete.revision === revision || obsolete.camera === currentCamera)
      throw Error("Stale tags not detected");
    return {
      dense,
      mode,
      rawSamples,
      upload,
      main,
      service,
      latencies,
      frames,
      stale,
      peakPending,
      oraclePlanBytes,
      oracleSteps,
      exactPlans: 6,
      staleTagsDetected: true,
    };
  } finally {
    worker.terminate();
    fail(Error("Planner experiment closed"));
  }
};
