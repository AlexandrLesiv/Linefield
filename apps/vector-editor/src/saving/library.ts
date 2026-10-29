import { storageClient } from "./client";
export type DrawingEntry = { id: string; title: string; created: number; updated: number };
export type DrawingPage = {
  drawings: DrawingEntry[];
  nextOffset: number | null;
  pendingRecovery: boolean;
  recoveryErrors: { id: string; reason: string }[];
};
export function library() {
  async function request<T>(kind: string, options: Record<string, unknown>): Promise<T> {
    const client = storageClient();
    try {
      return await client.call<T>(kind, options);
    } finally {
      client.terminate();
    }
  }
  return {
    list({ offset = 0, locale = "en" }: { offset?: number; locale?: "en" | "uk" } = {}) {
      return request<DrawingPage>("library-list", { offset, locale });
    },
    get(id: string, locale: "en" | "uk" = "en") {
      return request<DrawingEntry | null>("library-get", { document: id, locale });
    },
    create({ id, locale }: { id: string; locale: "en" | "uk" }) {
      return request<DrawingEntry>("library-create", { document: id, locale });
    },
  };
}
