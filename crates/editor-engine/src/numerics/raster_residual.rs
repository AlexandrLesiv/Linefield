use super::{Axis, Viewport, interval::Interval, interval::relative};
use crate::{Code, Metrics};
pub(crate) const LIMIT: f64 = 1.0 / 4096.0;
fn project(x: Interval, y: Interval, v: Viewport, m: Metrics) -> Result<[Interval; 2], Code> {
    let (s, c) = v.angle.sin_cos();
    let s = Interval::exact(s)?;
    let c = Interval::exact(c)?;
    let scale = Interval::exact(v.zoom)?.multiply(Interval::exact(m.backing)?)?;
    Ok([
        c.multiply(x)?.subtract(s.multiply(y)?)?.multiply(scale)?,
        s.multiply(x)?.add(c.multiply(y)?)?.multiply(scale)?,
    ])
}
pub(crate) fn residual(
    anchor: Viewport,
    view: Viewport,
    m: Metrics,
    offset: [i32; 2],
) -> Result<f64, Code> {
    if anchor.zoom.to_bits() != view.zoom.to_bits()
        || anchor.angle.to_bits() != view.angle.to_bits()
    {
        return Err(Code::NumericalCapacity);
    }
    let projected = project(
        relative(view.center[0], anchor.center[0])?,
        relative(view.center[1], anchor.center[1])?,
        anchor,
        m,
    )?;
    let x = projected[0].add(Interval::exact(f64::from(offset[0]))?)?;
    let y = projected[1].add(Interval::exact(f64::from(offset[1]))?)?;
    certify(x, y)
}
pub(crate) fn descriptor(
    origin: [Axis; 2],
    anchor: Viewport,
    view: Viewport,
    m: Metrics,
    offset: [i32; 2],
) -> Result<f64, Code> {
    let translation = |v: Viewport| -> Result<[Interval; 2], Code> {
        let p = project(
            relative(origin[0], v.center[0])?,
            relative(origin[1], v.center[1])?,
            v,
            m,
        )?;
        Ok([
            p[0].add(
                Interval::exact(m.width)?
                    .multiply(Interval::exact(m.backing)?)?
                    .multiply(Interval::exact(0.5)?)?,
            )?,
            p[1].add(
                Interval::exact(m.height)?
                    .multiply(Interval::exact(m.backing)?)?
                    .multiply(Interval::exact(0.5)?)?,
            )?,
        ])
    };
    let a = translation(anchor)?;
    let b = translation(view)?;
    certify(
        a[0].add(Interval::exact(f64::from(offset[0]))?)?
            .subtract(b[0])?,
        a[1].add(Interval::exact(f64::from(offset[1]))?)?
            .subtract(b[1])?,
    )
}
fn certify(x: Interval, y: Interval) -> Result<f64, Code> {
    let bound = (x.max_abs() + y.max_abs()).next_up();
    if bound <= LIMIT {
        Ok(bound)
    } else {
        Err(Code::NumericalCapacity)
    }
}
