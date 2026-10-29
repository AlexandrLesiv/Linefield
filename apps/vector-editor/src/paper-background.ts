import type { Camera } from "./camera";
import type { CoverageBounds } from "./coverage-renderer";

export type GridStyle = "none" | "notebook" | "dots";
export type PaperStyle = "none" | "warm" | "white";
export type PaperSettings = { texture: PaperStyle; grid: GridStyle };

const SIZE = 256;
const GRID = 24;
const vertex = `#version 300 es
void main() {
  vec2 p[3] = vec2[3](vec2(-1,-1), vec2(3,-1), vec2(-1,3));
  gl_Position = vec4(p[gl_VertexID], 0, 1);
}`;
const fragment = `#version 300 es
precision highp float;
uniform sampler2D grain;
uniform vec2 viewport;
uniform vec2 cssPerPixel;
uniform vec2 rotation;
uniform float zoom;
uniform vec2 paperOrigin;
uniform vec2 gridOrigin;
uniform int paperStyle;
uniform int gridStyle;
out vec4 color;
void main() {
  vec2 screen = vec2(gl_FragCoord.x, viewport.y - gl_FragCoord.y) * cssPerPixel;
  vec2 world = vec2(rotation.x * screen.x + rotation.y * screen.y,
                   -rotation.y * screen.x + rotation.x * screen.y) / zoom;
  vec3 base = vec3(1);
  if (paperStyle != 0) {
    float fiber = texture(grain, (world + paperOrigin) / 256.0).r - 0.5;
    base = paperStyle == 1
      ? vec3(0.979, 0.968, 0.946) + fiber * 0.065
      : vec3(0.992) + fiber * 0.014;
  }
  if (gridStyle != 0) {
    vec2 p = world + gridOrigin;
    vec2 distanceToLine = abs(mod(p + 12.0, 24.0) - 12.0);
    float ink;
    if (gridStyle == 1) {
      vec2 footprint = max(fwidth(p), vec2(0.0001));
      // Integrate a thin strip over a pixel instead of letting narrow lines blink.
      vec2 coverage = clamp((0.3 + footprint * 0.5 - distanceToLine) / footprint,
                           vec2(0), min(vec2(1), 0.6 / footprint));
      ink = max(coverage.x, coverage.y) * 0.32;
    } else {
      // Round dots at the same world-space intersections, with a device-pixel edge.
      float pixel = max(max(length(dFdx(p)), length(dFdy(p))), 0.0001);
      float radius = 1.1;
      float coverage = 1.0 - smoothstep(radius - pixel * 0.5,
                                       radius + pixel * 0.5, length(distanceToLine));
      coverage = min(coverage, 3.14159265 * radius * radius / (pixel * pixel));
      ink = coverage * 0.55;
    }
    ink *= smoothstep(5.0, 12.0, 24.0 * zoom);
    base = mix(base, vec3(0.46, 0.63, 0.73), ink);
  }
  color = vec4(base, 1);
}`;

/** A small, deterministic, tileable grain. Built once, never per camera frame. */
function paperGrain() {
	const noise = (x: number, y: number) => {
		let n = Math.imul(x & 255, 374761393) ^ Math.imul(y & 255, 668265263);
		n = Math.imul(n ^ (n >>> 13), 1274126177);
		return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
	};
	const data = new Uint8Array(SIZE * SIZE);
	for (let y = 0; y < SIZE; y++) {
		for (let x = 0; x < SIZE; x++) {
			const fine = noise(x, y);
			const fiber = (noise(x, y - 1) + noise(x, y) + noise(x, y + 1)) / 3;
			data[y * SIZE + x] = Math.round((fine * 0.6 + fiber * 0.4) * 255);
		}
	}
	return data;
}

/** Paint beneath ink into the same damaged regions as the final-pixel cache. */
export class PaperBackground {
	private program: WebGLProgram;
	private vao: WebGLVertexArrayObject;
	private texture: WebGLTexture | null = null;
	private locations: Record<string, WebGLUniformLocation | null> = {};
	readonly stats = { draws: 0, textureBytes: 0 };

	constructor(private gl: WebGL2RenderingContext) {
		const program = gl.createProgram();
		const vao = gl.createVertexArray();
		if (!program || !vao)
			throw Error("Could not prepare the paper background.");
		this.program = program;
		this.vao = vao;
		for (const [type, source] of [
			[gl.VERTEX_SHADER, vertex],
			[gl.FRAGMENT_SHADER, fragment],
		] as const) {
			const shader = gl.createShader(type);
			if (!shader) throw Error("Could not prepare the paper shader.");
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
				throw Error(gl.getShaderInfoLog(shader) ?? "Paper shader failed.");
			gl.attachShader(program, shader);
			gl.deleteShader(shader);
		}
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
			throw Error(gl.getProgramInfoLog(program) ?? "Paper program failed.");
		for (const name of [
			"grain",
			"viewport",
			"cssPerPixel",
			"rotation",
			"zoom",
			"paperOrigin",
			"gridOrigin",
			"paperStyle",
			"gridStyle",
		])
			this.locations[name] = gl.getUniformLocation(program, name);
	}

	private ensureTexture() {
		if (this.texture) return;
		const gl = this.gl;
		const texture = gl.createTexture();
		if (!texture) throw Error("Could not allocate the paper grain.");
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.R8,
			SIZE,
			SIZE,
			0,
			gl.RED,
			gl.UNSIGNED_BYTE,
			paperGrain(),
		);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_MIN_FILTER,
			gl.LINEAR_MIPMAP_LINEAR,
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		this.texture = texture;
		this.stats.textureBytes = 87381; // 256² R8 plus all mip levels.
	}

	draw(
		settings: PaperSettings,
		camera: Camera,
		width: number,
		height: number,
		cssWidth: number,
		cssHeight: number,
		target: WebGLFramebuffer | null,
		region: CoverageBounds,
	) {
		if (settings.texture === "none" && settings.grid === "none") return;
		const gl = this.gl;
		const u = this.locations;
		const [x, y] = camera.screenToWorld(0, 0);
		gl.activeTexture(gl.TEXTURE0);
		// Bind a complete sampler even in grid-only mode; allocation stays bounded.
		this.ensureTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.bindFramebuffer(gl.FRAMEBUFFER, target);
		gl.viewport(0, 0, width, height);
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(
			region[0],
			height - region[3],
			region[2] - region[0],
			region[3] - region[1],
		);
		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.CULL_FACE);
		gl.useProgram(this.program);
		gl.bindVertexArray(this.vao);
		gl.uniform1i(u.grain, 0);
		gl.uniform2f(u.viewport, width, height);
		gl.uniform2f(u.cssPerPixel, cssWidth / width, cssHeight / height);
		gl.uniform2f(
			u.rotation,
			Math.cos(camera.rotation),
			Math.sin(camera.rotation),
		);
		gl.uniform1f(u.zoom, camera.zoom);
		gl.uniform2f(u.paperOrigin, camera.phase(0, x, SIZE), camera.phase(1, y, SIZE));
		gl.uniform2f(u.gridOrigin, camera.phase(0, x, GRID), camera.phase(1, y, GRID));
		gl.uniform1i(
			u.paperStyle,
			settings.texture === "warm" ? 1 : settings.texture === "white" ? 2 : 0,
		);
		gl.uniform1i(
			u.gridStyle,
			settings.grid === "notebook" ? 1 : settings.grid === "dots" ? 2 : 0,
		);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		this.stats.draws++;
		gl.bindVertexArray(null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
}
