use crate::numerics::Viewport;
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub(crate) struct RasterCapture {
    pub anchor: Viewport,
    pub epoch: u64,
    pub offset: [i32; 2],
}
impl RasterCapture {
    pub fn canonical(view: Viewport) -> Self {
        Self {
            anchor: view,
            epoch: 0,
            offset: [0; 2],
        }
    }
    pub fn anchored(self) -> bool {
        self.epoch != 0
    }
}
