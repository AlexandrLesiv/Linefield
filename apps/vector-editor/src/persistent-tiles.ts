import { Camera } from "./camera";
import type { CompositeView } from "./composite-cache";
import type { Bounds, DrawRecord } from "./geometry-cache";

const TILE = 256,
	SIZE = 2048,
	CAPACITY = 64,
	BYTES = SIZE * SIZE * 4;
type Tile = { slot: number; used: number; signature: string };
/** Exact-resolution document tiles, bounded independently of document area.
 * Only integer translation at unchanged scale/rotation is eligible. */
export class PersistentTiles {
	private texture: WebGLTexture | null = null;
	private framebuffer: WebGLFramebuffer | null = null;
	private tiles = new Map<string, Tile>();
	private clock = 0;
	private previousCount = 0;
	private checks = 0;
	private previousSignature: ((bounds: Bounds) => string | null) | null = null;
	private currentSignature: ((bounds: Bounds) => string | null) | null = null;
	configure(
		previous: CompositeView | null,
		oldRecords: DrawRecord[],
		current: CompositeView,
		records: DrawRecord[],
	) {
		this.checks = 0;
		this.previousCount = oldRecords.length;
		const make = (view: CompositeView, records: DrawRecord[]) => {
			const camera = new Camera();
			Object.assign(camera, view);
			const project = camera.deviceBoundsProjector(
					view.width / view.cssWidth,
					view.height / view.cssHeight,
				),
				scratch: Bounds = [0, 0, 0, 0],
				memo = new Map<string, string | null>();
			return (bounds: Bounds) => {
				const key = bounds.join(",");
				if (memo.has(key)) return memo.get(key)!;
				if (this.checks + records.length > 65536) {
					memo.set(key, null);
					return null;
				}
				this.checks += records.length;
				const entries: string[] = [];
				for (const r of records) {
					const b = project(r.bounds, 0, scratch);
					if (
						b[2] >= bounds[0] &&
						b[0] <= bounds[2] &&
						b[3] >= bounds[1] &&
						b[1] <= bounds[3]
					)
						entries.push(`${r.id}:${r.chunk}:${r.serial}:${r.group}`);
				}
				const signature = entries.join(",");
				memo.set(key, signature);
				return signature;
			};
		};
		this.previousSignature = previous ? make(previous, oldRecords) : null;
		this.currentSignature = make(current, records);
	}
	readonly stats = {
		persistentTileBytes: 0,
		persistentTileHits: 0,
		persistentTileBlits: 0,
		persistentTileStores: 0,
	};
	constructor(
		private gl: WebGL2RenderingContext,
		private reportError: (error: number) => void,
	) {}
	resetStats() {
		this.stats.persistentTileHits =
			this.stats.persistentTileBlits =
			this.stats.persistentTileStores =
				0;
	}
	clear() {
		this.tiles.clear();
		this.previousSignature = this.currentSignature = null;
	}
	dispose() {
		this.gl.deleteTexture(this.texture);
		this.gl.deleteFramebuffer(this.framebuffer);
		this.texture = null;
		this.framebuffer = null;
		this.clear();
		this.stats.persistentTileBytes = 0;
	}
	private allocate(limit: number) {
		if (limit < BYTES) {
			this.dispose();
			return false;
		}
		if (this.texture) return true;
		const gl = this.gl,
			texture = gl.createTexture(),
			framebuffer = gl.createFramebuffer();
		if (!texture || !framebuffer) {
			gl.deleteTexture(texture);
			gl.deleteFramebuffer(framebuffer);
			return false;
		}
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA8,
			SIZE,
			SIZE,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null,
		);
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			texture,
			0,
		);
		const complete =
				gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE,
			error = gl.getError();
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		if (!complete || error !== gl.NO_ERROR) {
			gl.deleteTexture(texture);
			gl.deleteFramebuffer(framebuffer);
			if (error !== gl.NO_ERROR) this.reportError(error);
			return false;
		}
		this.texture = texture;
		this.framebuffer = framebuffer;
		this.stats.persistentTileBytes = BYTES;
		return true;
	}
	private origin(view: CompositeView) {
		const x = (view.cx * view.width) / view.cssWidth,
			y = (view.cy * view.height) / view.cssHeight;
		return {
			x: Math.floor(x),
			y: Math.floor(y),
			phaseX: x - Math.floor(x),
			phaseY: y - Math.floor(y),
		};
	}
	private space(view: CompositeView) {
		const o = this.origin(view);
		return `${view.zoom}:${view.rotation}:${view.width / view.cssWidth}:${view.height / view.cssHeight}:${o.phaseX}:${o.phaseY}`;
	}
	private keys(view: CompositeView, bounds: Bounds) {
		const o = this.origin(view),
			space = this.space(view),
			result: { key: string; x: number; y: number }[] = [];
		for (
			let y = Math.floor((bounds[1] - o.y) / TILE);
			y < Math.ceil((bounds[3] - o.y) / TILE);
			y++
		)
			for (
				let x = Math.floor((bounds[0] - o.x) / TILE);
				x < Math.ceil((bounds[2] - o.x) / TILE);
				x++
			)
				result.push({
					key: `${space}:${x}:${y}`,
					x: o.x + x * TILE,
					y: o.y + y * TILE,
				});
		return result;
	}
	capture(
		previous: CompositeView,
		source: WebGLFramebuffer,
		next: CompositeView,
		limit: number,
	) {
		if (
			this.previousCount === 0 ||
			previous.contentVersion === undefined ||
			previous.contentVersion !== next.contentVersion ||
			this.space(previous) !== this.space(next)
		)
			return;
		if (!this.allocate(limit)) return;
		const gl = this.gl,
			origin = this.origin(previous),
			target = this.origin(next),
			space = this.space(previous);
		const protect = new Set(
			this.keys(next, [0, 0, next.width, next.height]).map((t) => t.key),
		);
		gl.disable(gl.SCISSOR_TEST);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, source);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.framebuffer);
		for (
			let y = Math.ceil(-origin.y / TILE);
			origin.y + y * TILE + TILE <= previous.height;
			y++
		)
			for (
				let x = Math.ceil(-origin.x / TILE);
				origin.x + x * TILE + TILE <= previous.width;
				x++
			) {
				const nx = target.x + x * TILE,
					ny = target.y + y * TILE;
				// Current viewport pixels already live in the ordinary region cache.
				if (
					nx >= 0 &&
					ny >= 0 &&
					nx + TILE <= next.width &&
					ny + TILE <= next.height
				)
					continue;
				const key = `${space}:${x}:${y}`;
				if (this.tiles.has(key)) continue;
				const sx = origin.x + x * TILE,
					sy = origin.y + y * TILE;
				const signature = this.previousSignature?.([
					sx,
					sy,
					sx + TILE,
					sy + TILE,
				]);
				if (!signature) continue;
				let slot = this.tiles.size;
				if (slot === CAPACITY) {
					let oldest: string | undefined,
						age = Infinity;
					for (const [k, t] of this.tiles)
						if (!protect.has(k) && t.used < age) {
							oldest = k;
							age = t.used;
						}
					if (oldest === undefined) continue;
					slot = this.tiles.get(oldest)!.slot;
					this.tiles.delete(oldest);
				}
				const dx = (slot % 8) * TILE,
					dy = Math.floor(slot / 8) * TILE;
				gl.blitFramebuffer(
					sx,
					previous.height - sy - TILE,
					sx + TILE,
					previous.height - sy,
					dx,
					SIZE - dy - TILE,
					dx + TILE,
					SIZE - dy,
					gl.COLOR_BUFFER_BIT,
					gl.NEAREST,
				);
				this.tiles.set(key, { slot, used: ++this.clock, signature });
				this.stats.persistentTileStores++;
			}
	}
	restore(view: CompositeView, target: WebGLFramebuffer, bounds: Bounds) {
		if (!this.framebuffer) return false;
		const required = this.keys(view, bounds);
		if (
			!required.length ||
			required.some((t) => {
				const tile = this.tiles.get(t.key);
				return (
					!tile ||
					this.currentSignature?.([t.x, t.y, t.x + TILE, t.y + TILE]) !==
						tile.signature
				);
			})
		)
			return false;
		const gl = this.gl;
		gl.disable(gl.SCISSOR_TEST);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebuffer);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, target);
		for (const part of required) {
			const tile = this.tiles.get(part.key)!;
			tile.used = ++this.clock;
			const left = Math.max(bounds[0], part.x),
				top = Math.max(bounds[1], part.y),
				right = Math.min(bounds[2], part.x + TILE),
				bottom = Math.min(bounds[3], part.y + TILE);
			const sx = (tile.slot % 8) * TILE + left - part.x,
				sy = Math.floor(tile.slot / 8) * TILE + top - part.y,
				w = right - left,
				h = bottom - top;
			gl.blitFramebuffer(
				sx,
				SIZE - sy - h,
				sx + w,
				SIZE - sy,
				left,
				view.height - bottom,
				right,
				view.height - top,
				gl.COLOR_BUFFER_BIT,
				gl.NEAREST,
			);
			this.stats.persistentTileBlits++;
		}
		this.stats.persistentTileHits++;
		return true;
	}
}
