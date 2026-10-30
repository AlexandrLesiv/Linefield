import { storageClient } from "./client";
export type DrawingEntry = {
  id: string;
  title: string;
  created: number;
  updated: number;
  incarnation: string;
};
export type DrawingPage = {
  drawings: DrawingEntry[];
  nextOffset: number | null;
  pendingRecovery: boolean;
  recoveryErrors: { id: string; reason: string }[];
};
export type MutationIdentity = { document: string; incarnation: string; operation: string };
export type MutationResult = { entry: DrawingEntry; deletionToken: string | null };
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
    rename(options: MutationIdentity & { expectedTitle: string; title: string }) {
      return request<MutationResult>("library-rename", options);
    },
    remove(options: MutationIdentity) {
      return request<MutationResult>("library-remove", options);
    },
    undo(options: MutationIdentity & { deletionToken: string }) {
      return request<MutationResult>("library-undo", options);
    },
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
