export function measurements() {
  const metrics: { phase: string; ms: number }[] = [];
  const measure = <T>(phase: string, call: () => T): T => {
    const start = performance.now(),
      value = call();
    metrics.push({ phase, ms: performance.now() - start });
    if (metrics.length > 2048) metrics.splice(0, metrics.length - 2048);
    return value;
  };
  return { metrics, measure };
}
