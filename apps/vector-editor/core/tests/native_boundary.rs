#![cfg(not(target_arch = "wasm32"))]
use vector_core::native::*;

// Boundary scenarios exercise the exported adapter and canonical engine together.
// These are integration checks, not native UI or hardware evidence.
fn copy(id: usize, start: usize, capacity: usize, data: &mut [f32]) -> usize {
    assert!(data.len() >= capacity.min(256) * 6);
    unsafe { vc_copy_segments(id, start, capacity, data.as_mut_ptr()) }
}

#[test]
fn native_chunks_match_web_geometry_including_dabs_and_pressure_changes() {
    vc_reset();
    let id = vc_begin(12., 0x123456);
    for i in 0..777 {
        // Repeated positions deliberately retain changing pressure.
        vc_push((i / 3) as f32, (i % 17) as f32, (i % 13) as f32 / 10.);
    }
    assert_eq!(vc_length(id), 777);
    let mut data = [0.; 256 * 6];
    let mut start = 0;
    while start < vc_length(id) {
        let count = copy(id, start, usize::MAX, &mut data);
        assert_eq!(count, (777 - start).min(256));
        for j in 0..count {
            let index = start + j;
            for field in 0..3 {
                assert_eq!(
                    data[j * 6 + field],
                    vector_core::point(id, index.saturating_sub(1), field as u32)
                );
                assert_eq!(
                    data[j * 6 + 3 + field],
                    vector_core::point(id, index, field as u32)
                );
            }
        }
        start += count;
    }
    vc_commit();
    assert_eq!(vc_color(id), 0x123456);
    assert_eq!(vc_visible(id), 1);
    assert_eq!(vc_length(id), 777);
    assert_eq!(copy(id, 777, 256, &mut data), 0);
    assert_eq!(vc_last_error(), 0);
}

#[test]
fn native_history_cancel_and_branch_keep_monotonic_ids() {
    vc_reset();
    let first = vc_begin(4., 1);
    vc_push(1., 2., 0.5);
    vc_commit();
    let aborted = vc_begin(2., 2);
    vc_push(4., 5., 1.);
    vc_cancel();
    vc_cancel();
    assert_eq!(vc_length(aborted), 0);
    assert_eq!(vc_visible(aborted), 0);
    vc_undo();
    assert_eq!(vc_visible(first), 0);
    assert_eq!(vc_length(first), 1);
    vc_redo();
    assert_eq!(vc_visible(first), 1);
    vc_undo();
    let branch = vc_begin(2., 3);
    assert!(branch > aborted);
    vc_push(9., 8., 1.);
    vc_commit();
    vc_redo();
    assert_eq!(vc_length(first), 0);
    assert_eq!(vc_visible(first), 0);
    assert_eq!(vc_visible(branch), 1);
    assert_eq!(vc_count(), 3);
    vc_reset();
    assert_eq!(vc_count(), 0);
    assert_eq!(vc_visible(branch), 0);
    assert_eq!(vc_last_error(), 2);
}

#[test]
fn native_invalid_arguments_preserve_pending_work_and_buffer_sentinels() {
    vc_reset();
    vc_push(0., 0., 1.);
    assert_eq!(vc_last_error(), 3);
    let id = vc_begin(4., 0);
    vc_push(0., 0., 1.);
    assert_eq!(vc_begin(f32::NAN, 0), usize::MAX);
    assert_eq!(vc_last_error(), 1);
    vc_push(f32::INFINITY, 1., 1.);
    assert_eq!(vc_last_error(), 1);
    vc_push(1., 1., f32::NAN);
    assert_eq!(vc_last_error(), 1);
    assert_eq!(vc_length(id), 1);
    let mut data = [42.; 12];
    assert_eq!(copy(id, usize::MAX, 1, &mut data), 0);
    assert_eq!(vc_last_error(), 1);
    assert_eq!(data, [42.; 12]);
    assert_eq!(copy(usize::MAX, 0, 1, &mut data), 0);
    assert_eq!(vc_last_error(), 2);
    unsafe {
        assert_eq!(vc_copy_segments(id, 0, 1, std::ptr::null_mut()), 0);
        assert_eq!(vc_last_error(), 1);
        assert_eq!(vc_copy_segments(id, 0, 0, std::ptr::null_mut()), 0);
        assert_eq!(vc_last_error(), 0);
    }
    assert_eq!(copy(id, 0, 1, &mut data), 1);
    assert_eq!(&data[6..], &[42.; 6]);
    vc_commit();
    assert_eq!(vc_visible(id), 1);
}

#[test]
fn native_empty_commit_and_active_history_follow_existing_web_semantics() {
    vc_reset();
    let empty = vc_begin(4., 0);
    vc_commit();
    assert_eq!(vc_visible(empty), 0);
    let complete = vc_begin(4., 0);
    vc_push(0., 0., 1.);
    vc_commit();
    let active = vc_begin(4., 0);
    vc_push(1., 1., 1.);
    vc_undo();
    assert_eq!(vc_length(active), 0);
    assert_eq!(vc_visible(complete), 0);
    vc_redo();
    assert_eq!(vc_visible(complete), 1);
}

#[test]
fn native_camera_preserves_web_transform_and_rejects_invalid_results() {
    for zoom in [0.05, 0.5, 1., 2., 16.] {
        for offset in [-1000., 0., 1000.] {
            for screen in [-100., 0., 100., 10000.] {
                assert_eq!(
                    vc_world_coordinate(screen, offset, zoom),
                    (screen - offset) / zoom
                );
                assert_eq!(vc_last_error(), 0);
            }
        }
    }
    for zoom in [0., -1., f32::NAN, f32::INFINITY] {
        assert!(vc_world_coordinate(0., 0., zoom).is_nan());
        assert_eq!(vc_last_error(), 1);
    }
    assert!(vc_world_coordinate(f32::MAX, -f32::MAX, 1.).is_nan());
    assert_eq!(vc_last_error(), 1);
}
