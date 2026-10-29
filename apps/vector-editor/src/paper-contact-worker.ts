import { createPaperContactMaterial } from "./paper-contact-material";
const material = createPaperContactMaterial();
self.postMessage({ version: 1, data: material.data }, { transfer: [material.data.buffer] });
