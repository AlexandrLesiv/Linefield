import type { ReplyValue } from "./bridge.ts";
export function editorCommands(options: {
  read(): ReplyValue;
  valid(): boolean;
  accept(state: ReplyValue): boolean;
  cancelled(): void;
  changed(previous: ReplyValue, next: ReplyValue): void;
  fatal(): void;
}) {
  return {
    read: options.read,
    fail: options.fatal,
    run(action: (state: ReplyValue) => ReplyValue): ReplyValue | undefined {
      if (!options.valid()) return undefined;
      const previous = options.read();
      let result: ReplyValue;
      try {
        result = action(previous);
        options.accept(result);
        if (!options.valid()) return undefined;
      } catch {
        options.fatal();
        return undefined;
      }
      if (result.activeCancelled) options.cancelled();
      if (result.scene !== previous.scene || result.content !== previous.content)
        options.changed(previous, result);
      return result;
    },
  };
}
