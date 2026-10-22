use crate::{Code, Engine, numerics::normalize, scene::Descriptor};
impl Engine {
    pub fn adopt_preparation(
        &mut self,
        owner: u64,
        session: u64,
        token: u64,
        ordinal: u64,
        data: &[f32],
        origin: [f64; 2],
    ) -> Result<u64, Code> {
        self.preparation_current(owner, session, token)?;
        let index = self
            .preparations
            .iter()
            .position(|t| t.token == token)
            .ok_or(Code::StaleScene)?;
        let t = self.preparations[index];
        if t.complete
            || ordinal != t.ordinal
            || data.is_empty()
            || data.len() > 6144
            || !data.len().is_multiple_of(6)
            || data.iter().any(|v| !v.is_finite())
            || origin.iter().any(|v| !v.is_finite())
        {
            return Err(Code::Invalid);
        }
        let mut centers = [
            f64::INFINITY,
            f64::INFINITY,
            f64::NEG_INFINITY,
            f64::NEG_INFINITY,
        ];
        let mut bounds = centers;
        let extent = crate::geometry_precision::page_extent(t.key.detail);
        let source = self.document.stroke(t.key.stroke).ok_or(Code::StaleScene)?;
        for p in data.as_chunks::<3>().0 {
            let [x, y, r] = [p[0] as f64, p[1] as f64, p[2] as f64];
            if x.abs() > extent + 0.01 / t.key.detail
                || y.abs() > extent + 0.01 / t.key.detail
                || r < 0.0
                || r > source.style.width * 0.5 + 0.01 / t.key.detail
            {
                return Err(Code::Invalid);
            }
            let epsilon = 0.1 / t.key.detail;
            if x + origin[0] - r < t.hull[0] - epsilon
                || y + origin[1] - r < t.hull[1] - epsilon
                || x + origin[0] + r > t.hull[2] + epsilon
                || y + origin[1] + r > t.hull[3] + epsilon
            {
                return Err(Code::Invalid);
            }
            centers[0] = centers[0].min(x);
            centers[1] = centers[1].min(y);
            centers[2] = centers[2].max(x);
            centers[3] = centers[3].max(y);
            bounds[0] = bounds[0].min(x - r);
            bounds[1] = bounds[1].min(y - r);
            bounds[2] = bounds[2].max(x + r);
            bounds[3] = bounds[3].max(y + r);
        }
        let anchor = [
            normalize(t.anchor[0], origin[0], 0.0, 1.0, 1_048_576)?,
            normalize(t.anchor[1], origin[1], 0.0, 1.0, 1_048_576)?,
        ];
        if self.pages.len() >= 4096 {
            return Err(Code::Capacity);
        }
        let id = self.page_counter.checked_add(1).ok_or(Code::Exhausted)?;
        let next = t.ordinal.checked_add(1).ok_or(Code::Exhausted)?;
        self.pages.try_reserve(1).map_err(|_| Code::Capacity)?;
        let mut key = t.key;
        key.ordinal = ordinal;
        self.pages.push(Descriptor {
            id,
            key,
            bounds,
            centers,
            origin: anchor,
            proof: t.proof,
        });
        self.page_counter = id;
        self.preparations[index].ordinal = next;
        Ok(id)
    }
}
