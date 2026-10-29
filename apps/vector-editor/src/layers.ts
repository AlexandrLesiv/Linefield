import { t } from "../../web/src/locale";
import type { Core } from "./core";

export function createLayers(
	core: Core,
	mutate: (change: () => number) => number,
) {
	const panel = document.querySelector<HTMLElement>("#layers-panel")!;
	const toggle = document.querySelector<HTMLButtonElement>("#layers-toggle")!;
	const list = document.querySelector<HTMLElement>("#layer-list")!;
	const message = document.querySelector<HTMLElement>("#layer-message")!;
	const blocked = document.querySelector<HTMLElement>("#layer-blocked")!;
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	let renaming = false;
	const name = (id: number) =>
		decoder.decode(
			new Uint8Array(
				core.memory.buffer,
				core.layer_name_ptr(id),
				core.layer_name_len(id),
			),
		);
	const state = () =>
		Array.from({ length: core.layer_count() }, (_, rank) => {
			const id = core.layer_at(rank);
			return {
				id,
				rank,
				name: name(id),
				visible: !!core.layer_visible(id),
				locked: !!core.layer_locked(id),
				active: id === core.layer_active(),
			};
		});
	const actions = {
		state,
		create: () => mutate(() => core.layer_create()),
		select: (id: number) => mutate(() => core.layer_select(id)),
		remove: (id: number) => mutate(() => core.layer_delete(id)),
		move: (id: number, rank: number) => mutate(() => core.layer_move(id, rank)),
		visible: (id: number, value: boolean) =>
			mutate(() => core.layer_set_visible(id, Number(value))),
		locked: (id: number, value: boolean) =>
			mutate(() => core.layer_set_locked(id, Number(value))),
		rename: (id: number, value: string) => {
			renaming = true;
			try {
				return mutate(() => {
					const bytes = encoder.encode(
						[...value.trim()].slice(0, 128).join(""),
					);
					if (!bytes.length || bytes.length > 512) return 0;
					new Uint8Array(
						core.memory.buffer,
						core.layer_name_input_ptr(),
						bytes.length,
					).set(bytes);
					return core.layer_rename(id, bytes.length);
				});
			} finally {
				renaming = false;
			}
		},
	};
	function open(value: boolean) {
		panel.hidden = !value;
		toggle.setAttribute("aria-expanded", String(value));
		if (value) refresh();
	}
	function refresh() {
		const layers = state();
		const active = layers.find((layer) => layer.active)!;
		toggle.textContent = t("vector.layersCount", {count: layers.length});
		toggle.title = t("vector.drawingOn", {name: active.name});
		message.textContent = !active.visible
			? t("vector.hiddenLayer", {name: active.name})
			: active.locked
				? t("vector.lockedLayer", {name: active.name})
				: t("vector.drawingOn", {name: active.name});
		blocked.hidden = !!core.can_draw();
		blocked.textContent = message.textContent;
		if (panel.hidden) return;
		// Keep the clicked control connected when a rename commits on blur.
		// Replacing its row between pointer-down and pointer-up swallows the click.
		if (renaming) {
			for (const row of Array.from(
				list.querySelectorAll<HTMLElement>(".layer-row"),
			)) {
				const currentName = name(Number(row.dataset.layerId));
				const select = row.querySelector(".layer-name");
				if (select) select.textContent = currentName;
				for (const button of Array.from(
					row.querySelectorAll<HTMLButtonElement>("button"),
				))
					button.setAttribute(
						"aria-label",
						`${button.dataset.layerLabel} ${currentName}`,
					);
			}
			return;
		}
		const focus =
			document.activeElement instanceof HTMLElement
				? document.activeElement.dataset.layerAction
				: undefined;
		list.replaceChildren();
		for (const layer of layers.reverse()) {
			const row = document.createElement("div");
			row.className = `layer-row${layer.active ? " active" : ""}`;
			row.dataset.layerId = String(layer.id);
			const primary = document.createElement("div");
			primary.className = "layer-primary";
			const controls = document.createElement("div");
			controls.className = "layer-actions";
			const button = (
				text: string,
				label: string,
				action: () => void,
				parent = controls,
			) => {
				const b = document.createElement("button");
				b.textContent = text;
				b.setAttribute("aria-label", `${label} ${layer.name}`);
				b.dataset.layerAction = `${layer.id}-${label}`;
				b.dataset.layerLabel = label;
				b.addEventListener("click", action);
				parent.append(b);
				return b;
			};
			const select = button(
				layer.name,
				t("vector.select"),
				() => actions.select(layer.id),
				primary,
			);
			select.className = "layer-name";
			select.setAttribute("aria-pressed", String(layer.active));
			button(
				layer.visible ? t("vector.hide") : t("vector.show"),
				layer.visible ? t("vector.hide") : t("vector.show"),
				() => actions.visible(layer.id, !layer.visible),
				primary,
			);
			button(
				layer.locked ? t("vector.unlock") : t("vector.lock"),
				layer.locked ? t("vector.unlock") : t("vector.lock"),
				() => actions.locked(layer.id, !layer.locked),
				primary,
			);
			button("↑", t("vector.moveUp"), () =>
				actions.move(layer.id, layer.rank + 1),
			).disabled = layer.rank === layers.length - 1;
			button("↓", t("vector.moveDown"), () =>
				actions.move(layer.id, layer.rank - 1),
			).disabled = layer.rank === 0;
			button(t("vector.rename"), t("vector.rename"), () => {
				const input = document.createElement("input");
				input.type = "text";
				input.value = name(layer.id);
				input.maxLength = 128;
				input.setAttribute("aria-label", t("vector.nameFor", {name: name(layer.id)}));
				select.replaceWith(input);
				let canceled = false;
				input.addEventListener("keydown", (event) => {
					if (event.key === "Enter" || event.key === "Escape") {
						event.preventDefault();
						event.stopPropagation();
						canceled = event.key === "Escape";
						input.blur();
					}
				});
				input.addEventListener(
					"blur",
					() => {
						input.replaceWith(select);
						if (!canceled) actions.rename(layer.id, input.value);
						else refresh();
					},
					{ once: true },
				);
				input.focus();
				input.select();
			});
			button(t("vector.delete"), t("vector.delete"), () => actions.remove(layer.id)).disabled =
				layers.length === 1;
			row.append(primary, controls);
			list.append(row);
		}
		if (focus)
			list.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
				if (button.dataset.layerAction === focus && !button.disabled)
					button.focus();
			});
	}
	toggle.addEventListener("click", () => open(panel.hidden !== false));
	toggle.addEventListener("keydown", (event) => {
		if (event.code === "Space") event.stopPropagation();
	});
	document.querySelector("#layers-close")!.addEventListener("click", () => {
		open(false);
		toggle.focus();
	});
	document
		.querySelector("#layer-add")!
		.addEventListener("click", actions.create);
	panel.addEventListener("keydown", (event) => {
		if (event.code === "Space") event.stopPropagation();
		if (event.key === "Escape") {
			event.stopPropagation();
			open(false);
			toggle.focus();
		}
	});
	refresh();
	return { ...actions, refresh };
}
