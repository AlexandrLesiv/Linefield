import { loadCore } from "./load-core";
import { queryLasso, validateLasso, type LassoSnapshot } from "./lasso-snapshot";
const scope = globalThis as unknown as {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent<LassoSnapshot>) => void) | null;
};
loadCore()
  .then((core) => {
    scope.onmessage = ({ data }) => {
      try {
        validateLasso(data);
        scope.postMessage({ ids: queryLasso(core, data) });
      } catch (error) {
        scope.postMessage({ error: String(error) });
      }
    };
    scope.postMessage({ ready: true });
  })
  .catch((error) => scope.postMessage({ error: String(error) }));
