import { animateComposeEdge } from "./compose-edge.ts";
import { animateCreationVisual } from "./creation-motion.ts";
import { reducedMotion } from "./dom.ts";

function frame(rect: DOMRect, parent?: DOMRect): Keyframe {
  return {
    left: `${rect.left - (parent?.left ?? 0)}px`,
    top: `${rect.top - (parent?.top ?? 0)}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

/** Shell and contained artwork share a clock, but have independent geometry. */
export function moveSurface(
  node: HTMLElement,
  from: DOMRect,
  to: DOMRect,
  artworkFrom: DOMRect | null,
  artworkTo: DOMRect | null,
  closing: boolean,
  radius: string,
  appearance: {
    background: string;
    opacity: number;
    radius: string;
    edgeOpacity: number;
    shadow: string;
  },
  elevatedShadow: string,
  targetShadow: string,
  targetBackground: string,
) {
  const timing = {
    duration: reducedMotion() ? 0 : 360,
    easing: "cubic-bezier(.2,.7,.2,1)",
    fill: "both",
  } satisfies KeyframeAnimationOptions;
  const shellFrames = (target: DOMRect) => [
    {
      ...frame(from),
      borderRadius: closing ? appearance.radius : radius,
      backgroundColor: appearance.background,
    },
    { ...frame(target), borderRadius: closing ? radius : "0px", backgroundColor: targetBackground },
  ];
  node.style.boxShadow = "none";
  const elevation = node.animate(
    closing
      ? [
          { boxShadow: appearance.shadow },
          { boxShadow: elevatedShadow, offset: 0.2 },
          { boxShadow: elevatedShadow, offset: 0.8 },
          { boxShadow: targetShadow },
        ]
      : [
          { boxShadow: appearance.shadow },
          { boxShadow: elevatedShadow, offset: 0.8 },
          { boxShadow: "none" },
        ],
    { ...timing, easing: "linear" },
  );
  const shell = node.animate(shellFrames(to), timing);
  const edge = animateComposeEdge(node, closing, appearance.edgeOpacity, timing);
  const creation = animateCreationVisual(node, closing, appearance.opacity, timing);
  const image = node.querySelector<HTMLImageElement>(".canvas-art");
  const imageFrames = (target: DOMRect, art: DOMRect) => [
    frame(artworkFrom ?? from, from),
    frame(art, target),
  ];
  const artwork = image && artworkTo ? image.animate(imageFrames(to, artworkTo), timing) : null;
  // Both pending animations start on the same document timeline tick.
  // Assigning a null startTime here would pause the artwork.
  return {
    finished: shell.finished,
    finish(target: DOMRect, art: DOMRect | null) {
      if (shell.effect instanceof KeyframeEffect) shell.effect.setKeyframes(shellFrames(target));
      if (art && artwork?.effect instanceof KeyframeEffect)
        artwork.effect.setKeyframes(imageFrames(target, art));
      elevation.finish();
      edge?.finish();
      creation?.finish();
      artwork?.finish();
      shell.finish();
    },
    cancel() {
      elevation.cancel();
      edge?.cancel();
      creation?.cancel();
      shell.cancel();
      artwork?.cancel();
    },
  };
}

export function artworkBounds(origin: HTMLElement): DOMRect | null {
  return origin.querySelector<HTMLImageElement>(".artwork img")?.getBoundingClientRect() ?? null;
}
