use crate::{
    Code,
    numerics::{Axis, Viewport},
};
#[derive(Clone, Copy, Debug)]
pub struct Style {
    pub width: f64,
    pub rgb: [f64; 3],
    pub opacity: f64,
    pub minimum: f64,
    pub gamma: f64,
    pub fixed: bool,
}
impl Default for Style {
    fn default() -> Self {
        Self {
            width: 8.0,
            rgb: [0.0; 3],
            opacity: 1.0,
            minimum: 0.05,
            gamma: 1.8,
            fixed: false,
        }
    }
}
impl Style {
    pub fn valid(self) -> bool {
        self.rgb
            .iter()
            .all(|v| v.is_finite() && (0.0..=1.0).contains(v))
            && self.width.is_finite()
            && (1.0..=512.0).contains(&self.width)
            && self.opacity.is_finite()
            && (0.0..=1.0).contains(&self.opacity)
            && self.minimum.is_finite()
            && (0.0..=0.5).contains(&self.minimum)
            && self.gamma.is_finite()
            && (0.25..=4.0).contains(&self.gamma)
    }
    pub fn radius(self, sample: RawSample) -> f64 {
        self.width
            * 0.5
            * if self.fixed || !sample.present {
                1.0
            } else {
                self.minimum + (1.0 - self.minimum) * sample.pressure.powf(self.gamma)
            }
    }
}
#[derive(Clone, Copy, Debug, Default)]
pub struct RawSample {
    pub position: [Axis; 2],
    pub pressure: f64,
    pub present: bool,
}
#[derive(Debug, Default)]
pub struct Samples {
    blocks: Vec<Vec<RawSample>>,
    pub len: usize,
}
impl Samples {
    pub fn get(&self, i: usize) -> Option<RawSample> {
        self.blocks
            .get(i / 256)
            .and_then(|v| v.get(i % 256))
            .copied()
    }
    pub fn append(&mut self, samples: &[RawSample]) -> Result<(), Code> {
        let total = self.len.checked_add(samples.len()).ok_or(Code::Exhausted)?;
        let needed = total.div_ceil(256);
        self.blocks
            .try_reserve(needed.saturating_sub(self.blocks.len()))
            .map_err(|_| Code::Capacity)?;
        // Reserve all blocks before changing any accepted sample or length.
        while self.blocks.len() < needed {
            let mut block = Vec::new();
            block.try_reserve_exact(256).map_err(|_| Code::Capacity)?;
            self.blocks.push(block);
        }
        for sample in samples {
            self.blocks[self.len / 256].push(*sample);
            self.len += 1;
        }
        Ok(())
    }
    pub fn charge(&self) -> usize {
        self.blocks.capacity() * size_of::<Vec<RawSample>>()
            + self
                .blocks
                .iter()
                .map(|b| b.capacity() * size_of::<RawSample>())
                .sum::<usize>()
    }
}
#[derive(Debug)]
pub struct Stroke {
    pub id: u64,
    pub samples: Samples,
    pub style: Style,
}
#[derive(Clone, Copy, Debug)]
pub struct Gesture {
    pub id: u64,
    pub _pointer: u64,

    pub mapping: u64,
    pub sequence: u64,
    pub base: Viewport,
    pub start: [f64; 2],
    pub rotate: bool,
}
#[derive(Default)]
pub struct Document {
    pub style: Style,
    pub view: Viewport,
    pub strokes: Vec<Stroke>,
    pub visible: usize,
    pub retired: usize,
    pub active: Option<Stroke>,
    pub gesture: Option<Gesture>,
    pub next_id: u64,
}
impl Document {
    pub fn busy(&self) -> bool {
        self.gesture.is_some()
    }
    pub fn stroke(&self, id: u64) -> Option<&Stroke> {
        self.active
            .as_ref()
            .filter(|s| s.id == id)
            .or_else(|| self.strokes[..self.visible].iter().find(|s| s.id == id))
    }
    pub fn charge(&self) -> usize {
        self.strokes.capacity() * size_of::<Stroke>()
            + self
                .strokes
                .iter()
                .map(|s| s.samples.charge())
                .sum::<usize>()
            + self.active.as_ref().map_or(0, |s| s.samples.charge())
    }
}
