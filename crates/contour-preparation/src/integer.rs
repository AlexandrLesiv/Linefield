//! Exact signed dyadics. Capacity proof: P05-R08 Gate0, <639 determinant bits.
#[derive(Clone, Copy, Default, PartialEq, Eq)]
pub(crate) struct Integer {
    negative: bool,
    words: [u64; 12],
}
impl Integer {
    pub fn zero(self) -> bool {
        self.words.iter().all(|v| *v == 0)
    }
    pub fn negative(self) -> bool {
        self.negative && !self.zero()
    }
    pub fn from_parts(value: u64, shift: usize, negative: bool) -> Option<Self> {
        if shift >= 768 {
            return None;
        }
        let mut result = Self::default();
        let index = shift / 64;
        let bits = shift % 64;
        result.words[index] = value << bits;
        if bits != 0 {
            let high = value >> (64 - bits);
            if high != 0 {
                *result.words.get_mut(index + 1)? = high;
            }
        }
        result.negative = negative && !result.zero();
        Some(result)
    }
    pub fn negate(mut self) -> Self {
        self.negative = !self.negative && !self.zero();
        self
    }
    fn compare(self, other: Self) -> std::cmp::Ordering {
        self.words.iter().rev().cmp(other.words.iter().rev())
    }
    pub fn add(self, other: Self) -> Option<Self> {
        let mut result = Self::default();
        if self.negative == other.negative {
            let mut carry = 0_u128;
            for (i, out) in result.words.iter_mut().enumerate() {
                let sum = u128::from(self.words[i]) + u128::from(other.words[i]) + carry;
                *out = sum as u64;
                carry = sum >> 64;
            }
            if carry != 0 {
                return None;
            }
            result.negative = self.negative;
        } else {
            let (large, small) = if self.compare(other).is_lt() {
                (other, self)
            } else {
                (self, other)
            };
            let mut borrow = false;
            for (i, out) in result.words.iter_mut().enumerate() {
                let (difference, a) = large.words[i].overflowing_sub(small.words[i]);
                let (difference, b) = difference.overflowing_sub(u64::from(borrow));
                *out = difference;
                borrow = a || b;
            }
            if borrow {
                return None;
            }
            result.negative = large.negative;
        }
        result.negative &= !result.zero();
        Some(result)
    }
    pub fn multiply(self, other: Self) -> Option<Self> {
        let mut result = Self::default();
        for i in 0..12 {
            let mut carry = 0_u128;
            for j in 0..(12 - i) {
                let sum = u128::from(self.words[i]) * u128::from(other.words[j])
                    + u128::from(result.words[i + j])
                    + carry;
                result.words[i + j] = sum as u64;
                carry = sum >> 64;
            }
            if carry != 0 || (self.words[i] != 0 && other.words[(12 - i)..].iter().any(|v| *v != 0))
            {
                return None;
            }
        }
        result.negative = (self.negative != other.negative) && !result.zero();
        Some(result)
    }
    pub fn half(mut self) -> Option<Self> {
        if self.words[0] & 1 != 0 {
            return None;
        }
        for i in 0..12 {
            self.words[i] =
                (self.words[i] >> 1) | self.words.get(i + 1).map_or(0, |value| value << 63);
        }
        self.negative &= !self.zero();
        Some(self)
    }
}
