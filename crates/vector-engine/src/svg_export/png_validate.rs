//! Bounded PNG framing and CRC checks. Hosts also decode encoded PNG before publication.
const SIGNATURE: [u8; 8] = [137, 80, 78, 71, 13, 10, 26, 10];
const fn table() -> [u32; 256] {
    let mut out = [0; 256];
    let mut i = 0;
    while i < 256 {
        let mut v = i as u32;
        let mut bit = 0;
        while bit < 8 {
            v = if v & 1 != 0 {
                0xedb88320 ^ (v >> 1)
            } else {
                v >> 1
            };
            bit += 1;
        }
        out[i] = v;
        i += 1;
    }
    out
}
const CRC: [u32; 256] = table();
#[derive(Default)]
pub(super) struct Validator {
    phase: u8,
    index: usize,
    length: u32,
    remaining: u32,
    chunk: [u8; 4],
    crc: u32,
    received_crc: u32,
    header: [u8; 13],
    ihdr: bool,
    idat: bool,
    idat_ended: bool,
    palette: bool,
}
impl Validator {
    pub fn done(&self) -> bool {
        self.phase == 5
    }
    fn update(&mut self, byte: u8) {
        self.crc = CRC[((self.crc ^ byte as u32) & 255) as usize] ^ (self.crc >> 8);
    }
    fn start_chunk(&mut self) -> bool {
        if !self.chunk.iter().all(u8::is_ascii_alphabetic) || self.chunk[2] & 32 != 0 {
            return false;
        }
        if !self.ihdr && self.chunk != *b"IHDR" {
            return false;
        }
        match &self.chunk {
            b"IHDR" => {
                if self.ihdr || self.length != 13 {
                    return false;
                }
            }
            b"PLTE" => {
                if self.palette
                    || self.idat
                    || self.length == 0
                    || self.length > 768
                    || self.length % 3 != 0
                {
                    return false;
                }
            }
            b"IDAT" => {
                if self.idat_ended || (self.header[9] == 3 && !self.palette) {
                    return false;
                }
            }
            b"IEND" => {
                if !self.idat || self.length != 0 {
                    return false;
                }
            }
            _ => {
                if self.chunk[0] & 32 == 0 {
                    return false;
                }
            }
        }
        if self.idat && self.chunk != *b"IDAT" {
            self.idat_ended = true;
        }
        self.remaining = self.length;
        self.index = 0;
        self.received_crc = 0;
        self.phase = if self.remaining == 0 { 4 } else { 3 };
        true
    }
    fn finish_chunk(&mut self, width: u32, height: u32) -> bool {
        if self.received_crc != !self.crc {
            return false;
        }
        match &self.chunk {
            b"IHDR" => {
                let h = &self.header;
                let depth_ok = match h[9] {
                    0 => [1, 2, 4, 8, 16].contains(&h[8]),
                    2 | 4 | 6 => [8, 16].contains(&h[8]),
                    3 => [1, 2, 4, 8].contains(&h[8]),
                    _ => false,
                };
                if u32::from_be_bytes(h[0..4].try_into().unwrap()) != width
                    || u32::from_be_bytes(h[4..8].try_into().unwrap()) != height
                    || !depth_ok
                    || h[10] != 0
                    || h[11] != 0
                    || h[12] > 1
                {
                    return false;
                }
                self.ihdr = true;
            }
            b"PLTE" => self.palette = true,
            b"IDAT" => self.idat = true,
            b"IEND" => {
                self.phase = 5;
                return true;
            }
            _ => {}
        }
        self.phase = 1;
        self.index = 0;
        self.length = 0;
        true
    }
    pub fn push(&mut self, byte: u8, width: u32, height: u32) -> bool {
        match self.phase {
            0 => {
                if SIGNATURE[self.index] != byte {
                    return false;
                }
                self.index += 1;
                if self.index == 8 {
                    self.phase = 1;
                    self.index = 0;
                }
            }
            1 => {
                self.length = (self.length << 8) | byte as u32;
                self.index += 1;
                if self.index == 4 {
                    if self.length as usize > super::xml::OUTPUT_LIMIT {
                        return false;
                    }
                    self.phase = 2;
                    self.index = 0;
                    self.crc = u32::MAX;
                }
            }
            2 => {
                self.chunk[self.index] = byte;
                self.update(byte);
                self.index += 1;
                if self.index == 4 {
                    return self.start_chunk();
                }
            }
            3 => {
                if self.chunk == *b"IHDR" {
                    self.header[self.index] = byte;
                }
                self.update(byte);
                self.remaining -= 1;
                self.index += 1;
                if self.remaining == 0 {
                    self.phase = 4;
                    self.index = 0;
                }
            }
            4 => {
                self.received_crc = (self.received_crc << 8) | byte as u32;
                self.index += 1;
                if self.index == 4 {
                    return self.finish_chunk(width, height);
                }
            }
            _ => return false,
        }
        true
    }
}
