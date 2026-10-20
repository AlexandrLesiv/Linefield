use crate::point::{Point, orientation, split};
#[derive(Clone, Copy, Default, PartialEq, Eq)]
pub(crate) struct Contour {
    pub bits: [u32; 18],
    pub disc: bool,
}
impl Contour {
    pub fn eligible(self, index: usize) -> Option<bool> {
        if self
            .bits
            .iter()
            .any(|v| f32::from_bits(*v).abs() >= 2_f32.powi(23))
        {
            return None;
        }
        if self.disc {
            return self.disc_template().then_some(true);
        }
        let sign = orientation(
            self.point(index)?,
            self.point((index + 1) % 4)?,
            self.point((index + 2) % 4)?,
        )?;
        if sign.negative() || sign.zero() {
            None
        } else {
            Some(index == 3)
        }
    }
    pub fn point(self, index: usize) -> Option<Point> {
        Point::new(
            f32::from_bits(*self.bits.get(index * 2)?),
            f32::from_bits(*self.bits.get(index * 2 + 1)?),
            false,
        )
    }
    pub fn center(self) -> Option<Point> {
        Point::new(
            f32::from_bits(self.bits[4]),
            f32::from_bits(self.bits[1]),
            false,
        )
    }
    pub fn arc(self, index: usize) -> Option<[Point; 3]> {
        let start = index * 2;
        Some([
            self.point(start)?,
            Point::new(
                f32::from_bits(self.bits[(start + 1) * 2]),
                f32::from_bits(self.bits[(start + 1) * 2 + 1]),
                true,
            )?,
            self.point(start + 2)?,
        ])
    }
    pub fn disc_template(self) -> bool {
        let p = self.bits.map(f32::from_bits);
        let [r, cy, cx, d, l, u] = [p[0], p[1], p[4], p[5], p[8], p[13]];
        l < cx
            && cx < r
            && u < cy
            && cy < d
            && p == [r, cy, r, d, cx, d, l, d, l, cy, l, u, cx, u, r, u, r, cy]
    }
    pub fn polygon(self) -> Option<([Point; 16], usize)> {
        let mut polygon = [Point::default(); 16];
        if !self.disc {
            for (index, point) in polygon.iter_mut().take(4).enumerate() {
                *point = self.point(index)?;
            }
            return Some((polygon, 4));
        }
        for i in 0..4 {
            let (a, b) = split(self.arc(i)?)?;
            let (aa, ab) = split(a)?;
            let (ba, bb) = split(b)?;
            for (j, arc) in [aa, ab, ba, bb].iter().enumerate() {
                polygon[i * 4 + j] = arc[0];
            }
        }
        Some((polygon, 16))
    }
    pub fn bounds(self) -> [f32; 4] {
        let mut bounds = [
            f32::INFINITY,
            f32::INFINITY,
            f32::NEG_INFINITY,
            f32::NEG_INFINITY,
        ];
        for i in 0..if self.disc { 9 } else { 4 } {
            let x = f32::from_bits(self.bits[i * 2]);
            let y = f32::from_bits(self.bits[i * 2 + 1]);
            bounds[0] = bounds[0].min(x);
            bounds[1] = bounds[1].min(y);
            bounds[2] = bounds[2].max(x);
            bounds[3] = bounds[3].max(y);
        }
        bounds
    }
    pub fn verbs(self) -> u64 {
        if self.disc { 6 } else { 5 }
    }
    pub fn hash(self) -> u64 {
        self.bits.iter().fold(u64::from(self.disc), |value, bits| {
            value.wrapping_mul(0x100_0000_01b3) ^ u64::from(*bits)
        })
    }
}
