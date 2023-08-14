// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore, InvalidProjectError, UserCancelError } from "@microsoft/teamsfx-core";
import "mocha";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Provision from "../../../src/cmds/provision";
import * as constants from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { expect, mockLogProvider, mockTelemetry, mockYargs } from "../utils";
import UI from "../../../src/userInteraction";

describe("Provision Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let logs: string[] = [];
  const mockedEnvRestore: RestoreFn = () => {};

  beforeEach(() => {
    mockYargs(sandbox);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox, logs);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
    sandbox.stub(FxCore.prototype, "provisionResources").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) return ok(undefined);
      else if (inputs.projectPath?.includes("Cancel")) return err(new UserCancelError());
      else return err(new InvalidProjectError());
    });
  });

  afterEach(() => {
    telemetryEvents = [];
    logs = [];
    sandbox.restore();
    mockedEnvRestore();
  });

  it("Builder Check", () => {
    const cmd = new Provision();
    cmd.builder(yargs);
  });

  it("Running check", async () => {
    const cmd = new Provision();
    const result = await cmd.runCommand({
      [constants.RootFolderNode.data.name as string]: "real",
    });
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([TelemetryEvent.ProvisionStart, TelemetryEvent.Provision]);
  });

  it("Provision Command Running -- provisionResources error", async () => {
    const cmd = new Provision();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    const result = await cmd.runCommand(args);
    expect(result.isErr()).equals(true);
    expect(telemetryEvents).deep.equals([TelemetryEvent.ProvisionStart, TelemetryEvent.Provision]);
    if (result.isErr()) {
      expect(result.error).instanceOf(UserError);
      expect(result.error.name).equals("InvalidProjectError");
    }
  });

  it("Provision with region", async () => {
    sandbox.stub(UI, "interactive").value(false);
    const cmd = new Provision();
    const args = {
      "resource-group": "mockrg",
      region: "fake",
    };
    const result = await cmd.runCommand(args);
    expect(result.isErr()).equals(true);
  });
});
