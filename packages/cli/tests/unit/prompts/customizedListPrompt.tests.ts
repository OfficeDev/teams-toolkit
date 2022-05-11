// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import chalk from "chalk";
import ScreenManager from "inquirer/lib/utils/screen-manager";
import { Interface } from "readline";

import ListPrompt, { Question } from "../../../src/prompts/customizedListPrompt";
import { expect } from "../utils";

describe("ListPrompt Tests", function () {
  const sandbox = sinon.createSandbox();
  const question: Question = {
    choices: [
      { name: "a", extra: { title: "aa", detail: "aaa" } },
      { type: "separator" },
      { name: "c", disabled: true, extra: { title: "cc" } },
      { name: "d", extra: { title: "dd", detail: "ddd" } },
    ],
    name: "question",
    default: "d",
  };
  let content = "";
  let bottomContent = "";

  before(() => {
    sandbox
      .stub(ScreenManager.prototype, "render")
      .callsFake((contentT: string, bottomContentT: string) => {
        content = contentT;
        bottomContent = bottomContentT;
      });
  });

  after(() => {
    sandbox.restore();
  });

  it("Render Check - not answered", () => {
    const rl = sinon.createStubInstance(Interface);
    const prompt = new ListPrompt(question, rl as any, {});
    prompt.render();
    expect(content).includes("aaa");
    expect(content).not.includes("bbb");
    expect(content).not.includes("ccc");
    expect(content).includes("ddd");
  });

  it("Render Check - answered", () => {
    const rl = sinon.createStubInstance(Interface);
    const prompt = new ListPrompt(question, rl as any, {});
    prompt.status = "answered";
    prompt.render();
    expect(content).includes(chalk.cyan("dd"));
  });
});
