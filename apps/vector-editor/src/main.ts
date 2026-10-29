import { preparePaperContact, materialPreparation } from "./paper-contact-preparation";
import "./style.css";
import { buildGpuResources, installGpuRecovery } from "./gpu-restore";
import { installStatusAnnouncements } from "./status-announcements";
import { installEditorSession } from "../../web/src/editor-session";
import { t as hostMessage } from "../../web/src/locale";
import { installHostTheme } from "./host-theme";
import { installHostLocale } from "./host-locale";
import { showStartupFailure } from "./startup-failure";
import { Camera } from "./camera";
import { createRegionalAddressAdapter } from "./regional-address";
import { CompositeCache } from "./composite-cache";
import { loadCore } from "./load-core";
import { CoverageRenderer } from "./coverage-renderer";
import { type Bounds, type DrawPlan, GeometryCache } from "./geometry-cache";
import { INSTANCE_BYTES } from "./gpu-arena";
import { GpuPassTimers } from "./gpu-pass-timers";
import { createInkProgram } from "./ink-program";
import { createLayers } from "./layers";
import {
	type GridStyle,
	PaperBackground,
	type PaperStyle,
} from "./paper-background";
import { PencilGrain } from "./pencil-grain";
import { releasePointer, tryCapturePointer } from "./pointer-capture";
import { createBrushControls } from "./brush-controls";
import { PointerSamples } from "./pointer-samples";
import { PointerRelease } from "./pointer-release";
import { InputDiagnostics } from "./input-diagnostics";
import { installKeyboardInput } from "./keyboard-input";
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
const announceStatus = installStatusAnnouncements(status);
const brushControls = createBrushControls();
void preparePaperContact();
const core = await loadCore().catch((error: unknown) => {
	showStartupFailure(status);
	throw error;
});
let runtimeFailure = "";
let startupComplete = false;
window.addEventListener("error", (e) => {
	if (!startupComplete) { showStartupFailure(status); return; }
	runtimeFailure = e.message;
	status.textContent = hostMessage("vector.engineFailure", {detail: runtimeFailure});
});
const gl = canvas.getContext("webgl2", {
	alpha: false,
	antialias: true,
	preserveDrawingBuffer: false,
});
if (!gl)
	throw new Error("WebGL2 is required; please use a browser with GPU support.");
const gpu = gl;
const camera = new Camera(core);
const cache = new GeometryCache(gpu, core, () => [camera.regionX, camera.regionY]);
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
let ink: ReturnType<typeof createInkProgram>;
try {
	ink = createInkProgram(gpu);
} catch (error) {
	showStartupFailure(status);
	throw error;
}
type Tool = "draw" | "select" | "slice" | "pan" | "rotate";
const selection = createSelection(core, cache, camera, canvas, failure => { runtimeFailure = String(failure); cancel(); });
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
let originRevision = camera.originRevision;
function prepare() {
	if (gesture === null || gesture === "pan" || gesture === "rotate") camera.rebase();
	if (originRevision !== camera.originRevision) {
		cache.syncTransforms();
		compositeCache.invalidate();
		originRevision = camera.originRevision;
		dirty = true;
	}
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
	gpu.useProgram(ink.program);
	gpu.uniform2f(ink.viewport, rect.width, rect.height);
	gpu.uniform2f(ink.deviceViewport, w, h);
	gpu.uniform1i(ink.atlasRoutes, 1);

	gpu.uniform1i(ink.pencilGrain, 2);
	gpu.uniform1i(ink.pencilParticles, 3);
	gpu.uniform1i(ink.routeCount, 0);
	gpu.uniform1f(ink.rasterHeight, h);
	gpu.uniform3f(ink.camera, camera.cx, camera.cy, camera.zoom);
	gpu.uniform1f(ink.pixelWorld, 1 / (camera.zoom * dpr));
	gpu.uniform2f(
		ink.rotation,
		Math.cos(camera.rotation),
		Math.sin(camera.rotation),
	);
	cache.resetDrawStats();
	const completePlan = cache.planDraw(1 / (camera.zoom * dpr));
  pencilGrain.bind(completePlan.records.some(record => (record.brush ?? 0) !== 0));
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
	const scenePlan = overlay ? partition(false) : completePlan;
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
	const compositeFrame = compositeCache.prepare(compositeView, scenePlan.records, camera);
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
	const regions = compositeFrame?.regions ?? [[0, 0, w, h] as Bounds];
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
		if (compositeFrame) coverageRenderer.setRegion(compositeFrame.framebuffer, region);
		paperBackground.draw(
			{ texture: selectedPaper(), grid: selectedGrid() },
			camera,
			w,
			h,
			rect.width,
			rect.height,
			compositeFrame?.framebuffer ?? null,
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
						gpu.useProgram(ink.program);
						gpu.uniform1i(ink.routeCount, 0);
						gpu.uniform1f(ink.rasterHeight, h);
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
								: (geometryRecord, first, count, out) =>
										capsuleBounds(
											geometryRecord.entry.capsules!,
											first,
											count,
											out,
											geometryRecord.entry.capsuleStride,
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
							compositeFrame?.framebuffer ?? null,
							region,
							w,
							h,
							(routed, base) => {
								const { record: geometryRecord, routeCount, spanSize, first, count } = routed;
								gpu.useProgram(ink.program);
								gpu.uniform1i(ink.routeCount, routeCount);
								gpu.uniform1i(ink.routeSpan, spanSize);
								gpu.uniform1i(ink.routeBase, base);
								gpu.uniform1f(ink.rasterHeight, ATLAS_SIZE);
								const slot = geometryRecord.entry.allocation;
								const instances = count * routeCount;
								drawInstances(
									slot.buffer,
									slot.offset + first,
									instances,
									routeCount,
								);
								cache.markDrawn(geometryRecord, instances);
							},
						);
				}
			} else drawLegacy();
		};
		drawRegular(scenePlan);
	}
	coverageRenderer.end();
	if (compositeFrame) {
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
				gpu.useProgram(ink.program);
				gpu.uniform1i(ink.routeCount, 0);
				gpu.uniform1f(ink.rasterHeight, h);
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
	brushControls.render();
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
	try {
		selection.render(tool === "select");
		slice.render(tool === "slice" && !space && !rotateHeld, gesture === "slice");
	} catch (e) {
		error = String(e);
	}
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(() => {
	const failure = runtimeFailure || error;
	announceStatus(failure ? hostMessage("vector.engineFailure", {detail: failure}) : cache.warning || "");
	status.textContent = failure ? hostMessage("vector.engineFailure", {detail: failure}) :
		cache.warning ||
		`${Math.round(camera.zoom * 100)}% · ${metrics.accepted.toLocaleString()} samples · ${metrics.backlog} chunks pending · ${(metrics.gpuBytes / 1048576).toFixed(1)} MB geometry · ${(metrics.coverageBytes / 1048576).toFixed(1)} MB coverage · ${(metrics.compositeCacheBytes / 1048576).toFixed(1)} MB region cache · Antialiased · Rust/Wasm + WebGL2`;
}, 250);
const pointerRelease = new PointerRelease();
const inputDiagnostics = new InputDiagnostics();
const pointerSamples = new PointerSamples(canvas, (x, y, pressure) => {
    if (camera.appendSample(x, y, pressure)) metrics.accepted++;
    else runtimeFailure = "Input position or pressure is outside the supported range; existing accepted samples are retained.";
    if (active !== null) cache.note(active);
}, (pressure) => brushControls.receive(pressure));
function cancel(reason = "interaction-cancelled") {
	if (pointer !== null) inputDiagnostics.note("cancel", undefined, active === null ? undefined : core.raw_length(active), reason);
	pointerRelease.clear();
	const releasedPointer = pointer;
	pointer = null;
	slice.cancel();
	selection.cancel();
	brushControls.receive(null);
	core.cancel();
	cache.historyChanged();
	active = null;
	gesture = null;
	rotationDrag = null;
	updateCursor();
	dirty = true;
	releasePointer(canvas, releasedPointer);
}
function selectionInput(action: () => void): boolean {
	try {
		action();
		return true;
	} catch (failure) {
		runtimeFailure = String(failure);
		cancel();
		return false;
	}
}
canvas.addEventListener("pointerdown", (e) => {
	if (pointerRelease.pending) cancel("new-contact-before-release");
	if (lost || pointer !== null || e.button !== 0) return;
	e.preventDefault();
	canvas.focus();
	if (!space && !rotateHeld && tool === "draw" && !core.can_draw()) return;
	if (!tryCapturePointer(canvas, e.pointerId)) return;
	selection.cancelQuery();
	pointer = e.pointerId;
	pointerRelease.begin(e);
	inputDiagnostics.note("begin", e);
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
	if (gesture === "select" && !selectionInput(() => selection.down(e))) return;
	if (gesture === "slice") slice.down(e);
	if (gesture === "draw") {
		zoomDetail.settle(camera.zoom * devicePixelRatio);
		const settings = brushControls.read();
		// Rust freezes style for this new stroke; accepted pressure stays intact.
		active = settings.fixedWidth
			? core.begin_fixed_width(settings.width, settings.color, settings.opacity)
			: core.begin_with_style(
					settings.width,
					settings.color,
					settings.minimum,
					settings.gamma,
					settings.opacity,
				);
		core.set_active_brush(settings.brush);
		cache.note(active);
		pointerSamples.sample(e);
		inputAt = performance.now();
	}
	dirty = true;
});
canvas.addEventListener("pointermove", (e) => {
	if (pointer === null && tool === "slice") slice.hover(e);
	if (e.pointerId !== pointer || !pointerRelease.matches(e)) return;
	if (pointerRelease.pending) {
		if (e.buttons !== 0) cancel("pressed-move-after-release-pending");
		return;
	}
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
		let moved = false;
		if (!selectionInput(() => { moved = selection.move(e); })) return;
		updateCursor();
		if (!moved) return;
	} else if (gesture === "draw") {
		pointerSamples.move(e);
	}
	inputAt ||= t;
	dirty = true;
	record(metrics.inputMs, performance.now() - t);
});
function finishPointer(e: PointerEvent) {
	if (e.pointerId !== pointer || !pointerRelease.canRelease(e)) return;
	inputDiagnostics.note("release", e, active === null ? undefined : core.raw_length(active));
	brushControls.receive(null);
	if (gesture === "draw") {
		pointerSamples.release(e);
		core.commit();
		inputDiagnostics.note("commit", e, active === null ? undefined : core.raw_length(active));
		cache.historyChanged();
	}
	if (gesture === "select" && !selectionInput(() => selection.up(e))) return;
	if (gesture === "slice") slice.up(e);
	if (gesture === "rotate") rotate(e);
	active = null;
	gesture = null;
	rotationDrag = null;
	pointer = null;
	updateCursor();
	dirty = true;
	pointerRelease.clear();
	releasePointer(canvas, e.pointerId);
}
canvas.addEventListener("pointerup", finishPointer);
canvas.addEventListener("pointercancel", (e) => {
	if (pointerRelease.matches(e)) cancel("pointer-cancel");
});
canvas.addEventListener("lostpointercapture", (e) => {
	if (!pointerRelease.matches(e) || canvas.hasPointerCapture(e.pointerId)) return;
	inputDiagnostics.note("capture-loss", e);
	if (gesture === "draw" && pointerRelease.defer(e)) {
		inputDiagnostics.note("release-pending", e, active === null ? undefined : core.raw_length(active));
	} else cancel("capture-loss-during-contact");
});
// Capture is gone: the matching release may target another element in this document.
for (const kind of ["pointerup", "pointercancel", "pointerdown", "pointermove", "gotpointercapture"] as const) {
  document.addEventListener(kind, (event) => {
    if (!pointerRelease.pending) return;
    if (kind === "pointerdown") { cancel("new-contact-before-release"); return; }
    if (!pointerRelease.matches(event)) return;
    if (kind === "pointerup") finishPointer(event);
    else if (kind === "pointercancel" || kind === "gotpointercapture" || event.buttons !== 0)
      cancel(`pending-${kind}`);
  }, true);
}
function suspendInput() {
	space = rotateHeld = false;
	cancel("session-blur-or-hidden");
}
installEditorSession(suspendInput);
window.addEventListener("blur", suspendInput);
document.addEventListener("visibilitychange", () => {
	if (document.hidden) suspendInput();
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
installKeyboardInput({
	selectionToolActive: () => tool === "select",
	escape() {
		space = rotateHeld = false;
		cancel();
		selection.clear();
	},
	deleteSelection() {
		cancel();
		selection.remove();
	},
	setPanHeld(held) { space = held; },
	setRotationHeld(held) { rotateHeld = held; },
	updateCursor,
	history,
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
brushControls.connectTools();
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
installGpuRecovery(canvas, () => {
  const timingSettings = gpuTimings.snapshot();
  const resources = buildGpuResources(gpu, () => {
    const timers = new GpuPassTimers(gpu);
    timers.configure(timingSettings.enabled, timingSettings.sampleEvery, timingSettings.mode);
    return {
      timers,
      paper: new PaperBackground(gpu),
      pencil: new PencilGrain(gpu),
      ink: createInkProgram(gpu),
      coverage: new CoverageRenderer(gpu, reportGpuError, timers),
      composite: new CompositeCache(gpu, reportGpuError),
      sparse: new SparseCoverage(gpu, reportGpuError, noteGpuMutation, timers),
    };
  });
  gpuTimings.dispose();
  gpuTimings = resources.timers;
  paperBackground = resources.paper;
  pencilGrain = resources.pencil;
  ink = resources.ink;
  coverageRenderer = resources.coverage;
  compositeCache = resources.composite;
  sparseCoverage = resources.sparse;
  cache.contextLost();
  lost = false;
  dirty = true;
  error = "";
}, (message) => { error = message; });

Object.assign(window, {
	lab: {
		metrics,
		inputDiagnostics: () => inputDiagnostics.snapshot(),
		downloadInputDiagnostics: () => inputDiagnostics.download(),
		brushStats: () => ({ textureBytes: pencilGrain.textureBytes, materialPreparation: { ...materialPreparation } }),
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
		// Checked regional boundary diagnostics; view-origin adoption remains pending.
		regional: createRegionalAddressAdapter(core),
		selection: () => selection.ids(),
    lassoWorker: () => ({...selection.queryStats}),
		layers,
		view: () => camera.state(),
		viewOrigin: () => [String(camera.regionX), String(camera.regionY)],
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

startupComplete = true;
