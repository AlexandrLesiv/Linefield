use crate::{Preparation, PreparedPage};
impl Preparation {
    pub fn page(&mut self) -> Result<PreparedPage, &'static str> {
        let mut data = Vec::new();
        data.try_reserve_exact(6144).map_err(|_| "capacity")?;
        let mut work = 4096;
        let mut origin = None;
        let mut centers = [
            f64::INFINITY,
            f64::INFINITY,
            f64::NEG_INFINITY,
            f64::NEG_INFINITY,
        ];
        let mut bounds = centers;
        while data.len() < 6144 {
            let Some(pair) = self.capsule(&mut work)? else {
                break;
            };
            let o = *origin.get_or_insert([pair[0][0], pair[0][1]]);
            let extent = 4096.0_f64.min(4096.0 / self.detail);
            if pair
                .iter()
                .any(|p| (p[0] - o[0]).abs() > extent || (p[1] - o[1]).abs() > extent)
            {
                self.output -= 1;
                break;
            }
            for p in pair {
                let v = [p[0] - o[0], p[1] - o[1], p[2]];
                centers[0] = centers[0].min(v[0]);
                centers[1] = centers[1].min(v[1]);
                centers[2] = centers[2].max(v[0]);
                centers[3] = centers[3].max(v[1]);
                bounds[0] = bounds[0].min(v[0] - v[2]);
                bounds[1] = bounds[1].min(v[1] - v[2]);
                bounds[2] = bounds[2].max(v[0] + v[2]);
                bounds[3] = bounds[3].max(v[1] + v[2]);
                for value in v {
                    let packed = value as f32;
                    if !packed.is_finite() || (value - packed as f64).abs() * self.detail > 0.01 {
                        return Err("numerical-capacity");
                    }
                    data.push(packed);
                }
            }
        }
        let done = self.next == self.end
            && self.flatten.is_none()
            && self.pending.is_none()
            && self.output == self.compacted.len();
        if data.is_empty() {
            bounds = [0.0; 4];
            centers = bounds;
        }
        Ok(PreparedPage {
            data,
            origin: origin.unwrap_or([0.0; 2]),
            bounds,
            centers,
            done,
        })
    }
}
