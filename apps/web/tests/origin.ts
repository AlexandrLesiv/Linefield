// Explicit contexts do not inherit Playwright's configured baseURL.
import { testPort } from "../test-ports.ts";
export const testOrigin = `http://127.0.0.1:${testPort}`;
