// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, Func, FxError, Inputs, ok, Platform, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import Init from "../../../src/cmds/init";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import { NotSupportedProjectType } from "../../../src/error";

describe("Init Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let telemetryEventStatus: string | undefined = undefined;

  before(() => {
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: string, description: string, builder: any, handler: any) => {
        registeredCommands.push(command);
        builder(yargs);
      });
    sandbox.stub(yargs, "version").returns(yargs);
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
          method: "registerTeamsAppAndAad",
        });
        expect(inputs.platform).equals(Platform.VS);
        if ((inputs["root-path"] as string).includes("real")) return ok("");
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
    const cmd = new Init();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["init"]);
    expect(options).deep.equals(["app-name", "environment", "endpoint", "root-path"]);
  });

  it("Init Command Running Check", async () => {
    const cmd = new Init();
    const args = { "root-path": "real" };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.InitStart, TelemetryEvent.Init]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Init Command Running Check with Error", async () => {
    const cmd = new Init();
    const args = { "root-path": "fake" };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.InitStart, TelemetryEvent.Init]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });
});
