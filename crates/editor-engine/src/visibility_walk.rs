use crate::{
    document::Document,
    visibility_bounds::Hull,
    visibility_cache::Cache,
    visibility_cursor::{Cursor, Step, VisibilityPage},
    visibility_range::Range,
};

impl Cursor {
    pub fn walk(&mut self, document: &Document, cache: &mut Cache, page: &mut VisibilityPage) {
        while page.visited < 512 && page.strokes.len() < 128 {
            let Some(step) = self.stack.last() else { break };
            let range = step.range;
            let key = range.key(document);
            let children = range.children(document);
            if step.phase == 0 {
                let cached = cache.find(key);
                if children.is_none() && cached.is_none() && page.hulls == 4 {
                    break;
                }
                page.visited += 1;
                let hull = cached.map(|pin| cache.hull(pin));
                if hull.is_some_and(|h| !h.visible(self.captured)) {
                    self.stack.pop();
                    continue;
                }
                if let Some((left, _)) = children {
                    if let Some(pin) = cached {
                        cache.pin(pin);
                    }
                    let step = self.stack.last_mut().expect("current traversal step");
                    step.phase = 1;
                    step.pin = cached;
                    // Both source and chunk ranges halve. Canonical allocation limits
                    // bound their combined depth below128; no capacity growth is allowed.
                    assert!(self.stack.len() < 128);
                    self.stack.push(Step {
                        range: left,
                        phase: 0,
                        pin: None,
                    });
                } else {
                    let source = &document.strokes[range.source];
                    let hull = hull.unwrap_or_else(|| {
                        page.hulls += 1;
                        let h = Hull::chunk(source, range.start);
                        cache.insert(key, h);
                        h
                    });
                    if hull.visible(self.captured) {
                        page.strokes.push(source.id);
                        page.chunks.push(range.start as u64);
                        page.revisions.push(source.samples.len as u64);
                    }
                    self.stack.pop();
                }
            } else {
                page.visited += 1;
                if step.phase == 1
                    && let Some((_, Some(right))) = children
                {
                    self.stack.last_mut().expect("current traversal step").phase = 2;
                    assert!(self.stack.len() < 128);
                    self.stack.push(Step {
                        range: right,
                        phase: 0,
                        pin: None,
                    });
                    continue;
                }
                let step = self.stack.pop().expect("current traversal step");
                if let Some(pin) = step.pin {
                    cache.unpin(pin);
                } else if let Some((left, right)) = children {
                    let hull = Self::child_hull(left, document, cache);
                    let hull =
                        right.map_or(hull, |r| hull.union(Self::child_hull(r, document, cache)));
                    // Missing child data is unknown, never a false culling certificate.
                    // Do not cache a missing aggregate: a later traversal can complete it.
                    if hull.known {
                        cache.insert(key, hull);
                    }
                }
            }
        }
        page.done = self.stack.is_empty();
        page.next = if page.done { 0 } else { self.id };
    }
    fn child_hull(range: Range, document: &Document, cache: &mut Cache) -> Hull {
        cache
            .find(range.key(document))
            .map(|pin| cache.hull(pin))
            .unwrap_or_default()
    }
}
