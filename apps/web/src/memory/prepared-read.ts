import { orderedPreparation } from "./ordered-preparation.ts";
import type { PreparedPage } from "./prepared-types.ts";
/** Preserve ordered producer traversal while exposing an explicit reader-owned borrow. */
export async function* readPrepared(
  count: bigint,
  prepare: (chunk: bigint) => AsyncGenerator<PreparedPage>,
  borrow: (page: PreparedPage) => PreparedPage,
): AsyncGenerator<PreparedPage> {
  function* chunks() {
    for (let chunk = 0n; chunk < (count + 127n) / 128n; chunk++) yield prepare(chunk);
  }
  for await (const page of orderedPreparation(chunks())) yield borrow(page);
}
