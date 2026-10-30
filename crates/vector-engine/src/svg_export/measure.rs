use super::{Group, Job, Key, STATE};
use std::ops::Bound::{Excluded, Unbounded};

#[derive(Default)]
pub(super) struct Layout {
    pub state: u32,
    key: Option<Key>,
    chunk: usize,
    group: Option<Group>,
    pub groups: usize,
    pub bounds: Option<[f64; 4]>,
    pub image_key: Option<(usize, usize, usize)>,
    pub images_done: bool,
    pub text_key: Option<(usize, usize, usize)>,
    pub texts_done: bool,
    pub view: [f64; 9],
}
pub(super) fn fail(j: &mut Job, code: u32) -> u32 {
    j.error = code;
    j.state = 5;
    j.xml.text.clear();
    0
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_configure(token: u32, density: f64, background: u32, grid: u32) -> u32 {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token) else {
            return 0;
        };
        if j.state != 2 || j.tolerance.is_some() || j.layout.state != 0 {
            return fail(j, 3);
        }
        if ![1.0, 2.0, 4.0].contains(&density) || background > 2 || grid > 1 {
            return fail(j, 1);
        }
        let paper = match background {
            0 => {
                if j.settings[0] == 0 {
                    3
                } else {
                    j.settings[0]
                }
            }
            1 => 3,
            _ => 0,
        };
        let grid = if grid == 1 { j.settings[1] } else { 0 };
        if paper == 0 && grid != 0 {
            return fail(j, 1);
        }
        j.layout.state = 1;
        j.layout.view[4..7].copy_from_slice(&[density, paper as f64, grid as f64]);
        1
    })
}
fn step(j: &mut Job) -> Option<()> {
    if !j.layout.texts_done {
        return super::texts::measure(j);
    }
    if !j.layout.images_done {
        return super::images::measure(j);
    }
    let next = match j.layout.key {
        None => j.items.first_key_value(),
        Some(key) if j.layout.chunk > 0 => j.items.get_key_value(&key),
        Some(key) => j.items.range((Excluded(key), Unbounded)).next(),
    };
    let Some((&key, item)) = next else {
        let b = j.layout.bounds.unwrap_or([16.0, 16.0, 1904.0, 1064.0]);
        let d = j.layout.view[4];
        let [left, top, right, bottom] = [
            ((b[0] - 16.0) * d).floor(),
            ((b[1] - 16.0) * d).floor(),
            ((b[2] + 16.0) * d).ceil(),
            ((b[3] + 16.0) * d).ceil(),
        ];
        let [x, y, pw, ph] = [left / d, top / d, right - left, bottom - top];
        if ![x, y, pw, ph].iter().all(|n| n.is_finite())
            || pw <= 0.0
            || ph <= 0.0
            || pw * ph > 64_000_000.0
        {
            return None;
        }
        j.layout.view[0..4].copy_from_slice(&[x, y, pw / d, ph / d]);
        j.layout.view[7..9].copy_from_slice(&[pw, ph]);
        j.layout.state = 2;
        return Some(());
    };
    let s = &item.stroke;
    let origin = j.origin?;
    let place = [
        s.placement(0)?.relative_to(origin[0]),
        s.placement(1)?.relative_to(origin[1]),
    ];
    let b = crate::geometry_wide::chunk_bounds(s, j.layout.chunk)?;
    let [a, z] = s.basis;
    let mut merged = j.layout.bounds.unwrap_or([
        f64::INFINITY,
        f64::INFINITY,
        f64::NEG_INFINITY,
        f64::NEG_INFINITY,
    ]);
    for x in [b[0], b[2]] {
        for y in [b[1], b[3]] {
            let p = [place[0] + a * x - z * y, place[1] + z * x + a * y];
            if p.iter().any(|n| !n.is_finite() || n.abs() > 4294967296.0) {
                return None;
            }
            for axis in 0..2 {
                merged[axis] = merged[axis].min(p[axis]);
                merged[axis + 2] = merged[axis + 2].max(p[axis]);
            }
        }
    }
    let group = item.group();
    if j.layout.group != Some(group) {
        j.layout.groups += 1;
        j.layout.group = Some(group);
    }
    j.layout.bounds = Some(merged);
    j.layout.key = Some(key);
    j.layout.chunk += 1;
    if crate::geometry_wide::chunk_range(s, j.layout.chunk).is_none() {
        j.layout.chunk = 0;
    }
    Some(())
}
/// One bounded geometry chunk per call; 1 measuring, 2 ready, 5 failed.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_measure(token: u32) -> u32 {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token) else {
            return 0;
        };
        if j.state != 2 || j.layout.state == 0 {
            fail(j, 3);
            return 5;
        }
        if j.layout.state == 1 && step(j).is_none() {
            fail(j, 2);
            return 5;
        }
        j.layout.state
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_view(token: u32, index: usize) -> f64 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token && j.layout.state == 2 && [2, 3].contains(&j.state))
            .and_then(|j| j.layout.view.get(index))
            .copied()
            .unwrap_or(f64::NAN)
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_group_last(token: u32) -> u32 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token && [2, 3].contains(&j.state))
            .map_or(0, |j| u32::from(j.group_last))
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_error(token: u32) -> u32 {
    STATE.with(|s| {
        s.borrow()
            .job
            .as_ref()
            .filter(|j| j.token == token)
            .map_or(u32::MAX, |j| {
                if j.state == 5 && j.error == 0 {
                    7
                } else {
                    j.error
                }
            })
    })
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_tolerance(token: u32) -> f64 {
    let density = svg_view(token, 4);
    0.25 / density
}
