import React from "react";

import { render, screen } from "@testing-library/react";

import { BaseDashboard } from "../src";

describe("BaseDashboard", () => {
  it("render", () => {
    ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    render(<BaseDashboard />);
    expect(screen.findAllByRole("div")).toBeDefined();
  });
});
