export type ZoomDetailState = { level: number; settling: boolean };

/** Ignore arithmetic noise at exact power-of-two detail boundaries. */
export function detailLevelFor(scale: number) {
	const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
	const exponent = Math.log2(0.25 / safeScale);
	const boundary = Math.round(exponent);
	// Wheel multiplication and log2 can land a few ULPs below an integer.
	// This only absorbs rounding noise; meaningful zoom-in still refines now.
	const tolerance = 4 * Number.EPSILON * Math.max(1, Math.abs(exponent));
	const normalized =
		Math.abs(exponent - boundary) <= tolerance ? boundary : exponent;
	return Math.max(-12, Math.min(8, Math.floor(normalized)));
}

/** Refine on zoom-in immediately; defer coarsening until the camera pauses. */
export class ZoomDetail {
	private level: number;
	private settleAt = Number.NEGATIVE_INFINITY;
	private pendingZoom = false;

	constructor(scale = 1) {
		this.level = detailLevelFor(scale);
	}

	noteZoom(now: number) {
		this.settleAt = now + 150;
		this.pendingZoom = true;
	}

	update(scale: number, now: number): ZoomDetailState {
		if (this.pendingZoom) {
			// A slow rendering frame can outlast the idle deadline before this
			// input is observed. Give that new view a settling interval instead
			// of mistaking rendering delay for an idle camera. On-time frames
			// retain the original deadline and normal coarsening latency.
			if (now >= this.settleAt) this.settleAt = now + 150;
			this.pendingZoom = false;
		}
		const settling = now < this.settleAt;
		const target = detailLevelFor(scale);
		this.level = settling ? Math.min(this.level, target) : target;
		return { level: this.level, settling };
	}

	/** Use current detail immediately for a new stroke or an explicit camera reset. */
	settle(scale: number) {
		this.pendingZoom = false;
		this.settleAt = Number.NEGATIVE_INFINITY;
		this.level = detailLevelFor(scale);
		return this.level;
	}
}
