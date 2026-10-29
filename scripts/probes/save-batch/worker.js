self.onmessage = ({ data }) => {
  let hash = 2166136261;
  for (const byte of new Uint8Array(data.buffer)) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  self.postMessage({ hash, length: data.buffer.byteLength });
};
