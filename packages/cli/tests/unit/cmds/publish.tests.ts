// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, Func, FxError, Inputs, ok, Platform, UserError } from "@microsoft/teamsfx-api";
import { environmentManager, FxCore, getUuid } from "@microsoft/teamsfx-core";

import Publish from "../../../src/cmds/publish";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import { NotSupportedProjectType } from "../../../src/error";
import CLIUIInstance from "../../../src/userInteraction";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as utils from "../../../src/utils";

describe("Publish Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let telemetryEventStatus: string | undefined = undefined;
  const params = {
    [constants.RootFolderNode.data.name as string]: {},
    "manifest-folder": {},
    "teams-app-id": {},
  };
  const mockedEnvRestore: RestoreFn = () => {};

  before(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").returns({});
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
          method: "VSpublish",
        });
        expect(inputs.platform).equals(Platform.VS);
        if ((inputs["manifest-folder"] as string).includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    sandbox.stub(FxCore.prototype, "publishApplication").callsFake(async (inputs: Inputs) => {
      expect(inputs.platform).equals(Platform.CLI);
      if (inputs.projectPath?.includes("real")) return ok("");
      else return err(NotSupportedProjectType());
    });
    sandbox.stub(LogProvider, "necessaryLog").returns();
    sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev", "local"]));
    CLIUIInstance.interactive = false;
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

  afterEach(() => {
    mockedEnvRestore();
  });

  it("Builder Check", () => {
    const cmd = new Publish();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["publish"]);
  });

  it("Publish Command Running Check (CLI)", async () => {
    sandbox.stub(utils, "getTeamsAppTelemetryInfoByEnv").returns({
      appId: getUuid(),
      tenantId: getUuid(),
    });

    const cmd = new Publish();
    cmd["params"] = params;
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      env: "dev",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.PublishStart, TelemetryEvent.Publish]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Publish Command Running Check with Error (CLI)", async () => {
    const cmd = new Publish();
    cmd["params"] = params;
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.PublishStart, TelemetryEvent.Publish]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });
});
