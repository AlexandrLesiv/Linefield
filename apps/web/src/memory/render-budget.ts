import { nextTurn } from "./committed-scene.ts";
// Cooperative scheduling only: complete contours/whole paths and canonical input stay intact.
export class RenderBudget {
  private verbs = 0;
  private start = performance.now();
  async before(maximumVerbs: number, valid: () => boolean): Promise<boolean> {
    if (this.verbs + maximumVerbs > 4096 || performance.now() - this.start >= 4) {
      await nextTurn();
      this.verbs = 0;
      this.start = performance.now();
    }
    return valid();
  }
  transferred(verbs: number): void {
    this.verbs += verbs;
  }
}
