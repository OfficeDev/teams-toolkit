// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { addChoiceDetail, nextPosition, splitLongStringByWidth } from "../../../src/prompts/utils";
import { expect } from "../utils";

describe("Prompts Utils Tests", function () {
  const content = "abcd ".repeat(5);
  const isTTY = process.stdout.isTTY;
  const columns = process.stdout.columns;

  after(() => {
    process.stdout.isTTY = isTTY;
    process.stdout.columns = columns;
  });

  afterEach(() => {});

  it("splitLongStringByWidth", () => {
    const answers = splitLongStringByWidth(content, 10);
    expect(answers).deep.equals(["abcd abcd ", "abcd abcd ", "abcd "]);
  });

  it("addChoiceDetail - process.stdout.columns=21", () => {
    process.stdout.isTTY = true;
    process.stdout.columns = 21;
    const output = addChoiceDetail("details", content, 3, 6);
    expect(output.split("\n").length).equals(3);
    expect(output).includes("abcd abcd abcd a");
    expect(output).not.includes("abcd abcd abcd ab");
  });

  it("addChoiceDetail - process.stdout.columns=31", () => {
    process.stdout.isTTY = true;
    process.stdout.columns = 31;
    const output = addChoiceDetail("details", content, 3, 6);
    expect(output.split("\n").length).equals(2);
    expect(output).includes("abcd abcd abcd abcd ");
    expect(output).not.includes("abcd abcd abcd abcd a");
  });
});

describe("nextPosition", function () {
  it("loop", () => {
    const pos = nextPosition(1, 1, 2, true);
    expect(pos).equals(0);
  });
  it("none loop", () => {
    const pos = nextPosition(0, 1, 2, false);
    expect(pos).equals(1);
  });
  it("none loop >= length", () => {
    const pos = nextPosition(1, 1, 2, false);
    expect(pos).equals(1);
  });
  it("none loop < 0", () => {
    const pos = nextPosition(0, -1, 2, false);
    expect(pos).equals(0);
  });
});
