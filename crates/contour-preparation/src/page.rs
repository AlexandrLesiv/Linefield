use crate::{Status, contour::Contour};
#[derive(Default)]
pub struct Page {
    pub verbs: Vec<u8>,
    pub points: Vec<f32>,
    pub weights: Vec<f32>,
}
pub(crate) fn parse(verbs: &[u8], points: &[f32], weights: &[f32]) -> Result<Vec<Contour>, Status> {
    let bytes = verbs
        .len()
        .checked_add(points.len().checked_mul(4).ok_or(Status::Invalid)?)
        .and_then(|n| n.checked_add(weights.len().checked_mul(4)?))
        .ok_or(Status::Invalid)?;
    if bytes > 4096 || verbs.is_empty() {
        return Err(Status::Invalid);
    }
    if points.iter().chain(weights).any(|v| !v.is_finite()) {
        return Err(Status::Invalid);
    }
    let mut result = Vec::new();
    result.try_reserve_exact(32).map_err(|_| Status::Capacity)?;
    let (mut v, mut p, mut w) = (0, 0, 0);
    while v < verbs.len() {
        if result.len() == 32 {
            return Err(Status::Invalid);
        }
        let disc = verbs.get(v + 1) == Some(&2);
        let pattern: &[u8] = if disc {
            &[0, 2, 2, 2, 2, 3]
        } else {
            &[0, 1, 1, 1, 3]
        };
        if verbs.get(v..v + pattern.len()) != Some(pattern) {
            return Err(Status::Invalid);
        }
        let coordinates = points
            .get(p..p + if disc { 18 } else { 8 })
            .ok_or(Status::Invalid)?;
        let mut contour = Contour {
            disc,
            ..Contour::default()
        };
        for (out, value) in contour.bits.iter_mut().zip(coordinates) {
            *out = value.to_bits();
        }
        if disc {
            let values = weights.get(w..w + 4).ok_or(Status::Invalid)?;
            if values
                .iter()
                .any(|v| v.to_bits() != std::f32::consts::FRAC_1_SQRT_2.to_bits())
            {
                return Err(Status::Invalid);
            }
            w += 4;
        }
        result.push(contour);
        v += pattern.len();
        p += coordinates.len();
    }
    if p != points.len() || w != weights.len() {
        return Err(Status::Invalid);
    }
    Ok(result)
}
impl Page {
    pub(crate) fn from_contours(contours: &[Contour]) -> Result<Self, Status> {
        let mut page = Self::default();
        page.verbs
            .try_reserve_exact(contours.len() * 6)
            .map_err(|_| Status::Capacity)?;
        page.points
            .try_reserve_exact(contours.len() * 18)
            .map_err(|_| Status::Capacity)?;
        page.weights
            .try_reserve_exact(contours.len() * 4)
            .map_err(|_| Status::Capacity)?;
        for contour in contours {
            if contour.disc {
                page.verbs.extend_from_slice(&[0, 2, 2, 2, 2, 3]);
                page.weights
                    .extend_from_slice(&[std::f32::consts::FRAC_1_SQRT_2; 4]);
            } else {
                page.verbs.extend_from_slice(&[0, 1, 1, 1, 3]);
            }
            page.points.extend(
                contour.bits[..if contour.disc { 18 } else { 8 }]
                    .iter()
                    .copied()
                    .map(f32::from_bits),
            );
        }
        Ok(page)
    }
}
