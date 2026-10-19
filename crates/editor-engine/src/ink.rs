use crate::numerics::{Axis, Viewport, unproject};
use crate::{Code, Metrics};
#[derive(Clone, Copy, Debug)]
pub struct Input {
    pub x: f64,
    pub y: f64,
    pub pressure: f64,
    pub has_pressure: bool,
}
#[derive(Clone, Copy, Debug)]
pub struct Sample {
    pub(crate) x: Axis,
    pub(crate) y: Axis,
    pub(crate) radius: f64,
    pub(crate) offset: u64,
    pub(crate) hull: bool,
}
#[derive(Debug)]
pub(crate) struct Stroke {
    pub id: u64,
    pub samples: Vec<Sample>,
    pub color: [f64; 3],
    pub min: [Axis; 2],
    pub max: [Axis; 2],
    pub verbs: u64,
}
pub(crate) struct Active {
    pub _pointer: u64,
    pub interaction: u64,
    pub stroke: Stroke,
}
pub(crate) struct Document {
    pub width: f64,
    pub color: [f64; 3],
    pub viewport: Viewport,
    pub strokes: Vec<Stroke>,
    pub visible: usize,
    pub retired: usize,
    pub active: Option<Active>,
    pub pan: Option<crate::pan::Pan>,
}
impl Default for Document {
    fn default() -> Self {
        Self {
            width: 8.0,
            color: [0.0; 3],
            viewport: Viewport::default(),
            strokes: Vec::new(),
            visible: 0,
            retired: 0,
            active: None,
            pan: None,
        }
    }
}
impl Document {
    pub fn busy(&self) -> bool {
        self.active.is_some() || self.pan.is_some()
    }
    pub fn charge(&self) -> usize {
        self.strokes.capacity() * size_of::<Stroke>()
            + self.strokes.iter().map(Stroke::charge).sum::<usize>()
            + self
                .active
                .as_ref()
                .map_or(0, |active| active.stroke.charge())
    }
    pub fn sample(&self, input: Input, metrics: Metrics) -> Result<Sample, Code> {
        if !input.pressure.is_finite()
            || !(0.0..=1.0).contains(&input.pressure)
            || (!input.has_pressure && input.pressure.to_bits() != 0)
        {
            return Err(Code::Invalid);
        }
        let radius = if input.has_pressure {
            let t = 9.0 * input.pressure;
            let u = 1.0 + t;
            let v = self.width * u;
            v / 20.0
        } else {
            self.width / 2.0
        };
        let [x, y] = unproject(
            self.viewport,
            [input.x, input.y],
            [metrics.width / 2.0, metrics.height / 2.0],
            8192,
        )?;
        Ok(Sample {
            x,
            y,
            radius,
            offset: 0,
            hull: false,
        })
    }
}
impl Stroke {
    pub fn charge(&self) -> usize {
        self.samples.capacity() * size_of::<Sample>()
    }
    pub fn push(&mut self, mut sample: Sample) -> Result<(), Code> {
        sample.offset = self.verbs;
        sample.hull = self
            .samples
            .last()
            .is_some_and(|previous| crate::geometry::hull(*previous, sample).is_some());
        self.verbs = self
            .verbs
            .checked_add(if sample.hull { 11 } else { 6 })
            .ok_or(Code::Exhausted)?;
        self.min = [self.min[0].min(sample.x), self.min[1].min(sample.y)];
        self.max = [self.max[0].max(sample.x), self.max[1].max(sample.y)];
        self.samples.push(sample);
        Ok(())
    }
}
