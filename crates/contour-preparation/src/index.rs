use crate::{contour::Contour, point::Point};
const SEGMENTS: usize = 96;
const PER_SEGMENT: usize = 32;
pub(crate) struct Entry {
    pub contour: Contour,
    pub polygon: [Point; 16],
    pub count: usize,
    bounds: [f32; 4],
    hash: u64,
}
pub(crate) struct Index {
    segments: [Option<Vec<Entry>>; SEGMENTS],
    len: usize,
}
impl Default for Index {
    fn default() -> Self {
        Self {
            segments: std::array::from_fn(|_| None),
            len: 0,
        }
    }
}
impl Index {
    pub fn bytes(&self) -> usize {
        self.segments
            .iter()
            .flatten()
            .map(|v| v.capacity() * size_of::<Entry>())
            .sum::<usize>()
            + size_of::<Self>()
            + size_of::<Entry>()
    }
    pub fn get(&self, index: usize) -> Option<&Entry> {
        self.segments
            .get(index / PER_SEGMENT)?
            .as_ref()?
            .get(index % PER_SEGMENT)
    }
    pub fn insert(&mut self, contour: Contour) {
        let segment = self.len / PER_SEGMENT;
        if segment >= SEGMENTS {
            return;
        }
        if self.segments[segment].is_none() {
            let reserve = 2 * PER_SEGMENT * size_of::<Entry>();
            if self
                .bytes()
                .checked_add(reserve)
                .is_none_or(|n| n > 16 * 1024 * 1024)
            {
                return;
            }
            let mut values = Vec::new();
            if values.try_reserve_exact(PER_SEGMENT).is_err() {
                return;
            }
            if values.capacity() > 2 * PER_SEGMENT {
                return;
            }
            self.segments[segment] = Some(values);
        }
        let Some((polygon, count)) = contour.polygon() else {
            return;
        };
        if let Some(values) = self.segments[segment].as_mut() {
            values.push(Entry {
                contour,
                polygon,
                count,
                bounds: contour.bounds(),
                hash: contour.hash(),
            });
            self.len += 1;
        }
    }
    pub fn query(&self, contour: Contour) -> ([usize; 16], usize, bool, usize, usize) {
        let bounds = contour.bounds();
        let hash = contour.hash();
        let mut candidates = [0; 16];
        let (mut count, mut comparisons, mut visits) = (0, 0, 0);
        for index in (0..self.len).rev().take(256) {
            let Some(entry) = self.get(index) else { break };
            visits += 1;
            if comparisons < 16 && entry.hash == hash {
                comparisons += 1;
                if entry.contour == contour {
                    return (candidates, count, true, visits, comparisons);
                }
            }
            if count < 16
                && entry.bounds[0] <= bounds[2]
                && entry.bounds[2] >= bounds[0]
                && entry.bounds[1] <= bounds[3]
                && entry.bounds[3] >= bounds[1]
            {
                candidates[count] = index;
                count += 1;
            }
        }
        (candidates, count, false, visits, comparisons)
    }
    pub fn release_step(&mut self) -> bool {
        if self.len == 0 {
            for segment in &mut self.segments {
                if segment.take().is_some() {
                    return false;
                }
            }
            return true;
        }
        let segment = (self.len - 1) / PER_SEGMENT;
        if let Some(values) = self.segments[segment].take() {
            self.len -= values.len();
        }
        self.len == 0
    }
}
