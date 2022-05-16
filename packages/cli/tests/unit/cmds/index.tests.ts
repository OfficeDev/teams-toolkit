// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { isPreviewFeaturesEnabled } from "@microsoft/teamsfx-core";
import sinon from "sinon";
import yargs from "yargs";

import { registerCommands } from "../../../src/cmds/index";
import { expect } from "../utils";

describe("Register Commands Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];

  before(() => {
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: string, description: string, builder: any, handler: any) => {
        registeredCommands.push(command.split(" ")[0]);
      });
    sandbox.stub(yargs, "options").returns(yargs);
    sandbox.stub(yargs, "positional").returns(yargs);
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registeredCommands = [];
  });

  it("Register Commands Check", () => {
    registerCommands(yargs);
    expect(registeredCommands).includes("account");
    expect(registeredCommands).includes("new");
    if (!isPreviewFeaturesEnabled()) {
      expect(registeredCommands).includes("capability");
      expect(registeredCommands).includes("resource");
    }
    expect(registeredCommands).includes("provision");
    expect(registeredCommands).includes("deploy");
    expect(registeredCommands).includes("package");
    expect(registeredCommands).includes("validate");
    expect(registeredCommands).includes("publish");
    expect(registeredCommands).includes("config");
    expect(registeredCommands).includes("preview");
  });
});
