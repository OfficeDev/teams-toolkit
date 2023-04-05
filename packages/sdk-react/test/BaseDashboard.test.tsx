import React from "react";

import { render, screen } from "@testing-library/react";

import { BaseDashboard } from "../src";

ResizeObserver = jest.fn().mockImplementation(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
}));

describe("BaseDashboard", () => {
  it("render", () => {
    render(<BaseDashboard />);
    expect(screen.findAllByRole("div")).toBeDefined();
  });
});
