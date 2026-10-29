import type { Bounds } from "./geometry-cache";
import type { GpuPassTimers } from "./gpu-pass-timers";
import type { AtlasRecord, SparseAtlasStep } from "./sparse-atlas-plan";

type Batch = Extract<SparseAtlasStep, { kind: "atlas" }>;
export const ATLAS_SIZE = 2048;
export const ATLAS_TILE = 64;
const ROUTE_WIDTH = 1024;
const ROUTE_HEIGHT = 16;
const CAPACITY = (ATLAS_SIZE / ATLAS_TILE) ** 2;

function exactTileCoordinate(coordinate: number) {
	return (
		Number.isInteger(coordinate / ATLAS_TILE) &&
		coordinate >= -32768 * ATLAS_TILE &&
		coordinate <= 32767 * ATLAS_TILE
	);
}

function presenter(gl: WebGL2RenderingContext) {
	const program = gl.createProgram();
	if (!program) throw Error("Could not create sparse coverage presenter.");
	try {
		for (const [type, source] of [
			[
				gl.VERTEX_SHADER,
				`#version 300 es
precision highp float;
layout(location=0) in vec4 target;
layout(location=1) in vec2 offset;
uniform vec2 outputSize;
flat out vec2 sourceOffset;
void main(){
 vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
 vec2 p=mix(target.xy,target.zw,corners[gl_VertexID]);
 sourceOffset=offset;
 gl_Position=vec4(p/outputSize*vec2(2,-2)+vec2(-1,1),0,1);
}`,
			],
			[
				gl.FRAGMENT_SHADER,
				`#version 300 es
precision highp float;
uniform highp sampler2D coverage;
uniform vec2 outputSize;
flat in vec2 sourceOffset;
out vec4 outColor;
void main(){
 ivec2 p=ivec2(floor(vec2(gl_FragCoord.x,outputSize.y-gl_FragCoord.y)))+ivec2(sourceOffset);
 outColor=texelFetch(coverage,ivec2(p.x,2047-p.y),0);
}`,
			],
		] as const) {
			const shader = gl.createShader(type);
			if (!shader) throw Error("Could not create sparse coverage shader.");
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
			const message = ok ? "" : gl.getShaderInfoLog(shader);
			gl.attachShader(program, shader);
			gl.deleteShader(shader);
			if (!ok) throw Error(message ?? "Sparse coverage shader failed.");
		}
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
			throw Error(gl.getProgramInfoLog(program) ?? "Sparse presenter failed.");
		return program;
	} catch (error) {
		gl.deleteProgram(program);
		throw error;
	}
}

/** Bounded scratch coverage, regenerated at the exact current device pixels.
 * Each global group/tile owns one slot. All pieces MAX-union into that slot,
 * then disjoint tile quads composite in original group order in one draw.
 */
export class SparseCoverage {
	private framebuffer: WebGLFramebuffer | null = null;
	private mask: WebGLTexture | null = null;
	private routes: WebGLTexture | null = null;
	private quads: WebGLBuffer | null = null;
	private vao: WebGLVertexArrayObject | null = null;
	private program: WebGLProgram | null = null;
	private sizeLoc: WebGLUniformLocation | null = null;
	private samplerLoc: WebGLUniformLocation | null = null;
	private failed = false;
	private routeData = new Int16Array(ROUTE_WIDTH * ROUTE_HEIGHT * 4);
	private quadData = new Float32Array(CAPACITY * 6);
	private bases = new Uint32Array(ROUTE_WIDTH * ROUTE_HEIGHT);
	readonly stats = {
		atlasBatches: 0,
		atlasTiles: 0,
		atlasBytes: 0,
		atlasRoutes: 0,
	};

	constructor(
		private gl: WebGL2RenderingContext,
		private reportGpuError: (error: number) => void = () => {},
		private noteGpuMutation: (bytes: number) => void = () => {},
		private timings?: GpuPassTimers,
	) {}

	resetStats() {
		this.stats.atlasBatches =
			this.stats.atlasTiles =
			this.stats.atlasRoutes =
				0;
	}

	private texture(
		internal: number,
		width: number,
		height: number,
		type: number,
		format: number = this.gl.RGBA,
	) {
		const gl = this.gl;
		const texture = gl.createTexture();
		if (!texture) throw Error("Sparse coverage texture allocation failed.");
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			internal,
			width,
			height,
			0,
			format,
			type,
			null,
		);
		return texture;
	}

	/** Unsupported resources fall back; shared GPU errors remain latched. */
	available() {
		if (this.failed) return false;
		if (this.mask) return true;
		const gl = this.gl;
		let consumedError: number = gl.NO_ERROR;
		try {
			if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < ATLAS_SIZE) {
				this.failed = true;
				return false;
			}
			this.program = presenter(gl);
			this.framebuffer = gl.createFramebuffer();
			this.quads = gl.createBuffer();
			this.vao = gl.createVertexArray();
			if (!this.framebuffer || !this.quads || !this.vao)
				throw Error("Sparse coverage allocation failed.");
			gl.activeTexture(gl.TEXTURE0);
			this.mask = this.texture(
				gl.RGBA8,
				ATLAS_SIZE,
				ATLAS_SIZE,
				gl.UNSIGNED_BYTE,
			);
			this.routes = this.texture(
				gl.RGBA16I,
				ROUTE_WIDTH,
				ROUTE_HEIGHT,
				gl.SHORT,
				gl.RGBA_INTEGER,
			);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				this.mask,
				0,
			);
			gl.bindVertexArray(this.vao);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.quads);
			gl.bufferData(gl.ARRAY_BUFFER, this.quadData.byteLength, gl.DYNAMIC_DRAW);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0);
			gl.vertexAttribDivisor(0, 1);
			gl.enableVertexAttribArray(1);
			gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16);
			gl.vertexAttribDivisor(1, 1);
			const complete =
				gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
			consumedError = gl.getError();
			if (!complete || consumedError !== gl.NO_ERROR)
				throw Error("Sparse coverage framebuffer allocation failed.");
			this.sizeLoc = gl.getUniformLocation(this.program, "outputSize");
			this.samplerLoc = gl.getUniformLocation(this.program, "coverage");
			this.stats.atlasBytes =
				ATLAS_SIZE ** 2 * 4 +
				this.routeData.byteLength +
				this.quadData.byteLength;
			return true;
		} catch {
			this.dispose();
			this.failed = true;
			// Cleanup first. A consumed flag may belong to earlier geometry work;
			// its shared reporter must be allowed to throw outside this catch.
			const error = consumedError || gl.getError();
			if (error !== gl.NO_ERROR) this.reportGpuError(error);
			return false;
		} finally {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.bindVertexArray(null);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
	}

	render(
		batch: Batch,
		output: WebGLFramebuffer | null,
		clip: Bounds,
		width: number,
		height: number,
		draw: (record: AtlasRecord, routeBase: number) => void,
	) {
		const gl = this.gl;
		const requiredRoutes = batch.records.reduce(
			(n, record) => n + record.tiles.length,
			0,
		);
		if (
			requiredRoutes > ROUTE_WIDTH * ROUTE_HEIGHT ||
			batch.tiles.length > CAPACITY
		)
			throw Error("Sparse coverage batch exceeds its bounded storage.");
		// Tile coordinates are exact signed integers, independently of world scale.
		// Validate once per unique tile, before uploading or drawing any part.
		for (const tile of batch.tiles)
			if (!exactTileCoordinate(tile.x) || !exactTileCoordinate(tile.y))
				throw RangeError(
					"Sparse coverage tile exceeds exact route coordinates.",
				);
		let routeCount = 0;
		let recordIndex = 0;
		for (const record of batch.records) {
			this.bases[recordIndex++] = routeCount;
			for (const slot of record.tiles) {
				const offset = routeCount++ * 4;
				if (slot < 0) {
					this.routeData[offset + 2] = -1;
					continue;
				}
				const tile = batch.tiles[slot];
				this.routeData[offset] = tile.x / ATLAS_TILE;
				this.routeData[offset + 1] = tile.y / ATLAS_TILE;
				this.routeData[offset + 2] = slot % 32;
				this.routeData[offset + 3] = Math.floor(slot / 32);
			}
		}
		if (
			routeCount > ROUTE_WIDTH * ROUTE_HEIGHT ||
			batch.tiles.length > CAPACITY
		)
			throw Error("Sparse coverage batch exceeds its bounded storage.");
		this.timings?.begin("atlasUpload");
		this.noteGpuMutation(
			Math.ceil(routeCount / ROUTE_WIDTH) * ROUTE_WIDTH * 8 +
				batch.tiles.length * 24,
		);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.routes);
		gl.texSubImage2D(
			gl.TEXTURE_2D,
			0,
			0,
			0,
			ROUTE_WIDTH,
			Math.ceil(routeCount / ROUTE_WIDTH),
			gl.RGBA_INTEGER,
			gl.SHORT,
			this.routeData,
		);
		this.timings?.begin("atlasCoverage");
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.viewport(0, 0, ATLAS_SIZE, ATLAS_SIZE);
		gl.bindVertexArray(null);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.BLEND);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendEquation(gl.MAX);
		gl.blendFunc(gl.ONE, gl.ONE);
		for (let i = 0; i < batch.records.length; i++) {
			const record = batch.records[i];
			draw(record, this.bases[i]);
		}
		this.timings?.end();
		for (const tile of batch.tiles) {
			const x = (tile.slot % 32) * ATLAS_TILE,
				y = Math.floor(tile.slot / 32) * ATLAS_TILE;
			const offset = tile.slot * 6;
			for (let k = 0; k < 4; k++) this.quadData[offset + k] = tile.bounds[k];
			this.quadData[offset + 4] = x - tile.x;
			this.quadData[offset + 5] = y - tile.y;
		}
		this.timings?.begin("atlasComposite");
		gl.bindFramebuffer(gl.FRAMEBUFFER, output);
		gl.viewport(0, 0, width, height);
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(clip[0], height - clip[3], clip[2] - clip[0], clip[3] - clip[1]);
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFuncSeparate(
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA,
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA,
		);
		gl.useProgram(this.program);
		gl.bindVertexArray(this.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quads);
		gl.bufferSubData(
			gl.ARRAY_BUFFER,
			0,
			this.quadData.subarray(0, batch.tiles.length * 6),
		);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.mask);
		gl.uniform2f(this.sizeLoc, width, height);
		gl.uniform1i(this.samplerLoc, 0);
		gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, batch.tiles.length);
		this.timings?.end();
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindVertexArray(null);
		this.stats.atlasBatches++;
		this.stats.atlasTiles += batch.tiles.length;
		this.stats.atlasRoutes += routeCount;
	}

	dispose() {
		const gl = this.gl;
		gl.deleteTexture(this.mask);
		gl.deleteTexture(this.routes);
		gl.deleteBuffer(this.quads);
		gl.deleteVertexArray(this.vao);
		gl.deleteFramebuffer(this.framebuffer);
		gl.deleteProgram(this.program);
		this.mask = this.routes = null;
		this.quads = null;
		this.vao = null;
		this.framebuffer = null;
		this.program = null;
		this.stats.atlasBytes = 0;
	}
}
