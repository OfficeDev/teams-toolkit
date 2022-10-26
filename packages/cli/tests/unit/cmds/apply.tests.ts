// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";
import { err, FxError, ok, SystemError, UserError, Void } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { TelemetryProperty, TelemetrySuccess } from "../../../src/telemetry/cliTelemetryEvents";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import { ApplyCommand } from "../../../src/cmds/apply";
import { expect } from "../utils";
import * as constants from "../../../src/constants";
import * as activate from "../../../src/activate";

describe("teamsfx apply", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let telemetryEventStatus: string | undefined = undefined;

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registeredCommands = [];
    options = [];
    telemetryEvents = [];
    telemetryEventStatus = undefined;
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: string, description: string, builder: any, handler: any) => {
        registeredCommands.push(command);
        builder(yargs);
      });
    sandbox.stub(yargs, "options").callsFake((ops: { [key: string]: Options }) => {
      if (typeof ops === "string") {
        options.push(ops);
      } else {
        options = options.concat(...Object.keys(ops));
      }
      return yargs;
    });
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });
    sandbox
      .stub(CliTelemetry, "sendTelemetryEvent")
      .callsFake((eventName: string, options?: { [_: string]: string }) => {
        telemetryEvents.push(eventName);
        if (options && TelemetryProperty.Success in options) {
          telemetryEventStatus = options[TelemetryProperty.Success];
        }
      });
    sandbox
      .stub(CliTelemetry, "sendTelemetryErrorEvent")
      .callsFake((eventName: string, error: FxError) => {
        telemetryEvents.push(eventName);
        telemetryEventStatus = TelemetrySuccess.No;
      });
  });

  it("should contain correct options", () => {
    const cmd = new ApplyCommand();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["apply"]);
    expect(options)
      .contains("template")
      .and.contains("folder")
      .and.contains("env")
      .and.contains("lifecycle");
  });

  it("should return normally if apply returns ok", async () => {
    sandbox.stub(FxCore.prototype, "apply").resolves(ok(Void));
    const cmd = new ApplyCommand();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
  });

  it("should return error if apply returns error", async () => {
    const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");
    sandbox.stub(FxCore.prototype, "apply").resolves(err(mockedError));
    const cmd = new ApplyCommand();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    const result = await cmd.runCommand(args);
    expect(result.isErr() && result.error.name === "mockedError").to.be.true;
  });

  it("should return error if activate() failed", async () => {
    const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");
    sandbox.stub(activate, "default").resolves(err(mockedError));
    const cmd = new ApplyCommand();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    const result = await cmd.runCommand(args);
    expect(result.isErr() && result.error.name === "mockedError").to.be.true;
  });
});
