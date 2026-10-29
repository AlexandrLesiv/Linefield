export async function panToRegionalOrigin(
  frame,
  regionalOrigin,
  expectedRegion = String(BigInt(regionalOrigin / 65536)),
  held = false,
) {
  await frame.evaluate(
    ({ origin, held: keepHeld }) => {
      const canvas = document.querySelector("canvas"),
        r = canvas.getBoundingClientRect();
      const names = ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"];
      const descriptors = names.map((name) => Object.getOwnPropertyDescriptor(canvas, name));
      canvas.setPointerCapture = () => {};
      canvas.hasPointerCapture = () => true;
      canvas.releasePointerCapture = () => {};
      const send = (type, x) =>
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 311,
            pointerType: "mouse",
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
            clientX: r.x + x,
            clientY: r.y + 100,
          }),
        );
      try {
        document.querySelector("#pan").click();
        send("pointerdown", 100);
        send("pointermove", 100 - origin);
        if (!keepHeld) send("pointerup", 100 - origin);
      } finally {
        names.forEach((name, i) =>
          descriptors[i]
            ? Object.defineProperty(canvas, name, descriptors[i])
            : delete canvas[name],
        );
      }
    },
    { origin: regionalOrigin, held },
  );
  await frame.waitForFunction(
    (expected) => lab.viewOrigin()[0] === expected && !lab.renderPending(),
    expectedRegion,
  );
}
