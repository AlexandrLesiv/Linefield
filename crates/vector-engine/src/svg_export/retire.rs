use super::STATE;
use std::rc::Rc;
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_cancel(token: u32) -> u32 {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s.job.as_mut().filter(|j| j.token == token) else {
            return 0;
        };
        j.state = 4;
        1
    })
}
/// At most64 source-reference/node or256-sample-block retirements per call.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn svg_cleanup(token: u32) -> u32 {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        let Some(j) = s
            .job
            .as_mut()
            .filter(|j| j.token == token && [3, 4, 5].contains(&j.state))
        else {
            return 0;
        };
        for _ in 0..64 {
            if let Some(points) = j.dropping.as_mut() {
                if points.blocks.pop().is_none() {
                    j.dropping = None;
                }
            } else if let Some(item) = j
                .current
                .take()
                .or_else(|| j.items.pop_first().map(|(_, v)| v))
            {
                j.retired.push(item.stroke.points);
            } else if let Some(points) = j.retired.pop() {
                if let Ok(points) = Rc::try_unwrap(points) {
                    j.dropping = Some(points);
                }
            } else if j.texts.pop_first().is_some()
                || j.images.pop_first().is_some()
                || j.image_ids.pop_first().is_some()
            {
                continue;
            } else if j.sources.pop_first().is_none() {
                s.job = None;
                return 1;
            }
        }
        0
    })
}
