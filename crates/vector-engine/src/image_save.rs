//! Version2 metadata records; encoded originals never enter transform/save batches.
use crate::{
    images::{Image, CAP, TAG},
    save_decode::Read,
    save_delta_wire::{wide, word},
};
pub(super) const RECORD_BYTES: usize = 169;
pub(super) fn encode(out: &mut Vec<u8>, id: usize, i: &Image) {
    out.push(7);
    word(out, id - TAG);
    out.extend_from_slice(&i.digest);
    for n in [
        i.mime as usize,
        i.width as usize,
        i.height as usize,
        i.bytes as usize,
        i.layer,
        i.before_source,
        i.visible as usize,
    ] {
        word(out, n);
    }
    out.extend_from_slice(&i.opacity.to_le_bytes());
    for a in i.anchor {
        wide(out, a.region as u64);
        out.extend_from_slice(&a.local.to_le_bytes());
    }
    for n in i.basis.into_iter().chain(i.offset) {
        out.extend_from_slice(&n.to_le_bytes());
    }
}
pub(super) fn decode(r: &mut Read<'_>) -> Option<(usize, Image)> {
    let id = r.word()?;
    if id >= CAP {
        return None;
    }
    let digest = r.take(64)?.try_into().ok()?;
    let i = Image {
        digest,
        mime: r.word()? as u32,
        width: r.word()? as u32,
        height: r.word()? as u32,
        bytes: r.word()? as u32,
        layer: r.word()?,
        before_source: r.word()?,
        visible: r.boolean()?,
        opacity: r.number()?,
        anchor: [r.address()?, r.address()?],
        basis: [r.number()?, r.number()?],
        offset: [r.number()?, r.number()?],
    };
    i.valid().then_some((id, i))
}
/// Stable identity and immutable originals cannot be rewritten by later deltas.
pub(super) fn validate_update(
    images: &std::collections::BTreeMap<usize, Image>,
    id: usize,
    image: &Image,
) -> Option<()> {
    if let Some(old) = images.get(&id) {
        if old.digest != image.digest
            || !old.same_asset(image)
            || old.layer != image.layer
            || old.before_source != image.before_source
            || (0..2).any(|a| {
                old.anchor[a].region != image.anchor[a].region
                    || old.anchor[a].local.to_bits() != image.anchor[a].local.to_bits()
            })
        {
            return None;
        }
    } else if id != images.len() {
        return None;
    }
    if images.values().any(|old| !old.same_asset(image)) {
        return None;
    }
    Some(())
}
