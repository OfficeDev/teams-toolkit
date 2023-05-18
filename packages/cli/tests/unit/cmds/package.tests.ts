// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Func, Inputs, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Package from "../../../src/cmds/package";
import * as constants from "../../../src/constants";
import { NotSupportedProjectType } from "../../../src/error";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import * as Utils from "../../../src/utils";
import { expect, mockLogProvider, mockTelemetry, mockYargs } from "../utils";

describe("Package Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let mockedEnvRestore: RestoreFn = () => {};

  beforeEach(() => {
    mockYargs(sandbox, options);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
  });

  afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
    options = [];
    telemetryEvents = [];
  });

  it("Builder Check", () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "false",
    });
    const cmd = new Package();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
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
    const result = await cmd.runCommand(args);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([TelemetryEvent.BuildStart, TelemetryEvent.Build]);
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
    const result = await cmd.runCommand(args);
    expect(result.isErr()).equals(true);
    expect(telemetryEvents).deep.equals([TelemetryEvent.BuildStart, TelemetryEvent.Build]);
    if (result.isErr()) {
      expect(result.error).instanceOf(UserError);
      expect(result.error.name).equals("NotSupportedProjectType");
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
    const result = await cmd.runCommand(args);
    expect(result.isOk()).equals(true);
    // interactive ask env question if not provided
    expect(askEnv.calledOnce);
    expect(telemetryEvents).deep.equals([TelemetryEvent.BuildStart, TelemetryEvent.Build]);
  });

  it("Builder Check V3", () => {
    const cmd = new Package();
    cmd.builder(yargs);
  });

  it("Package Command Running Check V3", async () => {
    sandbox.stub(FxCore.prototype, "createAppPackage").resolves(ok(new Map()));
    const cmd = new Package();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      env: "dev",
    };
    const result = await cmd.runCommand(args);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([TelemetryEvent.BuildStart, TelemetryEvent.Build]);
  });
});
