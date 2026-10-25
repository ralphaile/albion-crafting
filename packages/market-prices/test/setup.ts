import { HttpNetworkFrame } from "msw/experimental";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

export const server = setupServer();

beforeAll(() => {
  server.listen({
    onUnhandledFrame({ frame, defaults }) {
      defaults.error();
      if (frame instanceof HttpNetworkFrame) {
        frame.respondWith(Response.error());
      }
    },
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
