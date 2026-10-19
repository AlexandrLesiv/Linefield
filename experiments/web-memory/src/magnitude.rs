// Fixed-storage unsigned arithmetic for the isolated rational viewport experiment.
pub const WORDS: usize = 20;
#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Magnitude(pub [u64; WORDS]);

impl Magnitude {
    pub fn small(value: u64) -> Self {
        let mut out = Self([0; WORDS]);
        out.0[0] = value;
        out
    }
    pub fn compare(self, other: Self) -> std::cmp::Ordering {
        self.0.iter().rev().cmp(other.0.iter().rev())
    }
    pub fn width(self) -> usize {
        self.0
            .iter()
            .rposition(|&x| x != 0)
            .map_or(0, |i| i * 64 + 64 - self.0[i].leading_zeros() as usize)
    }
    pub fn shift(self, bits: usize) -> Self {
        assert!(self.width() + bits <= WORDS * 64);
        let mut out = Self([0; WORDS]);
        for (i, value) in self.0.iter().enumerate() {
            if *value == 0 {
                continue;
            }
            out.0[i + bits / 64] |= value << (bits % 64);
            if !bits.is_multiple_of(64) && i + bits / 64 + 1 < WORDS {
                out.0[i + bits / 64 + 1] |= value >> (64 - bits % 64);
            }
        }
        out
    }
    pub fn add(self, other: Self) -> Self {
        let mut out = Self([0; WORDS]);
        let mut carry = 0_u128;
        for (i, target) in out.0.iter_mut().enumerate() {
            let value = self.0[i] as u128 + other.0[i] as u128 + carry;
            *target = value as u64;
            carry = value >> 64;
        }
        assert_eq!(carry, 0);
        out
    }
    pub fn subtract(self, other: Self) -> Self {
        let mut out = Self([0; WORDS]);
        let mut borrow = false;
        for (i, target) in out.0.iter_mut().enumerate() {
            let (value, first) = self.0[i].overflowing_sub(other.0[i]);
            let (value, second) = value.overflowing_sub(u64::from(borrow));
            *target = value;
            borrow = first || second;
        }
        assert!(!borrow);
        out
    }
    pub fn multiply(self, factor: u64) -> Self {
        let mut out = Self([0; WORDS]);
        let mut carry = 0_u128;
        for (i, target) in out.0.iter_mut().enumerate() {
            let value = self.0[i] as u128 * factor as u128 + carry;
            *target = value as u64;
            carry = value >> 64;
        }
        assert_eq!(carry, 0);
        out
    }
    pub fn divide(self, denominator: Self) -> (u64, Self) {
        assert!(denominator.width() > 0);
        let shift = self.width().saturating_sub(denominator.width());
        assert!(shift < 64);
        let mut remainder = self;
        let mut quotient = 0;
        for bit in (0..=shift).rev() {
            let part = denominator.shift(bit);
            if remainder.compare(part).is_ge() {
                remainder = remainder.subtract(part);
                quotient |= 1_u64 << bit;
            }
        }
        (quotient, remainder)
    }
}

pub fn decode(value: f64) -> (bool, Magnitude) {
    let bits = value.to_bits();
    let exponent = ((bits >> 52) & 2047) as usize;
    let fraction = bits & ((1_u64 << 52) - 1);
    let mantissa = fraction | if exponent == 0 { 0 } else { 1_u64 << 52 };
    (
        bits >> 63 != 0,
        Magnitude::small(mantissa).shift(exponent.saturating_sub(1)),
    )
}

pub fn signed_add(a: (bool, Magnitude), b: (bool, Magnitude)) -> (bool, Magnitude) {
    if a.0 == b.0 {
        (a.0, a.1.add(b.1))
    } else if a.1.compare(b.1).is_ge() {
        (a.0, a.1.subtract(b.1))
    } else {
        (b.0, b.1.subtract(a.1))
    }
}
