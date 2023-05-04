import React from "react";
import { render, screen } from "@testing-library/react";

import { BaseDashboard } from "../src";
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
describe("BaseDashboard", () => {
  window.ResizeObserver = ResizeObserver;
  it("render", () => {
    render(<BaseDashboard />);
    expect(screen.findAllByRole("div")).toBeDefined();
  });
});
