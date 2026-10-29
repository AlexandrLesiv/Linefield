import type { Catalog } from "./types.ts";
export const catalog = {
  version: 1,
  sourceLanguage: "en",
  messages: {
    "library.back": {
      kind: "plain",
      context: "Return from missing drawing to gallery",
      arguments: {},
    },
    "library.recovery": { kind: "plain", context: "Partial saved gallery recovery", arguments: {} },
    "library.more": { kind: "plain", context: "Saved drawing pagination", arguments: {} },
    "library.loading": { kind: "plain", context: "Saved drawing gallery", arguments: {} },
    "library.failed": { kind: "plain", context: "Saved drawing gallery", arguments: {} },
    "library.retry": { kind: "plain", context: "Saved drawing gallery", arguments: {} },
    "library.missing": { kind: "plain", context: "Saved drawing gallery", arguments: {} },
    "library.creating": { kind: "plain", context: "Saved drawing gallery", arguments: {} },
    "library.created": { kind: "plain", context: "Saved drawing gallery", arguments: {} },
    "library.createFailed": { kind: "plain", context: "Saved drawing gallery", arguments: {} },
    "library.modified": {
      kind: "plain",
      context: "Saved drawing modification date",
      arguments: { date: "string" },
    },
    "save.capacity": { kind: "plain", context: "Saving failure condition", arguments: {} },
    "save.openInUse": { kind: "plain", context: "Saving failure condition", arguments: {} },

    "save.title": { kind: "plain", context: "Single local drawing preview entry", arguments: {} },
    "save.open": { kind: "plain", context: "Single local drawing preview entry", arguments: {} },

    "save.loading": {
      kind: "plain",
      context: "Local drawing saving state or action",
      arguments: {},
    },
    "save.saved": { kind: "plain", context: "Local drawing saving state or action", arguments: {} },
    "save.pending": {
      kind: "plain",
      context: "Local drawing saving state or action",
      arguments: {},
    },
    "save.saving": {
      kind: "plain",
      context: "Local drawing saving state or action",
      arguments: {},
    },
    "save.failed": {
      kind: "plain",
      context: "Local drawing saving state or action",
      arguments: {},
    },
    "save.openFailed": {
      kind: "plain",
      context: "Local drawing saving state or action",
      arguments: {},
    },
    "save.now": { kind: "plain", context: "Local drawing saving state or action", arguments: {} },
    "save.retry": { kind: "plain", context: "Local drawing saving state or action", arguments: {} },
    "save.retryOpen": {
      kind: "plain",
      context: "Local drawing saving state or action",
      arguments: {},
    },
    "save.leaving": {
      kind: "plain",
      context: "Local drawing saving state or action",
      arguments: {},
    },
    "save.cancelLeave": {
      kind: "plain",
      context: "Local drawing saving state or action",
      arguments: {},
    },
    "save.local": { kind: "plain", context: "Local drawing saving state or action", arguments: {} },
    "save.waitStroke": {
      kind: "plain",
      context: "Local drawing saving state or action",
      arguments: {},
    },

    "vector.adjustPressure": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.fixedWidth": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.pressureRecorded": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.pressureCurve": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.pressureHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.minimumWidth": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.pressureChart": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.pressureChartDesc": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.pressureAxis": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.widthAxis": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.incomingPressure": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.incomingPenPressure": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.pressureNote": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.layersTitle": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.newLayer": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.closeLayers": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.layersHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.lasso": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.pick": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.partialStrokes": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.activeLayerOnly": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.lassoMore": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.clearSelection": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.sliceWidth": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.sliceWidthUnits": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.zeroCut": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.zeroCutHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.sliceHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.navigationHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.selectHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.sliceToolHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.rotateHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.resetRotation": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.resetRotationHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.opacityHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.gridHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.partialHelp": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.selectionOptions": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },
    "vector.sliceOptions": {
      kind: "plain",
      context: "Vector editor panel explanation or accessible label",
      arguments: {},
    },

    "vector.brush": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.width": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.color": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.opacity": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.paper": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.grid": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.engineFailure": {
      kind: "plain",
      context: "Runtime drawing failure, keeping the existing in-memory session available",
      arguments: { detail: "string" },
    },
    "vector.defaultLayer": {
      kind: "plain",
      context: "Display name of a layer that has not been renamed by the user",
      arguments: { number: "integer" },
    },
    "vector.layersCount": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: { count: "integer" },
    },
    "vector.drawingOn": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: { name: "string" },
    },
    "vector.hiddenLayer": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: { name: "string" },
    },
    "vector.lockedLayer": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: { name: "string" },
    },
    "vector.hide": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.show": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.lock": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.unlock": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.moveUp": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.moveDown": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.rename": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.delete": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.nameFor": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: { name: "string" },
    },
    "vector.slicing": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.cutCount": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: { count: "integer" },
    },
    "vector.noCuts": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.lassoPreparing": {
      kind: "plain",
      context: "Pending asynchronous Lasso query",
      arguments: {},
    },
    "vector.lassoRelease": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.lassoAgain": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.selectedCount": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: { count: "integer" },
    },
    "vector.lassoHelp": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.pickHelp": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: {},
    },
    "vector.pressureExample": {
      kind: "plain",
      context: "Vector editor host controls and feedback",
      arguments: { value: "integer" },
    },

    "vector.pen": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.select": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.slice": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.pan": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.rotate": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.pressure": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.undo": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.redo": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.ink": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.hard": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.soft": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.paperNone": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.paperWarm": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.paperWhite": {
      kind: "plain",
      context: "Approved vector editor control",
      arguments: {},
    },
    "vector.gridNone": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.gridNotebook": {
      kind: "plain",
      context: "Approved vector editor control",
      arguments: {},
    },
    "vector.gridDots": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.background": {
      kind: "plain",
      context: "Approved vector editor control",
      arguments: {},
    },
    "vector.notSaved": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.pressureTitle": {
      kind: "plain",
      context: "Approved vector editor control",
      arguments: {},
    },
    "vector.steeper": { kind: "plain", context: "Approved vector editor control", arguments: {} },
    "vector.original": { kind: "plain", context: "Approved vector editor control", arguments: {} },

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
