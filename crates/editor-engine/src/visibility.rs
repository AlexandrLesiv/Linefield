use crate::{
    Code, Engine, FrameReceipt,
    visibility_cursor::{Cursor, VisibilityPage},
};

impl Engine {
    pub fn frame_visibility(
        &mut self,
        owner: u64,
        session: u64,
        scene: u64,
        frame: u64,
        predecessor: u64,
        cursor: u64,
    ) -> Result<VisibilityPage, Code> {
        self.session(owner, session)?;
        if self.current.is_none_or(|v| v.scene != scene) {
            return Err(Code::StaleScene);
        }
        let slot = if cursor == 0 {
            None
        } else {
            let slot = self
                .visibility
                .iter()
                .position(|v| v.as_ref().is_some_and(|v| v.id == cursor))
                .ok_or(Code::StaleScene)?;
            let value = self.visibility[slot].as_ref().expect("found cursor");
            if value.frame != frame || value.predecessor != predecessor {
                return Err(Code::Invalid);
            }
            Some(slot)
        };
        let (captured, start) = match self.visibility_frame(owner, session, frame, predecessor) {
            Ok(value) => value,
            Err(code) => {
                if let Some(slot) = slot
                    && let Some(value) = self.visibility[slot].take()
                {
                    value.release(&mut self.visibility_cache);
                }
                return Err(code);
            }
        };
        let slot = match slot {
            Some(slot) => slot,
            None => self
                .visibility
                .iter()
                .position(Option::is_none)
                .ok_or(Code::Capacity)?,
        };
        let mut page = VisibilityPage::reserve()?;
        let mut value = if cursor == 0 {
            let id = self
                .visibility_counter
                .checked_add(1)
                .ok_or(Code::Exhausted)?;
            let value = Cursor::new(id, captured, predecessor, start)?;
            self.visibility_counter = id;
            value
        } else {
            self.visibility[slot].take().expect("validated cursor")
        };
        value.walk(&self.document, &mut self.visibility_cache, &mut page);
        if page.done {
            value.release(&mut self.visibility_cache);
        } else {
            self.visibility[slot] = Some(value);
        }
        page.index_bytes = self.visibility_cache.bytes();
        page.cursor_bytes = size_of_val(&self.visibility)
            + self
                .visibility
                .iter()
                .flatten()
                .map(|v| v.bytes())
                .sum::<usize>();
        page.reply_bytes = page.bytes();
        Ok(page)
    }
    fn visibility_frame(
        &self,
        owner: u64,
        session: u64,
        frame: u64,
        predecessor: u64,
    ) -> Result<(FrameReceipt, usize), Code> {
        let frame = self.frame_receipt(owner, session, frame)?;
        if self.current.and_then(|v| v.metrics) != Some(frame.metrics) {
            return Err(Code::StaleMapping);
        }
        if predecessor == 0 {
            return Ok((frame, 0));
        }
        let previous = self.frame_receipt(owner, session, predecessor)?;
        if previous.raster != frame.raster
            || previous.view != frame.view
            || previous.metrics != frame.metrics
            || previous.count.checked_add(1) != Some(frame.count)
            || self
                .document
                .strokes
                .get(previous.count)
                .is_none_or(|s| s.id != frame.through)
        {
            return Err(Code::Invalid);
        }
        Ok((frame, previous.count))
    }
    pub(crate) fn release_visibility(&mut self, frame: Option<u64>) {
        for slot in &mut self.visibility {
            if slot
                .as_ref()
                .is_some_and(|v| frame.is_none_or(|id| v.frame == id || v.predecessor == id))
                && let Some(value) = slot.take()
            {
                value.release(&mut self.visibility_cache);
            }
        }
    }
    pub(crate) fn prune_visibility(&mut self) {
        for i in 0..self.visibility.len() {
            let invalid = self.visibility[i]
                .as_ref()
                .is_some_and(|v| !self.prefix_current(v.captured));
            if invalid && let Some(value) = self.visibility[i].take() {
                value.release(&mut self.visibility_cache);
            }
        }
    }
}
