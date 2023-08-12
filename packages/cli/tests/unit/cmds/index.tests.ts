// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import { registerCommands } from "../../../src/cmds/index";
import { initTelemetryReporter } from "../../../src/index";
import cliTelemetry from "../../../src/telemetry/cliTelemetry";
import { expect } from "../utils";

describe("Register Commands Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  const restoreFn: RestoreFn = () => {};

  before(() => {
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: any, description: any, builder: any, handler: any) => {
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

  afterEach(() => {
    restoreFn();
  });

  it("Register Commands Check V3", () => {
    registerCommands(yargs);
    expect(registeredCommands).includes("account");
    expect(registeredCommands).includes("new");
    expect(registeredCommands).includes("provision");
    expect(registeredCommands).includes("deploy");
    expect(registeredCommands).includes("package");
    expect(registeredCommands).includes("validate");
    expect(registeredCommands).includes("publish");
    expect(registeredCommands).includes("config");
    expect(registeredCommands).includes("preview");
    // expect(registeredCommands).includes("init");
    expect(registeredCommands).includes("update");
    expect(registeredCommands).includes("upgrade");
  });

  it("Register Commands Check", () => {
    registerCommands(yargs);
    expect(registeredCommands).includes("account");
    expect(registeredCommands).includes("new");
    expect(registeredCommands).includes("provision");
    expect(registeredCommands).includes("deploy");
    expect(registeredCommands).includes("package");
    expect(registeredCommands).includes("validate");
    expect(registeredCommands).includes("publish");
    expect(registeredCommands).includes("config");
    expect(registeredCommands).includes("preview");
  });
});

describe("initTelemetryReporter", function () {
  it("happy path", () => {
    initTelemetryReporter();
    assert.isDefined(cliTelemetry.reporter);
  });
});
