/** Same-origin browser lifecycle boundary. No document, geometry or history data
 * crosses it. The editor remains the sole execution owner of its Rust engine.
 */
export interface EditorSession {
  readonly version: 1;
  /** Cancel unfinished input and clear held modifiers; retain committed work. */
  suspendInput(): void;
}
interface SessionWindow extends Window {
  linefieldEditorSession?: EditorSession;
}
export function installEditorSession(suspendInput: () => void): void {
  (window as SessionWindow).linefieldEditorSession = Object.freeze({ version: 1, suspendInput });
}
export function suspendEditorSession(target: Window | null): void {
  const session = (target as SessionWindow | null)?.linefieldEditorSession;
  // Before initialization completes no owning input handlers are available.
  if (!session) return;
  if (session.version !== 1 || typeof session.suspendInput !== "function")
    throw Error("Incompatible editor session lifecycle");
  session.suspendInput();
}
