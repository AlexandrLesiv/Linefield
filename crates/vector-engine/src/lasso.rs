//! Synchronous disposable query state, never an authoritative document copy.
use super::{
    lasso_math::{self, Edge},
    picking::INPUT,
};
use std::cell::RefCell;
#[derive(Default)]
struct Query {
    edges: Vec<Edge>,
    first: Option<[f64; 2]>,
    last: Option<[f64; 2]>,
    ready: bool,
}
thread_local! { static QUERY: RefCell<Query> = RefCell::new(Query::default()); }
/// Begin/end a query and release its edge allocation. Never discard gesture points.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn lasso_reset() {
    QUERY.with(|q| *q.borrow_mut() = Query::default());
}
/// Append up to 768 view-local point pairs from pick_input_ptr. 1=accepted, 0=error.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn lasso_append(count: usize) -> u32 {
    if count > 768 {
        return 0;
    }
    INPUT.with(|input| {
        let input = input.borrow();
        let points = &input[..count * 2];
        if points.iter().any(|v| !v.is_finite()) {
            return 0;
        }
        QUERY.with(|q| {
            let mut q = q.borrow_mut();
            if q.ready || q.edges.try_reserve(count).is_err() {
                return 0;
            }
            for p in points.chunks_exact(2) {
                let p = [p[0], p[1]];
                if let Some(last) = q.last {
                    q.edges.push(Edge::new(last, p));
                }
                if q.first.is_none() {
                    q.first = Some(p);
                }
                q.last = Some(p);
            }
            1
        })
    })
}
/// Close the gesture using the approved automatic closure rule.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn lasso_finish() -> u32 {
    QUERY.with(|q| {
        let mut q = q.borrow_mut();
        if q.ready || q.edges.try_reserve(1).is_err() {
            return 0;
        }
        if let (Some(first), Some(last)) = (q.first, q.last) {
            q.edges.push(Edge::new(last, first));
        }
        q.ready = true;
        1
    })
}
/// Bit flags: 1=nonempty ink, 2=any match, 4=any miss, 8=invalid batch/state.
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn lasso_capsules(count: usize, partial: u32) -> u32 {
    if count > 256 || partial > 1 {
        return 8;
    }
    INPUT.with(|input| {
        let input = input.borrow();
        let capsules = &input[..count * 6];
        if capsules.iter().any(|v| !v.is_finite())
            || capsules.chunks_exact(6).any(|c| c[2] < 0.0 || c[5] < 0.0)
        {
            return 8;
        }
        QUERY.with(|q| {
            let q = q.borrow();
            if !q.ready {
                return 8;
            }
            let mut flags = 0;
            for c in capsules.chunks_exact(6) {
                if c[2].max(c[5]) <= 0.0 {
                    continue;
                }
                flags |= 1;
                flags |= if lasso_math::matches(&q.edges, c, partial != 0) {
                    2
                } else {
                    4
                };
                if (partial != 0 && flags & 2 != 0) || (partial == 0 && flags & 4 != 0) {
                    break;
                }
            }
            flags
        })
    })
}
