// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import "mocha";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import { ManifestValidate } from "../../../src/cmds/validate";
import * as constants from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import CLIUIInstance from "../../../src/userInteraction";
import { expect, mockTelemetry, mockYargs } from "../utils";
import { MissingRequiredArgumentError, MissingRequiredOptionError } from "../../../src/error";

describe("teamsfx validate", () => {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  const mockedEnvRestore: RestoreFn = () => {};

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

  it("Builder Check V3", () => {
    const cmd = new ManifestValidate();
    cmd.builder(yargs);
  });

  it("Throw error for multiple options", async () => {
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
      expect(res.error instanceof MissingRequiredArgumentError).to.be.true;
    }
  });

  it("Validate Command Running Check - manifest with all inputs", async () => {
    sandbox.stub(FxCore.prototype, "validateApplication").resolves(ok(new Map()));
    const cmd = new ManifestValidate();
    const args = {
      [constants.ManifestFilePathParamName]: "./manifest.json",
      env: "dev",
      folder: "./",
    };
    CLIUIInstance.interactive = false;
    const res = await cmd.runCommand(args);
    expect(res.isOk()).equals(true);
  });
});
