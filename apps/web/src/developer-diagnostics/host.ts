export interface DiagnosticAvailability {
  readonly idle: boolean;
  readonly ready: boolean;
  readonly visible: boolean;
  readonly terminal: boolean;
  /** Changes on every interaction begin, even if it ends during export preparation. */
  readonly interactionEpoch: number;
}
export interface DiagnosticHost {
  readonly mount: HTMLElement;
  focusCanvas(): void;
  closeSettings(restoreFocus: boolean): void;
  backToSettings(): void;
  /** Read cached aggregates only; terminal availability forbids Wasm getters.
   * On enable, supply a current cached snapshot, retaining its observation time.
   * Fence session/generation completions before offering metrics. No idle rAF.
   */
  observeMetrics(wanted: boolean): void;
}
export function sameAvailability(a: DiagnosticAvailability, b: DiagnosticAvailability): boolean {
  return (
    a.idle === b.idle &&
    a.ready === b.ready &&
    a.visible === b.visible &&
    a.terminal === b.terminal &&
    a.interactionEpoch === b.interactionEpoch
  );
}
export function canCapture(value: DiagnosticAvailability): boolean {
  return value.idle && value.visible && value.ready && !value.terminal;
}
