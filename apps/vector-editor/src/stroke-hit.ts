/** Signed distance to the same union of linearly varying discs as the ink shader. */
export function capsuleDistance(
	x: number,
	y: number,
	ax: number,
	ay: number,
	ar: number,
	bx: number,
	by: number,
	br: number,
) {
	const dx = bx - ax,
		dy = by - ay,
		l = dx * dx + dy * dy,
		dr = br - ar;
	let t = br > ar ? 1 : 0;
	if (l > dr * dr + 0.000001) {
		const u = ((x - ax) * dx + (y - ay) * dy) / l;
		const cross = (x - ax) * dy - (y - ay) * dx;
		t = Math.max(
			0,
			Math.min(
				1,
				u +
					(dr * Math.abs(cross)) / Math.sqrt(l * (l - dr * dr)) / Math.sqrt(l),
			),
		);
	}
	return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) - (ar + t * dr);
}
