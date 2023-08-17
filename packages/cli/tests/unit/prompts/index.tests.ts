// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import inquirer from "inquirer";

import { registerPrompts } from "../../../src/prompts/index";
import { expect } from "../utils";

describe("Register Prompts Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredPrompts: string[] = [];

  before(() => {
    sandbox
      .stub(inquirer, "registerPrompt")
      .callsFake((name: string, prompt: inquirer.prompts.PromptConstructor) => {
        registeredPrompts.push(name);
      });
  });

  after(() => {
    sandbox.restore();
  });

  afterEach(() => {
    registeredPrompts = [];
  });

  it("Register Prompts Check", () => {
    registerPrompts();
    expect(registeredPrompts).deep.equals(["checkbox", "list"]);
  });
});
