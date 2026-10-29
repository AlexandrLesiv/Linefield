import "./style.css";
import { installHostTheme } from "./host-theme";
import { installHostLocale } from "./host-locale";
import { Camera } from "./camera";
import { CompositeCache } from "./composite-cache";
import { loadCore } from "./load-core";
import { CoverageRenderer } from "./coverage-renderer";
import { type Bounds, type DrawPlan, GeometryCache } from "./geometry-cache";
import { INSTANCE_BYTES } from "./gpu-arena";
import { GpuPassTimers } from "./gpu-pass-timers";
import { inkFragment, inkVertex } from "./ink-shaders";
import { createLayers } from "./layers";
import {
	type GridStyle,
	PaperBackground,
	type PaperStyle,
} from "./paper-background";
import { PencilGrain } from "./pencil-grain";
import { releasePointer, tryCapturePointer } from "./pointer-capture";
import { createPressureControls } from "./pressure";
import { createSelection } from "./selection";
import { createSlice } from "./slice";
import {
	ATLAS_FRAME_INSTANCE_BUDGET,
	planSparseAtlas,
} from "./sparse-atlas-plan";
import { ATLAS_SIZE, SparseCoverage } from "./sparse-coverage";
import { detailLevelFor, ZoomDetail } from "./zoom-detail";

installHostTheme();
installHostLocale();
const canvas = document.querySelector("canvas")!;
const status = document.querySelector<HTMLElement>("#status")!;
const pressureControls = createPressureControls();
const opacityInput = document.querySelector<HTMLInputElement>("#opacity")!;
const opacityValue =
	document.querySelector<HTMLOutputElement>("#opacity-value")!;
opacityInput.addEventListener("input", () => {
	opacityValue.textContent = `${opacityInput.value}%`;
	opacityInput.setAttribute("aria-valuetext", `${opacityInput.value}%`);
});
window.addEventListener("error", (e) => {
	status.textContent = `Engine error: ${e.message}. Keep this tab open; session data may remain in memory.`;
});
const core = await loadCore().catch((error: unknown) => {
	status.textContent = `Drawing engine could not start: ${error instanceof Error ? error.message : String(error)}. Reload to retry.`;
	throw error;
});
const gl = canvas.getContext("webgl2", {
	alpha: false,
	antialias: true,
	preserveDrawingBuffer: false,
});
if (!gl)
	throw new Error("WebGL2 is required; please use a browser with GPU support.");
const gpu = gl;
const cache = new GeometryCache(gpu, core);
cache.setBackgroundPreparation(true);
const reportGpuError = (error: number) => cache.reportGpuError(error);
const noteGpuMutation = (bytes: number) => cache.noteGpuMutation(bytes);
let gpuTimings = new GpuPassTimers(gpu);
let coverageRenderer = new CoverageRenderer(gpu, reportGpuError, gpuTimings);
let compositeCache = new CompositeCache(gpu, reportGpuError);
let sparseCoverage = new SparseCoverage(
	gpu,
	reportGpuError,
	noteGpuMutation,
	gpuTimings,
);
let paperBackground = new PaperBackground(gpu);
let pencilGrain = new PencilGrain(gpu);
const paperStyle = document.querySelector<HTMLSelectElement>("#paper-style")!;
const selectedPaper = (): PaperStyle =>
	paperStyle.value === "warm" || paperStyle.value === "white"
		? paperStyle.value
		: "none";
const gridStyle = document.querySelector<HTMLSelectElement>("#grid-style")!;
const selectedGrid = (): GridStyle =>
	gridStyle.value === "notebook" || gridStyle.value === "dots"
		? gridStyle.value
		: "none";
for (const control of [paperStyle, gridStyle]) {
	control.addEventListener("change", () => {
		compositeCache.invalidate();
		dirty = true;
	});
}
let sparseEnabled = true;
let hierarchicalPlanning = true;
let projectionReuse = true;
let routeReuse = true;
let liveOverlayEnabled = true;
function shader(type: number, source: string) {
	const s = gpu.createShader(type)!;
	gpu.shaderSource(s, source);
	gpu.compileShader(s);
	if (!gpu.getShaderParameter(s, gpu.COMPILE_STATUS))
		throw Error(gpu.getShaderInfoLog(s)!);
	return s;
}
function createProgram() {
	const program = gpu.createProgram()!;
	gpu.attachShader(program, shader(gpu.VERTEX_SHADER, inkVertex));
	gpu.attachShader(program, shader(gpu.FRAGMENT_SHADER, inkFragment));
	gpu.linkProgram(program);
	if (!gpu.getProgramParameter(program, gpu.LINK_STATUS))
		throw Error(gpu.getProgramInfoLog(program)!);
	return program;
}
let program = createProgram();
const loc = (name: string) => gpu.getUniformLocation(program, name);
let pencilGrainLoc = loc("pencilGrain");
let pencilParticlesLoc = loc("pencilParticles");
let cameraLoc = loc("camera"),
	viewportLoc = loc("viewport"),
	rotationLoc = loc("rotation"),
	pixelWorldLoc = loc("pixelWorld");
let deviceViewportLoc = loc("deviceViewport"),
	rasterHeightLoc = loc("rasterHeight"),
	routeCountLoc = loc("routeCount"),
	routeBaseLoc = loc("routeBase"),
	routeSpanLoc = loc("routeSpan"),
	atlasRoutesLoc = loc("atlasRoutes");
type Tool = "draw" | "select" | "slice" | "pan" | "rotate";
const camera = new Camera(core);
const selection = createSelection(core, cache, camera, canvas);
const slice = createSlice(core, cache, camera, canvas, () => {
	selection.clear();
	compositeCache.invalidate();
	dirty = true;
});
const rotationReset =
	document.querySelector<HTMLButtonElement>("#rotation-reset")!;
const rotationPivot = document.querySelector<HTMLElement>("#rotation-pivot")!;
let dirty = true,
	lost = false,
	tool: Tool = "draw",
	space = false,
	rotateHeld = false,
	active: number | null = null,
	gesture: Tool | null = null,
	pointer: number | null = null;
let lastX = 0,
	lastY = 0;
let rotationDrag: {
	x: number;
	y: number;
	pointerAngle: number | null;
	angle: number;
} | null = null;
function updateCursor() {
	const mode = gesture ?? (space ? "pan" : rotateHeld ? "rotate" : tool);
	canvas.style.cursor =
		mode === "draw"
			? core.can_draw()
				? "crosshair"
				: "not-allowed"
			: mode === "slice"
				? "crosshair"
				: mode === "select"
					? selection.cursor()
					: gesture
						? "grabbing"
						: "grab";
	rotationPivot.hidden = gesture !== "rotate";
}
function updateRotation() {
	rotationReset.textContent = `${Math.round((camera.rotation * 180) / Math.PI)}°`;
	dirty = true;
}
function rotate(e: PointerEvent) {
	if (!rotationDrag) return;
	const rect = canvas.getBoundingClientRect();
	const dx = e.clientX - rect.left - rotationDrag.x;
	const dy = e.clientY - rect.top - rotationDrag.y;
	// Direction is unstable at the pivot. Resume from the next valid direction
	// without a jump if the pen passes through the small center deadzone.
	if (Math.hypot(dx, dy) < 20) {
		rotationDrag.pointerAngle = null;
		return;
	}
	const angle = Math.atan2(dy, dx);
	if (rotationDrag.pointerAngle !== null)
		rotationDrag.angle += camera.normalizeRotation(angle - rotationDrag.pointerAngle);
	rotationDrag.pointerAngle = angle;
	const step = Math.PI / 12;
	const target = e.shiftKey
		? Math.round(rotationDrag.angle / step) * step
		: rotationDrag.angle;
	camera.rotateAt(target, rotationDrag.x, rotationDrag.y);
	updateRotation();
}
let displayDpr = devicePixelRatio;
const zoomDetail = new ZoomDetail(displayDpr);
const metrics = {
	inputMs: [] as number[],
	frameMs: [] as number[],
	renderMs: [] as number[],
	panSubmissionMs: [] as number[],
	submissionDelayMs: [] as number[],
	historyMs: [] as number[],
	longTasks: 0,
	accepted: 0,
	backlog: 0,
	gpuBytes: 0,
	zoomSettling: false,
	targetLodLevel: -2,
	geometryDrawCalls: 0,
	compositeDraws: 0,
	drawCalls: 0,
	coverageBytes: 0,
	...compositeCache.stats,
	...sparseCoverage.stats,
	...cache.validationStats,
};
function cacheMetrics() {
	Object.assign(metrics, cache.stats, cache.validationStats);
	metrics.geometryDrawCalls = cache.stats.drawCalls;
	metrics.compositeDraws =
		coverageRenderer.stats.compositeDraws + sparseCoverage.stats.atlasBatches;
	Object.assign(metrics, sparseCoverage.stats);
	Object.assign(metrics, compositeCache.stats);
	metrics.drawCalls =
		metrics.geometryDrawCalls +
		metrics.compositeDraws +
		metrics.compositeCacheDraws;
	metrics.coverageBytes =
		coverageRenderer.stats.maskBytes + sparseCoverage.stats.atlasBytes;
}
function record(a: number[], v: number) {
	a.push(v);
	if (a.length > 2048) a.shift();
}
try {
	new PerformanceObserver((list) => {
		metrics.longTasks += list.getEntries().length;
	}).observe({ entryTypes: ["longtask"] });
} catch {}
let inputAt = 0;
let panAt = 0;
let transformRevision = core.transform_revision();
let layerRevision = core.layer_revision();
let layerRenderRevision = core.layer_render_revision();
const layers = createLayers(core, (change) => {
	// Finish accepted ink on its original layer before changing document metadata.
	core.commit();
	active = null;
	cancel();
	const result = change();
	if (layerRenderRevision !== core.layer_render_revision()) {
		layerRenderRevision = core.layer_render_revision();
		cache.historyChanged();
		compositeCache.invalidate();
	}
	layerRevision = core.layer_revision();
	layers.refresh();
	updateCursor();
	dirty = true;
	return result;
});
function prepare() {
	if (transformRevision !== core.transform_revision()) {
		cache.syncTransforms();
		transformRevision = core.transform_revision();
		compositeCache.invalidate();
		dirty = true;
	}
	if (layerRevision !== core.layer_revision()) {
		layerRevision = core.layer_revision();
		layers.refresh();
		updateCursor();
		dirty = true;
	}
	if (layerRenderRevision !== core.layer_render_revision()) {
		layerRenderRevision = core.layer_render_revision();
		cache.historyChanged();
		compositeCache.invalidate();
		dirty = true;
	}
	if (displayDpr !== devicePixelRatio) {
		displayDpr = devicePixelRatio;
		zoomDetail.settle(camera.zoom * displayDpr);
		dirty = true;
	}
	const detail = zoomDetail.update(camera.zoom * displayDpr, performance.now());
	metrics.zoomSettling = detail.settling;
	metrics.targetLodLevel = detailLevelFor(camera.zoom * displayDpr);
	const rect = canvas.getBoundingClientRect(),
		pad = 2 / (camera.zoom * devicePixelRatio);
	dirty =
		cache.prepare(
			{
				bounds: camera.bounds(rect.width, rect.height, pad),
				level: detail.level,
				settling: detail.settling,
			},
			active,
		) || dirty;
	cacheMetrics();
	metrics.backlog += Number(detail.settling);
}

function draw() {
	const drawStart = performance.now();
	const rect = canvas.getBoundingClientRect(),
		dpr = devicePixelRatio;
	const w = Math.round(rect.width * dpr),
		h = Math.round(rect.height * dpr);
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w;
		canvas.height = h;
	}
	gpuTimings.beginFrame();
	gpuTimings.begin("cache");
	coverageRenderer.begin(w, h);
	paperBackground.stats.draws = 0;
	sparseCoverage.resetStats();
	gpu.useProgram(program);
	gpu.uniform2f(viewportLoc, rect.width, rect.height);
	gpu.uniform2f(deviceViewportLoc, w, h);
	gpu.uniform1i(atlasRoutesLoc, 1);
	pencilGrain.bind();
	gpu.uniform1i(pencilGrainLoc, 2);
	gpu.uniform1i(pencilParticlesLoc, 3);
	gpu.uniform1i(routeCountLoc, 0);
	gpu.uniform1f(rasterHeightLoc, h);
	gpu.uniform3f(cameraLoc, camera.cx, camera.cy, camera.zoom);
	gpu.uniform1f(pixelWorldLoc, 1 / (camera.zoom * dpr));
	gpu.uniform2f(
		rotationLoc,
		Math.cos(camera.rotation),
		Math.sin(camera.rotation),
	);
	cache.resetDrawStats();
	const completePlan = cache.planDraw(1 / (camera.zoom * dpr));
	// A translucent stroke on the frontmost visible layer can composite over
	// exact cached completed pixels. Opaque union and middle-layer cases retain
	// the full painter-ordered path, including all upper-layer ink.
	const activeRank = active === null ? -1 : core.stroke_layer_rank(active);
	let overlay =
		liveOverlayEnabled &&
		active !== null &&
		(core.opacity(active) < 1 || core.brush(active) !== 0);
	for (let rank = activeRank + 1; overlay && rank < core.layer_count(); rank++)
		if (core.layer_visible(core.layer_at(rank))) overlay = false;
	const partition = (live: boolean): DrawPlan => {
		const records: DrawPlan["records"] = [],
			groups: DrawPlan["groups"] = [];
		for (const group of completePlan.groups) {
			const start = records.length;
			for (let i = group.start; i < group.end; i++)
				if ((completePlan.records[i].id === active) === live)
					records.push(completePlan.records[i]);
			if (records.length > start)
				groups.push({ ...group, start, end: records.length });
		}
		return { records, groups };
	};
	const plan = overlay ? partition(false) : completePlan;
	const livePlan = overlay ? partition(true) : null;
	const compositeView = {
		width: w,
		height: h,
		contentVersion: `${cache.stats.geometryBuilds}:${layerRenderRevision}:${overlay ? active : "full"}`,
		cssWidth: rect.width,
		cssHeight: rect.height,
		dpr,
		...camera.state(),
	};
	const frame = compositeCache.prepare(compositeView, plan.records, camera);
	gpuTimings.end();
	const deviceBounds = camera.deviceBoundsProjector(
		w / rect.width,
		h / rect.height,
	);

	const drawInstances = (
		buffer: WebGLBuffer,
		offset: number,
		count: number,
		divisor = 1,
	) => {
		gpu.bindBuffer(gpu.ARRAY_BUFFER, buffer);
		for (let k = 0; k < 2; k++) {
			gpu.enableVertexAttribArray(k);
			gpu.vertexAttribPointer(
				k,
				3,
				gpu.FLOAT,
				false,
				INSTANCE_BYTES,
				offset * INSTANCE_BYTES + k * 12,
			);
			gpu.vertexAttribDivisor(k, divisor);
		}
		gpu.enableVertexAttribArray(2);
		gpu.vertexAttribPointer(
			2,
			4,
			gpu.UNSIGNED_BYTE,
			true,
			INSTANCE_BYTES,
			offset * INSTANCE_BYTES + 24,
		);
		gpu.vertexAttribDivisor(2, divisor);
		gpu.enableVertexAttribArray(3);
		gpu.vertexAttribPointer(
			3,
			4,
			gpu.UNSIGNED_BYTE,
			true,
			INSTANCE_BYTES,
			offset * INSTANCE_BYTES + 28,
		);
		gpu.vertexAttribDivisor(3, divisor);
		gpu.drawArraysInstanced(gpu.TRIANGLES, 0, 6, count);
	};
	const regions = frame?.regions ?? [[0, 0, w, h] as Bounds];
	const atlasInstancesPerRegion = Math.max(
		1,
		Math.floor(ATLAS_FRAME_INSTANCE_BUDGET / Math.max(1, regions.length)),
	);
	const atlasWorkPerRegion = Math.max(
		1,
		Math.floor(524288 / Math.max(1, regions.length)),
	);
	const atlasRouteWorkPerRegion = Math.max(
		1,
		Math.floor(2097152 / Math.max(1, regions.length)),
	);
	const projectedSpan: Bounds = [0, 0, 0, 0];
	const projectedRecord: Bounds = [0, 0, 0, 0];
	const capsuleBounds = camera.capsuleBoundsProjector(
		w / rect.width,
		h / rect.height,
		2 / (camera.zoom * dpr),
		camera.zoom * dpr >= 12 && w * h >= 2_000_000,
		projectionReuse,
	);
	for (const region of regions) {
		// After global grouping: culling cannot merge opaque coverage unions.
		const visibleBounds = (bounds: Bounds) => {
			const b = deviceBounds(bounds, 0, projectedRecord);
			return (
				b[2] >= region[0] &&
				b[0] <= region[2] &&
				b[3] >= region[1] &&
				b[1] <= region[3]
			);
		};
		if (frame) coverageRenderer.setRegion(frame.framebuffer, region);
		paperBackground.draw(
			{ texture: selectedPaper(), grid: selectedGrid() },
			camera,
			w,
			h,
			rect.width,
			rect.height,
			frame?.framebuffer ?? null,
			region,
		);
		const corners = [
			camera.screenToWorld(
				(region[0] * rect.width) / w,
				(region[1] * rect.height) / h,
			),
			camera.screenToWorld(
				(region[2] * rect.width) / w,
				(region[1] * rect.height) / h,
			),
			camera.screenToWorld(
				(region[0] * rect.width) / w,
				(region[3] * rect.height) / h,
			),
			camera.screenToWorld(
				(region[2] * rect.width) / w,
				(region[3] * rect.height) / h,
			),
		];
		const worldClip: Bounds = [
			Math.min(...corners.map((p) => p[0])),
			Math.min(...corners.map((p) => p[1])),
			Math.max(...corners.map((p) => p[0])),
			Math.max(...corners.map((p) => p[1])),
		];

		const drawRegular = (plan: DrawPlan) => {
			const drawLegacy = (group?: number) =>
				cache.drawPlan(
					group === undefined
						? plan
						: { records: plan.records, groups: [plan.groups[group]] },
					drawInstances,
					(bounds) => {
						coverageRenderer.startRun(deviceBounds(bounds));
						gpu.useProgram(program);
						gpu.uniform1i(routeCountLoc, 0);
						gpu.uniform1f(rasterHeightLoc, h);
					},
					() => coverageRenderer.finishRun(),
					worldClip,
					visibleBounds,
				);
			if (sparseEnabled && plan.groups.length > 1) {
				const pad = 2 / (camera.zoom * dpr);
				const steps = planSparseAtlas(
					plan,
					(b) => deviceBounds(b, pad, projectedSpan),
					region,
					{
						hierarchical: hierarchicalPlanning,
						reuseRectangles: routeReuse,
						visibleBounds,
						spanIntersects:
							camera.zoom * dpr >= 12 && w * h >= 2_000_000
								? capsuleBounds.intersects
								: undefined,
						spanBounds:
							metrics.zoomSettling && camera.zoom * dpr < 4
								? undefined
								: (record, first, count, out) =>
										capsuleBounds(
											record.entry.capsules!,
											first,
											count,
											out,
											record.entry.capsuleStride,
										),
						maxWork: atlasWorkPerRegion,
						maxRouteWork: atlasRouteWorkPerRegion,
						maxTotalInstances: atlasInstancesPerRegion,
					},
				);
				// Reject expensive plans before allocating or submitting atlas resources.
				if (
					!steps.some((step) => step.kind === "atlas") ||
					!sparseCoverage.available()
				) {
					drawLegacy();
					return;
				}
				for (const step of steps) {
					if (step.kind === "legacy") drawLegacy(step.group);
					else
						sparseCoverage.render(
							step,
							frame?.framebuffer ?? null,
							region,
							w,
							h,
							(routed, base) => {
								const { record, routeCount, spanSize, first, count } = routed;
								gpu.useProgram(program);
								gpu.uniform1i(routeCountLoc, routeCount);
								gpu.uniform1i(routeSpanLoc, spanSize);
								gpu.uniform1i(routeBaseLoc, base);
								gpu.uniform1f(rasterHeightLoc, ATLAS_SIZE);
								const slot = record.entry.allocation;
								const instances = count * routeCount;
								drawInstances(
									slot.buffer,
									slot.offset + first,
									instances,
									routeCount,
								);
								cache.markDrawn(record, instances);
							},
						);
				}
			} else drawLegacy();
		};
		drawRegular(plan);
	}
	coverageRenderer.end();
	if (frame) {
		gpuTimings.begin("cache");
		compositeCache.present();
		gpuTimings.end();
	}
	if (livePlan?.records.length) {
		coverageRenderer.setTarget(null);
		cache.drawPlan(
			livePlan,
			drawInstances,
			(bounds) => {
				coverageRenderer.startRun(deviceBounds(bounds));
				gpu.useProgram(program);
				gpu.uniform1i(routeCountLoc, 0);
				gpu.uniform1f(rasterHeightLoc, h);
			},
			() => coverageRenderer.finishRun(),
		);
		coverageRenderer.end();
	}
	cacheMetrics();
	metrics.backlog += Number(metrics.zoomSettling);

	if (inputAt) {
		record(metrics.submissionDelayMs, performance.now() - inputAt);
		inputAt = 0;
	}
	record(metrics.renderMs, performance.now() - drawStart);
	if (panAt) {
		record(metrics.panSubmissionMs, performance.now() - panAt);
		panAt = 0;
	}
	dirty = false;
}
let error = "";
function frame() {
	pressureControls.render();
	if (!lost) {
		const t = performance.now();
		let drew = false;
		try {
			gpuTimings.poll();
			// A late GPU can drain without blocking input or discarding samples.
			// Validate only when the latest submitted frame has completed.
			if (cache.beginFrame()) {
				prepare();
				if (dirty) {
					drew = true;
					draw();
				}
				error = "";
			}
		} catch (e) {
			error = String(e);
		} finally {
			gpuTimings.endFrame();
			try {
				cache.endFrame(drew);
			} catch (e) {
				error = String(e);
			}
		}
		record(metrics.frameMs, performance.now() - t);
	}
	selection.render(tool === "select");
	slice.render(tool === "slice" && !space && !rotateHeld, gesture === "slice");
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(() => {
	status.textContent =
		error ||
		cache.warning ||
		`${Math.round(camera.zoom * 100)}% · ${metrics.accepted.toLocaleString()} samples · ${metrics.backlog} chunks pending · ${(metrics.gpuBytes / 1048576).toFixed(1)} MB geometry · ${(metrics.coverageBytes / 1048576).toFixed(1)} MB coverage · ${(metrics.compositeCacheBytes / 1048576).toFixed(1)} MB region cache · Antialiased · Rust/Wasm + WebGL2`;
}, 250);
let lastSampleX = 0,
	lastSampleY = 0,
	lastPressure = 1;
function sample(e: PointerEvent) {
	const r = canvas.getBoundingClientRect();
	const [x, y] = camera.screenToWorld(e.clientX - r.left, e.clientY - r.top);
	core.push(x, y, e.pointerType === "pen" ? e.pressure : 1);
	metrics.accepted++;
	lastSampleX = e.clientX;
	lastSampleY = e.clientY;
	lastPressure = e.pointerType === "pen" ? e.pressure : 1;
	pressureControls.receive(e.pointerType === "pen" ? e.pressure : null);
	if (active !== null) cache.note(active);
}
function cancel() {
	const releasedPointer = pointer;
	pointer = null;
	slice.cancel();
	selection.cancel();
	pressureControls.receive(null);
	core.cancel();
	cache.historyChanged();
	active = null;
	gesture = null;
	rotationDrag = null;
	updateCursor();
	dirty = true;
	releasePointer(canvas, releasedPointer);
}
canvas.addEventListener("pointerdown", (e) => {
	if (lost || pointer !== null || e.button !== 0) return;
	e.preventDefault();
	canvas.focus();
	if (!space && !rotateHeld && tool === "draw" && !core.can_draw()) return;
	if (!tryCapturePointer(canvas, e.pointerId)) return;
	pointer = e.pointerId;
	lastX = e.clientX;
	lastY = e.clientY;
	gesture = space ? "pan" : rotateHeld ? "rotate" : tool;
	updateCursor();
	if (gesture === "rotate") {
		const rect = canvas.getBoundingClientRect();
		rotationDrag = {
			x: rect.width / 2,
			y: rect.height / 2,
			pointerAngle: null,
			angle: camera.rotation,
		};
		rotate(e);
	}
	if (gesture === "select") selection.down(e);
	if (gesture === "slice") slice.down(e);
	if (gesture === "draw") {
		zoomDetail.settle(camera.zoom * devicePixelRatio);
		const response = pressureControls.settings();
		const width = Number(
			(document.querySelector("#width") as HTMLInputElement).value,
		);
		const color = Number.parseInt(
			(document.querySelector("#color") as HTMLInputElement).value.slice(1),
			16,
		);
		// The choice is frozen only for this new stroke. Keep incoming pressure
		// intact in both modes; completed strokes never change their style.
		active = document.querySelector<HTMLInputElement>("#fixed-width")!.checked
			? core.begin_fixed_width(width, color, Number(opacityInput.value) / 100)
			: core.begin_with_style(
					width,
					color,
					response.minimum,
					response.gamma,
					Number(opacityInput.value) / 100,
				);
		core.set_active_brush(Number(brushInput.value));
		cache.note(active);
		sample(e);
		inputAt = performance.now();
	}
	dirty = true;
});
canvas.addEventListener("pointermove", (e) => {
	if (pointer === null && tool === "slice") slice.hover(e);
	if (e.pointerId !== pointer) return;
	const t = performance.now();
	if (gesture === "pan") {
		panAt ||= t;
		camera.cx += e.clientX - lastX;
		camera.cy += e.clientY - lastY;
		lastX = e.clientX;
		lastY = e.clientY;
	} else if (gesture === "rotate") {
		rotate(e);
	} else if (gesture === "slice") {
		slice.move(e);
		return;
	} else if (gesture === "select") {
		const moved = selection.move(e);
		updateCursor();
		if (!moved) return;
	} else if (gesture === "draw") {
		for (const s of e.getCoalescedEvents?.().length
			? e.getCoalescedEvents()
			: [e])
			sample(s);
	}
	inputAt ||= t;
	dirty = true;
	record(metrics.inputMs, performance.now() - t);
});
canvas.addEventListener("pointerup", (e) => {
	if (e.pointerId !== pointer) return;
	pressureControls.receive(null);
	if (gesture === "draw") {
		// Preserve a changed release position with the last valid pressure.
		if (e.clientX !== lastSampleX || e.clientY !== lastSampleY) {
			const r = canvas.getBoundingClientRect();
			const [x, y] = camera.screenToWorld(
				e.clientX - r.left,
				e.clientY - r.top,
			);
			core.push(x, y, lastPressure);
			metrics.accepted++;
			if (active !== null) cache.note(active);
		}
		core.commit();
		cache.historyChanged();
	}
	if (gesture === "select") selection.up(e);
	if (gesture === "slice") slice.up(e);
	if (gesture === "rotate") rotate(e);
	active = null;
	gesture = null;
	rotationDrag = null;
	pointer = null;
	updateCursor();
	dirty = true;
	releasePointer(canvas, e.pointerId);
});
canvas.addEventListener("pointercancel", (e) => {
	if (e.pointerId === pointer) cancel();
});
canvas.addEventListener("lostpointercapture", (e) => {
	if (e.pointerId === pointer && !canvas.hasPointerCapture(e.pointerId))
		cancel();
});
window.addEventListener("blur", () => {
	space = rotateHeld = false;
	cancel();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		space = rotateHeld = false;
		cancel();
	}
});
canvas.addEventListener(
	"wheel",
	(e) => {
		e.preventDefault();
		if (gesture) return;
		const r = canvas.getBoundingClientRect(),
			x = e.clientX - r.left,
			y = e.clientY - r.top;
		const next = Math.min(
			16,
			Math.max(
				0.05,
				camera.zoom *
					Math.exp(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * 0.001),
			),
		);
		if (next !== camera.zoom) zoomDetail.noteZoom(performance.now());
		camera.zoomAt(next, x, y);
		dirty = true;
		inputAt ||= performance.now();
	},
	{ passive: false },
);
function history(redo: boolean) {
	cancel();
	const t = performance.now();
	if (redo) core.redo();
	else core.undo();
	cache.historyChanged();
	record(metrics.historyMs, performance.now() - t);
	dirty = true;
}
window.addEventListener("keydown", (e) => {
	if (e.defaultPrevented || e.isComposing) return;
	if (e.key === "Escape") {
		space = rotateHeld = false;
		cancel();
		selection.clear();
		return;
	}
	if (
		e.target instanceof HTMLElement &&
		(e.target.isContentEditable ||
			e.target.closest("input, textarea, select, [role='textbox']"))
	)
		return;
	if (
		tool === "select" &&
		(e.key === "Delete" || e.key === "Backspace") &&
		!e.metaKey &&
		!e.ctrlKey &&
		!e.altKey
	) {
		e.preventDefault();
		if (!e.repeat) {
			cancel();
			selection.remove();
		}
		return;
	}
	if (e.code === "KeyS" && !e.metaKey && !e.ctrlKey && !e.altKey) {
		e.preventDefault();
		document.querySelector<HTMLButtonElement>("#slice")!.click();
	}
	if (e.code === "KeyV" && !e.metaKey && !e.ctrlKey && !e.altKey) {
		e.preventDefault();
		document.querySelector<HTMLButtonElement>("#select")!.click();
	}
	if (e.code === "Space") {
		e.preventDefault();
		space = true;
		updateCursor();
	}
	if (e.code === "KeyR" && !e.metaKey && !e.ctrlKey && !e.altKey) {
		e.preventDefault();
		rotateHeld = true;
		updateCursor();
	}
	if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
		e.preventDefault();
		history(e.shiftKey);
	}
});
window.addEventListener("keyup", (e) => {
	if (e.code === "Space") space = false;
	if (e.code === "KeyR") rotateHeld = false;
	updateCursor();
});
for (const mode of ["pen", "select", "slice", "pan", "rotate"])
	document.querySelector(`#${mode}`)!.addEventListener("click", () => {
		cancel();
		tool = mode === "pen" ? "draw" : (mode as Tool);
		for (const id of ["pen", "select", "slice", "pan", "rotate"])
			document
				.querySelector(`#${id}`)!
				.setAttribute("aria-pressed", String(id === mode));
		updateCursor();
	});
rotationReset.addEventListener("click", () => {
	cancel();
	const rect = canvas.getBoundingClientRect();
	camera.rotateAt(0, rect.width / 2, rect.height / 2);
	updateRotation();
});
document
	.querySelector("#undo")!
	.addEventListener("click", () => history(false));
document.querySelector("#redo")!.addEventListener("click", () => history(true));
document.querySelector("#reset")!.addEventListener("click", () => {
	cancel();
	camera.reset();
	updateRotation();
	zoomDetail.settle(devicePixelRatio);
	dirty = true;
});
const brushInput = document.querySelector<HTMLSelectElement>("#brush")!;
const brushWidths = [6, 3, 12];
let previousBrush = 0;
brushInput.addEventListener("change", () => {
	const width = document.querySelector<HTMLInputElement>("#width")!;
	brushWidths[previousBrush] = Number(width.value);
	previousBrush = Number(brushInput.value);
	width.value = String(brushWidths[previousBrush] ?? 6);
	width.dispatchEvent(new Event("input"));
	document.querySelector<HTMLButtonElement>("#pen")!.click();
});
document.querySelector("#width")!.addEventListener("input", (e) => {
	document.querySelector("#widthValue")!.textContent = (
		e.target as HTMLInputElement
	).value;
});
new ResizeObserver(() => {
	dirty = true;
}).observe(canvas);
canvas.addEventListener("webglcontextlost", (e) => {
	e.preventDefault();
	lost = true;
	// A GPU failure is not a user cancellation: preserve the accepted transaction.
	core.commit();
	active = null;
	cancel();
	error =
		"GPU context lost. Accepted drawing data remains in memory; waiting for restoration.";
});
canvas.addEventListener("webglcontextrestored", () => {
	const timingSettings = gpuTimings.snapshot();
	gpuTimings.dispose();
	gpuTimings = new GpuPassTimers(gpu);
	gpuTimings.configure(
		timingSettings.enabled,
		timingSettings.sampleEvery,
		timingSettings.mode,
	);
	paperBackground = new PaperBackground(gpu);
	pencilGrain = new PencilGrain(gpu);
	program = createProgram();
	pencilGrainLoc = loc("pencilGrain");
	pencilParticlesLoc = loc("pencilParticles");
	coverageRenderer = new CoverageRenderer(gpu, reportGpuError, gpuTimings);
	compositeCache = new CompositeCache(gpu, reportGpuError);
	sparseCoverage = new SparseCoverage(
		gpu,
		reportGpuError,
		noteGpuMutation,
		gpuTimings,
	);
	cameraLoc = loc("camera");
	viewportLoc = loc("viewport");
	rotationLoc = loc("rotation");
	pixelWorldLoc = loc("pixelWorld");
	deviceViewportLoc = loc("deviceViewport");
	rasterHeightLoc = loc("rasterHeight");
	routeCountLoc = loc("routeCount");
	routeBaseLoc = loc("routeBase");
	routeSpanLoc = loc("routeSpan");
	atlasRoutesLoc = loc("atlasRoutes");
	cache.contextLost();
	lost = false;
	dirty = true;
	error = "";
});
Object.assign(window, {
	lab: {
		metrics,
		brushStats: () => ({ textureBytes: pencilGrain.textureBytes }),
		backgroundStats: () => ({
			...paperBackground.stats,
			texture: selectedPaper(),
			grid: selectedGrid(),
		}),
		gpuTimings: () => gpuTimings.snapshot(),
		setGpuTimings: (
			enabled: boolean,
			every = 30,
			mode: "sample" | "all" = "sample",
		) => {
			gpuTimings.configure(enabled, every, mode);
			dirty = true;
		},
		core,
		selection: () => selection.ids(),
		layers,
		view: () => camera.state(),
		prepared: () => cache.size,
		cacheState: () => cache.state(),
		samples: () => gpu.getParameter(gpu.SAMPLES),
		setCacheLimit: (n: number) => cache.setLimit(n),
		setCompositeCaching: (enabled: boolean) => {
			compositeCache.setEnabled(enabled);
			dirty = true;
		},
		setCompositeCacheLimit: (bytes: number) => {
			compositeCache.setLimit(bytes);
			dirty = true;
		},
		renderPending: () =>
			lost || dirty || metrics.backlog > 0 || cache.framePending,
		requestRedraw: () => {
			dirty = true;
		},
		setHierarchicalPlanning: (enabled: boolean) => {
			hierarchicalPlanning = enabled;
			compositeCache.invalidate();
			dirty = true;
		},
		setProjectionReuse: (enabled: boolean) => {
			projectionReuse = enabled;
			compositeCache.invalidate();
			dirty = true;
		},
		setRouteReuse: (enabled: boolean) => {
			routeReuse = enabled;
			compositeCache.invalidate();
			dirty = true;
		},
		setSparseCoverage: (enabled: boolean) => {
			sparseEnabled = enabled;
			compositeCache.invalidate();
			dirty = true;
		},
		setPersistentTiles: (enabled: boolean) => {
			compositeCache.setPersistentTiles(enabled);
			dirty = true;
		},
		setLiveOverlay: (enabled: boolean) => {
			liveOverlayEnabled = enabled;
			compositeCache.invalidate();
			dirty = true;
		},
		setBackgroundPreparation: (enabled: boolean) =>
			cache.setBackgroundPreparation(enabled),
		setBatching: (enabled: boolean) => {
			cache.setBatching(enabled);
			compositeCache.invalidate();
			dirty = true;
		},
	},
});
status.textContent = "Ready · drawings are not saved";
