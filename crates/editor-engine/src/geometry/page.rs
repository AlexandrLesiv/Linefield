use super::primitives::{disc, hull, quad};
use crate::numerics::{coefficients, eligible, project};
use crate::{Code, Engine, Sample};
#[derive(Default)]
pub struct GeometryPage {
    pub geometry: u64,
    pub next: u64,
    pub done: bool,
    pub stroke: u64,
    pub color: [f64; 3],
    pub verbs: Vec<u8>,
    pub points: Vec<f32>,
    pub weights: Vec<f32>,
}
impl Engine {
    pub fn scene_page(
        &self,
        owner: u64,
        session: u64,
        scene: u64,
        stroke: u64,
        geometry: u64,
        offset: u64,
    ) -> Result<GeometryPage, Code> {
        self.stroke_state(owner, session, scene, stroke)?;
        let state = self.projection(Code::Ok);
        if geometry != state.mapping {
            return Err(Code::StaleScene);
        }
        let metrics = state.metrics.ok_or(Code::Unavailable)?;
        let selected = self.stroke(stroke).ok_or(Code::StaleScene)?;
        let mut page = GeometryPage {
            geometry,
            stroke,
            color: selected.color,
            done: true,
            ..GeometryPage::default()
        };
        let view = self.document.viewport;
        if !eligible(selected.min, selected.max, view, metrics)? {
            return Ok(page);
        }
        let index = selected
            .samples
            .partition_point(|sample| sample.offset <= offset)
            .saturating_sub(1);
        let first = selected.samples.get(index).ok_or(Code::Invalid)?;
        if offset != first.offset && !(first.hull && offset == first.offset + 6) {
            return Err(Code::Invalid);
        }
        page.verbs
            .try_reserve_exact(4096)
            .map_err(|_| Code::Capacity)?;
        page.points
            .try_reserve_exact(12288)
            .map_err(|_| Code::Capacity)?;
        page.weights
            .try_reserve_exact(4096)
            .map_err(|_| Code::Capacity)?;
        let projected = |sample: Sample| -> Result<[f64; 3], Code> {
            let [x, y] = project([sample.x, sample.y], view, metrics)?;
            Ok([x, y, sample.radius * view.zoom])
        };
        for (i, sample) in selected.samples.iter().enumerate().skip(index) {
            let skip_disc = i == index && offset == sample.offset + 6;
            let count = if skip_disc {
                5
            } else if sample.hull {
                11
            } else {
                6
            };
            if page.verbs.len() + count > 4096 {
                page.done = false;
                page.next = sample.offset;
                break;
            }
            let current = projected(*sample)?;
            if !skip_disc {
                disc(
                    current[0],
                    current[1],
                    current[2],
                    &mut page.points,
                    &mut page.weights,
                    &mut page.verbs,
                );
            }
            if sample.hull {
                let previous = *selected.samples.get(i - 1).ok_or(Code::Invalid)?;
                let mut normals = hull(previous, *sample).ok_or(Code::NumericalCapacity)?;
                let [c, s] = coefficients(view.rotation);
                for pair in normals.as_chunks_mut::<2>().0 {
                    let [x, y] = [pair[0], pair[1]];
                    pair[0] = c * x - s * y;
                    pair[1] = s * x + c * y;
                }
                quad(
                    projected(previous)?,
                    current,
                    normals,
                    &mut page.points,
                    &mut page.verbs,
                );
            }
        }
        Ok(page)
    }
}
