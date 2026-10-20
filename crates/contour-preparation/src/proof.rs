use crate::{
    contour::Contour,
    index::Index,
    point::{Point, orientation, split},
};
#[derive(Clone, Copy, Default)]
struct Piece {
    arc: [Point; 3],
    depth: u8,
}
pub(crate) enum Decision {
    Pending,
    Keep,
    Omit,
    Original,
}
pub(crate) struct Proof {
    pub contour: Contour,
    pub predicates: u16,
    phase: u8,
    eligible: usize,
    candidates: [usize; 16],
    count: usize,
    witness: usize,
    vertex: usize,
    edge: usize,
    roots: usize,
    stack: [Piece; 9],
    length: usize,
    current: Piece,
    center: Point,
    pub visits: usize,
    pub comparisons: usize,
    pub duplicate: bool,
}
impl Proof {
    pub fn new(contour: Contour) -> Self {
        Self {
            contour,
            predicates: 0,
            phase: 0,
            eligible: 0,
            candidates: [0; 16],
            count: 0,
            witness: 0,
            vertex: 0,
            edge: 0,
            roots: 0,
            stack: [Piece::default(); 9],
            length: 0,
            current: Piece::default(),
            center: Point::default(),
            visits: 0,
            comparisons: 0,
            duplicate: false,
        }
    }
    fn next_piece(&mut self) -> Option<bool> {
        self.witness = 0;
        self.vertex = 0;
        self.edge = 0;
        if !self.contour.disc {
            return Some(false);
        }
        if self.length != 0 {
            self.length -= 1;
            self.current = self.stack[self.length];
        } else if self.roots < 4 {
            self.current = Piece {
                arc: self.contour.arc(self.roots)?,
                depth: 0,
            };
            self.roots += 1;
        } else {
            return Some(false);
        }
        Some(true)
    }
    pub fn step(&mut self, index: &Index) -> Decision {
        if self.phase == 0 {
            let result = self.contour.eligible(self.eligible);
            self.eligible += 1;
            self.predicates += u16::from(!self.contour.disc);
            match result {
                None => return Decision::Original,
                Some(true) => {
                    if self.contour.disc {
                        let Some(center) = self.contour.center() else {
                            return Decision::Original;
                        };
                        self.center = center;
                    }
                    self.phase = 1;
                }
                Some(false) => {}
            }
            return Decision::Pending;
        }
        if self.phase == 1 {
            let (candidates, count, duplicate, visits, comparisons) = index.query(self.contour);
            self.visits = visits;
            self.comparisons = comparisons;
            self.duplicate = duplicate;
            if duplicate {
                return Decision::Omit;
            }
            if count == 0 {
                return Decision::Keep;
            }
            self.candidates = candidates;
            self.count = count;
            if self.contour.disc && self.next_piece().is_none() {
                return Decision::Keep;
            }
            self.phase = 2;
            return Decision::Pending;
        }
        for _ in 0..16 {
            if self.predicates >= 256 {
                return Decision::Keep;
            }
            if self.witness == self.count {
                if !self.contour.disc || self.current.depth == 8 {
                    return Decision::Keep;
                }
                let Some((left, right)) = split(self.current.arc) else {
                    return Decision::Keep;
                };
                let next = self.current.depth + 1;
                let Some(slot) = self.stack.get_mut(self.length) else {
                    return Decision::Keep;
                };
                *slot = Piece {
                    arc: right,
                    depth: next,
                };
                self.length += 1;
                self.current = Piece {
                    arc: left,
                    depth: next,
                };
                self.witness = 0;
                self.vertex = 0;
                self.edge = 0;
                return Decision::Pending;
            }
            let Some(entry) = index.get(self.candidates[self.witness]) else {
                return Decision::Keep;
            };
            let point = if self.contour.disc {
                Some(if self.vertex == 0 {
                    self.center
                } else {
                    self.current.arc[self.vertex - 1]
                })
            } else {
                self.contour.point(self.vertex)
            };
            let Some(point) = point else {
                return Decision::Keep;
            };
            self.predicates += 1;
            let Some(sign) = orientation(
                entry.polygon[self.edge],
                entry.polygon[(self.edge + 1) % entry.count],
                point,
            ) else {
                return Decision::Keep;
            };
            if sign.negative() {
                self.witness += 1;
                self.vertex = 0;
                self.edge = 0;
                continue;
            }
            self.edge += 1;
            if self.edge == entry.count {
                self.edge = 0;
                self.vertex += 1;
            }
            if self.vertex == 4 {
                match self.next_piece() {
                    Some(true) => {}
                    Some(false) => return Decision::Omit,
                    None => return Decision::Keep,
                }
            }
        }
        Decision::Pending
    }
}
