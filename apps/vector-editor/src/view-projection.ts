import type { Bounds } from "./geometry-cache";

/** Disposable renderer projection; no input or editing policy. */
export class ViewProjection {
	cx = 0;
	cy = 0;
	zoom = 1;
	rotation = 0;
	/** Freeze the current affine transform once for many conservative hull queries.
	 * Padding is in world units; X/Y scales include the physical canvas rounding.
	 */
	deviceBoundsProjector(scaleX: number, scaleY = scaleX) {
		const c = Math.cos(this.rotation),
			s = Math.sin(this.rotation);
		const xx = this.zoom * c * scaleX,
			xy = -this.zoom * s * scaleX;
		const yx = this.zoom * s * scaleY,
			yy = this.zoom * c * scaleY;
		const tx = this.cx * scaleX,
			ty = this.cy * scaleY;
		const largeTranslation = Math.abs(tx) + Math.abs(ty) > 32768;
		return (bounds: Bounds, pad = 0, output: Bounds = [0, 0, 0, 0]): Bounds => {
			const left = bounds[0] - pad,
				top = bounds[1] - pad;
			const right = bounds[2] + pad,
				bottom = bounds[3] + pad;
			output[0] =
				xx * (xx < 0 ? right : left) + xy * (xy < 0 ? bottom : top) + tx;
			output[1] =
				yx * (yx < 0 ? right : left) + yy * (yy < 0 ? bottom : top) + ty;
			output[2] =
				xx * (xx < 0 ? left : right) + xy * (xy < 0 ? top : bottom) + tx;
			output[3] =
				yx * (yx < 0 ? left : right) + yy * (yy < 0 ? top : bottom) + ty;
			// Shader uniforms/operations use Float32. At large world offsets the
			// usual AA pad alone cannot cover cancellation/rounding in the GPU.
			if (largeTranslation) {
				const mx = Math.max(Math.abs(left), Math.abs(right)),
					my = Math.max(Math.abs(top), Math.abs(bottom));
				const ex =
					(Math.abs(xx) * mx + Math.abs(xy) * my + Math.abs(tx)) * 2 ** -20;
				const ey =
					(Math.abs(yx) * mx + Math.abs(yy) * my + Math.abs(ty)) * 2 ** -20;
				output[0] -= ex;
				output[2] += ex;
				output[1] -= ey;
				output[3] += ey;
			}
			return output;
		};
	}

	/** Bound actual endpoint discs after rotation, avoiding reboxed world hulls.
	 * The caller supplies a conservative AA radius in world units. */
	capsuleBoundsProjector(
		scaleX: number,
		scaleY: number,
		pad: number,
		narrow = false,
		reuse = true,
	) {
		const c = Math.cos(this.rotation),
			s = Math.sin(this.rotation);
		const xx = this.zoom * c * scaleX,
			xy = -this.zoom * s * scaleX;
		const yx = this.zoom * s * scaleY,
			yy = this.zoom * c * scaleY;
		const tx = this.cx * scaleX,
			ty = this.cy * scaleY;
		const largeTranslation = Math.abs(tx) + Math.abs(ty) > 32768;
		const rx = this.zoom * scaleX,
			ry = this.zoom * scaleY;
		const capsules = new Float64Array(10);
		let capsuleCount = 0;
		let previous: Float32Array | null = null;
		let previousEnd = -1,
			lastX = 0,
			lastY = 0;
		const project = (
			data: Float32Array,
			first: number,
			count: number,
			out: Bounds,
			stride = 6,
		): Bounds => {
			capsuleCount = count <= 2 ? count : 0;
			if (
				reuse &&
				!largeTranslation &&
				stride === 3 &&
				(count === 1 || count === 2)
			) {
				const at = first * 3;
				const ax =
					previous === data && previousEnd === first
						? lastX
						: xx * data[at] + xy * data[at + 1] + tx;
				const ay =
					previous === data && previousEnd === first
						? lastY
						: yx * data[at] + yy * data[at + 1] + ty;
				const bx = xx * data[at + 3] + xy * data[at + 4] + tx,
					by = yx * data[at + 3] + yy * data[at + 4] + ty;
				const ra = Math.max(data[at + 2], data[at + 5]) + pad;
				const rax = ra * rx,
					ray = ra * ry;
				if (narrow) {
					capsules[0] = ax;
					capsules[1] = ay;
					capsules[2] = bx;
					capsules[3] = by;
					capsules[4] = Math.max(rax, ray);
				}
				if (count === 1) {
					out[0] = Math.min(ax - rax, bx - rax);
					out[1] = Math.min(ay - ray, by - ray);
					out[2] = Math.max(ax + rax, bx + rax);
					out[3] = Math.max(ay + ray, by + ray);
					lastX = bx;
					lastY = by;
				} else {
					const cx = xx * data[at + 6] + xy * data[at + 7] + tx,
						cy = yx * data[at + 6] + yy * data[at + 7] + ty;
					const rb = Math.max(data[at + 5], data[at + 8]) + pad,
						rbx = rb * rx,
						rby = rb * ry;
					const mx = Math.max(rax, rbx),
						my = Math.max(ray, rby);
					out[0] = Math.min(ax - rax, bx - mx, cx - rbx);
					out[1] = Math.min(ay - ray, by - my, cy - rby);
					out[2] = Math.max(ax + rax, bx + mx, cx + rbx);
					out[3] = Math.max(ay + ray, by + my, cy + rby);
					if (narrow) {
						capsules[5] = bx;
						capsules[6] = by;
						capsules[7] = cx;
						capsules[8] = cy;
						capsules[9] = Math.max(rbx, rby);
					}
					lastX = cx;
					lastY = cy;
				}
				previous = data;
				previousEnd = first + count;
				return out;
			}
			previous = null;
			previousEnd = -1;
			out[0] = out[1] = Infinity;
			out[2] = out[3] = -Infinity;
			for (let i = first; i < first + count; i++) {
				const at = i * stride;
				// Use max radius for both endpoints, just as the conservative GPU quad.
				const r = Math.max(data[at + 2], data[at + 5]) + pad;
				if (narrow && capsuleCount) capsules[(i - first) * 5 + 4] = 0;
				for (let k = at; k <= at + 3; k += 3) {
					const x = xx * data[k] + xy * data[k + 1] + tx;
					const y = yx * data[k] + yy * data[k + 1] + ty;
					const ex =
						r * rx +
						(largeTranslation
							? (Math.abs(xx * data[k]) +
									Math.abs(xy * data[k + 1]) +
									Math.abs(tx)) *
								2 ** -20
							: 0);
					const ey =
						r * ry +
						(largeTranslation
							? (Math.abs(yx * data[k]) +
									Math.abs(yy * data[k + 1]) +
									Math.abs(ty)) *
								2 ** -20
							: 0);
					if (narrow && capsuleCount) {
						const slot = (i - first) * 5 + (k - at === 0 ? 0 : 2);
						capsules[slot] = x;
						capsules[slot + 1] = y;
						capsules[(i - first) * 5 + 4] = Math.max(
							capsules[(i - first) * 5 + 4],
							ex,
							ey,
						);
					}
					out[0] = Math.min(out[0], x - ex);
					out[1] = Math.min(out[1], y - ey);
					out[2] = Math.max(out[2], x + ex);
					out[3] = Math.max(out[3], y + ey);
				}
			}
			return out;
		};
		const intersects = (
			left: number,
			top: number,
			right: number,
			bottom: number,
		) => {
			if (!capsuleCount) return true;
			for (let i = 0; i < capsuleCount; i++) {
				const k = i * 5,
					ax = capsules[k],
					ay = capsules[k + 1],
					bx = capsules[k + 2],
					by = capsules[k + 3],
					r = capsules[k + 4];
				if (
					Math.max(ax, bx) + r < left ||
					Math.min(ax, bx) - r > right ||
					Math.max(ay, by) + r < top ||
					Math.min(ay, by) - r > bottom
				)
					continue;
				const dx = bx - ax,
					dy = by - ay,
					l = dx * dx + dy * dy;
				if (l === 0) {
					const x = Math.max(left - ax, 0, ax - right),
						y = Math.max(top - ay, 0, ay - bottom);
					if (x * x + y * y <= r * r) return true;
					continue;
				}
				const gap =
					Math.abs(
						dx * ((top + bottom) * 0.5 - ay) - dy * ((left + right) * 0.5 - ax),
					) -
					(Math.abs(dx) * (bottom - top) + Math.abs(dy) * (right - left)) * 0.5;
				if (gap <= 0 || gap * gap <= r * r * l) return true;
			}
			return false;
		};
		return Object.assign(project, { intersects });
	}

	deviceBounds(bounds: Bounds, dpr: number): Bounds {
		return this.deviceBoundsProjector(dpr)(bounds);
	}

	reset() {
		this.cx = this.cy = this.rotation = 0;
		this.zoom = 1;
	}

	state() {
		return {
			cx: this.cx,
			cy: this.cy,
			zoom: this.zoom,
			rotation: this.rotation,
		};
	}
}
