import { queryLasso } from "./lasso-snapshot";
import { IMAGE_HANDLE, imageSelection } from "./image-selection";
import { LassoPreparer } from "./lasso-preparer";
import { SessionSelection } from "./session-selection";
import { t } from "../../web/src/locale";
import type { Camera } from "./camera";
import type { Core } from "./core";
import type { Bounds, GeometryCache } from "./geometry-cache";
import type { LassoPoint } from "./lasso";

export function createSelection(
	core: Core,
	cache: GeometryCache,
	camera: Camera,
	canvas: HTMLCanvasElement,
  reportFailure: (error: unknown) => void,
) {
	const ids = new SessionSelection(core);
  const objects = imageSelection(core, cache, camera);
  const queries = new LassoPreparer();
  let queryGeneration = 0;
  let releasedLasso: readonly LassoPoint[] | null = null;
  let releasedOrigin = 0;
  function cancelQuery() { queryGeneration++; queries.cancel(); releasedLasso=null; pending=true; }
	const overlay = document.querySelector<SVGSVGElement>("#selection-overlay")!;
	const outline = overlay.querySelector<SVGPathElement>("#selection-outline")!;
	const lassoPath = overlay.querySelector<SVGPathElement>("#selection-lasso")!;
	const label = document.querySelector<HTMLElement>("#selection-status")!;
	const controls = document.querySelector<HTMLElement>("#selection-controls")!;
	const partial =
		document.querySelector<HTMLInputElement>("#selection-partial")!;
	const activeLayer = document.querySelector<HTMLInputElement>(
		"#selection-active-layer",
	)!;
	const lassoButton = document.querySelector<HTMLButtonElement>(
		"#selection-lasso-mode",
	)!;
	const pickButton = document.querySelector<HTMLButtonElement>(
		"#selection-pick-mode",
	)!;
	const moreButton =
		document.querySelector<HTMLButtonElement>("#selection-more")!;
	let orientation = 0;
	let frameReference: { id: number; offset: number } | null = null;
	let mode: "lasso" | "pick" = "lasso",
		forceLasso = false,
		pending = true,
		lastView = "";
	let drag: {
		kind: "move" | "rotate" | "resize";
		orientation: number;
		pivot: [number, number];
		screen: [number, number];
		world: [number, number];
		moved: boolean;
	} | null = null;
	let lasso: {
		screen: [number, number];
		last: [number, number];
		points: LassoPoint[];
		moved: boolean;
		shift: boolean;
	} | null = null;
	const point = (e: PointerEvent): [number, number] => {
		const r = canvas.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top];
	};
	function prune() { ids.prune(); }
	function cancel() {
    cancelQuery();
		if (drag) orientation = drag.orientation;
		core.move_cancel();
		drag = null;
		lasso = null;
		forceLasso = false;
		pending = true;
	}
	function clear() {
		cancel();
		ids.clear();
		orientation = 0;
		frameReference = null;
	}
	function remove() {
		cancel();
		prune();
		if (!ids.size) return 0;
		core.delete_begin();
		for (const id of ids) core.delete_add(id);
		const count = core.delete_commit();
		clear();
		if (count) cache.historyChanged();
		return count;
	}
	function moveStart(screen: [number, number], world: [number, number]) {
		core.move_begin();
		for (const id of ids) core.move_add(id);
		drag = {
			screen,
			world,
			moved: false,
			kind: "move",
			orientation,
			pivot: [0, 0],
		};
	}
	const rotate = (p: readonly number[], angle: number): [number, number] => [
		Math.cos(angle) * p[0] - Math.sin(angle) * p[1],
		Math.sin(angle) * p[0] + Math.cos(angle) * p[1],
	];
	const project = (p: readonly number[]): [number, number] => {
		const [x, y] = rotate(p, camera.rotation);
		return [camera.cx + camera.zoom * x, camera.cy + camera.zoom * y];
	};
	function frame() {
		if (!ids.size) {
			frameReference = null;
			orientation = 0;
			return null;
		}
		const angleOf = objects.angle;
		if (!frameReference || !ids.has(frameReference.id)) {
			const id = ids.values().next().value!;
			frameReference = { id, offset: id >= IMAGE_HANDLE ? 0 : -angleOf(id) };
		}
		// Derive the frame from document metadata, including undo/redo. Keeping
		// only a UI angle would leave a stale diamond after undoing a rotation.
		orientation = angleOf(frameReference.id) + frameReference.offset;
		const bounds = objects.bounds(ids, orientation);
		if (!bounds) return null;
		// Leave a usable move target even for dots and very thin/subpixel strokes.
		const minimum = 40 / camera.zoom;
		for (const axis of [0, 1]) {
			const extra =
				Math.max(0, minimum - (bounds[axis + 2] - bounds[axis])) / 2;
			bounds[axis] -= extra;
			bounds[axis + 2] += extra;
		}
		const [x0, y0, x1, y1] = bounds;
		const corners = [
			[x0, y0],
			[x1, y0],
			[x1, y1],
			[x0, y1],
		].map((p) => rotate(p, orientation));
		const center = rotate([(x0 + x1) / 2, (y0 + y1) / 2], orientation);
		const top = rotate([(x0 + x1) / 2, y0], orientation);
		const rotationHandle = rotate(
			[(x0 + x1) / 2, y0 - 30 / camera.zoom],
			orientation,
		);
		return { bounds, corners, center, top, rotationHandle };
	}
	function inside(world: [number, number], bounds: Bounds) {
		const [x, y] = rotate(world, -orientation);
		return x >= bounds[0] && x <= bounds[2] && y >= bounds[1] && y <= bounds[3];
	}
	function pick(world: [number, number], shift: boolean) {
		const hit = objects.pick(...world, 6 / camera.zoom, activeLayer.checked);
		if (hit === null) {
			if (!shift) ids.clear();
			return false;
		}
		if (shift && ids.has(hit)) {
			ids.delete(hit);
			orientation = 0;
			frameReference = null;
			return false;
		}
		if (!ids.has(hit)) {
			if (!shift) ids.clear();
			ids.add(hit);
			orientation = 0;
			frameReference = null;
		}
		return true;
	}
	function down(e: PointerEvent) {
    cancelQuery();
		prune();
		pending = true;
		const screen = point(e),
			world = camera.screenToWorld(...screen);
		const f = frame();
		if (f && !forceLasso) {
			const near = (target: [number, number]) => {
				const p = project(target);
				return Math.hypot(p[0] - screen[0], p[1] - screen[1]) <= 12;
			};
			const distances = f.corners.map((cornerWorld) => {
				const p = project(cornerWorld);
				return Math.hypot(p[0] - screen[0], p[1] - screen[1]);
			});
			const nearest = Math.min(...distances);
			const corner = nearest <= 12 ? distances.indexOf(nearest) : -1;
			const rotating = near(f.rotationHandle);
			if (rotating || corner >= 0) {
				moveStart(screen, world);
				if (drag) {
					drag.kind = rotating ? "rotate" : "resize";
					drag.pivot = rotating ? f.center : f.corners[(corner + 2) % 4];
				}
				return;
			}
		}
		if (mode === "pick" && !forceLasso) {
			if (pick(world, e.shiftKey)) moveStart(screen, world);
			return;
		}
		if (!forceLasso && !e.shiftKey && f && inside(world, f.bounds)) {
			moveStart(screen, world);
			return;
		}
		lasso = {
			screen,
			last: screen,
			points: [world],
			moved: false,
			shift: e.shiftKey,
		};
	}
	function move(e: PointerEvent): boolean {
		const screen = point(e);
		if (drag) {
			if (
				!drag.moved &&
				Math.hypot(screen[0] - drag.screen[0], screen[1] - drag.screen[1]) < 3
			)
				return false;
			drag.moved = true;
			const world = camera.screenToWorld(...screen);
			let accepted: number;
			if (drag.kind === "move") {
				accepted = core.move_update(
					world[0] - drag.world[0],
					world[1] - drag.world[1],
				);
			} else {
				const [px, py] = drag.pivot;
				const x = world[0] - px,
					y = world[1] - py;
				const sx = drag.world[0] - px,
					sy = drag.world[1] - py;
				let angle = 0,
					scale = 1;
				if (drag.kind === "rotate") {
					angle = core.selection_drag_angle(x, y, sx, sy, e.shiftKey ? 1 : 0);
				} else {
					scale = core.selection_drag_scale(x, y, sx, sy);
				}
				accepted = camera.transform(px, py, scale, angle);
				if (accepted) orientation = drag.orientation + angle;
			}
			pending = true;
			return !!accepted;
		}
		if (!lasso) return false;
		const coalesced = e.getCoalescedEvents?.() ?? [];
		for (const sample of [...coalesced, e]) {
			const p = point(sample);
			if (Math.hypot(p[0] - lasso.last[0], p[1] - lasso.last[1]) < 1.5)
				continue;
			lasso.points.push(camera.screenToWorld(...p));
			lasso.last = p;
			lasso.moved ||=
				Math.hypot(p[0] - lasso.screen[0], p[1] - lasso.screen[1]) >= 3;
		}
		pending = true;
		return false;
	}
	function up(e: PointerEvent) {
		move(e);
		if (drag) {
			if (!drag.moved && drag.kind !== "move" && e.shiftKey) {
				// A handle may overlap visible ink. Preserve Shift-click toggling
				// while reserving Shift-drag on the rotate handle for snapping.
				core.move_cancel();
				pick(camera.screenToWorld(...point(e)), true);
			} else core.move_commit();
			drag = null;
		} else if (lasso) {
			if (lasso.moved) {
				// Include the exact release point, then implicitly close the loop.
				lasso.points.push(camera.screenToWorld(...point(e)));
        const points = lasso.points, isPartial = partial.checked, activeOnly = activeLayer.checked;
        releasedLasso=points; releasedOrigin=camera.originRevision;
        const generation = ++queryGeneration, state = cache.lassoState(activeOnly);
        const current = () => generation === queryGeneration && state === cache.lassoState(activeOnly);
        const publish = (found: number[]) => {
          if(!current()) return;
          found = [...found, ...objects.lasso(points, isPartial, activeOnly)];
          for(const id of found) { if(ids.has(id)) ids.delete(id); else ids.add(id); }
          if(found.length) { orientation=0; frameReference=null; }
          pending=true;
        };
        const fallback = () => cache.lassoHitTest(points,isPartial,activeOnly);
        let snapshot;
        try { snapshot=cache.lassoSnapshot(points,isPartial,activeOnly); } catch { snapshot=null; }
        if(snapshot) queries.run(snapshot,current,()=>queryLasso(core,snapshot),publish,reportFailure);
        else publish(fallback());
			} else pick(camera.screenToWorld(...point(e)), lasso.shift);
			lasso = null;
		}
		forceLasso = false;
		pending = true;
	}
	function renderNow(enabled: boolean) {
    if(releasedLasso && releasedOrigin!==camera.originRevision) cancelQuery();
		const key = [
			enabled,
      queries.stats.pending,
			camera.cx,
			camera.cy,
			camera.zoom,
			camera.rotation,
			canvas.clientWidth,
			canvas.clientHeight,
			core.transform_revision(),
			core.layer_revision(),
			cache.stats.backlog,
		].join(":");
		if (!pending && key === lastView) return;
		pending = false;
		lastView = key;
		prune();
    if(!queries.stats.pending) releasedLasso=null;
		controls.hidden = label.hidden = !enabled;
		moreButton.hidden = !ids.size;
		lassoButton.setAttribute("aria-pressed", String(mode === "lasso"));
		pickButton.setAttribute("aria-pressed", String(mode === "pick"));
		moreButton.setAttribute("aria-pressed", String(forceLasso));
		partial.disabled = mode === "pick" && !forceLasso;
		const f = enabled ? frame() : null;
		overlay.style.display = enabled && (f || lasso?.moved || releasedLasso) ? "block" : "none";
		label.textContent = lasso?.moved
			? t("vector.lassoRelease")
			: queries.stats.pending
        ? t("vector.lassoPreparing")
      : forceLasso
				? t("vector.lassoAgain")
				: ids.size
					? t("vector.selectedCount", {count: ids.size})
					: mode === "lasso"
						? t("vector.lassoHelp")
						: t("vector.pickHelp");
		const r = canvas.getBoundingClientRect(),
			c = Math.cos(camera.rotation),
			s = Math.sin(camera.rotation);
		overlay.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
		const screenPath = (points: readonly LassoPoint[]) =>
			points
				.map(
					([x, y], i) =>
						`${i ? "L" : "M"}${camera.cx + camera.zoom * (c * x - s * y)} ${camera.cy + camera.zoom * (s * x + c * y)}`,
				)
				.join(" ");
		outline.setAttribute("d", f ? `${screenPath(f.corners)} Z` : "");
		const handles = overlay.querySelector<SVGGElement>("#selection-handles")!;
		handles.style.display = f && !lasso ? "" : "none";
		if (f) {
			for (let i = 0; i < 4; i++) {
				const h = handles.querySelector<SVGRectElement>(
					`#selection-corner-${i}`,
				)!;
				const [x, y] = project(f.corners[i]);
				h.setAttribute("x", String(x - 5));
				h.setAttribute("y", String(y - 5));
			}
			const [x, y] = project(f.rotationHandle),
				[tx, ty] = project(f.top);
			const h = handles.querySelector<SVGCircleElement>(
				"#selection-rotation-handle",
			)!;
			h.setAttribute("cx", String(x));
			h.setAttribute("cy", String(y));
			handles
				.querySelector("path")!
				.setAttribute("d", `M${tx} ${ty} L${x} ${y}`);
		}
		lassoPath.setAttribute(
			"d",
			lasso?.moved ? `${screenPath(lasso.points)} Z` : releasedLasso ? `${screenPath(releasedLasso)} Z` : "",
		);
	}
	function render(enabled: boolean) {
		try {
			renderNow(enabled);
		} catch (error) {
			// A failed disposable snapshot must retry, not freeze stale handles.
			pending = true;
			overlay.style.display = "none";
			throw error;
		}
	}

	lassoButton.addEventListener("click", () => {
		cancel();
		mode = "lasso";
	});
	pickButton.addEventListener("click", () => {
		cancel();
		mode = "pick";
	});
	moreButton.addEventListener("click", () => {
		const next = !forceLasso;
		cancel();
		forceLasso = next;
	});
	for (const control of [partial, activeLayer])
		control.addEventListener("change", cancel);
	document.querySelector("#selection-clear")!.addEventListener("click", clear);
	controls.addEventListener("keydown", (event) => {
		if (event.code === "Space") event.stopPropagation();
	});
	return {
		select(id: number) { clear(); ids.add(id); pending = true; },
		down,
    cancelQuery,
    queryStats: queries.stats,
		move,
		up,
		cancel,
		clear,
		remove,
		prune,
		render,
		ids: () => [...ids],
		moving: () => !!drag?.moved,
		cursor: () =>
			drag?.moved
				? drag.kind === "resize"
					? "nwse-resize"
					: "grabbing"
				: mode === "lasso" || forceLasso
					? "crosshair"
					: "default",
	};
}
