import type { GpuPassTimers } from "./gpu-pass-timers";
/** Device-pixel bounds with the same top-left origin as the canvas camera. */
export type CoverageBounds = readonly [number, number, number, number];
type Scissor = readonly [number, number, number, number];

function compositeProgram(gl: WebGL2RenderingContext) {
	const program = gl.createProgram();
	if (!program) throw Error("Could not create the ink compositing program.");
	const shaders: WebGLShader[] = [];
	try {
		for (const [type, source] of [
			[
				gl.VERTEX_SHADER,
				`#version 300 es
precision highp float;
void main() {
  vec2 positions[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}`,
			],
			[
				gl.FRAGMENT_SHADER,
				`#version 300 es
precision highp float;
uniform sampler2D coverageMask;
out vec4 outColor;
void main() {
  outColor = texelFetch(coverageMask, ivec2(gl_FragCoord.xy), 0);
}`,
			],
		] as const) {
			const shader = gl.createShader(type);
			if (!shader) throw Error("Could not create the ink compositing shader.");
			shaders.push(shader);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
				throw Error(
					gl.getShaderInfoLog(shader) ?? "Ink shader compilation failed.",
				);
			gl.attachShader(program, shader);
		}
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
			throw Error(
				gl.getProgramInfoLog(program) ?? "Ink program linking failed.",
			);
		return program;
	} catch (error) {
		gl.deleteProgram(program);
		throw error;
	} finally {
		for (const shader of shaders) gl.deleteShader(shader);
	}
}

/**
 * Unions analytic segment coverage before applying ink opacity. The caller draws
 * one painter-ordered group between startRun and finishRun, binding its own
 * geometry program and writing premultiplied ink and coverage to the RGBA mask.
 * Separate strokes may share a group when their complete filter footprints
 * cannot overlap, or both use identical fully opaque ink. Translucent overlaps
 * need separate painter-ordered groups, including identical colors/opacities.
 *
 * A single viewport-sized mask is reused across all runs and frames. Run bounds
 * limit both clearing and compositing; retained stroke geometry stays untouched.
 */
export class CoverageRenderer {
	private framebuffer: WebGLFramebuffer;
	private mask: WebGLTexture | null = null;
	private program: WebGLProgram;
	private vao: WebGLVertexArrayObject;
	private maskLocation: WebGLUniformLocation | null;
	private maxTextureSize: number;
	private width = 0;
	private height = 0;
	private run: { scissor: Scissor } | null = null;
	private output: WebGLFramebuffer | null = null;
	private clip: CoverageBounds | null = null;
	readonly stats = { compositeDraws: 0, maskBytes: 0 };

	constructor(
		private gl: WebGL2RenderingContext,
		private reportGpuError: (error: number) => void = () => {},
		private timings?: GpuPassTimers,
	) {
		this.program = compositeProgram(gl);
		const framebuffer = gl.createFramebuffer();
		const vao = gl.createVertexArray();
		if (!framebuffer || !vao) {
			gl.deleteFramebuffer(framebuffer);
			gl.deleteVertexArray(vao);
			gl.deleteProgram(this.program);
			throw Error("Could not allocate ink compositing resources.");
		}
		this.framebuffer = framebuffer;
		this.vao = vao;
		this.maskLocation = gl.getUniformLocation(this.program, "coverageMask");
		this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
	}

	private resize(width: number, height: number) {
		if (width === this.width && height === this.height) return;
		const gl = this.gl;
		const texture = gl.createTexture();
		if (!texture)
			throw Error(
				"Could not allocate the ink coverage mask; raw strokes are retained.",
			);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
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
		gl.bindTexture(gl.TEXTURE_2D, null);
		if (complete && error === gl.NO_ERROR) {
			gl.deleteTexture(this.mask);
			this.mask = texture;
			this.width = width;
			this.height = height;
			this.stats.maskBytes = width * height * 4;
			return;
		}
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D,
			this.mask,
			0,
		);
		gl.deleteTexture(texture);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		// Cleanup and restore the old mask before the shared reporter can throw.
		if (error !== gl.NO_ERROR) this.reportGpuError(error);
		throw Error(
			"Could not allocate the ink coverage mask; raw strokes are retained.",
		);
	}

	begin(width: number, height: number) {
		if (
			!Number.isInteger(width) ||
			!Number.isInteger(height) ||
			width < 1 ||
			height < 1 ||
			width > this.maxTextureSize ||
			height > this.maxTextureSize
		)
			throw Error("The canvas dimensions exceed the ink coverage mask limit.");
		if (this.run)
			throw Error("Finish the current ink run before starting a frame.");
		this.resize(width, height);
		this.stats.compositeDraws = 0;
		this.output = null;
		this.clip = null;
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, width, height);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		gl.disable(gl.SAMPLE_COVERAGE);
		gl.disable(gl.DITHER);
		gl.colorMask(true, true, true, true);
		gl.clearColor(1, 1, 1, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	/** Clear one damaged region; every mask operation remains inside this clip. */
	setRegion(output: WebGLFramebuffer | null, clip: CoverageBounds) {
		if (this.run) throw Error("Finish the ink run before changing regions.");
		this.output = output;
		this.clip = clip;
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, output);
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(
			clip[0],
			this.height - clip[3],
			clip[2] - clip[0],
			clip[3] - clip[1],
		);
		gl.disable(gl.BLEND);
		gl.clearColor(1, 1, 1, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	/** Resume compositing over an already presented base without clearing it. */
	setTarget(
		output: WebGLFramebuffer | null,
		clip: CoverageBounds | null = null,
	) {
		if (this.run) throw Error("Finish the ink run before changing targets.");
		this.output = output;
		this.clip = clip;
	}

	startRun(bounds?: CoverageBounds) {
		if (this.run)
			throw Error("Finish the current ink run before starting another.");
		if (!this.mask) throw Error("Begin a frame before drawing ink.");
		let left = 0,
			top = 0,
			right = this.width,
			bottom = this.height;
		if (bounds?.every(Number.isFinite)) {
			left = Math.max(0, Math.min(this.width, Math.floor(bounds[0])));
			top = Math.max(0, Math.min(this.height, Math.floor(bounds[1])));
			right = Math.max(left, Math.min(this.width, Math.ceil(bounds[2])));
			bottom = Math.max(top, Math.min(this.height, Math.ceil(bounds[3])));
		}
		if (this.clip) {
			left = Math.max(left, this.clip[0]);
			top = Math.max(top, this.clip[1]);
			right = Math.max(left, Math.min(right, this.clip[2]));
			bottom = Math.max(top, Math.min(bottom, this.clip[3]));
		}
		const scissor: Scissor = [
			left,
			this.height - bottom,
			right - left,
			bottom - top,
		];
		this.run = { scissor };
		this.timings?.begin("legacyCoverage");
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.viewport(0, 0, this.width, this.height);
		gl.bindVertexArray(null);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(...scissor);
		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		gl.disable(gl.DITHER);
		gl.colorMask(true, true, true, true);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendEquation(gl.MAX);
		gl.blendFunc(gl.ONE, gl.ONE);
	}

	finishRun() {
		const run = this.run;
		if (!run) return;
		this.run = null;
		this.timings?.end();
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.output);
		gl.viewport(0, 0, this.width, this.height);
		if (!run.scissor[2] || !run.scissor[3]) return;
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(...run.scissor);
		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
		gl.enable(gl.BLEND);
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFuncSeparate(
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA,
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA,
		);
		gl.useProgram(this.program);
		gl.bindVertexArray(this.vao);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.mask);
		gl.uniform1i(this.maskLocation, 0);

		this.timings?.begin("legacyComposite");
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		this.timings?.end();
		this.stats.compositeDraws++;
		gl.bindVertexArray(null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	end() {
		this.finishRun();
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindVertexArray(null);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.BLEND);
		gl.blendEquation(gl.FUNC_ADD);
	}

	dispose() {
		const gl = this.gl;
		gl.deleteTexture(this.mask);
		gl.deleteFramebuffer(this.framebuffer);
		gl.deleteVertexArray(this.vao);
		gl.deleteProgram(this.program);
		this.mask = null;
		this.run = null;
		this.width = this.height = 0;
		this.stats.maskBytes = 0;
	}
}
