/** A deterministic observational paper field, independent of brush width. */
export const PAPER_CONTACT_SIZE = 512;
export const PAPER_CONTACT_PERIOD = 64;
export const PAPER_CONTACT_LEVELS = 32;
export const PAPER_CONTACT_THRESHOLD_MAX = 1.125;

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const wrap = (v: number, period: number) => ((v % period) + period) % period;
function hash(x: number, y: number, seed: number) {
	let n =
		Math.imul(x, 374761393) ^
		Math.imul(y, 668265263) ^
		Math.imul(seed, 1442695041);
	n = Math.imul(n ^ (n >>> 13), 1274126177);
	return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function field(x: number, y: number, nx: number, ny: number, seed: number) {
	const u = (x * nx) / PAPER_CONTACT_PERIOD,
		v = (y * ny) / PAPER_CONTACT_PERIOD;
	const ix = Math.floor(u),
		iy = Math.floor(v),
		fx = u - ix,
		fy = v - iy;
	const sx = fx * fx * (3 - 2 * fx),
		sy = fy * fy * (3 - 2 * fy);
	const a = hash(wrap(ix, nx), wrap(iy, ny), seed);
	const b = hash(wrap(ix + 1, nx), wrap(iy, ny), seed);
	const c = hash(wrap(ix, nx), wrap(iy + 1, ny), seed);
	const d = hash(wrap(ix + 1, nx), wrap(iy + 1, ny), seed);
	return mix(mix(a, b, sx), mix(c, d, sx), sy) * 2 - 1;
}

export function samplePaperContact(x: number, y: number) {
	const wx = x + 0.95 * field(x, y, 7, 7, 18);
	const wy = y + 0.95 * field(x + 19, y - 31, 7, 7, 19);
	const broad = field(wx, wy, 15, 19, 20);
	const tooth = field(wx, wy, 72, 79, 21);
	const fine = field(wx, wy, 198, 198, 22);
	// Periodic warped elongated relief represents crossing paper fibers.
	const fiberA = field(wx, wy, 12, 134, 23);
	const fiberB = field(wx, wy, 96, 15, 24);
	const valleyField = field(wx + 13, wy - 27, 52, 58, 25);
	const valley =
		0.55 * (0.5 - 0.5 * valleyField) ** 1.7 +
		0.25 * (0.5 - 0.5 * fiberA) ** 2 +
		0.2 * (0.5 - 0.5 * fiberB) ** 2;
	const height = clamp(
		0.56 +
			broad * 0.095 +
			tooth * 0.155 +
			fine * 0.055 +
			fiberA * 0.06 +
			fiberB * 0.04 -
			valley * 0.075,
	);
	const relief = clamp(0.5 + broad * 0.32 + tooth * 0.18);
	const grain = 0.5 + 0.5 * field(x, y, 371, 371, 26);
	const fiber = clamp(0.5 + fiberA * 0.3 + fiberB * 0.2);
	// No segment-direction term: subdivision and slicing must not rotate grain.
	const material =
		(0.66 + 0.44 * relief) * (0.7 + 0.55 * grain) * (0.84 + 0.24 * fiber);
	return { height, material };
}

export function paperContactOpacity(
	height: number,
	material: number,
	threshold: number,
	hard: boolean,
) {
	const delta = height - threshold,
		asperity = hard ? 0.075 : 0.085;
	if (delta <= -asperity) return 0;
	const amount =
		delta >= asperity
			? delta
			: ((delta + asperity) * (delta + asperity)) / (4 * asperity);
	return -Math.expm1(-amount * (hard ? 3.5 : 4.2) * material);
}

export type PaperContactMaterial = {
	data: Uint8Array;
	size: number;
	levels: number;
	levelsPerGrade: number;
	period: number;
	thresholdMin: number;
	thresholdMax: number;
};
let cached: PaperContactMaterial | undefined;

/** Bake deposited graphite before mip filtering, never filtered paper height. */
export function createPaperContactMaterial(): PaperContactMaterial {
	if (cached) return cached;
	const count = PAPER_CONTACT_SIZE * PAPER_CONTACT_SIZE;
	const levels = PAPER_CONTACT_LEVELS * 2;
	const data = new Uint8Array(count * levels);
	const heights = new Float32Array(count),
		materials = new Float32Array(count);
	for (let y = 0; y < PAPER_CONTACT_SIZE; y++) {
		for (let x = 0; x < PAPER_CONTACT_SIZE; x++) {
			const sample = samplePaperContact(
				((x + 0.5) * PAPER_CONTACT_PERIOD) / PAPER_CONTACT_SIZE,
				((y + 0.5) * PAPER_CONTACT_PERIOD) / PAPER_CONTACT_SIZE,
			);
			const at = y * PAPER_CONTACT_SIZE + x;
			heights[at] = sample.height;
			materials[at] = sample.material;
		}
	}
	for (let grade = 0; grade < 2; grade++) {
		for (let level = 0; level < PAPER_CONTACT_LEVELS; level++) {
			const threshold =
				(level * PAPER_CONTACT_THRESHOLD_MAX) / (PAPER_CONTACT_LEVELS - 1);
			const offset = (grade * PAPER_CONTACT_LEVELS + level) * count;
			for (let at = 0; at < count; at++)
				data[offset + at] = Math.round(
					255 *
						paperContactOpacity(
							heights[at],
							materials[at],
							threshold,
							grade === 0,
						),
				);
		}
	}
	cached = {
		data,
		size: PAPER_CONTACT_SIZE,
		levels,
		levelsPerGrade: PAPER_CONTACT_LEVELS,
		period: PAPER_CONTACT_PERIOD,
		thresholdMin: 0,
		thresholdMax: PAPER_CONTACT_THRESHOLD_MAX,
	};
	return cached;
}
