// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import {
  AppPackageFolderName,
  BuildFolderName,
  err,
  Func,
  FxError,
  Inputs,
  ok,
  TemplateFolderName,
  UserError,
} from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import Package from "../../../src/cmds/package";
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
import mockedEnv, { RestoreFn } from "mocked-env";
import path from "path";

describe("Package Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let telemetryEventStatus: string | undefined = undefined;
  let mockedEnvRestore: RestoreFn = () => {};

  afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
  });

  beforeEach(() => {
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
    sandbox.stub(LogProvider, "necessaryLog").returns();
    registeredCommands = [];
    options = [];
    telemetryEvents = [];
    telemetryEventStatus = undefined;
  });

  it("Builder Check", () => {
    const cmd = new Package();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["package"]);
  });

  it("Builder Check V3", () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    const cmd = new Package();
    cmd.builder(yargs);
  });

  it("Package Command Running Check", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "false",
    });
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure",
          method: "buildPackage",
          params: {
            type: "remote",
          },
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    const cmd = new Package();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      env: "dev",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.BuildStart, TelemetryEvent.Build]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Package Command Running Check V3", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    sandbox.stub(FxCore.prototype, "createAppPackage").resolves(ok(new Map()));
    const cmd = new Package();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      env: "dev",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.BuildStart, TelemetryEvent.Build]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Package Command Running Check with Error", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "false",
    });
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure",
          method: "buildPackage",
          params: {
            type: "localDebug",
          },
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    const cmd = new Package();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
      env: "local",
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

  it("Package Command with interactive question", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "false",
    });
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure",
          method: "buildPackage",
          params: {
            type: "remote",
          },
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    const askEnv = sandbox.stub(Utils, "askTargetEnvironment").resolves(ok("dev"));
    const cmd = new Package();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);

    // interactive ask env question if not provided
    expect(askEnv.calledOnce);
    expect(telemetryEvents).deep.equals([TelemetryEvent.BuildStart, TelemetryEvent.Build]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });
});
