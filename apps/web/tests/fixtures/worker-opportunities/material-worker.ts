import { createPaperContactMaterial } from "../../../../vector-editor/src/paper-contact-material";
self.onmessage = () => {
  const start = performance.now();
  const material = createPaperContactMaterial();
  self.postMessage(
    { material, bakeMs: performance.now() - start },
    { transfer: [material.data.buffer] },
  );
};
