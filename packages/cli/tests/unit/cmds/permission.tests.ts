// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, ok } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Permission, { PermissionGrant, PermissionStatus } from "../../../src/cmds/permission";
import * as constants from "../../../src/constants";
import { NotSupportedProjectType } from "../../../src/error";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { mockLogProvider, mockTelemetry, mockYargs } from "../utils";

describe("Permission Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];

  beforeEach(() => {
    telemetryEvents = [];
    mockYargs(sandbox);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
    sandbox.stub(FxCore.prototype, "checkPermission").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) return ok("");
      else return err(NotSupportedProjectType());
    });
    sandbox.stub(FxCore.prototype, "grantPermission").resolves(ok(""));
    sandbox.stub(FxCore.prototype, "listCollaborator").resolves(ok([]));
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Permission - Configs", () => {
    const cmd = new Permission();
    cmd.builder(yargs);
  });

  it("Permission Status - Happy Path", async () => {
    const cmd = new PermissionStatus();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      ["aad-app-manifest"]: "aadAppManifest",
      ["teams-app-manifest"]: "teamsAppManifest",
      ["env"]: "env",
    };

    const result = await cmd.runCommand(args);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.CheckPermissionStart,
      TelemetryEvent.CheckPermission,
    ]);
  });

  it("Permission Status - List Collaborator - Happy Path", async () => {
    const cmd = new PermissionStatus();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      ["aad-app-manifest"]: "aadAppManifest",
      ["teams-app-manifest"]: "teamsAppManifest",
      ["env"]: "env",
      ["list-all-collaborators"]: true,
    };

    const result = await cmd.runCommand(args as any);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.CheckPermissionStart,
      TelemetryEvent.CheckPermission,
    ]);
  });

  it("Permission Grant - Happy Path", async () => {
    const cmd = new PermissionGrant();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      ["aad-app-manifest"]: "aadAppManifest",
      ["teams-app-manifest"]: "teamsAppManifest",
      ["env"]: "env",
      ["email"]: "email",
    };

    const result = await cmd.runCommand(args);
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.GrantPermissionStart,
      TelemetryEvent.GrantPermission,
    ]);
  });
});
