import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  beginCapture,
  openDiagnostics,
  drawDiagnosticStroke,
  downloadReport,
} from "./diagnostics-ui.ts";
test("DIAG-01/02/04 actual mouse ink history and publication export safe correlated identities", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator(".new-tile").click();
  const canvas = page.locator("[data-memory-canvas]");
  await expect(canvas).toHaveAttribute("data-state", "ready");
  const size = await canvas.boundingBox();
  // Canvas extends beneath chrome; compare the whole known stroke area, excluding toolbar hover.
  const pixels = async () =>
    createHash("sha256")
      .update(await page.screenshot({ clip: { x: 280, y: 330, width: 270, height: 120 } }))
      .digest("hex");
  const blank = await pixels();
  await canvas.screenshot({ path: info.outputPath("blank.png") });
  await beginCapture(page);
  await drawDiagnosticStroke(page);
  await expect.poll(pixels).not.toBe(blank);
  const ink = await pixels();
  await canvas.screenshot({ path: info.outputPath("ink.png") });
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect(page.getByRole("button", { name: "Redo last action", exact: true })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  try {
    await expect.poll(pixels).toBe(blank);
  } finally {
    await canvas.screenshot({ path: info.outputPath("after-undo.png") });
  }
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await expect.poll(pixels).toBe(ink);
  await openDiagnostics(page);
  await page.getByRole("button", { name: "Stop capture", exact: true }).click();
  await expect(page.getByRole("button", { name: "Download JSON" })).toBeFocused();
  await page.screenshot({ path: info.outputPath("diagnostics-ready.png") });
  const text = await downloadReport(page);
  const report: unknown = JSON.parse(text);
  expect(report).toMatchObject({
    format: "linefield-diagnostics-v1",
    clock: "performance-relative-ms",
    reason: "manual",
    partial: false,
    build: {
      app: expect.stringMatching(/^index-[\w-]+\.js$/),
      engine: expect.stringMatching(/^linefield_web_memory_bg-[\w-]+\.wasm$/),
      preparation: expect.stringMatching(/^linefield_web_preparation_bg-[\w-]+\.wasm$/),
    },
    events: expect.arrayContaining([
      expect.objectContaining({
        command: "begin",
        origin: "pointer",
        pointer: "mouse",
        interaction: expect.stringMatching(/^[1-9][0-9]*$/),
      }),
      expect.objectContaining({
        command: "end",
        interaction: expect.stringMatching(/^[1-9][0-9]*$/),
      }),
      expect.objectContaining({ command: "undo", origin: "toolbar" }),
      expect.objectContaining({ command: "redo", origin: "toolbar" }),
      expect.objectContaining({ event: "frame.published", outcome: "completed" }),
    ]),
  });
  expect(text).not.toMatch(/127\.0\.0\.1|preview-new|clientX|pressure|Temporary drawing/);
  expect(text.length).toBeLessThanOrEqual(2_097_152);
  const parsed: {
    events: {
      command?: string;
      event: string;
      outcome?: string;
      session?: string;
      interaction?: string;
      revision?: string;
      scene?: string;
      mapping?: string;
      request?: string;
    }[];
  } = JSON.parse(text);
  const command = (name: string) =>
    parsed.events.find((event) => event.command === name && event.outcome === "accepted");
  const begin = command("begin"),
    end = command("end"),
    undo = command("undo"),
    redo = command("redo");
  expect(end).toMatchObject({ session: begin?.session, interaction: begin?.interaction });
  expect(parsed.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        command: "append",
        session: begin?.session,
        interaction: begin?.interaction,
      }),
    ]),
  );
  expect(BigInt(end?.request ?? "0")).toBeGreaterThan(BigInt(begin?.request ?? "0"));
  expect(BigInt(end?.revision ?? "0")).toBeGreaterThan(BigInt(begin?.revision ?? "0"));
  expect(BigInt(undo?.revision ?? "0")).toBeGreaterThan(BigInt(end?.revision ?? "0"));
  expect(BigInt(redo?.revision ?? "0")).toBeGreaterThan(BigInt(undo?.revision ?? "0"));
  expect(parsed.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event: "frame.published",
        session: redo?.session,
        revision: redo?.revision,
        scene: redo?.scene,
        mapping: redo?.mapping,
      }),
    ]),
  );
  expect(await canvas.boundingBox()).toEqual(size);
  expect(errors).toEqual([]);
});
test("DIAG-02/03 accepted departure freezes capture and Resume retains report without restarting", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await beginCapture(page);
  await drawDiagnosticStroke(page);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await openDiagnostics(page);
  await expect(
    page.getByText("Recording stopped when leaving the editor.", { exact: true }),
  ).toBeVisible();
  expect(JSON.parse(await downloadReport(page))).toMatchObject({
    reason: "departure",
    partial: true,
  });
  await page.getByRole("button", { name: "Clear report" }).click();
  await expect(page.getByRole("button", { name: "Download JSON" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Capture for 30 seconds" })).toBeEnabled();
});
