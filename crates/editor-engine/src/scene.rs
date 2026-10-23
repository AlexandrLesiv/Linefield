use crate::{Code, Engine, Style, numerics::Axis};
#[derive(Clone, Copy, Debug, Default)]
pub struct Placement {
    pub matrix: [f32; 6],
    pub available: bool,
    pub raster_epoch: u64,
    pub offset: [i32; 2],
    pub disposition: crate::PlacementDisposition,
    pub raster_miss: crate::RasterMiss,
}
#[derive(Debug)]
pub struct Page {
    pub data: Vec<f32>,
    pub origin: [Axis; 2],
    pub next: u64,
    pub done: bool,
    pub page: u64,
    pub revision: u64,
    pub style: Style,
}
#[derive(Clone, Copy, Debug)]
pub(crate) struct Descriptor {
    pub id: u64,
    pub key: crate::geometry_cursor::PageKey,
    pub bounds: [f64; 4],
    pub centers: [f64; 4],
    pub origin: [Axis; 2],
    pub proof: crate::source_proof::SourceProof,
}
impl Engine {
    pub fn scene_list(
        &self,
        owner: u64,
        session: u64,
        scene: u64,
        after: u64,
    ) -> Result<Vec<u64>, Code> {
        self.session(owner, session)?;
        if self.current.is_none_or(|v| v.scene != scene) {
            return Err(Code::StaleScene);
        }
        let mut out = Vec::new();
        out.try_reserve_exact(256).map_err(|_| Code::Capacity)?;
        let prefix = &self.document.strokes[..self.document.visible];
        let start = prefix.partition_point(|s| s.id <= after);
        for s in prefix[start..]
            .iter()
            .chain(self.document.active.iter())
            .filter(|s| s.id > after)
            .take(256)
        {
            out.push(s.id);
        }
        Ok(out)
    }
    pub fn stroke_info(
        &self,
        owner: u64,
        session: u64,
        scene: u64,
        id: u64,
    ) -> Result<(u64, Style, bool), Code> {
        self.session(owner, session)?;
        if self.current.is_none_or(|v| v.scene != scene) {
            return Err(Code::StaleScene);
        }
        self.document
            .stroke(id)
            .map(|s| {
                (
                    s.samples.len as u64,
                    s.style,
                    self.document.active.as_ref().is_some_and(|a| a.id == id),
                )
            })
            .ok_or(Code::StaleScene)
    }
    pub fn placement(
        &self,
        owner: u64,
        session: u64,
        mapping: u64,
        stroke: u64,
        page: u64,
    ) -> Result<Placement, Code> {
        self.mapping(owner, session, mapping)?;
        let Some(m) = self.current.and_then(|v| v.metrics) else {
            return Err(Code::Unavailable);
        };
        let v = self.document.view;
        self.project_page(stroke, page, v, m)
    }
    pub(crate) fn project_page(
        &self,
        stroke: u64,
        page: u64,
        v: crate::numerics::Viewport,
        m: crate::Metrics,
    ) -> Result<Placement, Code> {
        let descriptor = self
            .pages
            .binary_search_by_key(&page, |p| p.id)
            .ok()
            .and_then(|i| self.pages.get(i))
            .filter(|p| p.key.stroke == stroke)
            .ok_or(Code::StaleScene)?;
        let source = self.document.stroke(stroke).ok_or(Code::StaleScene)?;
        if !descriptor
            .proof
            .current(source.samples.len as u64, descriptor.key)
        {
            return Err(Code::StaleScene);
        }
        self.project_descriptor(descriptor, v, m, source.style.width)
    }
    pub(crate) fn project_descriptor(
        &self,
        descriptor: &Descriptor,
        v: crate::numerics::Viewport,
        m: crate::Metrics,
        width: f64,
    ) -> Result<Placement, Code> {
        if descriptor.key.detail < v.zoom * m.backing {
            return Err(Code::StaleScene);
        }
        let x = match descriptor.origin[0].relative(v.center[0]) {
            Ok(x) => x,
            Err(_) => return Ok(Placement::default()),
        };
        let y = match descriptor.origin[1].relative(v.center[1]) {
            Ok(y) => y,
            Err(_) => return Ok(Placement::default()),
        };
        let (s, c) = v.angle.sin_cos();
        let scale = v.zoom * m.backing;
        let tx = (c * x - s * y) * scale + m.width * m.backing / 2.0;
        let ty = (s * x + c * y) * scale + m.height * m.backing / 2.0;
        let [left, top, right, bottom] = descriptor.bounds;
        let points = [[left, top], [right, top], [left, bottom], [right, bottom]]
            .map(|[x, y]| [(c * x - s * y) * scale + tx, (s * x + c * y) * scale + ty]);
        if points.iter().all(|p| p[0] < -2.0)
            || points.iter().all(|p| p[1] < -2.0)
            || points.iter().all(|p| p[0] > m.width * m.backing + 2.0)
            || points.iter().all(|p| p[1] > m.height * m.backing + 2.0)
        {
            return Ok(Placement::default());
        }
        let matrix = crate::geometry_precision::placement(
            [c * scale, s * scale, -s * scale, c * scale, tx, ty],
            descriptor.centers,
            width * 0.5,
            scale,
            m.width.max(m.height) * m.backing,
        )?;
        crate::raster_quad::certify(
            matrix,
            descriptor.centers,
            width * 0.5,
            scale,
            descriptor.key.detail,
            [0; 2],
        )?;
        Ok(Placement {
            matrix,
            available: true,
            disposition: crate::PlacementDisposition::Visible,
            ..Default::default()
        })
    }
    pub fn release_page(&mut self, page: u64) {
        self.pages.retain(|v| v.id != page);
    }
}
