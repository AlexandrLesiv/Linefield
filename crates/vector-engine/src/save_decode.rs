//! Strict bounded checkpoint decoder; it never normalizes malformed saved values.
use super::{regional::Address, Point, Points, PressureCurve, Stroke};
use std::{collections::BTreeMap, rc::Rc};
pub(super) struct Read<'a> {
    pub bytes: &'a [u8],
    pub at: usize,
}
impl<'a> Read<'a> {
    pub fn take(&mut self, n: usize) -> Option<&'a [u8]> {
        let end = self.at.checked_add(n)?;
        let out = self.bytes.get(self.at..end)?;
        self.at = end;
        Some(out)
    }
    pub fn byte(&mut self) -> Option<u8> {
        Some(self.take(1)?[0])
    }
    pub fn word(&mut self) -> Option<usize> {
        Some(u32::from_le_bytes(self.take(4)?.try_into().ok()?) as usize)
    }
    pub fn wide(&mut self) -> Option<u64> {
        Some(u64::from_le_bytes(self.take(8)?.try_into().ok()?))
    }
    pub fn float(&mut self) -> Option<f32> {
        let v = f32::from_le_bytes(self.take(4)?.try_into().ok()?);
        v.is_finite().then_some(v)
    }
    pub fn number(&mut self) -> Option<f64> {
        let v = f64::from_le_bytes(self.take(8)?.try_into().ok()?);
        v.is_finite().then_some(v)
    }
    pub fn boolean(&mut self) -> Option<bool> {
        match self.word()? {
            0 => Some(false),
            1 => Some(true),
            _ => None,
        }
    }
    pub fn address(&mut self) -> Option<Address> {
        let region = self.wide()? as i64;
        let local = self.number()?;
        ((0.0..65536.0).contains(&local) && (local != 0.0 || local.to_bits() == 0))
            .then_some(Address { region, local })
    }
}
pub(super) fn points(bytes: &[u8], count: usize) -> Option<Rc<Points>> {
    if count == 0 || count > 1_000_000 || bytes.len() != count.checked_mul(40)? {
        return None;
    }
    let mut r = Read { bytes, at: 0 };
    let mut points = Points::default();
    for _ in 0..count {
        let x = r.address()?;
        let y = r.address()?;
        let pressure = r.float()?;
        if !(0.0..=1.0).contains(&pressure) || r.word()? != 0 {
            return None;
        }
        points.push(Point { x, y, pressure });
    }
    Some(Rc::new(points))
}
pub(super) fn stroke(
    r: &mut Read<'_>,
    sources: &BTreeMap<usize, Rc<Points>>,
) -> Option<(usize, Stroke)> {
    let id = r.word()?;
    let source = r.word()?;
    let layer = r.word()?;
    let brush = r.word()?;
    let color = r.word()? as u32;
    let sliced = r.boolean()?;
    if id >= 100_000 || layer >= 4096 || brush > 2 {
        return None;
    }
    let points = Rc::clone(sources.get(&source)?);
    let width = r.float()?;
    let minimum = r.float()?;
    let gamma = r.float()?;
    let opacity = r.float()?;
    if !(0.5..=100.0).contains(&width)
        || !((0.0..=0.5).contains(&minimum) || minimum == 1.0)
        || !(0.25..=4.0).contains(&gamma)
        || (minimum == 1.0 && gamma != 1.0)
        || !(0.0..=1.0).contains(&opacity)
    {
        return None;
    }
    let span = [r.number()?, r.number()?];
    if sliced && (span[0] < 0.0 || span[0] >= span[1] || span[1] > (points.len() - 1) as f64) {
        return None;
    }
    if !sliced && span != [0.0; 2] {
        return None;
    }
    let source_anchor = [r.address()?, r.address()?];
    for (axis, expected) in source_anchor
        .iter()
        .zip([points[0].x.source_anchor(), points[0].y.source_anchor()])
    {
        if axis.region != expected.region || axis.local.to_bits() != expected.local.to_bits() {
            return None;
        }
    }
    let basis = [r.number()?, r.number()?];
    let offset = [r.number()?, r.number()?];
    if !(0.001..=1000.0).contains(&basis[0].hypot(basis[1]))
        || source_anchor[0].offset(offset[0]).is_none()
        || source_anchor[1].offset(offset[1]).is_none()
    {
        return None;
    }
    Some((
        id,
        Stroke {
            points,
            slice: sliced.then_some(span),
            source,
            blend_group: id,
            width,
            pressure_curve: PressureCurve { minimum, gamma },
            color,
            opacity,
            brush: brush as u32,
            visible: true,
            layer,
            source_anchor,
            offset,
            basis,
        },
    ))
}

pub(super) fn empty_stroke(id: usize, layer: usize) -> Stroke {
    Stroke {
        points: Rc::default(),
        slice: None,
        source: id,
        blend_group: id,
        width: 1.0,
        pressure_curve: PressureCurve::default(),
        color: 0,
        opacity: 1.0,
        brush: 0,
        visible: false,
        layer,
        source_anchor: [Address {
            region: 0,
            local: 0.0,
        }; 2],
        offset: [0.0; 2],
        basis: [1.0, 0.0],
    }
}
