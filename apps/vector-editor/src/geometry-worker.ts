import { loadCore } from "./load-core";

const scope = globalThis as unknown as {
	postMessage(message: unknown, transfer?: Transferable[]): void;
	onmessage:
		| ((
				event: MessageEvent<{
					id: number;
					input: Float32Array;
					tolerance: number;
				}>,
		  ) => void)
		| null;
};
async function initialize() {
	const core = await loadCore();
	scope.onmessage = ({ data: { id, input, tolerance } }) => {
		try {
			if (input.length > 1542) throw Error("Invalid bounded geometry snapshot");
			new Float32Array(
				core.memory.buffer,
				core.geometry_input_ptr(),
				input.length,
			).set(input);
			const count = core.render_snapshot(input.length, tolerance);
			const output = new Float32Array(
				core.memory.buffer,
				core.render_chunk_ptr(),
				count * 6,
			).slice();
			scope.postMessage({ id, output }, [output.buffer]);
		} catch (error) {
			scope.postMessage({ id, error: String(error) });
		}
	};
	scope.postMessage({ ready: true });
}
initialize().catch((error) => scope.postMessage({ error: String(error) }));
