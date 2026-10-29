export type GpuPass =
	| "atlasUpload"
	| "atlasCoverage"
	| "atlasComposite"
	| "legacyCoverage"
	| "legacyComposite"
	| "cache";
type Extension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
const PASSES: GpuPass[] = [
	"atlasUpload",
	"atlasCoverage",
	"atlasComposite",
	"legacyCoverage",
	"legacyComposite",
	"cache",
];
type Sample = {
	mode: "sample" | "all";
	selectedPass?: GpuPass;
	selectedOccurrence?: number;
	occurrences: Partial<Record<GpuPass, number>>;
	frame: number;
	complete: boolean;
	queries: number;
	ms: Partial<Record<GpuPass, number>>;
};
type Pending = { sample: Sample; remaining: number; closed: boolean };
type Query = { query: WebGLQuery; pass: GpuPass; owner: Pending };
const MAX_QUERIES = 512;
const MAX_FRAME_QUERIES = 256;

/** Optional diagnostics only. Never waits for GPU completion or reads pixels.
 * A partial/capped frame is labeled, never presented as a full-frame timing.
 * Samples cover named command ranges, not CPU time or input/display latency. */
export class GpuPassTimers {
	private extension: Extension | null = null;
	private enabled = false;
	private interval = 30;
	private mode: "sample" | "all" = "sample";
	private previousCounts: Partial<Record<GpuPass, number>> = {};
	private sequence = 0;
	private frame = 0;
	private created = 0;
	private pool: WebGLQuery[] = [];
	private pending: Query[] = [];
	private active: Query | null = null;
	private current: Pending | null = null;
	private samples: Sample[] = [];
	private dropped = 0;
	private disjoint = 0;
	constructor(private gl: WebGL2RenderingContext) {}
	configure(enabled: boolean, every = 30, mode: "sample" | "all" = "sample") {
		if (mode !== "sample" && mode !== "all")
			throw RangeError("Unknown GPU timing mode.");
		if (!Number.isSafeInteger(every) || every < 1)
			throw RangeError("GPU timing interval must be a positive integer.");
		this.dispose();
		this.interval = every;
		this.mode = mode;
		this.sequence = 0;
		this.previousCounts = {};
		this.frame = 0;
		this.samples = [];
		this.dropped = this.disjoint = 0;
		this.enabled = enabled;
		this.extension = enabled
			? this.gl.getExtension("EXT_disjoint_timer_query_webgl2")
			: null;
	}
	beginFrame() {
		if (!this.enabled || !this.extension) return;
		this.endFrame();
		if (this.frame++ % this.interval !== 0) return;
		this.current = {
			sample: {
				frame: this.frame,
				complete: true,
				queries: 0,
				ms: {},
				mode: this.mode,
				occurrences: {},
			},
			remaining: 0,
			closed: false,
		};
		const pass = PASSES[this.sequence % PASSES.length];
		this.current.sample.selectedPass = pass;
		this.current.sample.selectedOccurrence =
			Math.floor(this.sequence++ / PASSES.length) %
			Math.max(1, this.previousCounts[pass] ?? 1);
	}
	begin(pass: GpuPass) {
		if (!this.current || !this.extension) return;
		this.end();
		const owner = this.current;
		const occurrence = owner.sample.occurrences[pass] ?? 0;
		owner.sample.occurrences[pass] = occurrence + 1;
		if (
			this.mode === "sample" &&
			(owner.sample.selectedPass !== pass ||
				owner.sample.selectedOccurrence !== occurrence)
		)
			return;
		if (
			owner.sample.queries >= MAX_FRAME_QUERIES ||
			(!this.pool.length && this.created >= MAX_QUERIES)
		) {
			owner.sample.complete = false;
			this.dropped++;
			return;
		}
		let query = this.pool.pop();
		if (!query) {
			query = this.gl.createQuery() ?? undefined;
			if (!query) {
				owner.sample.complete = false;
				this.dropped++;
				return;
			}
			this.created++;
		}
		owner.remaining++;
		owner.sample.queries++;
		this.active = { query, pass, owner };
		this.gl.beginQuery(this.extension.TIME_ELAPSED_EXT, query);
	}
	end() {
		if (!this.active || !this.extension) return;
		this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);
		this.pending.push(this.active);
		this.active = null;
	}
	endFrame() {
		this.end();
		if (this.current) {
			this.current.closed = true;
			this.previousCounts = this.current.sample.occurrences;
		}
		this.current = null;
	}
	poll() {
		if (!this.extension || !this.pending.length) return;
		if (this.gl.getParameter(this.extension.GPU_DISJOINT_EXT)) {
			this.disjoint++;
			this.clearQueries();
			return;
		}
		// FIFO results become readable after the browser has yielded to the driver.
		// Never fetch QUERY_RESULT before QUERY_RESULT_AVAILABLE.
		let consumed = 0;
		for (const item of this.pending) {
			if (
				!this.gl.getQueryParameter(item.query, this.gl.QUERY_RESULT_AVAILABLE)
			)
				break;
			const ns = this.gl.getQueryParameter(
				item.query,
				this.gl.QUERY_RESULT,
			) as number;
			const { owner, pass } = item;
			if (Number.isFinite(ns) && ns >= 0)
				owner.sample.ms[pass] = (owner.sample.ms[pass] ?? 0) + ns / 1e6;
			else owner.sample.complete = false;
			this.pool.push(item.query);
			consumed++;
			if (--owner.remaining === 0 && owner.closed) {
				this.samples.push(owner.sample);
				if (this.samples.length > 120) this.samples.shift();
			}
		}
		this.pending.splice(0, consumed);
	}
	snapshot() {
		return {
			enabled: this.enabled,
			supported: !!this.extension,
			sampleEvery: this.interval,
			mode: this.mode,
			note: "Instrumented command-range times can perturb driver scheduling and overlap. Do not sum sampled passes or treat all-pass totals as normal frame time.",
			pending: this.pending.length,
			allocated: this.created,
			dropped: this.dropped,
			disjoint: this.disjoint,
			samples: this.samples.map((s) => ({
				...s,
				ms: { ...s.ms },
				occurrences: { ...s.occurrences },
			})),
		};
	}
	private clearQueries() {
		this.endFrame();
		for (const q of this.pending) this.gl.deleteQuery(q.query);
		for (const q of this.pool) this.gl.deleteQuery(q);
		this.pending = [];
		this.pool = [];
		this.created = 0;
	}
	dispose() {
		this.clearQueries();
		this.enabled = false;
		this.extension = null;
	}
}
