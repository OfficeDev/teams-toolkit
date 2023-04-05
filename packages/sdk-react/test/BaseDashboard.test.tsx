import React from "react";

import { render, screen } from "@testing-library/react";

import { BaseDashboard } from "../src";

describe("BaseDashboard", () => {
  it("render", () => {
    render(<BaseDashboard />);
    expect(screen.findAllByRole("div")).toBeDefined();
  });
});
