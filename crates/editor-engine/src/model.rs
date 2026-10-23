#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Code {
    Ok,
    Noop,
    Invalid,
    StaleOwner,
    StaleSession,
    StaleMapping,
    StaleScene,
    Sequence,
    Active,
    Unavailable,
    Disposed,
    Exhausted,
    Capacity,
    CoordinateOverflow,
    NumericalCapacity,
    StaleInteraction,
}
impl Code {
    pub fn label(self) -> &'static str {
        match self {
            Self::Ok => "ok",
            Self::Noop => "noop",
            Self::Invalid => "invalid",
            Self::StaleOwner => "stale-owner",
            Self::StaleSession => "stale-session",
            Self::StaleMapping => "stale-mapping",
            Self::StaleScene => "stale-scene",
            Self::Sequence => "sequence",
            Self::Active => "active",
            Self::Unavailable => "unavailable",
            Self::Disposed => "disposed",
            Self::Exhausted => "exhausted",
            Self::Capacity => "capacity",
            Self::CoordinateOverflow => "coordinate-overflow",
            Self::NumericalCapacity => "numerical-capacity",
            Self::StaleInteraction => "stale-interaction",
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Phase {
    Gallery,
    Ready,
    Suspended,
}
impl Phase {
    pub fn label(self) -> &'static str {
        match self {
            Self::Gallery => "gallery",
            Self::Ready => "ready",
            Self::Suspended => "suspended",
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Metrics {
    pub width: f64,
    pub height: f64,
    pub backing: f64,
}
#[derive(Clone, Copy, Debug)]
pub struct Projection {
    pub code: Code,
    pub owner: u64,
    pub session: u64,
    pub mapping: u64,
    pub presentation: u64,
    pub content: u64,
    pub scene: u64,
    pub phase: Phase,
    pub metrics: Option<Metrics>,
    pub presented: bool,
    pub display_usable: bool,
    pub cpu_charge: usize,
    pub resources: crate::Resources,
    pub style: crate::document::Style,
    pub view: crate::numerics::Viewport,
    pub interaction: u64,
    pub can_undo: bool,
    pub can_redo: bool,
    pub stroke_count: u64,
    pub active_cancelled: bool,
}
#[derive(Default)]
pub struct Engine {
    pub(crate) raster: crate::raster_state::RasterState,
    pub(crate) visibility: [Option<crate::visibility_cursor::Cursor>; 2],
    pub(crate) visibility_counter: u64,
    pub(crate) visibility_cache: crate::visibility_cache::Cache,
    pub(crate) tails: [Option<crate::tail_display::TailDisplay>; 2],
    pub(crate) tail_counter: u64,
    pub(crate) frames: [Option<crate::FrameReceipt>; 8],
    pub(crate) frame_counter: u64,
    pub(crate) preparations: Vec<crate::preparation::Ticket>,
    pub(crate) preparation_counter: u64,
    pub(crate) pages: Vec<crate::scene::Descriptor>,
    pub(crate) page_counter: u64,
    pub(crate) continuation: Option<crate::geometry_cursor::Continuation>,
    pub(crate) continuation_counter: u64,
    pub(crate) document: crate::document::Document,
    pub(crate) interaction_counter: u64,
    pub(crate) active_cancelled: bool,
    pub(crate) owner_counter: u64,
    pub(crate) session_counter: u64,
    pub(crate) mapping_counter: u64,
    pub(crate) presentation_counter: u64,
    pub(crate) scene_counter: u64,
    pub(crate) content_counter: u64,
    pub(crate) disposed: u64,
    pub(crate) current: Option<Projection>,
    pub(crate) sequence: u64,
}
impl Engine {
    pub fn projection(&self, code: Code) -> Projection {
        let mut value = self.query_projection(code);
        value.resources = self.resources();
        value.cpu_charge = value.resources.total();
        value
    }
    pub fn query_projection(&self, code: Code) -> Projection {
        let mut value = self.current.unwrap_or(Projection {
            code,
            owner: 0,
            session: 0,
            mapping: 0,
            presentation: 0,
            content: 0,
            scene: 0,
            phase: Phase::Gallery,
            metrics: None,
            presented: false,
            display_usable: false,
            cpu_charge: 0,
            resources: crate::Resources::default(),
            style: self.document.style,
            view: self.document.view,
            interaction: 0,
            can_undo: false,
            can_redo: false,
            stroke_count: 0,
            active_cancelled: false,
        });
        value.code = code;
        value.style = self.document.style;
        value.view = self.document.view;
        value.interaction = self.document.gesture.map_or(0, |g| g.id);
        value.can_undo = !self.document.busy() && self.document.visible > self.document.retired;
        value.can_redo =
            !self.document.busy() && self.document.visible < self.document.strokes.len();
        value.stroke_count = self.document.visible as u64;
        value.active_cancelled = self.active_cancelled;
        value
    }
    pub fn owner(&self, owner: u64) -> Result<(), Code> {
        match self.current {
            Some(value) if value.owner == owner => Ok(()),
            _ if owner != 0 && owner == self.disposed => Err(Code::Disposed),
            _ => Err(Code::StaleOwner),
        }
    }
    pub fn session(&self, owner: u64, session: u64) -> Result<(), Code> {
        self.owner(owner)?;
        if self
            .current
            .is_some_and(|v| session != 0 && v.session == session)
        {
            Ok(())
        } else {
            Err(Code::StaleSession)
        }
    }
    pub fn mapping(&self, owner: u64, session: u64, mapping: u64) -> Result<(), Code> {
        self.session(owner, session)?;
        if self.current.is_some_and(|v| v.mapping == mapping) {
            Ok(())
        } else {
            Err(Code::StaleMapping)
        }
    }
    pub(crate) fn room(&self, count: u64) -> bool {
        self.mapping_counter <= u64::MAX - count
            && self.presentation_counter <= u64::MAX - count
            && self.scene_counter <= u64::MAX - count
    }
    pub(crate) fn advance(&mut self) {
        self.mapping_counter += 1;
        self.presentation_counter += 1;
        self.scene_counter += 1;
        if let Some(value) = self.current.as_mut() {
            value.mapping = self.mapping_counter;
            value.presentation = self.presentation_counter;
            value.scene = self.scene_counter;
            value.presented = false;
        }
    }
}
