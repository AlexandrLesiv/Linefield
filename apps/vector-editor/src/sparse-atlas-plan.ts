import {
	type Bounds,
	COVERAGE_BLOCK_ROWS,
	COVERAGE_SPAN,
	type CoverageSpans,
	type DrawPlan,
	type DrawRecord,
} from "./geometry-cache";

export const ATLAS_FRAME_INSTANCE_BUDGET = 3_000_000;
const MAX_GRID_CELLS = 262144;
const MAX_SPAN_ROWS = 4096;

// Bound backend vertex-layout variants while keeping every route conservative.
function routeStride(count: number) {
	return 2 ** Math.ceil(Math.log2(count));
}

export type AtlasTile = {
	/** Index in this batch, also its atlas slot. */
	slot: number;
	group: number;
	/** Unclipped, integer device-pixel top-left of the logical tile. */
	x: number;
	y: number;
	/** Half-open device-pixel rectangle owned by this tile in this region. */
	bounds: Bounds;
};
export type AtlasRecord = {
	record: DrawRecord;
	/** Rectangular routing rows; -1 entries are inactive padding. */
	tiles: number[];
	routeCount: number;
	spanSize: number;
	/** First retained segment and actual count, never including arena padding. */
	first: number;
	count: number;
};
export type SparseAtlasStep =
	| { kind: "atlas"; tiles: AtlasTile[]; records: AtlasRecord[] }
	| { kind: "legacy"; group: number };
export type AtlasOptions = {
	/** Derived bounds hierarchy, with the same conservative device transform. */
	hierarchical?: boolean;
	/** Reuse identical consecutive tile rectangles without changing routing. */
	reuseRectangles?: boolean;
	spanIntersects?: (
		left: number,
		top: number,
		right: number,
		bottom: number,
	) => boolean;
	/** Optional tighter projection of a derived span; global groups stay unchanged. */
	spanBounds?: (
		record: DrawRecord,
		first: number,
		count: number,
		out: Bounds,
	) => Bounds;
	visibleBounds?: (bounds: Bounds) => boolean;
	tileSize?: number;
	capacity?: number;
	maxRoutes?: number;
	/** Per-group replicated geometry cap; batches admit at most four times this. */
	maxReplicatedInstances?: number;
	/** Whole-plan submitted-instance cap, additionally limited to 36x source geometry. */
	maxTotalInstances?: number;
	/** Shared span and tile-candidate work cap. */
	maxWork?: number;
	/** Independent padded route-table materialization cap; defaults to 4x maxWork. */
	maxRouteWork?: number;
};
type AtlasBatch = Extract<SparseAtlasStep, { kind: "atlas" }>;

// Reused lookup scratch never escapes in returned plans. Coordinates are relative
// to the clipped device-tile rectangle, so negative/large world positions cannot
// collide. Stamps avoid clearing the viewport grid for every coverage group.
let gridSlots = new Int32Array(0);
let gridStamps = new Uint32Array(0);
let recordStamps = new Uint32Array(0);
let recordSlots = new Int32Array(0);
let groupStamp = 0;
let recordStamp = 0;
let spanTiles = new Int32Array(0);
const spanRows = new Int32Array(MAX_SPAN_ROWS * 2);
const spanRects = new Int32Array(MAX_SPAN_ROWS * 4);
function ensureScratch(cells: number, slots: number) {
	if (gridSlots.length < cells) {
		const size = 2 ** Math.ceil(Math.log2(cells));
		gridSlots = new Int32Array(size);
		gridStamps = new Uint32Array(size);
	}
	if (recordStamps.length < slots) {
		const size = 2 ** Math.ceil(Math.log2(slots));
		recordStamps = new Uint32Array(size);
		recordSlots = new Int32Array(size);
	}
}
function nextGroupStamp() {
	groupStamp = (groupStamp + 1) >>> 0;
	if (!groupStamp) {
		gridStamps.fill(0);
		groupStamp = 1;
	}
	return groupStamp;
}
function nextRecordStamp() {
	recordStamp = (recordStamp + 1) >>> 0;
	if (!recordStamp) {
		recordStamps.fill(0);
		recordStamp = 1;
	}
	return recordStamp;
}

/** Packs complete global coverage groups into bounded batches. The transform
 * includes the AA footprint. Every retained segment routes to every tile touched
 * by its conservative span; all chunks of a group share one coverage slot/tile.
 * No raw samples, geometry buffers, or caller-owned draw records are modified.
 */
export function planSparseAtlas(
	plan: DrawPlan,
	deviceBounds: (bounds: Bounds) => Bounds,
	clip: Bounds,
	options: AtlasOptions = {},
): SparseAtlasStep[] {
	const tileSize = options.tileSize ?? 64;
	const capacity = options.capacity ?? 1024;
	const maxRoutes = options.maxRoutes ?? 16384;
	const maxWork = options.maxWork ?? maxRoutes * 8;
	const maxRouteWork = options.maxRouteWork ?? maxWork * 4;
	const maxReplicatedInstances = options.maxReplicatedInstances ?? 262144;
	const maxBatchInstances = maxReplicatedInstances * 4;
	const maxTotalInstances =
		options.maxTotalInstances ?? ATLAS_FRAME_INSTANCE_BUDGET;
	for (const value of [
		tileSize,
		capacity,
		maxRoutes,
		maxWork,
		maxRouteWork,
		maxReplicatedInstances,
		maxBatchInstances,
		maxTotalInstances,
	])
		if (!Number.isSafeInteger(value) || value <= 0)
			throw RangeError("Atlas planning limits must be positive safe integers.");
	if (!clip.every(Number.isFinite))
		throw RangeError("Atlas clipping bounds must be finite.");
	if (clip[2] <= clip[0] || clip[3] <= clip[1]) return [];
	const region: Bounds = [
		Math.floor(clip[0]),
		Math.floor(clip[1]),
		Math.ceil(clip[2]),
		Math.ceil(clip[3]),
	];
	const allLegacy = (): SparseAtlasStep[] =>
		plan.groups.map((_, group) => ({ kind: "legacy", group }));
	const originX = Math.floor(region[0] / tileSize);
	const originY = Math.floor(region[1] / tileSize);
	const columns = Math.ceil(region[2] / tileSize) - originX;
	const rows = Math.ceil(region[3] / tileSize) - originY;
	const cells = columns * rows;
	if (
		!region.every(Number.isSafeInteger) ||
		!Number.isSafeInteger(cells) ||
		cells < 1 ||
		cells > MAX_GRID_CELLS
	)
		return allLegacy();
	ensureScratch(cells, Math.min(capacity, cells));
	if (options.spanIntersects && spanTiles.length < Math.min(maxWork, 1048576))
		spanTiles = new Int32Array(
			2 ** Math.ceil(Math.log2(Math.min(maxWork, 1048576))),
		);
	let sourceInstances = 0;
	for (const record of plan.records) {
		const count = record.entry.segments;
		if (!Number.isSafeInteger(count) || count <= 0) return allLegacy();
		sourceInstances = Math.min(maxTotalInstances, sourceInstances + count);
	}
	const instanceBudget = Math.min(maxTotalInstances, sourceInstances * 36);
	let totalInstances = 0;
	const steps: SparseAtlasStep[] = [];
	let batch: AtlasBatch = { kind: "atlas", tiles: [], records: [] };
	let batchRoutes = 0;
	let batchInstances = 0;
	let work = maxWork;
	let routeWork = maxRouteWork;
	const inputBounds: Bounds = [0, 0, 0, 0];
	const flush = () => {
		if (batch.tiles.length) steps.push(batch);
		batch = { kind: "atlas", tiles: [], records: [] };
		batchRoutes = 0;
		batchInstances = 0;
	};
	for (let group = 0; group < plan.groups.length; group++) {
		const range = plan.groups[group];
		const tiles: AtlasTile[] = [];
		const records: AtlasRecord[] = [];
		const groupId = nextGroupStamp();
		let routes = 0;
		let instances = 0;
		let fallback = work <= 0 || routeWork <= 0;
		for (let index = range.start; index < range.end && !fallback; index++) {
			const record = plan.records[index];
			if (options.visibleBounds && !options.visibleBounds(record.bounds))
				continue;
			const segments = record.entry.segments;
			const suppliedSpans = (record.entry as { spans?: CoverageSpans }).spans;
			const packed = suppliedSpans instanceof Float64Array;
			const suppliedRows = packed
				? suppliedSpans.length / 4
				: suppliedSpans?.length;
			// Missing, truncated, or old diagnostics retain the full conservative hull.
			const micro =
				suppliedRows !== undefined &&
				Number.isInteger(suppliedRows) &&
				suppliedRows === Math.ceil(segments / COVERAGE_SPAN) &&
				suppliedRows <= MAX_SPAN_ROWS;
			const spanCount = micro ? suppliedRows : 1;
			const narrow = !!(
				micro &&
				record.entry.capsules &&
				options.spanBounds &&
				options.spanIntersects
			);
			const blocks =
				options.hierarchical !== false && micro
					? record.entry.spanBlocks
					: undefined;
			const hierarchical =
				blocks &&
				blocks.length === Math.ceil(spanCount / COVERAGE_BLOCK_ROWS) * 4;
			let accepted = 0;
			const recordId = nextRecordStamp();
			let unique = 0;
			let firstRow = spanCount;
			let lastRow = -1;
			let widest = 0;
			for (let row = 0; row < spanCount; row++) {
				if (hierarchical && row % COVERAGE_BLOCK_ROWS === 0) {
					if (--work < 0) {
						fallback = true;
						break;
					}
					const at = Math.floor(row / COVERAGE_BLOCK_ROWS) * 4;
					for (let k = 0; k < 4; k++) inputBounds[k] = blocks[at + k];
					const b = deviceBounds(inputBounds);
					// Only reject finite, strictly disjoint bounds. A malformed or touching
					// hierarchy falls through to the independently validated fine spans.
					if (
						b.every(Number.isFinite) &&
						b[0] <= b[2] &&
						b[1] <= b[3] &&
						(b[2] < region[0] ||
							b[0] > region[2] ||
							b[3] < region[1] ||
							b[1] > region[3])
					) {
						const end = Math.min(spanCount, row + COVERAGE_BLOCK_ROWS);
						spanRects.fill(0, row * 4, end * 4);
						if (narrow) spanRows.fill(0, row * 2, end * 2);
						row = end - 1;
						continue;
					}
				}
				const acceptedStart = accepted;
				if (narrow) {
					spanRows[row * 2] = acceptedStart;
					spanRows[row * 2 + 1] = 0;
				}
				if (--work < 0) {
					fallback = true;
					break;
				}
				let bounds = record.bounds;
				if (micro && !(record.entry.capsules && options.spanBounds)) {
					if (packed) {
						const at = row * 4;
						for (let k = 0; k < 4; k++) inputBounds[k] = suppliedSpans[at + k];
						bounds = inputBounds;
					} else if (suppliedSpans) bounds = suppliedSpans[row].bounds;
				}
				const b =
					micro && record.entry.capsules && options.spanBounds
						? options.spanBounds(
								record,
								row * COVERAGE_SPAN,
								Math.min(COVERAGE_SPAN, segments - row * COVERAGE_SPAN),
								inputBounds,
							)
						: deviceBounds(bounds);
				if (!b.every(Number.isFinite) || b[2] < b[0] || b[3] < b[1]) {
					fallback = true;
					break;
				}
				const left = Math.max(region[0], Math.floor(b[0]));
				const top = Math.max(region[1], Math.floor(b[1]));
				const right = Math.min(region[2], Math.ceil(b[2]));
				const bottom = Math.min(region[3], Math.ceil(b[3]));
				const at = row * 4;
				if (left >= right || top >= bottom) {
					spanRects[at] =
						spanRects[at + 1] =
						spanRects[at + 2] =
						spanRects[at + 3] =
							0;
					continue;
				}
				const x0 = Math.floor(left / tileSize) - originX;
				const y0 = Math.floor(top / tileSize) - originY;
				const x1 = Math.ceil(right / tileSize) - originX;
				const y1 = Math.ceil(bottom / tileSize) - originY;
				const touched = (x1 - x0) * (y1 - y0);
				if (touched > capacity) {
					fallback = true;
					break;
				}
				spanRects[at] = x0;
				spanRects[at + 1] = y0;
				spanRects[at + 2] = x1;
				spanRects[at + 3] = y1;
				if (!narrow) {
					firstRow = Math.min(firstRow, row);
					lastRow = row;
					widest = Math.max(widest, touched);
				}
				// Fine curves commonly leave several neighboring spans in the same
				// tiles. Their exact route list already exists; do not revisit grid stamps.
				const repeat =
					options.reuseRectangles !== false &&
					row > 0 &&
					(!narrow || touched < 16) &&
					x0 === spanRects[at - 4] &&
					y0 === spanRects[at - 3] &&
					x1 === spanRects[at - 2] &&
					y1 === spanRects[at - 1];
				if (repeat) {
					if (narrow) {
						const source = spanRows[(row - 1) * 2],
							length = spanRows[(row - 1) * 2 + 1];
						if (accepted + length > spanTiles.length) {
							fallback = true;
							break;
						}
						spanTiles.copyWithin(accepted, source, source + length);
						spanRows[row * 2 + 1] = length;
						accepted += length;
						if (length) {
							firstRow = Math.min(firstRow, row);
							lastRow = row;
							widest = Math.max(widest, length);
						}
					}
					continue;
				}
				for (let y = y0; y < y1 && !fallback; y++) {
					for (let x = x0; x < x1; x++) {
						if (--work < 0) {
							fallback = true;
							break;
						}
						if (
							narrow &&
							touched >= 16 &&
							!options.spanIntersects!(
								(x + originX) * tileSize,
								(y + originY) * tileSize,
								(x + originX + 1) * tileSize,
								(y + originY + 1) * tileSize,
							)
						)
							continue;
						const key = y * columns + x;
						let slot = gridSlots[key];
						if (gridStamps[key] !== groupId) {
							if (tiles.length === capacity) {
								fallback = true;
								break;
							}
							slot = tiles.length;
							gridSlots[key] = slot;
							gridStamps[key] = groupId;
							const px = (x + originX) * tileSize;
							const py = (y + originY) * tileSize;
							tiles.push({
								slot,
								group,
								x: px,
								y: py,
								bounds: [
									Math.max(region[0], px),
									Math.max(region[1], py),
									Math.min(region[2], px + tileSize),
									Math.min(region[3], py + tileSize),
								],
							});
						}
						if (narrow) {
							if (accepted === spanTiles.length) {
								fallback = true;
								break;
							}
							spanTiles[accepted++] = slot;
						}
						if (recordStamps[slot] !== recordId) {
							recordStamps[slot] = recordId;
							recordSlots[unique++] = slot;
						}
					}
				}
				if (narrow && accepted > acceptedStart) {
					spanRows[row * 2 + 1] = accepted - acceptedStart;
					firstRow = Math.min(firstRow, row);
					lastRow = row;
					widest = Math.max(widest, accepted - acceptedStart);
				}
				if (fallback) break;
			}
			if (fallback) break;
			if (!unique) continue;
			const first = micro ? firstRow * COVERAGE_SPAN : 0;
			const count = micro
				? Math.min(segments, (lastRow + 1) * COVERAGE_SPAN) - first
				: segments;
			const wholeStride = routeStride(unique);
			const spanStride = routeStride(widest);
			const rectangularRoutes = (lastRow - firstRow + 1) * spanStride;
			const remainingRoutes = Math.min(maxRoutes - routes, routeWork);
			const wholeInstances = count * wholeStride;
			const remainingInstances = Math.min(
				maxReplicatedInstances - instances,
				instanceBudget - totalInstances - instances,
			);
			// Small footprints use one compact row. A padded span table is worth
			// its upload cost when it halves vertex work or avoids a work fallback.
			const selective =
				micro &&
				spanStride < wholeStride &&
				rectangularRoutes <= remainingRoutes &&
				(spanStride * 2 <= wholeStride || wholeInstances > remainingInstances);
			const routeCount = selective ? spanStride : wholeStride;
			const routeLength = selective ? rectangularRoutes : wholeStride;
			const submitted = count * routeCount;
			if (
				routeLength > remainingRoutes ||
				instances + submitted > maxReplicatedInstances
			) {
				fallback = true;
				break;
			}
			if (totalInstances + instances + submitted > instanceBudget)
				return allLegacy();
			const recordTiles = new Array<number>(routeLength).fill(-1);
			if (selective) {
				for (let row = firstRow; row <= lastRow; row++) {
					const at = row * 4;
					let target = (row - firstRow) * spanStride;
					if (narrow) {
						for (let i = 0; i < spanRows[row * 2 + 1]; i++)
							recordTiles[target++] = spanTiles[spanRows[row * 2] + i];
						continue;
					}
					for (let y = spanRects[at + 1]; y < spanRects[at + 3]; y++)
						for (let x = spanRects[at]; x < spanRects[at + 2]; x++)
							recordTiles[target++] = gridSlots[y * columns + x];
				}
			} else {
				for (let i = 0; i < unique; i++) recordTiles[i] = recordSlots[i];
			}
			routeWork -= routeLength;
			routes += routeLength;
			instances += submitted;
			records.push({
				record,
				tiles: recordTiles,
				routeCount,
				spanSize: selective ? COVERAGE_SPAN : count,
				first,
				count,
			});
		}
		if (fallback) {
			for (let index = range.start; index < range.end; index++) {
				totalInstances += plan.records[index].entry.segments;
				if (totalInstances > instanceBudget) return allLegacy();
			}
			flush();
			steps.push({ kind: "legacy", group });
			continue;
		}
		if (!tiles.length) continue;
		totalInstances += instances;
		if (
			batch.tiles.length + tiles.length > capacity ||
			batchRoutes + routes > maxRoutes ||
			batchInstances + instances > maxBatchInstances
		)
			flush();
		const offset = batch.tiles.length;
		for (const tile of tiles) {
			tile.slot += offset;
			batch.tiles.push(tile);
		}
		for (const record of records) {
			for (let i = 0; i < record.tiles.length; i++)
				if (record.tiles[i] >= 0) record.tiles[i] += offset;
			batch.records.push(record);
		}
		batchRoutes += routes;
		batchInstances += instances;
	}
	flush();
	return steps;
}
