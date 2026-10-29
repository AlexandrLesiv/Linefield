export const INSTANCE_BYTES = 32;
const PAGE_UNITS = 1024;
const MAX_UNITS = 4096;
// Every submitted frame is fenced and allowed to finish before another starts.
// These limits additionally protect mutations that have not reached endFrame yet.
const VALIDATION_MAX_DELAY_MS = 1000;
const VALIDATION_MAX_BYTES = 16 * 1024 * 1024;

export type Allocation = {
	readonly buffer: WebGLBuffer;
	/** First instance in the shared buffer, not a byte offset. */
	readonly offset: number;
	readonly capacity: number;
};
type Range = { offset: number; capacity: number };
type Page = {
	buffer: WebGLBuffer;
	capacity: number;
	free: Range[];
	live: number;
};

function slotCapacity(count: number) {
	if (!Number.isInteger(count) || count < 1 || count > MAX_UNITS) return 0;
	return 2 ** Math.ceil(Math.log2(count));
}

/** Retained instance storage. Sparse pages may compact under allocation pressure. */
export class GpuArena {
	private pages = new Set<Page>();
	private allocations = new Map<Allocation, Page>();
	private allocatedBytes = 0;
	private scratch = new ArrayBuffer(0);
	private scratchFloats = new Float32Array(this.scratch);
	private scratchBytes = new Uint8Array(this.scratch);
	private validationFence: WebGLSync | null = null;
	private uncheckedSince: number | null = null;
	private mutationSerial = 0;
	private fencedSerial = 0;
	private failure: Error | null = null;
	readonly stats = {
		compactionCopies: 0,
		compactionBytes: 0,
		compactionPages: 0,
		validationChecks: 0,
		validationWaitFrames: 0,
		validationDrainFrames: 0,
		queueWaitFrames: 0,
		uncheckedBytes: 0,
	};

	constructor(private gl: WebGL2RenderingContext) {}

	get bytes() {
		return this.allocatedBytes;
	}

	get pageCount() {
		return this.pages.size;
	}

	/** Whether a submitted frame or upload batch still awaits completion. */
	get framePending() {
		return this.validationFence !== null;
	}

	/** Run before ANY GPU commands in a frame, including geometry preparation.
	 * A false result leaves the previous canvas intact while queued work drains.
	 */
	beginFrame(now = performance.now()): boolean {
		if (this.failure) throw this.failure;
		if (this.validationFence) {
			const state = this.gl.clientWaitSync(this.validationFence, 0, 0);
			if (
				state === this.gl.ALREADY_SIGNALED ||
				state === this.gl.CONDITION_SATISFIED
			) {
				this.gl.deleteSync(this.validationFence);
				this.validationFence = null;
				// A draw-only frame needs queue pacing, not an error poll. Only
				// validate writes covered by this completed frame's fence.
				if (
					this.uncheckedSince !== null &&
					this.fencedSerial === this.mutationSerial
				) {
					this.stats.validationChecks++;
					const error = this.gl.getError();
					if (error !== this.gl.NO_ERROR)
						this.fail(`Deferred GPU validation failed (${error})`);
					this.uncheckedSince = null;
					this.stats.uncheckedBytes = 0;
				}
			} else if (state === this.gl.TIMEOUT_EXPIRED) {
				// Keep input sampling independent of GPU completion. The caller
				// retains dirty work and renders its latest view after this fence.
				this.stats.queueWaitFrames++;
				if (this.uncheckedSince !== null) this.stats.validationWaitFrames++;
				return false;
			} else {
				this.gl.deleteSync(this.validationFence);
				this.validationFence = null;
				this.fail("GPU validation fence failed");
			}
		}
		if (this.uncheckedSince === null) return true;
		// Defensive support for mutations outside a completed frame boundary.
		// endFrame(false) will fence them even when no drawing was submitted.
		this.stats.validationWaitFrames++;
		if (
			now - this.uncheckedSince >= VALIDATION_MAX_DELAY_MS ||
			this.stats.uncheckedBytes >= VALIDATION_MAX_BYTES
		) {
			this.stats.validationDrainFrames++;
			return false;
		}
		return true;
	}

	/** Must run after all frame commands, even when drawing partially failed. */
	endFrame(drew: boolean) {
		if (this.failure) return;
		// A skipped/idle callback must not move the fence behind more queued
		// work. beginFrame must permit a new draw before it can be submitted.
		if (this.validationFence && !drew) return;
		if (!drew && this.uncheckedSince === null) return;
		const fence = this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
		if (!fence) {
			if (this.validationFence) this.gl.deleteSync(this.validationFence);
			this.validationFence = null;
			this.fail("GPU validation fence allocation failed");
		}
		if (this.validationFence) this.gl.deleteSync(this.validationFence);
		this.validationFence = fence;
		this.fencedSerial = this.mutationSerial;
		// flush submits without waiting; clientWaitSync always uses timeout 0.
		this.gl.flush();
	}

	/** Track uploads owned by other renderers without polling the GPU. */
	noteExternalMutation(bytes: number) {
		if (this.failure) throw this.failure;
		if (!Number.isSafeInteger(bytes) || bytes < 0)
			throw RangeError(
				"External GPU mutation bytes must be a nonnegative safe integer.",
			);
		if (bytes) this.noteMutation(Math.min(bytes, VALIDATION_MAX_BYTES));
	}

	/** Resource owners that consume WebGL's shared error flag must report it.
	 * Its origin is unknowable after deferred uploads, so even an optional
	 * surface failure conservatively stops submission until context restoration.
	 */
	reportError(error: number) {
		if (error !== this.gl.NO_ERROR)
			this.fail(`GPU resource validation failed (${error})`);
	}

	private fail(message: string): never {
		this.failure ??= Error(`${message}; raw stroke data is retained.`);
		throw this.failure;
	}

	private noteMutation(bytes: number) {
		this.uncheckedSince ??= performance.now();
		this.stats.uncheckedBytes += bytes;
		this.mutationSerial++;
	}

	private pageCapacity(capacity: number, limit: number) {
		const remaining = Math.floor(
			(limit - this.allocatedBytes) / INSTANCE_BYTES,
		);
		if (remaining < capacity) return 0;
		return Math.min(
			Math.max(PAGE_UNITS, capacity),
			2 ** Math.floor(Math.log2(remaining)),
		);
	}

	canAllocate(count: number, limit: number) {
		if (!(this.allocatedBytes <= limit)) return false;
		if (count === 0) return true;
		const capacity = slotCapacity(count);
		if (!capacity) return false;
		for (const page of this.pages)
			if (page.free.some((range) => range.capacity >= capacity)) return true;
		return this.pageCapacity(capacity, limit) > 0;
	}

	/** Consolidate sparse pages only under allocation pressure. Copies stay
	 * between existing buffers, so no temporary GPU allocation exceeds the cap.
	 * Allocation objects retain identity; subsequent draws see their new slots. */
	compact(count: number, limit: number): boolean {
		if (this.failure) throw this.failure;
		if (this.canAllocate(count, limit)) return true;
		if (
			this.validationFence ||
			!slotCapacity(count) ||
			typeof this.gl.copyBufferSubData !== "function"
		)
			return false;
		const until = performance.now() + 2;
		for (let pass = 0; pass < 4 && performance.now() < until; pass++) {
			const pages: Page[] = [];
			for (const p of this.pages) {
				pages.push(p);
				if (pages.length === 64) break;
			}
			if (pages.length < 2) break;
			const entries = new Map<Page, Allocation[]>();
			let scanned = 0;
			for (const [a, p] of this.allocations) {
				if (++scanned > 4096) break;
				if (pages.includes(p)) {
					let list = entries.get(p);
					if (!list) {
						list = [];
						entries.set(p, list);
					}
					list.push(a);
				}
			}
			let moved = false;
			for (const source of pages) {
				if (performance.now() >= until) break;
				const live = entries.get(source) ?? [];
				if (
					!live.length ||
					live.length !== source.live ||
					live.length > 16 ||
					live.reduce((n, a) => n + a.capacity, 0) > source.capacity / 2
				)
					continue;
				const free = new Map(
					pages
						.filter((p) => p !== source)
						.map((p) => [p, p.free.map((r) => ({ ...r }))]),
				);
				const moves: {
					allocation: Allocation;
					target: Page;
					offset: number;
				}[] = [];
				for (const a of live.sort((a, b) => b.capacity - a.capacity)) {
					let placed = false;
					for (const [p, ranges] of free) {
						const range = ranges.find((r) => r.capacity >= a.capacity);
						if (!range) continue;
						moves.push({ allocation: a, target: p, offset: range.offset });
						range.offset += a.capacity;
						range.capacity -= a.capacity;
						placed = true;
						break;
					}
					if (!placed) break;
				}
				if (moves.length !== live.length) continue;
				for (const { allocation: a, target, offset } of moves) {
					const replacement = this.take(
						target,
						target.free.findIndex((r) => r.offset === offset),
						a.capacity,
					);
					try {
						this.gl.bindBuffer(this.gl.COPY_READ_BUFFER, a.buffer);
						this.gl.bindBuffer(this.gl.COPY_WRITE_BUFFER, replacement.buffer);
						this.gl.copyBufferSubData(
							this.gl.COPY_READ_BUFFER,
							this.gl.COPY_WRITE_BUFFER,
							a.offset * INSTANCE_BYTES,
							replacement.offset * INSTANCE_BYTES,
							a.capacity * INSTANCE_BYTES,
						);
					} catch (error) {
						this.free(replacement);
						throw error;
					}
					this.noteMutation(a.capacity * INSTANCE_BYTES);
					this.stats.compactionCopies++;
					this.stats.compactionBytes += a.capacity * INSTANCE_BYTES;
					this.free(a);
					this.allocations.delete(replacement);
					Object.assign(a, {
						buffer: replacement.buffer,
						offset: replacement.offset,
					});
					this.allocations.set(a, target);
				}
				this.gl.bindBuffer(this.gl.COPY_READ_BUFFER, null);
				this.gl.bindBuffer(this.gl.COPY_WRITE_BUFFER, null);
				this.stats.compactionPages++;
				moved = true;
				break;
			}
			if (this.canAllocate(count, limit)) return true;
			if (!moved) break;
		}
		return false;
	}

	allocate(count: number, limit: number): Allocation | null {
		if (this.failure) throw this.failure;
		const capacity = slotCapacity(count);
		if (!capacity || !(this.allocatedBytes <= limit)) return null;
		for (const page of this.pages) {
			const index = page.free.findIndex((range) => range.capacity >= capacity);
			if (index !== -1) return this.take(page, index, capacity);
		}
		const pageCapacity = this.pageCapacity(capacity, limit);
		if (!pageCapacity) return null;
		const buffer = this.gl.createBuffer();
		if (!buffer)
			throw Error("GPU arena allocation failed; raw stroke data is retained.");
		try {
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
			this.gl.bufferData(
				this.gl.ARRAY_BUFFER,
				pageCapacity * INSTANCE_BYTES,
				this.gl.DYNAMIC_DRAW,
			);
			this.noteMutation(pageCapacity * INSTANCE_BYTES);
		} catch (error) {
			this.gl.deleteBuffer(buffer);
			throw error;
		}
		const page: Page = {
			buffer,
			capacity: pageCapacity,
			free: [{ offset: 0, capacity: pageCapacity }],
			live: 0,
		};
		this.pages.add(page);
		this.allocatedBytes += pageCapacity * INSTANCE_BYTES;
		return this.take(page, 0, capacity);
	}

	private take(page: Page, index: number, capacity: number): Allocation {
		const range = page.free[index];
		const allocation = { buffer: page.buffer, offset: range.offset, capacity };
		range.offset += capacity;
		range.capacity -= capacity;
		if (!range.capacity) page.free.splice(index, 1);
		page.live++;
		this.allocations.set(allocation, page);
		return allocation;
	}

	/** Upload all slot bytes, including zero padding needed for adjacent batching. */
	upload(
		allocation: Allocation,
		data: Float32Array,
		color: number,
		opacity = 1,
		stride: 3 | 6 = 6,
		brush = 0,
		width = 1,
		seed = 0,
	) {
		if (this.failure) throw this.failure;
		const count = stride === 3 ? data.length / 3 - 1 : data.length / 6;
		if (
			!this.allocations.has(allocation) ||
			data.length % stride !== 0 ||
			count < 0 ||
			count > allocation.capacity
		)
			throw Error("Invalid GPU arena upload; raw stroke data is retained.");
		const bytes = allocation.capacity * INSTANCE_BYTES;
		if (this.scratch.byteLength < bytes) {
			this.scratch = new ArrayBuffer(bytes);
			this.scratchFloats = new Float32Array(this.scratch);
			this.scratchBytes = new Uint8Array(this.scratch);
		}
		this.scratchBytes.fill(0, 0, bytes);
		const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
		// Logarithmic width keeps grain scale identical across all capsules,
		// including pressure tapers, without expanding the instance format.
		const packedWidth = Math.max(
			0,
			Math.min(
				65535,
				Math.round((Math.log2(Math.max(2 ** -32, width)) + 32) * 1024),
			),
		);
		for (let i = 0; i < count; i++) {
			const source = i * stride;
			const target = i * (INSTANCE_BYTES / 4);
			for (let k = 0; k < 6; k++)
				this.scratchFloats[target + k] = data[source + k];
			const ink = i * INSTANCE_BYTES + 24;
			this.scratchBytes[ink] = (color >>> 16) & 255;
			this.scratchBytes[ink + 1] = (color >>> 8) & 255;
			this.scratchBytes[ink + 2] = color & 255;
			this.scratchBytes[ink + 3] = alpha;
			this.scratchBytes[ink + 4] = brush;

			this.scratchBytes[ink + 5] = packedWidth & 255;
			this.scratchBytes[ink + 6] = packedWidth >>> 8;
			this.scratchBytes[ink + 7] = seed & 255;
		}
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, allocation.buffer);
		this.gl.bufferSubData(
			this.gl.ARRAY_BUFFER,
			allocation.offset * INSTANCE_BYTES,
			this.scratchBytes.subarray(0, bytes),
		);
		this.noteMutation(bytes);
		return bytes;
	}

	free(allocation: Allocation) {
		const page = this.allocations.get(allocation);
		if (!page) return;
		this.allocations.delete(allocation);
		page.live--;
		if (!page.live) {
			this.gl.deleteBuffer(page.buffer);
			this.pages.delete(page);
			this.allocatedBytes -= page.capacity * INSTANCE_BYTES;
			return;
		}
		page.free.push({
			offset: allocation.offset,
			capacity: allocation.capacity,
		});
		page.free.sort((a, b) => a.offset - b.offset);
		for (let i = 1; i < page.free.length; ) {
			const previous = page.free[i - 1];
			const current = page.free[i];
			if (previous.offset + previous.capacity === current.offset) {
				previous.capacity += current.capacity;
				page.free.splice(i, 1);
			} else i++;
		}
	}

	contextLost() {
		// Context restoration invalidates old objects and the latched failure.
		this.validationFence = null;
		this.uncheckedSince = null;
		this.mutationSerial = 0;
		this.fencedSerial = 0;
		this.failure = null;
		this.stats.uncheckedBytes = 0;
		this.pages.clear();
		this.allocations.clear();
		this.allocatedBytes = 0;
	}
}
