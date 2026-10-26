import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";
import { fakeMarketData } from "../test/fake-market-data";

describe("App", () => {
  it("shows the app title as a heading", () => {
    render(<App marketData={fakeMarketData()} />);

    expect(
      screen.getByRole("heading", { name: "Albion Crafting" }),
    ).toBeInTheDocument();
  });
});
