// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Func, Inputs, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import { ManifestValidate } from "../../../src/cmds/validate";
import * as constants from "../../../src/constants";
import { NotSupportedProjectType } from "../../../src/error";
import { TelemetryEvent, TelemetrySuccess } from "../../../src/telemetry/cliTelemetryEvents";
import CLIUIInstance from "../../../src/userInteraction";
import { expect, mockTelemetry, mockYargs } from "../utils";

describe("teamsfx validate", () => {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let mockedEnvRestore: RestoreFn = () => {};

  afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
    options = [];
    telemetryEvents = [];
  });

  beforeEach(() => {
    mockYargs(sandbox, options);
    mockTelemetry(sandbox, telemetryEvents);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
  });

  it("should pass builder check", () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "false",
    });
    const cmd = new ManifestValidate();
    cmd.builder(yargs);
  });

  it("Builder Check V3", () => {
    const cmd = new ManifestValidate();
    cmd.builder(yargs);
  });

  it("Throw error for multiple options", async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    const cmd = new ManifestValidate();
    const args = {
      [constants.AppPackageFilePathParamName]: "./app.zip",
      [constants.ManifestFilePathParamName]: "./manifest.json",
    };
    const res = await cmd.runCommand(args);
    expect(res.isErr()).to.be.true;
  });

  it("Validate Command Running Check - app package", async () => {
    sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(new Map()));
    const cmd = new ManifestValidate();
    const args = {
      [constants.AppPackageFilePathParamName]: "./app.zip",
    };
    const result = await cmd.runCommand(args);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.ValidateManifestStart,
      TelemetryEvent.ValidateManifest,
    ]);
  });

  it("Validate Command Running Check - manifest", async () => {
    sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(new Map()));
    const cmd = new ManifestValidate();
    const args = {
      [constants.ManifestFilePathParamName]: "./manifest.json",
      env: "dev",
    };
    const result = await cmd.runCommand(args);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.ValidateManifestStart,
      TelemetryEvent.ValidateManifest,
    ]);
  });

  it("Validate Command Running Check - Run command failed without env", async () => {
    sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(new Map()));
    const cmd = new ManifestValidate();
    const args = {
      [constants.ManifestFilePathParamName]: "./manifest.json",
    };
    CLIUIInstance.interactive = false;
    const res = await cmd.runCommand(args);
    expect(res.isErr()).to.be.true;
    if (res.isErr()) {
      expect(res.error.message).equal("The --env argument is not specified");
    }
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
    const result = await cmd.runCommand(args);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.ValidateManifestStart,
      TelemetryEvent.ValidateManifest,
    ]);
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
    const result = await cmd.runCommand(args);
    expect(result.isErr()).equals(true);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.ValidateManifestStart,
      TelemetryEvent.ValidateManifest,
    ]);
    if (result.isErr()) {
      expect(result.error).instanceOf(UserError);
      expect(result.error.name).equals("NotSupportedProjectType");
    }
  });
});
