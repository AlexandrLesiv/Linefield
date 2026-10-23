import { diagnosticsStore } from "../../../src/developer-diagnostics/runtime-port.ts";
import { canonicalIdentity } from "../../../src/developer-diagnostics/schema.ts";
type Admission = { generation: string; request: string; operation: string; session: string };
const admissions: Admission[] = [];
let publications = 0;
const record = diagnosticsStore.record.bind(diagnosticsStore);
export function diagnosticDataString(event: object, key: string): string | undefined {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(event, key);
    const value: unknown = descriptor && "value" in descriptor ? descriptor.value : undefined;
    return typeof value === "string" && value.length <= 32 ? value : undefined;
  } catch {
    return undefined;
  }
}
// Bounded observation of real emitted metadata, never synthetic jobs or diagnostic records.
// Accessors belong solely to production validation; this observer never invokes them again.
diagnosticsStore.record = (event, detailed) => {
  record(event, detailed);
  const name = diagnosticDataString(event, "event");
  if (name === "frame.published" && publications < Number.MAX_SAFE_INTEGER) publications++;
  if (name !== "worker.admitted") return;
  const generation = diagnosticDataString(event, "generation");
  const request = diagnosticDataString(event, "request");
  const operation = diagnosticDataString(event, "operation");
  const session = diagnosticDataString(event, "session");
  if (!generation || !request || !operation || !session) return;
  if (![generation, request, operation, session].every(canonicalIdentity)) return;
  if (admissions.length === 16) admissions.shift();
  admissions.push({ generation, request, operation, session });
};
export const diagnosticEventObservation = () => ({ publications, admissions: [...admissions] });
