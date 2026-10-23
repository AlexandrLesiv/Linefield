type Counters = { pages: number; bytes: number; tickets: number };
/** Pending producer ownership remains charged alongside retained and borrowed pages. */
export function pendingResources<T extends Counters & { metadataEstimate: number }>(
  value: T,
  pending: Counters,
) {
  return {
    ...value,
    tickets: value.tickets + pending.tickets,
    metadataEstimate: value.metadataEstimate + pending.pages * 128,
    bytes: value.bytes + pending.bytes,
    pages: value.pages + pending.pages,
  };
}
