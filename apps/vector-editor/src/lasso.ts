import { capsuleDistance } from "./stroke-hit";
export type LassoPoint = readonly [number, number];
type Edge = { a: LassoPoint; b: LassoPoint; bounds: readonly number[] };
const EPSILON = 1e-7;
function pointSegmentDistance(p: LassoPoint, a: LassoPoint, b: LassoPoint) {
	const dx = b[0] - a[0],
		dy = b[1] - a[1],
		length = dx * dx + dy * dy;
	const t = length
		? Math.max(
				0,
				Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length),
			)
		: 0;
	return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function segmentsCross(
	a: LassoPoint,
	b: LassoPoint,
	c: LassoPoint,
	d: LassoPoint,
) {
	const cross = (p: LassoPoint, q: LassoPoint, r: LassoPoint) =>
		(q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
	const x = cross(a, b, c),
		y = cross(a, b, d),
		u = cross(c, d, a),
		v = cross(c, d, b);
	return (
		((x > 0 && y < 0) || (x < 0 && y > 0)) &&
		((u > 0 && v < 0) || (u < 0 && v > 0))
	);
}
/** Even-odd fill also gives predictable regions for a figure-eight lasso.
 * Edges close automatically on release; an open sweep can select touched ink. */
export class LassoRegion {
	readonly bounds: [number, number, number, number] = [
		Infinity,
		Infinity,
		-Infinity,
		-Infinity,
	];
	private edges: Edge[] = [];
	constructor(readonly points: readonly LassoPoint[]) {
		for (let i = 0; i < points.length; i++) {
			const a = points[i],
				b = points[(i + 1) % points.length];
			this.bounds[0] = Math.min(this.bounds[0], a[0]);
			this.bounds[1] = Math.min(this.bounds[1], a[1]);
			this.bounds[2] = Math.max(this.bounds[2], a[0]);
			this.bounds[3] = Math.max(this.bounds[3], a[1]);
			this.edges.push({
				a,
				b,
				bounds: [
					Math.min(a[0], b[0]),
					Math.min(a[1], b[1]),
					Math.max(a[0], b[0]),
					Math.max(a[1], b[1]),
				],
			});
		}
	}
	overlaps(bounds: readonly number[]) {
		const b = this.bounds;
		return (
			bounds[2] >= b[0] &&
			bounds[0] <= b[2] &&
			bounds[3] >= b[1] &&
			bounds[1] <= b[3]
		);
	}
	contains(p: LassoPoint) {
		if (this.points.length < 3) return false;
		let inside = false;
		for (const { a, b } of this.edges) {
			if (pointSegmentDistance(p, a, b) <= EPSILON) return true;
			if (
				a[1] > p[1] !== b[1] > p[1] &&
				p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
			)
				inside = !inside;
		}
		return inside;
	}
	private touchesEdge(
		a: LassoPoint,
		ar: number,
		b: LassoPoint,
		br: number,
		edge: Edge,
		epsilon: number,
	) {
		const r = Math.max(ar, br),
			q = edge.bounds;
		if (
			Math.max(a[0], b[0]) + r < q[0] ||
			Math.min(a[0], b[0]) - r > q[2] ||
			Math.max(a[1], b[1]) + r < q[1] ||
			Math.min(a[1], b[1]) - r > q[3]
		)
			return false;
		// The tapered capsule is the convex hull of its endpoint discs. A segment
		// intersects it at a cap, at one of its own endpoints, or across the axis.
		return (
			pointSegmentDistance(a, edge.a, edge.b) < ar + epsilon ||
			pointSegmentDistance(b, edge.a, edge.b) < br + epsilon ||
			capsuleDistance(...edge.a, ...a, ar, ...b, br) < epsilon ||
			capsuleDistance(...edge.b, ...a, ar, ...b, br) < epsilon ||
			segmentsCross(a, b, edge.a, edge.b)
		);
	}
	capsule(
		ax: number,
		ay: number,
		ar: number,
		bx: number,
		by: number,
		br: number,
		partial: boolean,
	) {
		const a: LassoPoint = [ax, ay],
			b: LassoPoint = [bx, by];
		if (partial) {
			if (this.contains(a) || this.contains(b)) return true;
			return this.edges.some((edge) =>
				this.touchesEdge(a, ar, b, br, edge, EPSILON),
			);
		}
		if (!this.contains(a) || !this.contains(b)) return false;
		// Reject excursions through a concavity even if both endpoint discs fit.
		// Exact tangency counts as enclosed; positive ink crossing an edge does not.
		return !this.edges.some((edge) =>
			this.touchesEdge(a, ar, b, br, edge, -EPSILON),
		);
	}
}
