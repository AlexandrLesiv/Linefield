// Explicit contexts do not inherit Playwright's configured baseURL.
export const testOrigin = `http://127.0.0.1:${process.env.LINEFIELD_TEST_PORT ?? "65161"}`;
