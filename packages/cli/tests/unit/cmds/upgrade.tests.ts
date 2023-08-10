// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok } from "@microsoft/teamsfx-api";
import { FxCore, InvalidProjectError } from "@microsoft/teamsfx-core";
import "mocha";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Upgrade from "../../../src/cmds/upgrade";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { expect, mockLogProvider, mockTelemetry, mockYargs, TestFolder } from "../utils";

describe("Init Command Tests", () => {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let telemetryEvents: string[] = [];

  beforeEach(() => {
    mockYargs(sandbox, options);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
  });

  afterEach(() => {
    sandbox.restore();
    options = [];
    telemetryEvents = [];
  });

  it("Builder Check", () => {
    const cmd = new Upgrade();
    cmd.builder(yargs);
  });

  it("Command Running Check", async () => {
    sandbox.stub(FxCore.prototype, "phantomMigrationV3").callsFake((inputs) => {
      expect(inputs.projectPath).equals(TestFolder);
      expect(inputs.skipUserConfirm).equals(true);
      expect(inputs.nonInteractive).equals(undefined);
      return Promise.resolve(ok(undefined));
    });
    const cmd = new Upgrade();
    const args = {
      folder: TestFolder,
      force: true,
    };
    const result = await cmd.runCommand(args as any);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([TelemetryEvent.UpgradeStart, TelemetryEvent.Upgrade]);
  });

  it("Command Running Check - error", async () => {
    sandbox.stub(FxCore.prototype, "phantomMigrationV3").callsFake((inputs) => {
      if (inputs.projectPath?.includes("fake"))
        return Promise.resolve(err(new InvalidProjectError()));
      return Promise.resolve(ok(undefined));
    });

    const cmd = new Upgrade();
    const args = {
      folder: "fake",
    };
    const result = await cmd.runCommand(args);
    expect(result.isErr()).equals(true);
  });
});
