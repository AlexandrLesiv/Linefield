type CaptureTarget = Pick<
	Element,
	"setPointerCapture" | "hasPointerCapture" | "releasePointerCapture"
>;

function pointerEnded(error: unknown): boolean {
	return error instanceof DOMException && error.name === "NotFoundError";
}

/** The pointer may have ended before its queued down event is handled. */
export function tryCapturePointer(target: CaptureTarget, id: number): boolean {
	try {
		target.setPointerCapture(id);
		return true;
	} catch (error) {
		if (!pointerEnded(error)) throw error;
		return false;
	}
}

/** Clear application gesture state before calling: release can deliver loss. */
export function releasePointer(target: CaptureTarget, id: number | null): void {
	if (id === null) return;
	try {
		if (target.hasPointerCapture(id)) target.releasePointerCapture(id);
	} catch (error) {
		// hasPointerCapture does not guarantee the browser still has an active id.
		if (!pointerEnded(error)) throw error;
	}
}
