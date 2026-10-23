use crate::{Code, Engine, FrameReceipt, Placement};
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum PlacementDisposition {
    Visible,
    #[default]
    Invisible,
    AnchorMiss,
}
impl PlacementDisposition {
    pub fn label(self) -> &'static str {
        match self {
            Self::Visible => "visible",
            Self::Invisible => "invisible",
            Self::AnchorMiss => "anchorMiss",
        }
    }
}
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum RasterMiss {
    #[default]
    None,
    Range,
    Residual,
    Envelope,
    Phase,
}
impl RasterMiss {
    pub fn label(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Range => "range",
            Self::Residual => "residual",
            Self::Envelope => "envelope",
            Self::Phase => "phase",
        }
    }
}
impl Placement {
    fn anchor_miss(reason: RasterMiss) -> Self {
        Self {
            disposition: PlacementDisposition::AnchorMiss,
            raster_miss: reason,
            ..Self::default()
        }
    }
}
impl Engine {
    pub(crate) fn project_frame_page(
        &self,
        stroke: u64,
        page: u64,
        f: FrameReceipt,
    ) -> Result<Placement, Code> {
        if !f.raster.anchored() {
            return self.project_page(stroke, page, f.view, f.metrics);
        }
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
            || descriptor.key.detail < f.view.zoom * f.metrics.backing
        {
            return Err(Code::StaleScene);
        }
        let v = f.raster.anchor;
        let m = f.metrics;
        let offset = f.raster.offset;
        let rho = match crate::numerics::raster_residual::descriptor(
            descriptor.origin,
            v,
            f.view,
            m,
            offset,
        ) {
            Ok(value) => value,
            Err(_) => return Ok(Placement::anchor_miss(RasterMiss::Residual)),
        };
        let coordinates = [0, 1].map(|i| descriptor.origin[i].relative(v.center[i]));
        let [Ok(x), Ok(y)] = coordinates else {
            return Ok(Placement::anchor_miss(RasterMiss::Range));
        };
        let (s, c) = v.angle.sin_cos();
        let scale = v.zoom * m.backing;
        let tx = (c * x - s * y) * scale + m.width * m.backing / 2.0;
        let ty = (s * x + c * y) * scale + m.height * m.backing / 2.0;
        let [left, top, right, bottom] = descriptor.bounds;
        let points = [[left, top], [right, top], [left, bottom], [right, bottom]].map(|[x, y]| {
            [
                (c * x - s * y) * scale + tx + f64::from(offset[0]),
                (s * x + c * y) * scale + ty + f64::from(offset[1]),
            ]
        });
        let margin = 2.0 + rho;
        if points.iter().all(|p| p[0] < -margin)
            || points.iter().all(|p| p[1] < -margin)
            || points.iter().all(|p| p[0] > m.width * m.backing + margin)
            || points.iter().all(|p| p[1] > m.height * m.backing + margin)
        {
            return Ok(Placement::default());
        }
        let envelope = m.width.max(m.height) * m.backing
            + f64::from(offset[0].unsigned_abs().max(offset[1].unsigned_abs()))
            + 2.0;
        let matrix = match crate::geometry_precision::placement_residual(
            [c * scale, s * scale, -s * scale, c * scale, tx, ty],
            descriptor.centers,
            source.style.width * 0.5,
            scale,
            envelope,
            rho,
        ) {
            Ok(value) => value,
            Err(_) => return Ok(Placement::anchor_miss(RasterMiss::Envelope)),
        };
        if crate::raster_quad::certify(
            matrix,
            descriptor.centers,
            source.style.width * 0.5,
            scale,
            descriptor.key.detail,
            offset,
        )
        .is_err()
        {
            return Ok(Placement::anchor_miss(RasterMiss::Envelope));
        }
        Ok(Placement {
            matrix,
            available: true,
            raster_epoch: f.raster.epoch,
            offset,
            disposition: PlacementDisposition::Visible,
            raster_miss: RasterMiss::None,
        })
    }
    pub(crate) fn raster_display_transform(
        &self,
        f: FrameReceipt,
        m: crate::Metrics,
    ) -> Result<Placement, Code> {
        self.display_transform_offset(f.raster.anchor, m, f.raster.offset)
    }
    pub fn capture_frame_canonical(
        &mut self,
        owner: u64,
        session: u64,
        mapping: u64,
    ) -> Result<FrameReceipt, Code> {
        let mut frame = self.capture_frame(owner, session, mapping)?;
        frame.raster = crate::raster_capture::RasterCapture::canonical(frame.view);
        if let Some(slot) = self
            .frames
            .iter_mut()
            .find(|f| f.is_some_and(|v| v.id == frame.id))
        {
            *slot = Some(frame);
        }
        Ok(frame)
    }
}
