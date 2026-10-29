import { readGeometry, readGeometryBounds, type GeometryData } from "./derived-geometry";
import type { Core } from "./core";
import { GeometryPreparer } from "./geometry-preparer";
import { type Allocation, GpuArena, INSTANCE_BYTES } from "./gpu-arena";
import { type LassoPoint, LassoRegion } from "./lasso";
import { capsuleDistance } from "./stroke-hit";
import {
	inversePoint,
	readTransform,
	type StrokeTransform,
	transformBounds,
	transformCapsules,
	transformedDetailLevel,
	transformPoint,
	transformScale,
} from "./stroke-transform";
export const RAW_CHUNK = 128;
export const COVERAGE_SPAN = 2;
export const COVERAGE_BLOCK_ROWS = 16;
export type Bounds = [number, number, number, number];
export type CoverageSpans = Float64Array | { bounds: Bounds }[];
export type View = { bounds: Bounds; level: number; settling: boolean };
type Entry = {
	/** Conservative micro-bounds for sparse tile planning; never raw samples. */
	spans: CoverageSpans;
	/** Coarse world-space bounds reject spans as a block before device projection. */
	spanBlocks?: Float64Array;
	/** Owned disposable endpoints, bounded by the geometry cache lifetime. */
	capsules?: Float32Array;
	/** Immutable local geometry retained for transformed strokes. */
	localCapsules?: GeometryData;
	capsuleStride?: 3 | 6;
	cpuBytes: number;
	serial: number;
	allocation: Allocation;
	bounds: Bounds;
	segments: number;
	bytes: number;
	level: number;
	used: number;
	version: number;
};
export type DrawRecord = {
	brush?: number;
	id: number;
	chunk: number;
	serial: number;
	color: number;
	opacity: number;
	/** Selected geometry hull including its antialiasing footprint. */
	bounds: Bounds;
	group: number;
	entry: Entry;
};
export type DrawPlan = {
	records: DrawRecord[];
	groups: { bounds: Bounds; start: number; end: number }[];
};
type Chunk = {
	brush: number;
	width: number;
	seed: number;
	id: number;
	chunk: number;
	color: number;
	opacity: number;
	bounds: Bounds;
	localBounds: Bounds;
	cells: string[];
	version: number;
	entries: Map<number, Entry>;
};
type Stroke = {
	seen: number;
	next: number;
	chunks: Map<number, Chunk>;
	transform: StrokeTransform;
};
const intersects = (a: Bounds, b: Bounds) =>
	a[2] >= b[0] && a[0] <= b[2] && a[3] >= b[1] && a[1] <= b[3];

/** Most completed geometry is one connected chain. Store each shared endpoint
 * once, preserving its Float32 bits; discontinuous future brush geometry keeps
 * the original six-float segment format. Both paths own their scratch copy. */
export function retainCapsules(data: Float32Array): {capsules: Float32Array; capsuleStride: 3 | 6};
export function retainCapsules(data: Float64Array): {capsules: Float64Array; capsuleStride: 3 | 6};
export function retainCapsules(data: GeometryData): {capsules: GeometryData; capsuleStride: 3 | 6};
export function retainCapsules(data: GeometryData): {capsules: GeometryData; capsuleStride: 3 | 6} {
	if (!data.length || data.length % 6)
		return { capsules: data.slice(), capsuleStride: 6 as const };
	const words = data.BYTES_PER_ELEMENT / 4;
	const bits = new Uint32Array(data.buffer, data.byteOffset, data.length * words);
	for (let i = 6 * words; i < bits.length; i += 6 * words)
		for (let k = 0; k < 3 * words; k++)
			if (bits[i + k] !== bits[i - 3 * words + k])
				return { capsules: data.slice(), capsuleStride: 6 as const };
	const capsules = data instanceof Float64Array ? new Float64Array(data.length / 2 + 3) : new Float32Array(data.length / 2 + 3);
	const output = new Uint32Array(capsules.buffer);
	output.set(bits.subarray(0, 3 * words));
	for (let i = 0; i < data.length / 6; i++)
		for (let k = 0; k < 3 * words; k++) output[(i + 1) * 3 * words + k] = bits[(i * 6 + 3) * words + k];
	return { capsules, capsuleStride: 3 as const };
}

/** Build a bounded second level over existing derived span bounds. */
export function coverageBlocks(spans: Float64Array) {
	const blocks = new Float64Array(
		Math.ceil(spans.length / (4 * COVERAGE_BLOCK_ROWS)) * 4,
	);
	for (let row = 0; row < spans.length / 4; row += COVERAGE_BLOCK_ROWS) {
		const at = Math.floor(row / COVERAGE_BLOCK_ROWS) * 4;
		blocks[at] = blocks[at + 1] = Infinity;
		blocks[at + 2] = blocks[at + 3] = -Infinity;
		for (
			let i = row * 4;
			i < Math.min(spans.length, (row + COVERAGE_BLOCK_ROWS) * 4);
			i += 4
		) {
			blocks[at] = Math.min(blocks[at], spans[i]);
			blocks[at + 1] = Math.min(blocks[at + 1], spans[i + 1]);
			blocks[at + 2] = Math.max(blocks[at + 2], spans[i + 2]);
			blocks[at + 3] = Math.max(blocks[at + 3], spans[i + 3]);
		}
	}
	return blocks;
}

/** Disposable geometry only. Rust remains the owner of accepted samples and curve policy. */
export class GeometryCache {
	private preparer: GeometryPreparer | null = null;
	private jobs = new Map<
		Chunk,
		{ version: number; level: number; data?: GeometryData }
	>();
	private active: number | null = null;
	setBackgroundPreparation(enabled: boolean) {
		this.preparer?.dispose();
		this.preparer = null;
		this.jobs.clear();
		if (enabled) {
			try {
				this.preparer = new GeometryPreparer(() => this.pumpPreparation());
			} catch {
				this.preparer = null;
			}
		}
	}
	private pumpPreparation() {
		const preparer = this.preparer;
		if (!preparer) return;
		if (preparer.failed) {
			this.jobs.clear();
			return;
		}
		for (const [c, job] of this.jobs)
			if (
				!this.strokes.has(c.id) ||
				this.urgent.has(c.id) ||
				!this.rebuilding.has(c) ||
				job.version !== c.version ||
				job.level !== this.levelFor(c) ||
				c.id === this.active
			)
				this.jobs.delete(c);
		// Ready payloads may fill while a GPU frame runs; bound actual bytes rather
		// than forcing one draw for every small batch of otherwise cheap chunks.
		let readyBytes = 0;
		for (const job of this.jobs.values())
			readyBytes += job.data?.byteLength ?? 0;
		const outstandingBytes = 8 * this.core.geometry_output_capacity() * Float64Array.BYTES_PER_ELEMENT;
		const until = performance.now() + 0.5;
		for (const c of this.rebuilding) {
			if (
				!preparer.available ||
				this.jobs.size >= 256 ||
				readyBytes + outstandingBytes > 8 * 1024 * 1024 ||
				performance.now() >= until
			)
				break;
			if (c.id === this.active || this.urgent.has(c.id) || this.jobs.has(c))
				continue;
			const job = { version: c.version, level: this.levelFor(c) };
			this.jobs.set(c, job);
			if (
				!preparer.request(
					this.core,
					c.id,
					c.chunk,
					2 ** this.levelFor(c),
					(data) => {
						if (this.jobs.get(c) !== job) return;
						if (
							!data ||
							!data.length ||
							c.version !== job.version ||
							this.levelFor(c) !== job.level
						)
							this.jobs.delete(c);
						else this.jobs.set(c, { ...job, data });
					},
				)
			)
				this.jobs.delete(c);
		}
	}
	private strokes = new Map<number, Stroke>();
	private grid = new Map<string, Set<Chunk>>();
	private oversized = new Set<Chunk>();
	private changed = new Set<number>();
	private registering = new Set<number>();
	private rebuilding = new Set<Chunk>();
	private visible: Chunk[] = [];
	private view: View = { bounds: [0, 0, 0, 0], level: -2, settling: false };
	private viewKey = "";
	private needsQuery = true;
	private sweep: MapIterator<[number, Stroke]> | null = null;
	private garbage = new Set<MapIterator<Chunk>>();
	private trimEpoch = -1;
	private clock = 0;
	private entrySerial = 0;
	private epoch = 0;
	private blockedEpoch = -1;
	private geometryBytes = 0;
	private cpuGeometryBytes = 0;
	private arena: GpuArena;
	private batching = true;
	private limit = 128 * 1024 * 1024;
	private level = -2;
	private budgetMs = 4;
	readonly stats = {
		gpuBytes: 0,
		backlog: 0,
		geometryBuilds: 0,
		evictions: 0,
		lodLevel: -2,
		visibleChunks: 0,
		segments: 0,
		geometryBytes: 0,
		cpuGeometryBytes: 0,
		drawCalls: 0,
		drawnChunks: 0,
		submittedInstances: 0,
		bufferUploads: 0,
		uploadedBytes: 0,
		overlapChecks: 0,
		overlapFallbacks: 0,
	};
	warning = "";
	constructor(
		gl: WebGL2RenderingContext,
		private core: Core,
		private origin: () => readonly [bigint, bigint] = () => [0n, 0n],
	) {
		this.arena = new GpuArena(gl);
	}
	get framePending() {
		return this.arena.framePending;
	}
	get validationStats() {
		return this.arena.stats;
	}
	reportGpuError(error: number) {
		this.arena.reportError(error);
	}
	noteGpuMutation(bytes: number) {
		this.arena.noteExternalMutation(bytes);
	}

	beginFrame() {
		return this.arena.beginFrame();
	}
	endFrame(drew: boolean) {
		this.arena.endFrame(drew);
	}

	setBatching(enabled: boolean) {
		this.batching = enabled;
	}
	private urgent = new Set<number>();
	note(id: number, urgent = false) {
		if (urgent) this.urgent.add(id);
		if (!this.strokes.has(id))
			this.strokes.set(id, {
				seen: 0,
				next: 0,
				chunks: new Map(),
				transform: readTransform(this.core, id, ...this.origin()),
			});
		this.changed.add(id);
		this.epoch++;
	}
	historyChanged() {
		this.sweep = this.strokes.entries();
		this.needsQuery = true;
		this.epoch++;
	}
	/** Called only after GPU admission. Reuses tessellation and buffer slots. */
	syncTransforms() {
		for (const [id, stroke] of this.strokes) {
			const transform = readTransform(this.core, id, ...this.origin());
			if (transform.every((v, k) => v === stroke.transform[k])) continue;
			for (const c of stroke.chunks.values()) {
				c.bounds = transformBounds(transform, c.localBounds);
				this.index(c);
				for (const e of c.entries.values()) {
					if (!e.capsules) continue;
					if (!e.localCapsules) {
						e.localCapsules = e.capsules;
						e.capsules = e.capsules.slice();
						e.cpuBytes += e.localCapsules.byteLength;
						this.cpuGeometryBytes += e.localCapsules.byteLength;
					}
					const data = e.capsules,
						source = e.localCapsules,
						stride = e.capsuleStride ?? 6;
					transformCapsules(source, data, transform);
					this.stats.uploadedBytes += this.arena.upload(
						e.allocation,
						data,
						c.color,
						c.opacity,
						stride,
						c.brush,
						c.width * transformScale(transform),
						c.seed,
					);
					this.stats.bufferUploads++;
					const spans = e.spans as Float64Array;
					for (let first = 0; first < e.segments; first += COVERAGE_SPAN) {
						const at = (first / COVERAGE_SPAN) * 4;
						spans[at] = spans[at + 1] = Infinity;
						spans[at + 2] = spans[at + 3] = -Infinity;
						for (
							let i = first;
							i < Math.min(e.segments, first + COVERAGE_SPAN);
							i++
						) {
							const k = i * stride,
								r = Math.max(data[k + 2], data[k + 5]);
							spans[at] = Math.min(spans[at], data[k] - r, data[k + 3] - r);
							spans[at + 1] = Math.min(
								spans[at + 1],
								data[k + 1] - r,
								data[k + 4] - r,
							);
							spans[at + 2] = Math.max(
								spans[at + 2],
								data[k] + r,
								data[k + 3] + r,
							);
							spans[at + 3] = Math.max(
								spans[at + 3],
								data[k + 1] + r,
								data[k + 4] + r,
							);
						}
					}
					e.spanBlocks = coverageBlocks(spans);
					e.bounds = [...c.bounds];
					e.serial = ++this.entrySerial;
				}
			}
			// An upload failure must leave the whole stroke eligible for retry.
			stroke.transform = transform;
			this.needsQuery = true;
			this.epoch++;
		}
	}
	selectionBounds(ids: ReadonlySet<number>, orientation = 0): Bounds | null {
		const bounds: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
		const cos = Math.cos(orientation),
			sin = Math.sin(orientation);
		for (const id of ids) {
			const s = this.strokes.get(id);
			if (!s) continue;
			const t = readTransform(this.core, id, ...this.origin());
			// Project directly into selection coordinates; don't rebox world AABBs.
			const local: StrokeTransform = [
				cos * t[0] + sin * t[1],
				cos * t[1] - sin * t[0],
				cos * t[2] + sin * t[3],
				cos * t[3] - sin * t[2],
			];
			const count = Math.ceil(this.core.length(id) / RAW_CHUNK);
			for (let k = 0; k < count; k++) {
				let raw: readonly number[] | undefined = s.chunks.get(k)?.localBounds;
				if (!raw) {
					raw = readGeometryBounds(this.core, id, k);
				}
				const b = transformBounds(local, raw);
				bounds[0] = Math.min(bounds[0], b[0]);
				bounds[1] = Math.min(bounds[1], b[1]);
				bounds[2] = Math.max(bounds[2], b[2]);
				bounds[3] = Math.max(bounds[3], b[3]);
			}
		}
		return Number.isFinite(bounds[0]) ? bounds : null;
	}
	hitTest(
		x: number,
		y: number,
		pad: number,
		activeLayerOnly = false,
	): number | null {
		const candidates: { id: number; rank: number; stroke: Stroke }[] = [];
		for (const [id, stroke] of this.strokes) {
			if (
				!this.core.visible(id) ||
				this.core.layer_locked(this.core.stroke_layer(id)) ||
				Math.round(this.core.opacity(id) * 255) === 0 ||
				(activeLayerOnly &&
					this.core.stroke_layer(id) !== this.core.layer_active())
			)
				continue;
			candidates.push({ id, rank: this.core.stroke_layer_rank(id), stroke });
		}
		candidates.sort(
			(a, b) =>
				b.rank - a.rank ||
				(this.core.stroke_order?.(b.id) ?? b.id) -
					(this.core.stroke_order?.(a.id) ?? a.id) ||
				b.id - a.id,
		);
		for (const { id, stroke } of candidates) {
			const transform = readTransform(this.core, id, ...this.origin()),
				scale = transformScale(transform);
			for (const c of stroke.chunks.values()) {
				const b = c.localBounds,
					[px, py] = inversePoint(transform, x, y),
					localPad = pad / scale;
				if (
					px < b[0] - localPad ||
					px > b[2] + localPad ||
					py < b[1] - localPad ||
					py > b[3] + localPad
				)
					continue;
				const e = this.selected(c);
				let data: GeometryData, stride: number;
				if (e?.capsules) {
					data = e.localCapsules ?? e.capsules;
					stride = e.capsuleStride ?? 6;
				} else {
					data = readGeometry(this.core, id, c.chunk, 2 ** transformedDetailLevel(this.level, transform));
					stride = 6;
				}
				for (let i = 0; i + 5 < data.length; i += stride)
					if (
						Math.max(data[i + 2], data[i + 5]) > 0 &&
						capsuleDistance(
							px,
							py,
							data[i],
							data[i + 1],
							data[i + 2],
							data[i + 3],
							data[i + 4],
							data[i + 5],
						) <= localPad
					)
						return id;
			}
		}
		return null;
	}
	lassoHitTest(
		points: readonly LassoPoint[],
		partial: boolean,
		activeLayerOnly: boolean,
	): number[] {
		if (points.length < 2) return [];
		const region = new LassoRegion(points),
			found: number[] = [];
		for (const [id, stroke] of this.strokes) {
			const layer = this.core.stroke_layer(id);
			if (
				!this.core.visible(id) ||
				this.core.layer_locked(layer) ||
				Math.round(this.core.opacity(id) * 255) === 0 ||
				(activeLayerOnly && layer !== this.core.layer_active())
			)
				continue;
			const transform = readTransform(this.core, id, ...this.origin()),
				scale = transformScale(transform);
			let hit = false,
				enclosed = true;
			// Include unregistered/offscreen chunks in whole-stroke containment.
			const count = Math.ceil(this.core.length(id) / RAW_CHUNK);
			for (let k = 0; k < count; k++) {
				const c = stroke.chunks.get(k);
				let bounds: readonly number[];
				if (c) bounds = c.localBounds;
				else {
					bounds = readGeometryBounds(this.core, id, k);
				}
				if (partial && !region.overlaps(transformBounds(transform, bounds)))
					continue;
				const e = c ? this.selected(c) : undefined;
				let data: GeometryData, stride: number;
				if (e?.capsules) {
					data = e.localCapsules ?? e.capsules;
					stride = e.capsuleStride ?? 6;
				} else {
					data = readGeometry(this.core, id, k, 2 ** transformedDetailLevel(this.level, transform));
					stride = 6;
				}
				for (let i = 0; i + 5 < data.length; i += stride) {
					if (Math.max(data[i + 2], data[i + 5]) <= 0) continue;
					const matches = region.capsule(
						...transformPoint(transform, data[i], data[i + 1]),
						data[i + 2] * scale,
						...transformPoint(transform, data[i + 3], data[i + 4]),
						data[i + 5] * scale,
						partial,
					);
					if (partial && matches) {
						hit = true;
						break;
					}
					if (!partial) {
						hit = true;
						if (!matches) {
							enclosed = false;
							break;
						}
					}
				}
				if ((partial && hit) || !enclosed) break;
			}
			if (hit && (partial || enclosed)) found.push(id);
		}
		return found;
	}
	setLimit(n: number) {
		this.limit = Math.max(256, n);
		this.epoch++;
		this.needsQuery = true;
	}
	private unindex(c: Chunk) {
		for (const key of c.cells) {
			const set = this.grid.get(key);
			set?.delete(c);
			if (!set?.size) this.grid.delete(key);
		}
		c.cells = [];
		this.oversized.delete(c);
	}
	private index(c: Chunk) {
		this.unindex(c);
		const [x0, y0, x1, y1] = c.bounds.map((v) => Math.floor(v / 512));
		if ((x1 - x0 + 1) * (y1 - y0 + 1) > 64) {
			this.oversized.add(c);
			return;
		}
		for (let y = y0; y <= y1; y++)
			for (let x = x0; x <= x1; x++) {
				const key = `${x},${y}`;
				let set = this.grid.get(key);
				if (!set) {
					set = new Set();
					this.grid.set(key, set);
				}
				set.add(c);
				c.cells.push(key);
			}
	}
	private updateChunk(id: number, s: Stroke, k: number) {
		let c = s.chunks.get(k);
		if (!c) {
			c = {
				id,
				chunk: k,
				color: this.core.color(id),
				opacity: this.core.opacity(id),
				brush: this.core.brush?.(id) ?? 0,
				width: this.core.stroke_width?.(id) ?? 1,
				seed: (this.core.stroke_order?.(id) ?? id) * 71,
				bounds: [0, 0, 0, 0],
				localBounds: [0, 0, 0, 0],
				cells: [],
				version: 0,
				entries: new Map(),
			};
			s.chunks.set(k, c);
		}
		c.version++;
		// One Rust traversal for the complete conservative hull, copied before scratch reuse.
		c.localBounds = readGeometryBounds(this.core, id, k) as Bounds;
		c.bounds = transformBounds(s.transform, c.localBounds);
		this.index(c);
		this.needsQuery = true;
		return c;
	}
	private freeEntry(c: Chunk, e: Entry) {
		this.arena.free(e.allocation);
		this.geometryBytes -= e.bytes;
		this.cpuGeometryBytes -= e.cpuBytes;
		c.entries.delete(e.level);
		this.stats.evictions++;
	}
	private removeStroke(id: number, s: Stroke) {
		this.garbage.add(s.chunks.values());
		this.strokes.delete(id);
		this.urgent.delete(id);
		this.changed.delete(id);
		this.registering.delete(id);
		this.needsQuery = true;
	}
	private query() {
		const viewBounds = this.view.bounds;
		const found = new Set<Chunk>();
		const [x0, y0, x1, y1] = viewBounds.map((v) => Math.floor(v / 512));
		if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4096) {
			for (const s of this.strokes.values())
				for (const c of s.chunks.values()) found.add(c);
		} else {
			for (let y = y0; y <= y1; y++)
				for (let x = x0; x <= x1; x++)
					for (const c of this.grid.get(`${x},${y}`) ?? []) found.add(c);
			for (const c of this.oversized) found.add(c);
		}
		const ranks = new Map<number, number>();
		const orders = new Map<number, number>();
		const blends = new Map<number, number>();
		for (const c of found)
			if (!ranks.has(c.id)) {
				ranks.set(c.id, this.core.stroke_layer_rank(c.id));
				orders.set(c.id, this.core.stroke_order?.(c.id) ?? c.id);
				blends.set(c.id, this.core.stroke_blend_group?.(c.id) ?? c.id);
			}
		this.visible = [...found]
			.filter((c) => this.core.visible(c.id) && intersects(c.bounds, viewBounds))
			.sort(
				(a, b) =>
					ranks.get(a.id)! - ranks.get(b.id)! ||
					orders.get(a.id)! - orders.get(b.id)! ||
					blends.get(a.id)! - blends.get(b.id)! ||
					a.id - b.id ||
					a.chunk - b.chunk,
			);
		this.rebuilding.clear();
		for (const c of this.visible) {
			const e = this.selected(c);
			// A fresh finer representation already meets the error bound while
			// zooming. Prepare the cheaper exact level only after motion stops.
			if (
				!e ||
				e.version !== c.version ||
				e.level > this.levelFor(c) ||
				(!this.view.settling && e.level !== this.levelFor(c))
			)
				this.rebuilding.add(c);
		}
		this.needsQuery = false;
	}
	private levelFor(c: Chunk) {
		return transformedDetailLevel(
			this.level,
			this.strokes.get(c.id)!.transform,
		);
	}
	private selected(c: Chunk): Entry | undefined {
		let best: Entry | undefined;
		for (const e of c.entries.values()) {
			if (!best) {
				best = e;
				continue;
			}
			const fresh = e.version === c.version;
			const bestFresh = best.version === c.version;
			if (fresh !== bestFresh) {
				if (fresh) best = e;
				continue;
			}
			const adequate = e.level <= this.levelFor(c);
			const bestAdequate = best.level <= this.levelFor(c);
			// Prefer adequate detail even if a coarse level is numerically closer.
			// Among adequate entries choose the cheapest, otherwise the finest fallback.
			if (
				adequate !== bestAdequate
					? adequate
					: adequate
						? e.level > best.level
						: e.level < best.level
			)
				best = e;
		}
		return best;
	}
	private makeRoom(count: number, target?: Chunk): boolean {
		if (this.arena.canAllocate(count, this.limit)) return true;
		if (this.arena.compact(count, this.limit)) return true;
		const candidates: { c: Chunk; e: Entry; rank: number }[] = [];
		for (const s of this.strokes.values())
			for (const c of s.chunks.values()) {
				const hidden =
					!this.core.visible(c.id) || !intersects(c.bounds, this.view.bounds);
				const selected = this.selected(c);
				const finest = Math.min(
					...[...c.entries.values()]
						.filter((e) => e.version === c.version)
						.map((e) => e.level),
				);
				for (const e of c.entries.values()) {
					// Retain visible selected ink until a replacement exists. The
					// target's spare can be reclaimed too, but not the entry build()
					// is replacing and still accounts for after the upload succeeds.
					if (c === target && e.level === this.levelFor(c)) continue;
					if (hidden || selected !== e)
						candidates.push({
							c,
							e,
							rank: hidden
								? 0
								: e.version !== c.version
									? 1
									: e.level === finest
										? 3
										: 2,
						});
				}
			}
		candidates.sort((a, b) => a.rank - b.rank || a.e.used - b.e.used);
		for (const { c, e } of candidates) {
			this.freeEntry(c, e);
			if (this.arena.canAllocate(count, this.limit)) break;
		}
		return (
			this.arena.canAllocate(count, this.limit) ||
			this.arena.compact(count, this.limit)
		);
	}
	private build(c: Chunk, background = false): boolean {
		let data: GeometryData;
		if (background && this.preparer && !this.preparer.failed) {
			const job = this.jobs.get(c);
			if (
				!job?.data ||
				job.version !== c.version ||
				job.level !== this.levelFor(c)
			)
				return false;
			data = job.data;
			this.jobs.delete(c);
		} else {
			data = readGeometry(this.core, c.id, c.chunk, 2 ** this.levelFor(c));
			if (!data.length) return false;
		}
		this.jobs.delete(c);
		const transform = this.strokes.get(c.id)!.transform;
		let localCapsules: GeometryData | undefined;
		let localStride: 3 | 6 | undefined;
		if (data instanceof Float64Array || transform[0] !== 1 || transform[1] || transform[2] || transform[3]) {
			const local = retainCapsules(data);
			localCapsules = local.capsules;
			localStride = local.capsuleStride;
			const source = data;
			data = new Float32Array(source.length);
			transformCapsules(source, data, transform);
		}
		if (!(data instanceof Float32Array)) throw Error("Geometry was not projected for GPU upload");
		const count = data.length / 6;
		const bytes = count * INSTANCE_BYTES;
		const old = c.entries.get(this.levelFor(c));
		const reuse = old && count <= old.allocation.capacity;
		if (!reuse && !this.makeRoom(count, c)) {
			this.warning =
				"Visible geometry exceeds cache capacity. Previous detail stays visible; raw data is retained.";
			this.blockedEpoch = this.epoch;
			return false;
		}
		const allocation = reuse
			? old.allocation
			: this.arena.allocate(count, this.limit);
		if (!allocation)
			throw Error("GPU allocation failed; raw data is retained.");
		try {
			this.stats.uploadedBytes += this.arena.upload(
				allocation,
				data,
				c.color,
				c.opacity,
				6,
				c.brush,
				c.width * transformScale(transform),
				c.seed,
			);
			this.stats.bufferUploads++;
		} catch (error) {
			if (!reuse) this.arena.free(allocation);
			throw error;
		}
		if (old && !reuse) this.arena.free(old.allocation);
		this.geometryBytes += bytes - (old?.bytes ?? 0);
		// Packed double-precision hulls avoid per-span objects without rounding
		// conservative bounds inward. Only derived geometry is indexed here.
		const spans = new Float64Array(Math.ceil(count / COVERAGE_SPAN) * 4);
		for (let first = 0; first < count; first += COVERAGE_SPAN) {
			let left = Infinity,
				top = Infinity,
				right = -Infinity,
				bottom = -Infinity;
			for (let i = first; i < Math.min(count, first + COVERAGE_SPAN); i++) {
				const k = i * 6;
				const radius = Math.max(data[k + 2], data[k + 5]);
				left = Math.min(left, data[k] - radius, data[k + 3] - radius);
				top = Math.min(top, data[k + 1] - radius, data[k + 4] - radius);
				right = Math.max(right, data[k] + radius, data[k + 3] + radius);
				bottom = Math.max(bottom, data[k + 1] + radius, data[k + 4] + radius);
			}
			const at = (first / COVERAGE_SPAN) * 4;
			spans[at] = left;
			spans[at + 1] = top;
			spans[at + 2] = right;
			spans[at + 3] = bottom;
		}

		// Preserve the local layout: rounding transformed endpoints can make two
		// distinct local endpoints look connected in world-space Float32.
		const retained =
			localCapsules && localStride
				? {
						capsules: new Float32Array(localCapsules.length),
						capsuleStride: localStride,
					}
				: retainCapsules(data);
		if (localCapsules)
			transformCapsules(localCapsules, retained.capsules, transform);
		const spanBlocks = coverageBlocks(spans);
		const cpuBytes =
			spans.byteLength +
			spanBlocks.byteLength +
			retained.capsules.byteLength +
			(localCapsules?.byteLength ?? 0);
		this.cpuGeometryBytes += cpuBytes - (old?.cpuBytes ?? 0);
		c.entries.set(this.levelFor(c), {
			spans,
			spanBlocks,
			...retained,
			localCapsules,
			cpuBytes,
			serial: ++this.entrySerial,
			allocation,
			bounds: [...c.bounds],
			segments: count,
			bytes,
			level: this.levelFor(c),
			used: ++this.clock,
			version: c.version,
		});
		this.stats.geometryBuilds++;
		// Retain current detail plus the finest fresh alternative, at most two
		// entries under the shared byte limit. Repeated settled coarse views must
		// not evict an expensive fine curve needed for the next zoom-in.
		if (c.entries.size > 2) {
			const spare = [...c.entries.values()]
				.filter((e) => e.level !== this.levelFor(c))
				.sort(
					(a, b) =>
						Number(a.version === c.version) - Number(b.version === c.version) ||
						b.level - a.level,
				)[0];
			this.freeEntry(c, spare);
		}
		this.rebuilding.delete(c);
		return true;
	}
	prepare(view: View, active: number | null): boolean {
		this.active = active;
		const t = performance.now(),
			until = t + this.budgetMs;
		let updated = false;
		const level = view.level;
		const key = `${view.bounds.join(",")}:${level}:${view.settling}`;
		this.view = view;
		if (key !== this.viewKey) {
			// A settled level can already be cached, so switching it still needs a frame.
			updated = level !== this.level;
			this.viewKey = key;
			this.level = level;
			this.needsQuery = true;
			this.epoch++;
		}
		// Disposal is independent of upload success, so memory pressure cannot starve reclamation.
		const cleanupUntil = Math.min(until, performance.now() + 0.5);
		while (this.sweep && performance.now() < cleanupUntil) {
			const next = this.sweep.next();
			if (next.done) {
				this.sweep = null;
				break;
			}
			const [id, s] = next.value;
			if (this.core.length(id) === 0) {
				this.removeStroke(id, s);
				updated = true;
			}
		}
		for (const iterator of this.garbage) {
			while (performance.now() < cleanupUntil) {
				const next = iterator.next();
				if (next.done) {
					this.garbage.delete(iterator);
					break;
				}
				const c = next.value;
				this.unindex(c);
				for (const e of c.entries.values()) this.freeEntry(c, e);
				this.rebuilding.delete(c);
				this.epoch++;
			}
			if (performance.now() >= cleanupUntil) break;
		}

		for (const id of active === null
			? this.changed
			: new Set([active, ...this.changed])) {
			if (!this.changed.has(id)) continue;
			if (performance.now() >= until) break;
			this.changed.delete(id);
			const s = this.strokes.get(id)!;
			const n = this.core.length(id);
			if (!n) {
				this.sweep = this.strokes.entries();
				continue;
			}
			if (s.seen > 0)
				this.updateChunk(id, s, Math.floor((s.seen - 1) / RAW_CHUNK));
			// Latest live block can be drawn immediately, independent of a long earlier backlog.
			this.updateChunk(id, s, Math.floor((n - 1) / RAW_CHUNK));
			s.seen = n;
			this.registering.add(id);
		}
		if (this.needsQuery) this.query();
		if (this.arena.bytes > this.limit && this.trimEpoch !== this.epoch) {
			this.trimEpoch = this.epoch;
			if (!this.makeRoom(0))
				this.warning =
					"Visible geometry exceeds reduced cache capacity. Visible ink is retained.";
		}
		if (active !== null && this.blockedEpoch !== this.epoch) {
			const s = this.strokes.get(active);
			if (s) {
				const c = s.chunks.get(Math.floor((s.seen - 1) / RAW_CHUNK));
				if (c && this.rebuilding.has(c)) {
					updated = this.build(c) || updated;
				}
			}
		}
		// Register unseen bounds in bounded units, including offscreen accepted data.
		for (const id of this.registering) {
			const s = this.strokes.get(id);
			if (!s) {
				this.registering.delete(id);
				continue;
			}
			const total = Math.ceil(s.seen / RAW_CHUNK);
			while (s.next < total && performance.now() < until) {
				if (!s.chunks.has(s.next)) this.updateChunk(id, s, s.next);
				s.next++;
			}
			if (s.next >= total) this.registering.delete(id);
			if (performance.now() >= until) break;
		}
		if (this.needsQuery) this.query();
		this.pumpPreparation();
		if (this.blockedEpoch !== this.epoch)
			for (const c of this.rebuilding) {
				if (performance.now() >= until) break;
				if (this.build(c, c.id !== active && !this.urgent.has(c.id)))
					updated = true;
				else if (this.blockedEpoch === this.epoch) break;
			}
		this.pumpPreparation();
		if (!this.rebuilding.size && this.arena.bytes <= this.limit) {
			this.warning = "";
			this.blockedEpoch = -1;
		}
		if (this.urgent.size) {
			const pending = new Set([...this.rebuilding].map((c) => c.id));
			for (const id of this.urgent) {
				if (
					!this.changed.has(id) &&
					!this.registering.has(id) &&
					!pending.has(id)
				)
					this.urgent.delete(id);
			}
		}
		this.stats.gpuBytes = this.arena.bytes;
		this.stats.geometryBytes = this.geometryBytes;
		this.stats.cpuGeometryBytes = this.cpuGeometryBytes;
		this.stats.backlog =
			this.changed.size +
			this.registering.size +
			this.rebuilding.size +
			this.garbage.size;
		this.stats.lodLevel = this.level;
		this.stats.visibleChunks = this.visible.length;
		return updated;
	}
	resetDrawStats() {
		this.stats.segments = 0;
		this.stats.drawCalls = 0;
		this.stats.drawnChunks = 0;
		this.stats.submittedInstances = 0;
		this.stats.overlapChecks = 0;
		this.stats.overlapFallbacks = 0;
	}
	/** Snapshot selected payloads and establish painter-order groups once per frame.
	 * Regional draws must reuse these groups: regrouping a subset could change
	 * same-color MAX union into source-over composition at a region boundary.
	 */
	planDraw(worldPixel: number): DrawPlan {
		type Item = {
			color: number;
			opaque: boolean;
			bounds: Bounds;
			start: number;
			end: number;
		};
		const records: DrawRecord[] = [];
		const groups: DrawPlan["groups"] = [];
		const pad = 2 * worldPixel;
		for (const c of this.visible) {
			// Invisible ink must not split otherwise compatible visible unions.
			// Match the packed GPU alpha while retaining the canonical stroke.
			if (Math.round(c.opacity * 255) === 0) continue;
			const entry = this.selected(c);
			if (!entry) continue;
			records.push({
				id: c.id,
				chunk: c.chunk,
				serial: entry.serial,
				color: c.color,
				opacity: c.opacity,
				brush: c.brush,
				bounds: [
					entry.bounds[0] - pad,
					entry.bounds[1] - pad,
					entry.bounds[2] + pad,
					entry.bounds[3] + pad,
				],
				group: -1,
				entry,
			});
		}
		const grid = new Map<string, Item[]>();
		const indexedItems: Item[] = [];
		const oversized: Item[] = [];
		const cell = worldPixel * 128;
		let groupStart = -1,
			groupEnd = 0,
			firstColor = 0,
			mixed = false,
			allOpaque = true,
			indexed = 0;
		let unindexedStyle: { color: number; opaque: boolean } | null = null;
		let groupBounds: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
		const cells = (bounds: Bounds) => {
			const [x0, y0, x1, y1] = bounds.map((v) => Math.floor(v / cell));
			if ((x1 - x0 + 1) * (y1 - y0 + 1) > 64) return null;
			const keys: string[] = [];
			for (let y = y0; y <= y1; y++)
				for (let x = x0; x <= x1; x++) keys.push(`${x},${y}`);
			return keys;
		};
		const flushGroup = () => {
			if (groupStart < 0) return;
			groups.push({ bounds: groupBounds, start: groupStart, end: groupEnd });
			groupStart = -1;
			groupBounds = [Infinity, Infinity, -Infinity, -Infinity];
			grid.clear();
			indexedItems.length = 0;
			oversized.length = 0;
			indexed = 0;
			mixed = false;
			allOpaque = true;
			unindexedStyle = null;
		};
		let groupLayer = -1;
		let frameRemaining = 32768;
		// Decide compatibility for whole visible strokes: splitting a stroke into
		// separate composites would darken its joins and self-intersections.
		// The broad-phase grid holds at most 512 stroke bounds (64 cells each).
		// Refine candidates with chunk bounds under a shared work budget per
		// incoming stroke; exhaustion conservatively starts another group.
		for (let strokeStart = 0; strokeStart < records.length; ) {
			const first = records[strokeStart];
			const layer = this.core.stroke_layer(first.id);
			if (layer !== groupLayer) {
				flushGroup();
				groupLayer = layer;
			}
			let strokeEnd = strokeStart + 1;
			// Unmoved siblings retain their source coverage union. Once transformed
			// independently they blend separately, at the original painter position.
			while (
				strokeEnd < records.length &&
				(this.core.stroke_blend_group?.(records[strokeEnd].id) ??
					records[strokeEnd].id) ===
					(this.core.stroke_blend_group?.(first.id) ?? first.id)
			)
				strokeEnd++;
			const bounds: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
			for (let i = strokeStart; i < strokeEnd; i++) {
				const b = records[i].bounds;
				bounds[0] = Math.min(bounds[0], b[0]);
				bounds[1] = Math.min(bounds[1], b[1]);
				bounds[2] = Math.max(bounds[2], b[2]);
				bounds[3] = Math.max(bounds[3], b[3]);
			}
			const color = first.color;
			const opaque = first.opacity === 1 && !first.brush;
			const canUnion = (other: { color: number; opaque: boolean }) =>
				opaque && other.opaque && other.color === color;
			const keys = cells(bounds);
			const checked = new Set<Item>();
			let remaining = 4096;
			const conflicts = (other: Item) => {
				if (checked.has(other)) return false;
				checked.add(other);
				if (canUnion(other) || !intersects(bounds, other.bounds)) return false;
				for (let i = strokeStart; i < strokeEnd; i++) {
					if (remaining-- <= 0 || frameRemaining-- <= 0) {
						this.stats.overlapFallbacks++;
						return true;
					}
					for (let j = other.start; j < other.end; j++) {
						if (remaining-- <= 0 || frameRemaining-- <= 0) {
							this.stats.overlapFallbacks++;
							return true;
						}
						this.stats.overlapChecks++;
						if (intersects(records[i].bounds, records[j].bounds)) return true;
					}
				}
				return false;
			};
			const conflict =
				groupStart >= 0 &&
				((unindexedStyle !== null && !canUnion(unindexedStyle)) ||
					((!allOpaque || !opaque || mixed || firstColor !== color) &&
						(keys
							? oversized.some(conflicts) ||
								keys.some((key) => grid.get(key)?.some(conflicts))
							: indexedItems.some(conflicts))));
			if (conflict) flushGroup();
			if (groupStart < 0) {
				groupStart = strokeStart;
				firstColor = color;
			} else mixed ||= firstColor !== color;
			allOpaque &&= opaque;
			groupEnd = strokeEnd;
			groupBounds[0] = Math.min(groupBounds[0], bounds[0]);
			groupBounds[1] = Math.min(groupBounds[1], bounds[1]);
			groupBounds[2] = Math.max(groupBounds[2], bounds[2]);
			groupBounds[3] = Math.max(groupBounds[3], bounds[3]);
			for (let i = strokeStart; i < strokeEnd; i++)
				records[i].group = groups.length;
			if (indexed < 512) {
				const item = {
					color,
					opaque,
					bounds,
					start: strokeStart,
					end: strokeEnd,
				};
				indexedItems.push(item);
				indexed++;
				if (keys) {
					for (const key of keys) {
						const bucket = grid.get(key);
						if (bucket) bucket.push(item);
						else grid.set(key, [item]);
					}
				} else oversized.push(item);
			} else {
				// Unindexed bounds can be ignored only for an opaque same-color
				// union. Any other incoming style starts a fresh bounded group,
				// including another translucent stroke with identical RGBA.
				unindexedStyle = { color, opaque };
			}
			strokeStart = strokeEnd;
		}
		flushGroup();
		return { records, groups };
	}
	/** Account for retained geometry submitted through the sparse atlas. */
	markDrawn(record: DrawRecord, instances: number) {
		record.entry.used = ++this.clock;
		this.stats.segments += record.entry.segments;
		this.stats.drawnChunks++;
		this.stats.drawCalls++;
		this.stats.submittedInstances += instances;
	}

	drawPlan(
		plan: DrawPlan,
		drawBatch: (buffer: WebGLBuffer, offset: number, count: number) => void,
		beginGroup: (bounds: Bounds) => void,
		endGroup: () => void,
		worldClip?: Bounds,
		visibleBounds?: (bounds: Bounds) => boolean,
	) {
		for (const group of plan.groups) {
			if (worldClip && !intersects(group.bounds, worldClip)) continue;
			let began = false;
			let buffer: WebGLBuffer | null = null;
			let start = 0,
				end = 0,
				count = 0;
			const flushBatch = () => {
				if (!buffer) return;
				drawBatch(buffer, start, count);
				this.stats.drawCalls++;
				this.stats.submittedInstances += count;
			};
			for (let i = group.start; i < group.end; i++) {
				const record = plan.records[i];
				if (worldClip && !intersects(record.bounds, worldClip)) continue;
				if (visibleBounds && !visibleBounds(record.bounds)) continue;
				if (!began) {
					beginGroup(
						worldClip
							? [
									Math.max(group.bounds[0], worldClip[0]),
									Math.max(group.bounds[1], worldClip[1]),
									Math.min(group.bounds[2], worldClip[2]),
									Math.min(group.bounds[3], worldClip[3]),
								]
							: group.bounds,
					);
					began = true;
				}
				const e = record.entry;
				e.used = ++this.clock;
				this.stats.segments += e.segments;
				this.stats.drawnChunks++;
				const slot = e.allocation;
				if (!this.batching || buffer !== slot.buffer || end !== slot.offset) {
					flushBatch();
					buffer = slot.buffer;
					start = slot.offset;
				}
				count = slot.offset + e.segments - start;
				end = slot.offset + slot.capacity;
			}
			flushBatch();
			if (began) endGroup();
		}
	}
	draw(
		drawBatch: (buffer: WebGLBuffer, offset: number, count: number) => void,
		beginGroup: (bounds: Bounds) => void,
		endGroup: () => void,
		worldPixel: number,
	) {
		this.resetDrawStats();
		this.drawPlan(this.planDraw(worldPixel), drawBatch, beginGroup, endGroup);
	}

	contextLost() {
		this.jobs.clear();
		this.arena.contextLost();
		for (const s of this.strokes.values())
			for (const c of s.chunks.values()) c.entries.clear();
		for (const iterator of this.garbage) {
			for (const c of iterator) {
				this.unindex(c);
				c.entries.clear();
			}
		}
		this.garbage.clear();
		this.geometryBytes = 0;
		this.cpuGeometryBytes = 0;
		this.needsQuery = true;
		this.epoch++;
		this.blockedEpoch = -1;
	}
	state() {
		const rows = [];
		for (const [id, s] of this.strokes)
			for (const c of s.chunks.values()) {
				if (c.entries.size) {
					for (const e of c.entries.values())
						rows.push({
							id,
							chunk: c.chunk,
							level: e.level,
							segments: e.segments,
							bytes: e.bytes,
							cpuBytes: e.cpuBytes,
							allocationBytes: e.allocation.capacity * INSTANCE_BYTES,
							resident: true,
						});
				} else
					rows.push({
						id,
						chunk: c.chunk,
						level: this.level,
						segments: 0,
						resident: false,
					});
			}
		return rows;
	}
	get size() {
		return this.strokes.size;
	}
}
