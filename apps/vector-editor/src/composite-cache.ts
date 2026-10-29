import type { Camera } from "./camera";
import type { Bounds, DrawRecord } from "./geometry-cache";
import { PersistentTiles } from "./persistent-tiles";

export type CompositeView = {
	contentVersion?: string;
	width: number;
	height: number;
	cssWidth: number;
	cssHeight: number;
	dpr: number;
	cx: number;
	cy: number;
	zoom: number;
	rotation: number;
};
type Surface = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };
const TILE = 256;
const DEFAULT_LIMIT = 64 * 1024 * 1024;

/** Final pixels, never a rescaled preview. Changed regions replay global ink groups. */
export class CompositeCache {
	private surfaces: Surface[] = [];
	private tiles: PersistentTiles;
	private tilesEnabled = true;
	setPersistentTiles(enabled: boolean) {
		this.tilesEnabled = enabled;
		this.tiles.dispose();
		Object.assign(this.stats, this.tiles.stats);
	}

	private width = 0;
	private height = 0;
	private front = 0;
	private valid = false;
	private previous: CompositeView | null = null;
	private records = new Map<string, DrawRecord>();
	private pending: {
		view: CompositeView;
		records: Map<string, DrawRecord>;
	} | null = null;
	private enabled = true;
	private limit = DEFAULT_LIMIT;
	private program: WebGLProgram;
	private vao: WebGLVertexArrayObject;
	private sampler: WebGLUniformLocation | null;
	readonly stats = {
		persistentTileBytes: 0,
		persistentTileHits: 0,
		persistentTileBlits: 0,
		persistentTileStores: 0,
		compositeCacheHits: 0,
		compositeCacheMisses: 0,
		compositeCacheBytes: 0,
		compositeCacheBlits: 0,
		compositeCacheDraws: 0,
	};

	constructor(
		private gl: WebGL2RenderingContext,
		private reportGpuError: (error: number) => void = () => {},
	) {
		this.tiles = new PersistentTiles(gl, reportGpuError);
		const program = gl.createProgram();
		const vao = gl.createVertexArray();
		if (!program || !vao)
			throw Error("Could not create the region cache presenter.");
		for (const [type, source] of [
			[
				gl.VERTEX_SHADER,
				`#version 300 es
void main(){vec2 p[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));gl_Position=vec4(p[gl_VertexID],0,1);}`,
			],
			[
				gl.FRAGMENT_SHADER,
				`#version 300 es
precision highp float;
uniform sampler2D pixels;
out vec4 color;
void main(){color=texelFetch(pixels,ivec2(gl_FragCoord.xy),0);}`,
			],
		] as const) {
			const shader = gl.createShader(type)!;
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
				throw Error(
					gl.getShaderInfoLog(shader) ?? "Region cache shader failed.",
				);
			gl.attachShader(program, shader);
			gl.deleteShader(shader);
		}
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
			throw Error(
				gl.getProgramInfoLog(program) ?? "Region cache program failed.",
			);
		this.program = program;
		this.vao = vao;
		this.sampler = gl.getUniformLocation(program, "pixels");
	}

	invalidate() {
		this.valid = false;
		this.tiles.clear();
	}
	setEnabled(enabled: boolean) {
		this.enabled = enabled;
		this.release();
	}
	setLimit(bytes: number) {
		this.limit = Number.isFinite(bytes)
			? Math.max(0, Math.min(DEFAULT_LIMIT, bytes))
			: DEFAULT_LIMIT;
		this.release();
	}
	private release() {
		this.tiles.dispose();
		Object.assign(this.stats, this.tiles.stats);
		for (const surface of this.surfaces) {
			this.gl.deleteTexture(surface.texture);
			this.gl.deleteFramebuffer(surface.framebuffer);
		}
		this.surfaces = [];
		this.width = this.height = 0;
		this.valid = false;
		this.previous = null;
		this.pending = null;
		this.records.clear();
		this.stats.compositeCacheBytes = 0;
	}
	private allocate(width: number, height: number) {
		if (this.width === width && this.height === height) return true;
		// Release first: resizing cannot temporarily exceed the cache's byte cap.
		this.release();
		const gl = this.gl;
		if (width * height * 8 > this.limit) return false;
		for (let i = 0; i < 2; i++) {
			const texture = gl.createTexture();
			const framebuffer = gl.createFramebuffer();
			if (!texture || !framebuffer) {
				gl.deleteTexture(texture);
				gl.deleteFramebuffer(framebuffer);
				this.release();
				return false;
			}
			this.surfaces.push({ texture, framebuffer });
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
				width,
				height,
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
				gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
			const error = gl.getError();
			if (!complete || error !== gl.NO_ERROR) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.bindTexture(gl.TEXTURE_2D, null);
				this.release();
				// A consumed flag may come from earlier geometry work. Cleanup
				// precedes reporting so a latched failure cannot leak surfaces.
				if (error !== gl.NO_ERROR) this.reportGpuError(error);
				return false;
			}
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		this.width = width;
		this.height = height;
		this.front = 0;
		this.stats.compositeCacheBytes = width * height * 8;
		return true;
	}

	prepare(view: CompositeView, records: DrawRecord[], camera: Camera) {
		const { width, height } = view;
		this.tiles.resetStats();
		this.stats.compositeCacheHits = this.stats.compositeCacheMisses = 0;
		this.stats.compositeCacheBlits = this.stats.compositeCacheDraws = 0;
		if (!this.enabled || !this.allocate(width, height)) {
			this.valid = false;
			return null;
		}
		const columns = Math.ceil(width / TILE),
			rows = Math.ceil(height / TILE);
		const damaged = new Uint8Array(columns * rows);
		const damage = (bounds: Bounds) => {
			const x0 = Math.max(0, Math.floor(bounds[0] / TILE));
			const y0 = Math.max(0, Math.floor(bounds[1] / TILE));
			const x1 = Math.min(columns, Math.ceil(bounds[2] / TILE));
			const y1 = Math.min(rows, Math.ceil(bounds[3] / TILE));
			for (let y = y0; y < y1; y++)
				for (let x = x0; x < x1; x++) damaged[y * columns + x] = 1;
		};
		const previous = this.previous;
		let reuse =
			this.valid &&
			previous !== null &&
			previous.width === width &&
			previous.height === height &&
			previous.cssWidth === view.cssWidth &&
			previous.cssHeight === view.cssHeight &&
			previous.dpr === view.dpr &&
			previous.zoom === view.zoom &&
			previous.rotation === view.rotation;
		const dx = previous ? ((view.cx - previous.cx) * width) / view.cssWidth : 0;
		const dy = previous
			? ((view.cy - previous.cy) * height) / view.cssHeight
			: 0;
		const ix = Math.round(dx),
			iy = Math.round(dy);
		const integerShift = Math.abs(dx - ix) < 1e-7 && Math.abs(dy - iy) < 1e-7;
		const archiveCompatible =
			this.tilesEnabled &&
			reuse &&
			integerShift &&
			view.contentVersion !== undefined &&
			previous?.contentVersion === view.contentVersion;
		if (archiveCompatible)
			this.tiles.configure(previous, [...this.records.values()], view, records);
		if (!archiveCompatible) this.tiles.clear();
		else if (ix || iy)
			this.tiles.capture(
				previous!,
				this.surfaces[this.front].framebuffer,
				view,
				this.limit - width * height * 8,
			);
		reuse &&= integerShift && Math.abs(ix) < width && Math.abs(iy) < height;
		const current = new Map(
			records.map((record) => [`${record.id}:${record.chunk}`, record]),
		);
		if (!reuse) damaged.fill(1);
		else {
			if (ix || iy) {
				const gl = this.gl;
				const source = this.surfaces[this.front];
				this.front = 1 - this.front;
				gl.disable(gl.SCISSOR_TEST);
				gl.bindFramebuffer(gl.READ_FRAMEBUFFER, source.framebuffer);
				gl.bindFramebuffer(
					gl.DRAW_FRAMEBUFFER,
					this.surfaces[this.front].framebuffer,
				);
				const left = Math.max(0, ix),
					top = Math.max(0, iy);
				const right = Math.min(width, width + ix),
					bottom = Math.min(height, height + iy);
				gl.blitFramebuffer(
					left - ix,
					height - bottom + iy,
					right - ix,
					height - top + iy,
					left,
					height - bottom,
					right,
					height - top,
					gl.COLOR_BUFFER_BIT,
					gl.NEAREST,
				);
				this.stats.compositeCacheBlits++;
				if (ix > 0) damage([0, 0, ix, height]);
				if (ix < 0) damage([width + ix, 0, width, height]);
				if (iy > 0) damage([0, 0, width, iy]);
				if (iy < 0) damage([0, height + iy, width, height]);
			}
			const damageRecord = (record: DrawRecord) => {
				const bounds = camera.deviceBounds(record.bounds, view.dpr);
				// Match the real viewport scaling when CSS dimensions round to device pixels.
				bounds[0] *= width / (view.cssWidth * view.dpr);
				bounds[2] *= width / (view.cssWidth * view.dpr);
				bounds[1] *= height / (view.cssHeight * view.dpr);
				bounds[3] *= height / (view.cssHeight * view.dpr);
				damage(bounds);
			};
			for (const [key, record] of current) {
				const old = this.records.get(key);
				if (
					!old ||
					old.serial !== record.serial ||
					old.group !== record.group
				) {
					if (old) damageRecord(old);
					damageRecord(record);
				}
			}
			for (const [key, old] of this.records)
				if (!current.has(key)) damageRecord(old);
		}
		if (archiveCompatible)
			for (let y = 0; y < rows; y++)
				for (let x = 0; x < columns; x++) {
					const index = y * columns + x;
					if (
						damaged[index] &&
						this.tiles.restore(view, this.surfaces[this.front].framebuffer, [
							x * TILE,
							y * TILE,
							Math.min(width, (x + 1) * TILE),
							Math.min(height, (y + 1) * TILE),
						])
					)
						damaged[index] = 0;
				}
		Object.assign(this.stats, this.tiles.stats);
		// Merge identical horizontal runs vertically, keeping rebuild call counts bounded.
		const regions: Bounds[] = [];
		let previousRuns = new Map<string, Bounds>();
		for (let y = 0; y < rows; y++) {
			const runs = new Map<string, Bounds>();
			for (let x = 0; x < columns; ) {
				if (!damaged[y * columns + x]) {
					x++;
					continue;
				}
				const start = x;
				while (x < columns && damaged[y * columns + x]) x++;
				const key = `${start}:${x}`;
				const region =
					previousRuns.get(key) ??
					([start * TILE, y * TILE, Math.min(width, x * TILE), 0] as Bounds);
				if (!previousRuns.has(key)) regions.push(region);
				region[3] = Math.min(height, (y + 1) * TILE);
				runs.set(key, region);
			}
			previousRuns = runs;
		}
		this.stats.compositeCacheMisses = damaged.reduce((a, b) => a + b, 0);
		this.stats.compositeCacheHits =
			damaged.length - this.stats.compositeCacheMisses;
		// Until a complete reconstruction succeeds, partially updated pixels are invalid.
		this.valid = false;
		this.pending = { view: { ...view }, records: current };
		return { framebuffer: this.surfaces[this.front].framebuffer, regions };
	}

	present() {
		if (!this.pending) return;
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this.width, this.height);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		gl.disable(gl.DITHER);
		gl.useProgram(this.program);
		gl.bindVertexArray(this.vao);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.surfaces[this.front].texture);
		gl.uniform1i(this.sampler, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindVertexArray(null);
		this.stats.compositeCacheDraws++;
		this.previous = this.pending.view;
		this.records = this.pending.records;
		this.pending = null;
		this.valid = true;
	}
}
