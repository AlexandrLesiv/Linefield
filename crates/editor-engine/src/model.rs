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
    pub cpu_charge: usize,
}
#[derive(Default)]
pub struct Engine {
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
            cpu_charge: 0,
        });
        value.code = code;
        value.cpu_charge = size_of::<Self>();
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
    #[cfg(feature = "e2e-fixtures")]
    pub fn fixture_near_exhaustion() -> Self {
        Self {
            mapping_counter: u64::MAX - 4,
            presentation_counter: u64::MAX - 4,
            scene_counter: u64::MAX - 4,
            ..Self::default()
        }
    }
}
