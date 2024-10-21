import React from "react";
import { render, screen } from "@testing-library/react";
import { BaseWidget } from "../src";

test("BaseWidget", () => {
  render(<BaseWidget />);
  expect(screen.findAllByRole("div")).toBeDefined();
});
