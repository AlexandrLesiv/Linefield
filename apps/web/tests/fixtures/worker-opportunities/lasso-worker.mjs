import { queryCore, query } from "./lasso-query.mjs";
const ready = queryCore();
let plan, revision;
self.onmessage = async ({ data }) => {
  try {
    const core = await ready;
    if (data.plan) {
      plan = data.plan;
      revision = data.revision;
      self.postMessage({ id: data.id, ready: true });
      return;
    }
    const start = performance.now();
    const ids = query(core, plan, data.points, data.partial);
    self.postMessage({ id: data.id, revision, ids, service: performance.now() - start });
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error) });
  }
};
