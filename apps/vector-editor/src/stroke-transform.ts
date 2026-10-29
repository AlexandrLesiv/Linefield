import type { Core } from "./core";
import type { Bounds } from "./geometry-cache";

/** Similarity metadata; original points and pressure remain stroke-local. */
export type StrokeTransform = readonly [
	a: number,
	b: number,
	tx: number,
	ty: number,
];
export const transformScale = (t: StrokeTransform) => Math.hypot(t[0], t[1]);
export function readTransform(core: Core, id: number, rx = 0n, ry = 0n): StrokeTransform {
	return [0, 1, 2, 3].map((k) =>
		core.stroke_transform_relative(id, k, rx, ry),
	) as unknown as StrokeTransform;
}
export function transformPoint(
	t: StrokeTransform,
	x: number,
	y: number,
): [number, number] {
	return [t[0] * x - t[1] * y + t[2], t[1] * x + t[0] * y + t[3]];
}
export function inversePoint(
	t: StrokeTransform,
	x: number,
	y: number,
): [number, number] {
	const dx = x - t[2],
		dy = y - t[3],
		d = t[0] * t[0] + t[1] * t[1];
	return [(t[0] * dx + t[1] * dy) / d, (-t[1] * dx + t[0] * dy) / d];
}
export function transformBounds(
	t: StrokeTransform,
	b: readonly number[],
): Bounds {
	const points = [
		[b[0], b[1]],
		[b[2], b[1]],
		[b[2], b[3]],
		[b[0], b[3]],
	].map(([x, y]) => transformPoint(t, x, y));
	return [
		Math.min(...points.map((p) => p[0])),
		Math.min(...points.map((p) => p[1])),
		Math.max(...points.map((p) => p[0])),
		Math.max(...points.map((p) => p[1])),
	];
}
export function transformCapsules(
	source: Float32Array,
	target: Float32Array,
	t: StrokeTransform,
) {
	const scale = transformScale(t);
	for (let i = 0; i < source.length; i += 3) {
		target[i] = t[0] * source[i] - t[1] * source[i + 1] + t[2];
		target[i + 1] = t[1] * source[i] + t[0] * source[i + 1] + t[3];
		target[i + 2] = source[i + 2] * scale;
	}
}
/** Quantize local tolerance, accounting for document size as well as camera zoom. */
export function transformedDetailLevel(level: number, t: StrokeTransform) {
	const exponent = level - Math.log2(transformScale(t));
	const nearest = Math.round(exponent);
	return Math.max(
		-14,
		Math.min(
			18,
			Math.floor(Math.abs(exponent - nearest) < 1e-12 ? nearest : exponent),
		),
	);
}
