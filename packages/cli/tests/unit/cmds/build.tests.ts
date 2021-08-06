// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, Func, FxError, Inputs, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import Build from "../../../src/cmds/build";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import * as Utils from "../../../src/utils";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import { NotSupportedProjectType } from "../../../src/error";

describe("Build Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let telemetryEventStatus: string | undefined = undefined;

  before(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").returns({});
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
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure",
          method: "buildPackage",
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    sandbox.stub(LogProvider, "necessaryLog").returns();
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registeredCommands = [];
    options = [];
    telemetryEvents = [];
    telemetryEventStatus = undefined;
  });

  it("Builder Check", () => {
    const cmd = new Build();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["build"]);
  });

  it("Build Command Running Check", async () => {
    const cmd = new Build();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.BuildStart, TelemetryEvent.Build]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Build Command Running Check with Error", async () => {
    const cmd = new Build();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.BuildStart, TelemetryEvent.Build]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });
});
