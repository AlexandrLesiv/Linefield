import type { Core } from "./core";
/** One bounded independent Wasm engine. Canonical samples never leave ownership
 * of the main engine: messages contain small disposable copies with neighbors. */
export class GeometryPreparer {
	private worker: Worker;
	private sequence = 0;
	private watchdog: ReturnType<typeof setTimeout> | undefined;
	private callbacks = new Map<number, (data: Float32Array | null) => void>();
	ready = false;
	failed = false;
	constructor(private changed: () => void) {
		this.worker = new Worker(new URL("./geometry-worker.ts", import.meta.url), {
			type: "module",
		});
		this.armWatchdog();
		this.worker.onmessage = ({ data }) => {
			if (this.failed) return;
			if (!data || typeof data !== "object") {
				this.fail();
				return;
			}
			this.stopWatchdog();
			if (data.ready) {
				this.ready = true;
				this.changed();
				return;
			}
			const callback = this.callbacks.get(data.id);
			this.callbacks.delete(data.id);
			if (
				data.error ||
				!(data.output instanceof Float32Array) ||
				data.output.length === 0 ||
				data.output.length > 4096 * 6 ||
				data.output.length % 6
			) {
				this.fail();
				callback?.(null);
				return;
			}
			if (this.callbacks.size) this.armWatchdog();
			callback?.(data.output);
			this.changed();
		};
		this.worker.onerror = () => this.fail();
		this.worker.onmessageerror = () => this.fail();
	}
	get available() {
		return this.ready && !this.failed && this.callbacks.size < 8;
	}
	request(
		core: Core,
		stroke: number,
		chunk: number,
		tolerance: number,
		callback: (data: Float32Array | null) => void,
	) {
		if (!this.available) return false;
		const length = core.geometry_snapshot(stroke, chunk);
		if (!length) return false;
		const input = new Float32Array(
			core.memory.buffer,
			core.geometry_input_ptr(),
			length,
		).slice();
		const id = ++this.sequence;
		this.callbacks.set(id, callback);
		if (!this.watchdog) this.armWatchdog();
		try {
			this.worker.postMessage({ id, input, tolerance }, [input.buffer]);
		} catch {
			this.fail();
			return false;
		}
		return true;
	}
	private stopWatchdog() {
		clearTimeout(this.watchdog);
		this.watchdog = undefined;
	}
	private armWatchdog() {
		this.stopWatchdog();
		this.watchdog = setTimeout(() => this.fail(), 5000);
	}
	private fail() {
		if (this.failed) return;
		this.stopWatchdog();
		this.failed = true;
		this.ready = false;
		this.worker.terminate();
		const callbacks = [...this.callbacks.values()];
		this.callbacks.clear();
		for (const callback of callbacks) callback(null);
		this.changed();
	}
	dispose() {
		this.stopWatchdog();
		this.failed = true;
		this.ready = false;
		this.callbacks.clear();
		this.worker.terminate();
	}
}
