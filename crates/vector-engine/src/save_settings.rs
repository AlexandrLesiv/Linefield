use super::{layers::Command, ENGINE};
pub(super) fn decode(r: &mut super::save_decode::Read<'_>) -> Option<[u32; 2]> {
    let paper = r.word()?;
    let grid = r.word()?;
    (paper <= 2 && grid <= 2).then_some([paper as u32, grid as u32])
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn document_paper() -> u32 {
    ENGINE.with(|e| e.borrow().settings[0])
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn document_grid() -> u32 {
    ENGINE.with(|e| e.borrow().settings[1])
}
#[cfg_attr(target_arch = "wasm32", no_mangle)]
pub extern "C" fn document_settings(paper: u32, grid: u32) -> u32 {
    if paper > 2 || grid > 2 {
        return 0;
    }
    ENGINE.with(|e| {
        let mut e = e.borrow_mut();
        let before = e.settings;
        let after = [paper, grid];
        if before != after {
            e.settings = after;
            e.record(Command::Settings(before, after));
        }
        1
    })
}
