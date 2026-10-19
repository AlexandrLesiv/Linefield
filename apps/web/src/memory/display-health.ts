import { recoverDisplay } from "./display-failure.ts";
import type { MemoryView } from "./view.ts";
export class DisplayHealth {
  lost = false;
  failed = false;
  private readonly hooks: {
    valid(): boolean;
    suspend(): void;
    destroy(): void;
    cancelFrames(): void;
    session(): bigint;
    view: MemoryView;
    fatal(): void;
    schedule(): void;
  };
  constructor(hooks: DisplayHealth["hooks"]) {
    this.hooks = hooks;
  }
  failure = () => {
    this.failed = true;
    this.hooks.cancelFrames();
    const { suspend, destroy, view, session, fatal } = this.hooks;
    recoverDisplay(suspend, destroy, view, session(), fatal);
  };
  contextLost = (event: Event) => {
    event.preventDefault();
    if (!this.hooks.valid() || this.lost) return;
    this.lost = true;
    this.hooks.cancelFrames();
    try {
      this.hooks.suspend();
    } catch {
      this.hooks.fatal();
      return;
    }
    this.hooks.destroy();
    this.hooks.view.status("displayLost");
  };
  contextRestored = () => {
    if (this.hooks.valid()) {
      this.lost = false;
      this.hooks.schedule();
    }
  };
}
