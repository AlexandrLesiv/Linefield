/* Served-only diagnostic prefix, never modifies the byte-verified upstream archive. */
const fixtureId = crypto.randomUUID();
const fixtureBus = new BroadcastChannel(FIXTURE_CHANNEL);
let fixtureArmed = false;
let fixtureRelease;
fixtureBus.onmessage = ({ data }) => {
  if (data.kind === "arm") {
    fixtureArmed = true;
    fixtureBus.postMessage({ kind: "armed", proxy: fixtureId });
  }
  if (data.kind === "release" && data.proxy === fixtureId) fixtureRelease?.();
};
globalThis.fixtureFlush = async function (handle) {
  if (fixtureArmed) {
    fixtureArmed = false;
    const held = new Promise((resolve) => {
      fixtureRelease = resolve;
    });
    fixtureBus.postMessage({ kind: "reached", proxy: fixtureId });
    await held;
    fixtureBus.postMessage({ kind: "flush-start", proxy: fixtureId });
    await handle.flush();
    fixtureBus.postMessage({ kind: "flush-complete", proxy: fixtureId });
  } else await handle.flush();
};
