use crate::{Code, Engine, Metrics, Placement, numerics::Viewport};
#[derive(Clone, Copy)]
pub struct FrameReceipt {
    pub id: u64,
    pub through: u64,
    pub count: usize,
    pub content: u64,
    pub mapping: u64,
    pub(crate) view: Viewport,
    pub(crate) metrics: Metrics,
}
impl Engine {
    pub fn capture_frame(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
    ) -> Result<FrameReceipt, Code> {
        self.mapping(owner, session, mapping)?;
        if self.frames.len() >= 8 {
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
        self.frames.try_reserve(1).map_err(|_| Code::Capacity)?;
        let receipt = FrameReceipt {
            id,
            through,
            count,
            content: self.content_counter,
            mapping,
            view: self.document.view,
            metrics,
        };
        self.frames.push(receipt);
        self.frame_counter = id;
        Ok(receipt)
    }
    pub fn frame_transform(
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
            .find(|f| f.id == id)
            .ok_or(Code::StaleScene)?;
        if self.document.visible < f.count
            || (f.count > 0 && self.document.strokes[f.count - 1].id != f.through)
        {
            return Err(Code::StaleScene);
        }
        let m = self
            .current
            .and_then(|s| s.metrics)
            .ok_or(Code::Unavailable)?;
        if m != f.metrics {
            return Err(Code::StaleMapping);
        }
        let v = self.document.view;
        let (s, c) = (v.angle - f.view.angle).sin_cos();
        let scale = v.zoom / f.view.zoom;
        let dx = f.view.center[0].relative(v.center[0])?;
        let dy = f.view.center[1].relative(v.center[1])?;
        let (vs, vc) = v.angle.sin_cos();
        let x = m.width * m.backing / 2.0;
        let y = m.height * m.backing / 2.0;
        let tx = x + (vc * dx - vs * dy) * v.zoom * m.backing - (c * x - s * y) * scale;
        let ty = y + (vs * dx + vc * dy) * v.zoom * m.backing - (s * x + c * y) * scale;
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
            .find(|f| f.id == id)
            .ok_or(Code::StaleScene)?;
        if self.document.visible < f.count
            || (f.count > 0 && self.document.strokes[f.count - 1].id != f.through)
        {
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
        self.project_page(stroke, page, f.view, f.metrics)
    }
    pub fn release_frame(&mut self, owner: u64, session: u64, id: u64) -> Code {
        if let Err(c) = self.session(owner, session) {
            return c;
        }
        self.frames.retain(|f| f.id != id);
        Code::Ok
    }
}
