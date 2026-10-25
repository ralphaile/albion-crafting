import { describe, expect, it, vi } from "vitest";

describe("test network", () => {
  it("blocks a request that no handler answers, including .json URLs", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const error: unknown = await fetch(
      "https://aodp.invalid/api/v2/stats/prices/T4_BAG.json",
    ).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(TypeError);
    expect(error).not.toHaveProperty("cause.code");
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("without a matching request handler"),
    );
  });
});
