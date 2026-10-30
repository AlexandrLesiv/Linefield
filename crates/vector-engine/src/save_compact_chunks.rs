use super::*;
impl Checkpoint {
    pub fn chunk(&mut self, m: &Model, stream: usize, chunk: usize) -> Option<usize> {
        if !self.ready {
            return None;
        }
        self.output.clear();
        if stream > 0 {
            let points = m.sources.get(self.ids.get(stream - 1)?)?;
            wire::samples(points, chunk, &mut self.output)?;
        } else {
            if chunk != self.next_chunk {
                return None;
            }
            while self.output.len() < 65520 {
                if self.at == self.pending.len() {
                    self.pending = self.record(m)?;
                    self.at = 0;
                    if self.pending.is_empty() {
                        break;
                    }
                }
                let n = (65520 - self.output.len()).min(self.pending.len() - self.at);
                self.output
                    .extend_from_slice(&self.pending[self.at..self.at + n]);
                self.at += n;
            }
            self.next_chunk += 1;
        }
        Some(self.output.len())
    }
}
