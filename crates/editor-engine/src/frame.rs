use crate::{Code, Engine, Metrics, Placement, numerics::Viewport};
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FrameAuthority {
    Prefix,
    LiveSource,
    DisplayOnly,
}
#[derive(Clone, Copy)]
pub struct FrameReceipt {
    pub id: u64,
    pub through: u64,
    pub count: usize,
    pub content: u64,
    pub mapping: u64,
    pub authority: FrameAuthority,
    pub source: u64,
    pub ordinal: usize,
    pub(crate) view: Viewport,
    pub(crate) metrics: Metrics,
    pub(crate) raster: crate::raster_capture::RasterCapture,
}
impl Engine {
    pub fn capture_frame(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
    ) -> Result<FrameReceipt, Code> {
        self.mapping(owner, session, mapping)?;
        if self.receipt_count() >= 8 {
            return Err(Code::Capacity);
        }
        let metrics = self
            .current
            .and_then(|s| s.metrics)
            .ok_or(Code::Unavailable)?;
        let id = self.frame_counter.checked_add(1).ok_or(Code::Exhausted)?;
        let count = self.document.visible;
        let through = count
            .checked_sub(1)
            .and_then(|i| self.document.strokes.get(i))
            .map_or(0, |s| s.id);
        let receipt = FrameReceipt {
            id,
            through,
            count,
            content: self.content_counter,
            mapping,
            authority: FrameAuthority::Prefix,
            source: 0,
            ordinal: 0,
            view: self.document.view,
            metrics,
            raster: self.raster.capture,
        };
        self.insert_frame(receipt)
    }
    pub fn frame_transform(
        &self,
        owner: u64,
        session: u64,
        mapping: u64,
        id: u64,
    ) -> Result<Placement, Code> {
        self.frame_receipt(owner, session, id)?;
        self.frame_display_transform(owner, session, mapping, id)
    }
    pub fn frame_display_transform(
        &self,
        owner: u64,
        session: u64,
        mapping: u64,
        id: u64,
    ) -> Result<Placement, Code> {
        self.mapping(owner, session, mapping)?;
        let f = self
            .frames
            .iter()
            .flatten()
            .find(|f| f.id == id)
            .ok_or(Code::StaleScene)?;
        let m = self
            .current
            .and_then(|s| s.metrics)
            .ok_or(Code::Unavailable)?;
        if m != f.metrics {
            return Err(Code::StaleMapping);
        }
        self.raster_display_transform(*f, m)
    }
    pub(crate) fn display_transform(
        &self,
        captured: Viewport,
        m: Metrics,
    ) -> Result<Placement, Code> {
        self.display_transform_offset(captured, m, [0; 2])
    }
    pub(crate) fn display_transform_offset(
        &self,
        captured: Viewport,
        m: Metrics,
        offset: [i32; 2],
    ) -> Result<Placement, Code> {
        let v = self.document.view;
        let (s, c) = (v.angle - captured.angle).sin_cos();
        let scale = v.zoom / captured.zoom;
        let dx = captured.center[0].relative(v.center[0])?;
        let dy = captured.center[1].relative(v.center[1])?;
        let (vs, vc) = v.angle.sin_cos();
        let x = m.width * m.backing / 2.0;
        let y = m.height * m.backing / 2.0;
        let tx = -(c * f64::from(offset[0]) - s * f64::from(offset[1])) * scale
            + x
            + (vc * dx - vs * dy) * v.zoom * m.backing
            - (c * x - s * y) * scale;
        let ty = -(s * f64::from(offset[0]) + c * f64::from(offset[1])) * scale
            + y
            + (vs * dx + vc * dy) * v.zoom * m.backing
            - (s * x + c * y) * scale;
        let matrix = crate::geometry_precision::placement(
            [c * scale, s * scale, -s * scale, c * scale, tx, ty],
            [0.0, 0.0, m.width * m.backing, m.height * m.backing],
            0.0,
            1.0,
            m.width.max(m.height) * m.backing,
        )?;
        Ok(Placement {
            matrix,
            available: true,
            disposition: crate::PlacementDisposition::Visible,
            ..Default::default()
        })
    }
    pub(crate) fn frame_receipt(
        &self,
        owner: u64,
        session: u64,
        id: u64,
    ) -> Result<FrameReceipt, Code> {
        self.session(owner, session)?;
        let f = *self
            .frames
            .iter()
            .flatten()
            .find(|f| f.id == id)
            .ok_or(Code::StaleScene)?;
        if f.authority != FrameAuthority::Prefix {
            return Err(Code::Invalid);
        }
        if !self.prefix_current(f) {
            return Err(Code::StaleScene);
        }
        Ok(f)
    }
    pub fn frame_placement(
        &self,
        owner: u64,
        session: u64,
        frame: u64,
        stroke: u64,
        page: u64,
    ) -> Result<Placement, Code> {
        let f = self.frame_receipt(owner, session, frame)?;
        if stroke > f.through {
            return Err(Code::StaleScene);
        }
        self.project_frame_page(stroke, page, f)
    }
    pub fn release_frame(&mut self, owner: u64, session: u64, id: u64) -> Code {
        if let Err(c) = self.session(owner, session) {
            return c;
        }
        self.release_visibility(Some(id));
        for slot in &mut self.frames {
            if slot.is_some_and(|f| f.id == id) {
                *slot = None;
            }
        }
        Code::Ok
    }
}
