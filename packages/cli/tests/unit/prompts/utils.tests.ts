// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";

import { addChoiceDetail, splitLongStringByWidth } from "../../../src/prompts/utils";
import { expect } from "../utils";

describe("Prompts Utils Tests", function () {
  const sandbox = sinon.createSandbox();
  const content = "abcd ".repeat(5);
  const columns = process.stdout.columns;

  before(() => {
    sandbox.stub(process.stdout, "isTTY").value(true);
  });

  after(() => {
    sandbox.restore();
    process.stdout.columns = columns;
  });

  afterEach(() => {});

  it("splitLongStringByWidth", () => {
    const answers = splitLongStringByWidth(content, 10);
    expect(answers).deep.equals(["abcd abcd ", "abcd abcd ", "abcd "]);
  });

  it("addChoiceDetail - process.stdout.columns=21", () => {
    process.stdout.columns = 21;
    const output = addChoiceDetail("details", content, 3, 6);
    expect(output.split("\n").length).equals(3);
    expect(output).includes("abcd abcd abcd a");
    expect(output).not.includes("abcd abcd abcd ab");
  });

  it("addChoiceDetail - process.stdout.columns=31", () => {
    process.stdout.columns = 31;
    const output = addChoiceDetail("details", content, 3, 6);
    expect(output.split("\n").length).equals(2);
    expect(output).includes("abcd abcd abcd abcd ");
    expect(output).not.includes("abcd abcd abcd abcd a");
  });
});
