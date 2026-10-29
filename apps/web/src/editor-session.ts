/** Same-origin browser lifecycle boundary. No document, geometry or history data
 * crosses it. The editor remains the sole execution owner of its Rust engine.
 */
export interface EditorSession {
  readonly version: 1;
  /** Cancel unfinished input and clear held modifiers; retain committed work. */
  suspendInput(): void;
  requestLeave?(): Promise<boolean>;
  hasUnsaved?(): boolean;
}
interface SessionWindow extends Window {
  linefieldEditorSession?: EditorSession;
}
export function installEditorSession(
  suspendInput: () => void,
  saving?: Pick<EditorSession, "requestLeave" | "hasUnsaved">,
): void {
  (window as SessionWindow).linefieldEditorSession = Object.freeze({
    version: 1,
    suspendInput,
    ...saving,
  });
}
export function suspendEditorSession(target: Window | null): void {
  const session = (target as SessionWindow | null)?.linefieldEditorSession;
  // Before initialization completes no owning input handlers are available.
  if (!session) return;
  if (session.version !== 1 || typeof session.suspendInput !== "function")
    throw Error("Incompatible editor session lifecycle");
  session.suspendInput();
}

export function requestEditorLeave(target: Window | null): Promise<boolean> {
  return (
    (target as SessionWindow | null)?.linefieldEditorSession?.requestLeave?.() ??
    Promise.resolve(true)
  );
}
export function editorHasUnsaved(target: Window | null): boolean {
  return (target as SessionWindow | null)?.linefieldEditorSession?.hasUnsaved?.() ?? false;
}
