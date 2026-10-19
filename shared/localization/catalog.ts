import type { Catalog } from "./types.ts";
export const catalog = {
  version: 1,
  sourceLanguage: "en",
  messages: {
    "memory.navigationUnavailable": {
      kind: "plain",
      context: "In-memory navigation failure",
      arguments: {},
    },
    "memory.title": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.resume": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.lifetime": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.retained": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.loading": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.loadFailed": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: {},
    },
    "memory.retry": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.tools": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.toolUnavailable": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: { tool: "string" },
    },
    "memory.copyDiagnostics": {
      kind: "plain",
      context: "Manual pen diagnostics and rejected input status",
      arguments: {},
    },
    "memory.diagnosticsCopied": {
      kind: "plain",
      context: "Manual pen diagnostics and rejected input status",
      arguments: {},
    },
    "memory.diagnosticsFailed": {
      kind: "plain",
      context: "Manual pen diagnostics and rejected input status",
      arguments: {},
    },
    "memory.inputCapacity": {
      kind: "plain",
      context: "Manual pen diagnostics and rejected input status",
      arguments: {},
    },
    "memory.inputInvalid": {
      kind: "plain",
      context: "Manual pen diagnostics and rejected input status",
      arguments: {},
    },
    "memory.inputBusy": {
      kind: "plain",
      context: "Stroke admission waits for coherent frame",
      arguments: {},
    },
    "memory.color": { kind: "plain", context: "In-memory web pen color control", arguments: {} },
    "memory.undo": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.redo": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.opacityFixed": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: {},
    },
    "memory.smoothingOff": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: {},
    },
    "memory.canvas": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.foundation": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: {},
    },
    "memory.displayLost": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: {},
    },
    "memory.resourceUnavailable": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: {},
    },
    "memory.retryDisplay": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: {},
    },
    "memory.sizeUnavailable": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: {},
    },
    "memory.fatal": { kind: "plain", context: "In-memory web canvas foundation", arguments: {} },
    "memory.unavailable": {
      kind: "plain",
      context: "In-memory web canvas foundation",
      arguments: {},
    },
    "canvas.tools": {
      kind: "plain",
      context: "Drawing UI prototype: Preview tools",
      arguments: {},
    },
    "canvas.pen": { kind: "plain", context: "Drawing UI prototype: Pen", arguments: {} },
    "canvas.select": { kind: "plain", context: "Drawing UI prototype: Select", arguments: {} },
    "canvas.eraser": { kind: "plain", context: "Drawing UI prototype: Eraser", arguments: {} },
    "canvas.line": { kind: "plain", context: "Drawing UI prototype: Line", arguments: {} },
    "canvas.shapes": { kind: "plain", context: "Drawing UI prototype: Shapes", arguments: {} },
    "canvas.colorUnavailable": {
      kind: "plain",
      context: "Drawing UI prototype: Color · unavailable in this preview",
      arguments: {},
    },
    "canvas.settingsUnavailable": {
      kind: "plain",
      context: "Drawing UI prototype: Settings · unavailable in this preview",
      arguments: {},
    },
    "canvas.width": { kind: "plain", context: "Drawing UI prototype: Width", arguments: {} },
    "canvas.opacity": { kind: "plain", context: "Drawing UI prototype: Opacity", arguments: {} },
    "canvas.smoothing": {
      kind: "plain",
      context: "Drawing UI prototype: Smoothing",
      arguments: {},
    },
    "canvas.noSettings": {
      kind: "plain",
      context: "Drawing UI prototype: No settings for Select",
      arguments: {},
    },
    "canvas.preview": {
      kind: "plain",
      context: "Drawing UI prototype: UI preview · artwork is not editable",
      arguments: {},
    },
    "canvas.strokePreview": {
      kind: "plain",
      context: "Drawing UI prototype: Stroke preview",
      arguments: {},
    },
    "canvas.zoom": { kind: "plain", context: "Drawing UI prototype: Zoom", arguments: {} },
    "app.name": {
      kind: "plain",
      context: "Product name; keep Linefield unchanged.",
      arguments: {},
    },
    "preview.simulation": {
      kind: "plain",
      context:
        "Review toolbar badge explaining that selected native platforms are browser simulations.",
      arguments: {},
    },
    "preview.platform": {
      kind: "plain",
      context: "Label for browser prototype platform selector; not a production app setting.",
      arguments: {},
    },
    "preview.reset": {
      kind: "plain",
      context: "Button restoring disposable example drawings in the browser prototype.",
      arguments: {},
    },
    "preview.disclaimer": {
      kind: "plain",
      context: "Accessible description of the memory-only prototype; no persistent saving.",
      arguments: {},
    },
    "preview.resetAnnouncement": {
      kind: "plain",
      context: "Screen reader announcement after example drawings are restored.",
      arguments: {},
    },
    "drawing.create": {
      kind: "plain",
      context: "Accessible name and full label for creating a new blank drawing preview.",
      arguments: {},
    },
    "drawing.untitled": {
      kind: "plain",
      context: "Default display title when a drawing has no user-provided name.",
      arguments: {},
    },
    "gallery.label": {
      kind: "plain",
      context: "Accessible name for the collection of drawing cards.",
      arguments: {},
    },
    "drawing.open": {
      kind: "plain",
      context:
        "Accessible button name. name is a literal user-provided drawing title; preserve it verbatim.",
      arguments: {
        name: "string",
      },
    },
    "drawing.actions": {
      kind: "plain",
      context:
        "Accessible name for drawing action controls. name is a literal user-provided title.",
      arguments: {
        name: "string",
      },
    },
    "drawing.deleted": {
      kind: "plain",
      context:
        "In-place recoverable deletion status. name is a literal user-provided title; retain quotation punctuation.",
      arguments: {
        name: "string",
      },
    },
    "action.undo": {
      kind: "plain",
      context: "Restores a recoverably deleted drawing. Distinct from cancelling a rename form.",
      arguments: {},
    },
    "gallery.emptyViewer": {
      kind: "plain",
      context: "Empty state for read-only wearable viewer with no offline downloads.",
      arguments: {},
    },
    "navigation.back": {
      kind: "plain",
      context: "Returns from drawing preview to gallery; leading arrow indicates navigation.",
      arguments: {},
    },
    "rename.title": {
      kind: "plain",
      context: "Title of the form editing a drawing title.",
      arguments: {},
    },
    "rename.label": {
      kind: "plain",
      context: "Accessible label for drawing-title text input.",
      arguments: {},
    },
    "action.cancel": {
      kind: "plain",
      context:
        "Dismisses rename form without applying changes; distinct from restoring deleted drawing.",
      arguments: {},
    },
    "action.rename": {
      kind: "plain",
      context: "Applies edited drawing title; also labels action opening the rename form.",
      arguments: {},
    },
    "action.delete": {
      kind: "plain",
      context:
        "Immediately removes drawing from active gallery with in-place Undo; recoverable action.",
      arguments: {},
    },
    "rename.required": {
      kind: "plain",
      context: "Validation error for blank or whitespace-only drawing title.",
      arguments: {},
    },
    "drawing.restored": {
      kind: "plain",
      context: "Screen reader announcement after successful deletion Undo.",
      arguments: {},
    },
    "drawing.removedAnnouncement": {
      kind: "plain",
      context: "Screen reader announcement after deletion; explains same-slot Undo availability.",
      arguments: {},
    },
    "gallery.toolbar": {
      kind: "plain",
      context: "Accessible name for compact drawing-creation toolbar.",
      arguments: {},
    },
    "gallery.scroll": {
      kind: "plain",
      context: "Accessible name for gallery overlay scrollbar.",
      arguments: {},
    },
    "drawing.createShort": {
      kind: "plain",
      context: "Compact iPhone toolbar creation label, beside a plus/document icon.",
      arguments: {},
    },
  },
} satisfies Catalog;

export type MessageId = keyof typeof catalog.messages;
export type Translation = {
  [Id in MessageId]: (typeof catalog.messages)[Id]["kind"] extends "plural"
    ? Record<string, string>
    : string;
};
