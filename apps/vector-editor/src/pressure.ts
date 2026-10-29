// UI state never rewrites accepted input. Rust snapshots this response at down.
export function createPressureControls() {
	const toggle = document.querySelector<HTMLButtonElement>("#pressure-toggle")!;
	const panel = document.querySelector<HTMLElement>("#pressure-panel")!;
	const curve = document.querySelector<HTMLInputElement>("#pressure-curve")!;
	const minimum = document.querySelector<HTMLInputElement>("#pressure-min")!;
	const curveValue = document.querySelector<HTMLOutputElement>(
		"#pressure-curve-value",
	)!;
	const minimumValue = document.querySelector<HTMLOutputElement>(
		"#pressure-min-value",
	)!;
	const path = document.querySelector<SVGPathElement>("#pressure-response")!;
	const dot = document.querySelector<SVGCircleElement>("#pressure-dot")!;
	const example = document.querySelector<HTMLElement>("#pressure-example")!;
	const live = document.querySelector<HTMLOutputElement>("#pressure-live")!;
	const meter = document.querySelector<HTMLMeterElement>("#pressure-meter")!;
	let pending: number | null = null;
	let displayed: number | null | undefined;
	function settings() {
		return { minimum: Number(minimum.value) / 100, gamma: Number(curve.value) };
	}
	function fraction(pressure: number) {
		const { minimum, gamma } = settings();
		return minimum + (1 - minimum) * pressure ** gamma;
	}
	function update() {
		curveValue.value = Number(curve.value).toFixed(2);
		minimumValue.value = `${minimum.value}%`;
		path.setAttribute(
			"d",
			Array.from({ length: 65 }, (_, i) => {
				const p = i / 64;
				return `${i ? "L" : "M"}${(24 + 124 * p).toFixed(2)} ${(114 - 104 * fraction(p)).toFixed(2)}`;
			}).join(" "),
		);
		example.textContent = `At 50% pressure: ${Math.round(100 * fraction(0.5))}% of selected width. Full pressure always gives full width.`;
		displayed = undefined;
	}
	toggle.addEventListener("click", () => {
		panel.hidden = !panel.hidden;
		toggle.setAttribute("aria-expanded", String(!panel.hidden));
	});
	curve.addEventListener("input", update);
	minimum.addEventListener("input", update);
	for (const [id, gamma, floor] of [
		["pressure-steeper", "1.8", "5"],
		["pressure-original", "1", "20"],
	]) {
		document.querySelector(`#${id}`)!.addEventListener("click", () => {
			curve.value = gamma;
			minimum.value = floor;
			update();
		});
	}
	update();
	return {
		settings,
		// Only retain the latest reading; DOM work happens once per frame.
		receive(pressure: number | null) {
			pending = pressure;
		},
		render() {
			if (pending === displayed) return;
			displayed = pending;
			live.value = `${Math.round((pending ?? 0) * 100)}%`;
			meter.value = pending ?? 0;
			dot.toggleAttribute("hidden", pending === null);
			if (pending !== null) {
				dot.setAttribute("cx", String(24 + 124 * pending));
				dot.setAttribute("cy", String(114 - 104 * fraction(pending)));
			}
		},
	};
}
