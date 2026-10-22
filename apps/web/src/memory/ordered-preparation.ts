// At most eight copied jobs/results are ahead of painter-order consumption.
export async function* orderedPreparation<T>(
  source: Iterable<AsyncGenerator<T>>,
): AsyncGenerator<T> {
  const input = source[Symbol.iterator]();
  const queue: { iterator: AsyncGenerator<T>; next: Promise<IteratorResult<T>> }[] = [];
  const fill = () => {
    while (queue.length < 8) {
      const item = input.next();
      if (item.done) break;
      const next = item.value.next();
      void next.catch(() => {});
      queue.push({ iterator: item.value, next });
    }
  };
  try {
    fill();
    while (queue.length) {
      const first = queue[0];
      if (!first) break;
      const result = await first.next;
      if (result.done) {
        queue.shift();
        fill();
        continue;
      }
      yield result.value;
      first.next = first.iterator.next();
      void first.next.catch(() => {});
    }
  } finally {
    await Promise.allSettled(
      queue.map(async (entry) => {
        await entry.next.catch(() => undefined);
        await entry.iterator.return(undefined);
      }),
    );
  }
}
