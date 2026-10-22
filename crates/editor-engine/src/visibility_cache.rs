use crate::{visibility_bounds::Hull, visibility_range::Key};

pub(crate) const BUCKETS: usize = 8192;
pub(crate) const NODES: usize = 32768;
pub(crate) const NONE: u32 = u32::MAX;
#[derive(Clone, Copy)]
pub(crate) struct Pin {
    pub slot: u32,
    pub id: u64,
}
pub(crate) struct Node {
    pub key: Key,
    pub hull: Hull,
    pub id: u64,
    pub pins: u16,
    pub hash_next: u32,
    pub previous: u32,
    pub next: u32,
}
pub(crate) struct Cache {
    pub nodes: Vec<Node>,
    pub buckets: Vec<u32>,
    pub head: u32,
    pub tail: u32,
    pub counter: u64,
    #[cfg(feature = "e2e-fixtures")]
    pub limit: usize,
}
impl Default for Cache {
    fn default() -> Self {
        Self {
            nodes: Vec::new(),
            buckets: Vec::new(),
            head: NONE,
            tail: NONE,
            counter: 0,
            #[cfg(feature = "e2e-fixtures")]
            limit: NODES,
        }
    }
}
impl Cache {
    pub fn bytes(&self) -> usize {
        self.nodes.capacity() * size_of::<Node>() + self.buckets.capacity() * size_of::<u32>()
    }
    fn bucket(key: Key) -> usize {
        let hash = key.0.into_iter().fold(0x9e3779b97f4a7c15u64, |h, v| {
            h.rotate_left(13).wrapping_mul(0x100000001b3) ^ v
        });
        let hash = (hash ^ (hash >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
        let hash = (hash ^ (hash >> 27)).wrapping_mul(0x94d049bb133111eb);
        (hash ^ (hash >> 31)) as usize % BUCKETS
    }
    pub fn find(&mut self, key: Key) -> Option<Pin> {
        let mut slot = *self.buckets.get(Self::bucket(key))?;
        for _ in 0..16 {
            if slot == NONE {
                return None;
            }
            let node = &self.nodes[slot as usize];
            if node.key == key {
                let pin = Pin { slot, id: node.id };
                self.touch(slot);
                return Some(pin);
            }
            slot = node.hash_next;
        }
        None
    }
    pub fn hull(&self, pin: Pin) -> Hull {
        self.nodes[pin.slot as usize].hull
    }
    pub fn pin(&mut self, pin: Pin) {
        self.nodes[pin.slot as usize].pins += 1;
    }
    pub fn unpin(&mut self, pin: Pin) {
        let node = &mut self.nodes[pin.slot as usize];
        debug_assert_eq!(node.id, pin.id);
        node.pins -= 1;
    }
    fn unlink(&mut self, slot: u32) {
        let node = &self.nodes[slot as usize];
        let (previous, next) = (node.previous, node.next);
        if previous == NONE {
            self.head = next;
        } else {
            self.nodes[previous as usize].next = next;
        }
        if next == NONE {
            self.tail = previous;
        } else {
            self.nodes[next as usize].previous = previous;
        }
    }
    fn touch(&mut self, slot: u32) {
        if self.tail == slot {
            return;
        }
        self.unlink(slot);
        self.append(slot);
    }
    fn append(&mut self, slot: u32) {
        self.nodes[slot as usize].previous = self.tail;
        self.nodes[slot as usize].next = NONE;
        if self.tail == NONE {
            self.head = slot;
        } else {
            self.nodes[self.tail as usize].next = slot;
        }
        self.tail = slot;
    }
    pub fn insert(&mut self, key: Key, hull: Hull) -> Option<Pin> {
        if let Some(pin) = self.find(key) {
            return Some(pin);
        }
        #[cfg(feature = "e2e-fixtures")]
        let limit = self.limit;
        #[cfg(not(feature = "e2e-fixtures"))]
        let limit = NODES;
        if limit == 0 {
            return None;
        }
        let id = self.counter.checked_add(1)?;
        if !self.reserve() {
            return None;
        }
        let bucket = Self::bucket(key);
        let mut cursor = self.buckets[bucket];
        let mut count = 0;
        while cursor != NONE {
            count += 1;
            if count >= 16 {
                return None;
            }
            cursor = self.nodes[cursor as usize].hash_next;
        }
        let slot = if self.nodes.len() < limit {
            let slot = self.nodes.len() as u32;
            self.nodes.push(Node {
                key,
                hull,
                id,
                pins: 0,
                hash_next: NONE,
                previous: NONE,
                next: NONE,
            });
            slot
        } else {
            let mut slot = self.head;
            for _ in 0..257 {
                if slot == NONE || self.nodes[slot as usize].pins == 0 {
                    break;
                }
                slot = self.nodes[slot as usize].next;
            }
            if slot == NONE || self.nodes[slot as usize].pins != 0 {
                return None;
            }
            self.remove_hash(slot);
            self.unlink(slot);
            self.nodes[slot as usize] = Node {
                key,
                hull,
                id,
                pins: 0,
                hash_next: NONE,
                previous: NONE,
                next: NONE,
            };
            slot
        };
        self.nodes[slot as usize].hash_next = self.buckets[bucket];
        self.buckets[bucket] = slot;
        self.append(slot);
        self.counter = id;
        Some(Pin { slot, id })
    }
    fn remove_hash(&mut self, slot: u32) {
        let bucket = Self::bucket(self.nodes[slot as usize].key);
        let mut previous = NONE;
        let mut current = self.buckets[bucket];
        while current != slot {
            previous = current;
            current = self.nodes[current as usize].hash_next;
        }
        let next = self.nodes[slot as usize].hash_next;
        if previous == NONE {
            self.buckets[bucket] = next;
        } else {
            self.nodes[previous as usize].hash_next = next;
        }
    }
    pub fn clear(&mut self) {
        self.nodes.clear();
        self.buckets.fill(NONE);
        self.head = NONE;
        self.tail = NONE;
    }
}
