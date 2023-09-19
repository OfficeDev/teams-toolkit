// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import "mocha";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Package from "../../../src/cmds/package";
import * as constants from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { expect, mockLogProvider, mockTelemetry, mockYargs } from "../utils";

describe("Package Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  const mockedEnvRestore: RestoreFn = () => {};

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
    const cmd = new Package();
    cmd.builder(yargs);
  });

  it("Package Command Running Check", async () => {
    sandbox.stub(FxCore.prototype, "createAppPackage").resolves(ok(undefined));
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
