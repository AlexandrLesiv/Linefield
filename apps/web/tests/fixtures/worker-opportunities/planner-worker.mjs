import { planFrame } from "./planner.mjs";
let plan, revision;
self.onmessage = ({ data }) => {
  if (data.kind === "scene") {
    plan = data.plan;
    revision = data.revision;
    postMessage({ ready: revision });
    return;
  }
  const start = performance.now();
  try {
    const result = planFrame(plan, data.view);
    postMessage({
      id: data.id,
      revision,
      camera: data.camera,
      result,
      serviceMs: performance.now() - start,
    });
  } catch (error) {
    postMessage({ id: data.id, error: String(error) });
  }
};
