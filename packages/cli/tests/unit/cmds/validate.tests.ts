// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";
import { err, Func, FxError, Inputs, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import { ManifestValidate } from "../../../src/cmds/validate";
import { expect } from "../utils";
import * as constants from "../../../src/constants";
import { NotSupportedProjectType } from "../../../src/error";
import mockedEnv, { RestoreFn } from "mocked-env";

describe("teamsfx validate", () => {
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
    registeredCommands = [];
    options = [];
    telemetryEvents = [];
    telemetryEventStatus = undefined;
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
  });

  it("should pass builder check", () => {
    const cmd = new ManifestValidate();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["validate"]);
  });

  it("Builder Check V3", () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    const cmd = new ManifestValidate();
    cmd.builder(yargs);
  });

  it("Validate Command Running Check - app package", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(new Map()));
    const cmd = new ManifestValidate();
    const args = {
      [constants.AppPackageFilePathParamName]: "./app.zip",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.ValidateManifestStart,
      TelemetryEvent.ValidateManifest,
    ]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Validate Command Running Check - manifest", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(new Map()));
    const cmd = new ManifestValidate();
    const args = {
      [constants.ManifestFilePathParamName]: "./manifest.json",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.ValidateManifestStart,
      TelemetryEvent.ValidateManifest,
    ]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Validate Command Running Check", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "false",
    });
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure",
          method: "validateManifest",
          params: {
            type: "remote",
          },
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    const cmd = new ManifestValidate();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      env: "dev",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.ValidateManifestStart,
      TelemetryEvent.ValidateManifest,
    ]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Validate Command Running Check with Error", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "false",
    });
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure",
          method: "validateManifest",
          params: {
            type: "remote",
          },
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    const cmd = new ManifestValidate();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
      env: "dev",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.ValidateManifestStart,
        TelemetryEvent.ValidateManifest,
      ]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });
});
