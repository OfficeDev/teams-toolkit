// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, ok, Platform, UserError } from "@microsoft/teamsfx-api";
import { FxCore, InvalidProjectError } from "@microsoft/teamsfx-core";
import "mocha";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Publish from "../../../src/cmds/publish";
import * as constants from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { expect, mockLogProvider, mockTelemetry, mockYargs } from "../utils";

describe("Publish Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  const mockedEnvRestore: RestoreFn = () => {};

  beforeEach(() => {
    mockYargs(sandbox, options);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
    sandbox.stub(FxCore.prototype, "publishApplication").callsFake(async (inputs: Inputs) => {
      expect(inputs.platform).equals(Platform.CLI);
      if (inputs.projectPath?.includes("real")) return ok(undefined);
      else return err(new InvalidProjectError());
    });
  });

  afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
    options = [];
    telemetryEvents = [];
  });

  it("Builder Check", () => {
    const cmd = new Publish();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
  });

  it("Publish Command Running Check (CLI)", async () => {
    const cmd = new Publish();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      env: "dev",
    };
    const result = await cmd.runCommand(args);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([TelemetryEvent.PublishStart, TelemetryEvent.Publish]);
  });

  it("Publish Command Running Check with Error (CLI)", async () => {
    const cmd = new Publish();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    const result = await cmd.runCommand(args);
    expect(result.isErr()).equals(true);
    expect(telemetryEvents).deep.equals([TelemetryEvent.PublishStart, TelemetryEvent.Publish]);
    if (result.isErr()) {
      expect(result.error).instanceOf(UserError);
      expect(result.error.name).equals("InvalidProjectError");
    }
  });
});
