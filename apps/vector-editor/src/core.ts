export type Core = {
	set_active_brush(kind: number): void;
	brush(id: number): number;
	stroke_width(id: number): number;
	slice_begin(width: number, activeOnly: number): number;
	slice_push(x: number, y: number): number;
	slice_commit(): number;
	raw_length(id: number): number;
	stroke_order(id: number): number;
	stroke_blend_group(id: number): number;
	delete_begin(): void;
	delete_add(id: number): void;
	delete_commit(): number;
	stroke_transform(id: number, component: number): number;
	transform_update(
		px: number,
		py: number,
		scale: number,
		angle: number,
		dx: number,
		dy: number,
	): number;
	stroke_offset(id: number, axis: number): number;
	transform_revision(): number;
	move_begin(): void;
	move_add(id: number): number;
	move_update(dx: number, dy: number): number;
	move_commit(): void;
	move_cancel(): void;
	begin(w: number, c: number): number;
	begin_with_pressure(
		w: number,
		c: number,
		minimum: number,
		gamma: number,
	): number;
	begin_with_style(
		w: number,
		c: number,
		minimum: number,
		gamma: number,
		opacity: number,
	): number;
	begin_fixed_width(w: number, c: number, opacity: number): number;
	push(x: number, y: number, p: number): void;
	commit(): void;
	cancel(): void;
	undo(): void;
	redo(): void;
	can_draw(): number;
	can_undo(): number;
	can_redo(): number;
	layer_count(): number;
	layer_at(rank: number): number;
	layer_active(): number;
	layer_revision(): number;
	layer_render_revision(): number;
	layer_create(): number;
	layer_select(id: number): number;
	layer_delete(id: number): number;
	layer_move(id: number, rank: number): number;
	layer_set_visible(id: number, value: number): number;
	layer_set_locked(id: number, value: number): number;
	layer_visible(id: number): number;
	layer_locked(id: number): number;
	layer_name_input_ptr(): number;
	layer_name_ptr(id: number): number;
	layer_name_len(id: number): number;
	layer_rename(id: number, length: number): number;
	stroke_layer(id: number): number;
	stroke_layer_rank(id: number): number;
	count(): number;
	visible(id: number): number;
	length(id: number): number;
	color(id: number): number;
	opacity(id: number): number;
	point(id: number, i: number, f: number): number;
	render_chunk(id: number, chunk: number, tolerance: number): number;
	render_chunk_ptr(): number;
	geometry_input_ptr(): number;
	geometry_snapshot(id: number, chunk: number): number;
	render_snapshot(length: number, tolerance: number): number;
	raw_chunk_bounds_ptr(id: number, chunk: number): number;
	raw_chunk_bounds(id: number, chunk: number, field: number): number;
	raw_point(id: number, index: number, field: number): number;
	memory: WebAssembly.Memory;
};
