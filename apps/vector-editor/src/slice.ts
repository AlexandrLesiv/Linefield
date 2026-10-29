import type { Camera } from "./camera";
import type { Core } from "./core";
import type { GeometryCache } from "./geometry-cache";

/** Cut on every accepted movement; release records the whole gesture once. */
export function createSlice(
	core: Core,
	cache: GeometryCache,
	camera: Camera,
	canvas: HTMLCanvasElement,
	changed: () => void,
) {
	const controls = document.querySelector<HTMLElement>("#slice-controls")!;
	const width = document.querySelector<HTMLInputElement>("#slice-width")!;
	const number = document.querySelector<HTMLInputElement>(
		"#slice-width-number",
	)!;
	const activeLayer = document.querySelector<HTMLInputElement>(
		"#slice-active-layer",
	)!;
	const overlay = document.querySelector<SVGSVGElement>("#slice-overlay")!;
	const trail = document.querySelector<SVGPathElement>("#slice-trail")!;
	const tip = document.querySelector<SVGCircleElement>("#slice-tip")!;
	const cross = document.querySelector<SVGPathElement>("#slice-crosshair")!;
	const status = document.querySelector<HTMLElement>("#slice-status")!;
	let size = 20,
		gestureSize = 20,
		drawing = false,
		pending = true,
		lastView = "";
	let lastPoint: [number, number] | null = null;
	let cursor: [number, number] | null = null;
	function setSize(value: number) {
		size = Number.isFinite(value) ? Math.max(0, Math.min(500, value)) : 20;
		width.max = String(Math.max(150, size));
		width.value = number.value = String(size);
		width.setAttribute(
			"aria-valuetext",
			size === 0 ? "Zero-width split" : `${size} canvas units`,
		);
		pending = true;
	}
	width.addEventListener("input", () => setSize(Number(width.value)));
	number.addEventListener("change", () => setSize(number.valueAsNumber));
	document
		.querySelector("#slice-zero")!
		.addEventListener("click", () => setSize(0));
	controls.addEventListener("keydown", (e) => {
		if (e.code === "Space") e.stopPropagation();
	});
	function hover(e: PointerEvent) {
		const r = canvas.getBoundingClientRect();
		cursor = [e.clientX - r.left, e.clientY - r.top];
		pending = true;
	}
	function append(e: PointerEvent) {
		hover(e);
		const p = camera.screenToWorld(...cursor!);
		const last = lastPoint;
		if (last && p[0] === last[0] && p[1] === last[1]) return;
		lastPoint = p;
		const before = core.count();
		if (core.slice_push(...p)) {
			for (let id = before; id < core.count(); id++) cache.note(id, true);
			cache.historyChanged();
			changed();
		}
	}
	function down(e: PointerEvent) {
		lastPoint = null;
		gestureSize = size;
		drawing = !!core.slice_begin(gestureSize, Number(activeLayer.checked));
		status.textContent = "Slicing · Esc restores this gesture";
		if (drawing) append(e);
	}
	function move(e: PointerEvent) {
		if (!drawing) return;
		for (const sample of e.getCoalescedEvents?.() ?? []) append(sample);
		append(e);
	}
	function up(e: PointerEvent) {
		if (!drawing) return;
		move(e);
		const count = core.slice_commit();
		drawing = false;
		lastPoint = null;
		pending = true;
		if (count) {
			cache.historyChanged();
			changed();
		}
		status.textContent = count
			? `${count} stroke${count === 1 ? "" : "s"} cut · Undo restores the originals`
			: "No editable strokes crossed";
	}
	function cancel() {
		drawing = false;
		lastPoint = null;
		cursor = null;
		pending = true;
		status.textContent = "";
		// The owning pointer lifecycle calls core.cancel after this UI cleanup.
	}
	canvas.addEventListener("pointerleave", () => {
		if (!drawing) {
			cursor = null;
			pending = true;
		}
	});
	function render(enabled: boolean, active: boolean) {
		const key = [
			enabled,
			active,
			camera.cx,
			camera.cy,
			camera.zoom,
			camera.rotation,
			canvas.clientWidth,
			canvas.clientHeight,
		].join(":");
		if (!pending && key === lastView) return;
		lastView = key;
		pending = false;
		controls.hidden = status.hidden = !enabled;
		overlay.style.display = enabled && cursor ? "block" : "none";
		const r = canvas.getBoundingClientRect();
		overlay.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
		trail.setAttribute("d", "");
		const diameter = (active ? gestureSize : size) * camera.zoom;
		trail.setAttribute("stroke-width", String(Math.max(1, diameter)));
		if (cursor) {
			const [x, y] = cursor;
			tip.setAttribute("cx", String(x));
			tip.setAttribute("cy", String(y));
			tip.setAttribute("r", String(diameter / 2));
			tip.style.display = diameter > 0 ? "" : "none";
			cross.setAttribute(
				"d",
				`M${x - 5} ${y}H${x + 5} M${x} ${y - 5}V${y + 5}`,
			);
		}
	}
	setSize(20);
	return { down, move, up, hover, cancel, render };
}
