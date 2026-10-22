use crate::visibility_cache::{BUCKETS, Cache, NODES, NONE, Node};

impl Cache {
    pub(crate) fn reserve(&mut self) -> bool {
        if !self.buckets.is_empty() {
            return true;
        }
        // Optional allocation occurs only inside bounded visibility traversal, never
        // Begin/Append/End. Reserve actual capacities atomically before publishing them.
        let mut nodes = Vec::new();
        let mut buckets = Vec::new();
        if nodes.try_reserve_exact(NODES).is_err() || buckets.try_reserve_exact(BUCKETS).is_err() {
            return false;
        }
        if nodes.capacity() * size_of::<Node>()
            + buckets.capacity() * size_of::<u32>()
            + size_of::<Cache>()
            > 8 * 1024 * 1024
        {
            return false;
        }
        buckets.resize(BUCKETS, NONE);
        self.nodes = nodes;
        self.buckets = buckets;
        true
    }
}
