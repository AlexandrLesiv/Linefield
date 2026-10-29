fn midpoint(a: Position, b: Position) -> Position {
    // This form avoids overflow for two large, same-sign coordinates.
    [
        a[0] * 0.5 + b[0] * 0.5,
        a[1] * 0.5 + b[1] * 0.5,
        a[2] * 0.5 + b[2] * 0.5,
    ]
}
fn deviation(point: Position, a: Position, b: Position) -> Real {
    let d = delta(a, b);
    let length_squared = d[0] * d[0] + d[1] * d[1];
    let t = if length_squared > 0.0 {
        (((point[0] - a[0]) * d[0] + (point[1] - a[1]) * d[1]) / length_squared).clamp(0.0, 1.0)
    } else {
        0.0
    };
    let center_error = (point[0] - (a[0] + d[0] * t)).hypot(point[1] - (a[1] + d[1] * t));
    center_error + (point[2] - (a[2] + (b[2] - a[2]) * t)).abs()
}
fn flatten(curve: Cubic, tolerance: Real, depth: u32, vertices: &mut Vec<Vertex>) {
    if depth == MAX_DEPTH
        || deviation(curve[1], curve[0], curve[3]).max(deviation(curve[2], curve[0], curve[3]))
            <= tolerance
    {
        vertices.push(Vertex {
            point: curve[3],
            keep: false,
        });
        return;
    }
    let ab = midpoint(curve[0], curve[1]);
    let bc = midpoint(curve[1], curve[2]);
    let cd = midpoint(curve[2], curve[3]);
    let abc = midpoint(ab, bc);
    let bcd = midpoint(bc, cd);
    let middle = midpoint(abc, bcd);
    flatten([curve[0], ab, abc, middle], tolerance, depth + 1, vertices);
    flatten([middle, bcd, cd, curve[3]], tolerance, depth + 1, vertices);
}
pub(crate) fn chunk_range(stroke: &Stroke, chunk: usize) -> Option<std::ops::Range<usize>> {
    let start = chunk.checked_mul(CHUNK_POINTS)?;
    (start < stroke.sample_count()).then(|| {
        start
            ..start
                .saturating_add(CHUNK_POINTS)
                .min(stroke.sample_count())
    })
}

impl Scratch {
    pub(crate) fn render(&mut self, stroke: &Stroke, chunk: usize, tolerance: Real) -> usize {
        let Some(range) = chunk_range(stroke, chunk) else {
            self.output.clear();
            return 0;
        };
        if stroke.slice.is_some() {
            let curves: Vec<_> = range.clone().map(|i| span(stroke, i)).collect();
            return self.render_curves(&curves, range.start == 0, tolerance);
        }
        self.render_range(stroke, range, tolerance)
    }
    pub(crate) fn render_curves(&mut self, curves: &[Cubic], dab: bool, tolerance: Real) -> usize {
        self.output.clear();
        let tolerance = if tolerance.is_finite() && tolerance > 0.0 {
            tolerance.max(0.0001)
        } else {
            0.25
        };
        if let Some(first) = curves.first() {
            if dab {
                self.output.extend_from_slice(&first[0]);
                self.output.extend_from_slice(&first[0]);
            }
            for (index, &curve) in curves.iter().enumerate() {
                if dab && index == 0 {
                    continue;
                }
                self.vertices.clear();
                flatten(curve, tolerance * 0.5, 0, &mut self.vertices);
                let mut previous = curve[0];
                for v in &self.vertices {
                    self.output.extend_from_slice(&previous);
                    self.output.extend_from_slice(&v.point);
                    previous = v.point;
                }
            }
        }
        self.output.len() / 6
    }
    pub(crate) fn render_range(
        &mut self,
        stroke: &Stroke,
        range: std::ops::Range<usize>,
        tolerance: Real,
    ) -> usize {
        self.vertices.clear();
        self.stack.clear();
        self.output.clear();
        let tolerance = if tolerance.is_finite() && tolerance > 0.0 {
            tolerance.max(0.0001)
        } else {
            0.25
        };
        let first = source_point(stroke, range.start.saturating_sub(1));
        self.vertices.push(Vertex {
            point: first,
            keep: true,
        });
        for index in range.clone() {
            if index == 0 {
                continue;
            }
            let curve = span(stroke, index);
            if stationary(curve[0], curve[3]) {
                // A pressure dab must survive even at extremely coarse LOD.
                self.vertices.last_mut().unwrap().keep = true;
                self.vertices.push(Vertex {
                    point: curve[3],
                    keep: true,
                });
            } else {
                flatten(curve, tolerance * 0.5, 0, &mut self.vertices);
                self.vertices.last_mut().unwrap().keep =
                    is_corner(stroke, index) || pressure_extremum(stroke, index);
            }
        }
        self.vertices.last_mut().unwrap().keep = true;
        // Simplify only between protected anchors. The sum of centerline and
        // radius error bounds the displaced stroke edge, not just its center.
        let mut anchor = 0;
        for end in 1..self.vertices.len() {
            if self.vertices[end].keep {
                self.stack.push((anchor, end));
                anchor = end;
            }
        }
        while let Some((start, end)) = self.stack.pop() {
            let a = self.vertices[start].point;
            let b = self.vertices[end].point;
            let mut maximum = tolerance * 0.5;
            let mut split = None;
            for index in start + 1..end {
                let error = deviation(self.vertices[index].point, a, b);
                if error > maximum {
                    maximum = error;
                    split = Some(index);
                }
            }
            if let Some(index) = split {
                self.vertices[index].keep = true;
                self.stack.push((start, index));
                self.stack.push((index, end));
            }
        }
        if range.start == 0 {
            self.output.extend_from_slice(&first);
            self.output.extend_from_slice(&first);
        }
        let mut previous = first;
        for vertex in self.vertices.iter().skip(1).filter(|v| v.keep) {
            self.output.extend_from_slice(&previous);
            self.output.extend_from_slice(&vertex.point);
            previous = vertex.point;
        }
        debug_assert!(self.output.len() / 6 <= MAX_CHUNK_SEGMENTS);
        self.output.len() / 6
    }
}

