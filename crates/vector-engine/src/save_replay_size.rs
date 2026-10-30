pub(super) fn record_size(bytes: &[u8]) -> Option<Option<usize>> {
    let Some(tag) = bytes.first() else {
        return Some(None);
    };
    let size = match tag {
        1 => 121,
        7 => crate::image_save::RECORD_BYTES,
        10 => crate::image_save::RECORD_BYTES + 4,
        9 => {
            if bytes.len() < 9 {
                return Some(None);
            }
            let n = u32::from_le_bytes(bytes[5..9].try_into().ok()?) as usize;
            if n == 0 || n > crate::texts::BYTES {
                return None;
            }
            141 + n
        }
        8 => 5,
        2 => 5,
        6 => 5,
        3 => {
            if bytes.len() < 21 {
                return Some(None);
            }
            let n = u32::from_le_bytes(bytes[17..21].try_into().ok()?) as usize;
            if n > 512 {
                return None;
            }
            21 + n
        }
        4 => {
            if bytes.len() < 5 {
                return Some(None);
            }
            let n = u32::from_le_bytes(bytes[1..5].try_into().ok()?) as usize;
            if n == 0 || n > 4096 {
                return None;
            }
            5 + n * 4
        }
        5 => 9,
        _ => return None,
    };
    Some((bytes.len() >= size).then_some(size))
}
