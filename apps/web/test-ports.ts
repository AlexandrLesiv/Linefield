// Explicit browser contexts and their preview server must resolve the same origin.
export const testPort = Number(process.env.LINEFIELD_TEST_PORT ?? "65167");
export const fixturePort = Number(process.env.LINEFIELD_FIXTURE_PORT ?? "65168");
