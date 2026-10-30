//! Version4 label records preserve editable source and checked layout atomically.
use crate::{
    save_decode::Read,
    save_delta_wire::{wide, word},
    texts::{Text, BYTES, CAP, TAG},
};
use std::collections::BTreeMap;
pub(super) fn encode(out: &mut Vec<u8>, id: usize, t: &Text) {
    out.push(9);
    word(out, id - TAG);
    word(out, t.content.len());
    out.extend_from_slice(t.content.as_bytes());
    for n in [
        t.color as usize,
        t.revision as usize,
        t.layer,
        t.before_source,
        t.order,
        t.visible as usize,
        1,
    ] {
        word(out, n);
    }
    for n in [t.opacity, t.width, t.height] {
        out.extend_from_slice(&n.to_le_bytes());
    }
    for a in t.anchor {
        wide(out, a.region as u64);
        out.extend_from_slice(&a.local.to_le_bytes());
    }
    for n in t
        .basis
        .into_iter()
        .chain(t.offset)
        .chain([t.ink_x, t.baseline])
    {
        out.extend_from_slice(&n.to_le_bytes());
    }
}
pub(super) fn decode(r: &mut Read<'_>, existing: &BTreeMap<usize, Text>) -> Option<(usize, Text)> {
    let id = r.word()?;
    let n = r.word()?;
    if id >= CAP || n == 0 || n > BYTES {
        return None;
    }
    let value = std::str::from_utf8(r.take(n)?).ok()?;
    let content = if let Some(old) = existing
        .get(&id)
        .filter(|t| t.content.as_bytes() == value.as_bytes())
    {
        old.content.clone()
    } else {
        crate::text_content::Content::new(value)?
    };
    let color = r.word()? as u32;
    let revision = r.word()? as u32;
    let layer = r.word()?;
    let before_source = r.word()?;
    let order = r.word()?;
    let visible = r.boolean()?;
    if r.word()? != 1 {
        return None;
    }
    let t = Text {
        content,
        color,
        revision,
        layer,
        before_source,
        order,
        visible,
        opacity: r.number()?,
        width: r.number()?,
        height: r.number()?,
        anchor: [r.address()?, r.address()?],
        basis: [r.number()?, r.number()?],
        offset: [r.number()?, r.number()?],
        ink_x: r.number()?,
        baseline: r.number()?,
    };
    t.valid().then_some((id, t))
}
pub(super) fn validate(m: &BTreeMap<usize, Text>, id: usize, t: &Text) -> Option<()> {
    if let Some(old) = m.get(&id) {
        if old.layer != t.layer
            || old.before_source != t.before_source
            || old.order != t.order
            || (0..2).any(|a| {
                old.anchor[a].region != t.anchor[a].region
                    || old.anchor[a].local.to_bits() != t.anchor[a].local.to_bits()
            })
        {
            return None;
        }
    } else if id != m.len() {
        return None;
    }
    Some(())
}
