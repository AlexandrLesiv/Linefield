import type { Page, Browser, TestInfo } from "@playwright/test";
export async function attachDiagnosticBrowser(browser: Browser, info: TestInfo): Promise<void> {
  await info.attach("actual-browser-version", {
    body: JSON.stringify({ browser: browser.version() }),
    contentType: "application/json",
  });
}
export interface RetentionObservation {
  publications: number;
  readinessValidations: number;
  copybacks: number;
  copybackPublications: number;
  diagnostic: {
    publications: number;
    admissions: { generation: string; request: string; operation: string; session: string }[];
  };
  resources?: {
    hostGeometry: number;
    retiringHostGeometry: number;
    hostMetadataEstimate: number;
    retiringUncertainTickets: number;
  };
  retiring: { bytes: number; uncertainTickets?: number };
  geometry: {
    active: number;
    preparedRequests: number;
    preparedHits: number;
    preparedMisses: number;
    preparedFinerHits: number;
    preparedHitPages: number;
  };
}
export async function retentionObservation(page: Page): Promise<RetentionObservation> {
  return page.evaluate(() => {
    document.dispatchEvent(new Event("fixture-retention-observe"));
    return JSON.parse(document.body.dataset.fixtureRetention ?? "{}");
  });
}
