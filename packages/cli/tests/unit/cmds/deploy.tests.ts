// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, ok } from "@microsoft/teamsfx-api";
import { FxCore, InvalidProjectError } from "@microsoft/teamsfx-core";
import "mocha";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Deploy from "../../../src/cmds/deploy";
import * as constants from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { expect, mockTelemetry, mockYargs } from "../utils";

describe("Deploy Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let options: string[] = [];
  const mockedEnvRestore: RestoreFn = () => {};

  beforeEach(() => {
    mockYargs(sandbox, options);
    mockTelemetry(sandbox, telemetryEvents);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
    sandbox.stub(FxCore.prototype, "deployArtifacts").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) return ok(undefined);
      else return err(new InvalidProjectError());
    });
  });

  afterEach(() => {
    telemetryEvents = [];
    options = [];
    sandbox.restore();
    mockedEnvRestore();
  });

  it("Builder Check", () => {
    const cmd = new Deploy();
    cmd.builder(yargs);
    expect(options).to.include.members(["folder", "env"]);
  });

  it("Deploy Command Running -- deployArtifacts error", async () => {
    const cmd = new Deploy();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    const result = await cmd.runCommand(args);
    expect(result.isErr()).to.be.true;
    expect(telemetryEvents).deep.equals([TelemetryEvent.DeployStart, TelemetryEvent.Deploy]);
    if (result.isErr()) {
      expect(result.error.name).equals("InvalidProjectError");
    }
  });
});
