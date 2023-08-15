// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, ok } from "@microsoft/teamsfx-api";
import {
  CollaborationStateResult,
  FxCore,
  InvalidProjectError,
  ListCollaboratorResult,
  PermissionsResult,
} from "@microsoft/teamsfx-core";
import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Permission, { PermissionGrant, PermissionStatus } from "../../../src/cmds/permission";
import * as constants from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { mockLogProvider, mockTelemetry, mockYargs } from "../utils";
import CLIUserInteraction from "../../../src/userInteraction";

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
      if (inputs.projectPath?.includes("real"))
        return ok({ state: "OK" } as CollaborationStateResult);
      else return err(new InvalidProjectError());
    });
    sandbox
      .stub(FxCore.prototype, "grantPermission")
      .resolves(ok({ state: "OK" } as PermissionsResult));
    sandbox
      .stub(FxCore.prototype, "listCollaborator")
      .resolves(ok({ state: "OK" } as ListCollaboratorResult));
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Permission - Configs", () => {
    const cmd = new Permission();
    cmd.builder(yargs);
    cmd.runCommand({});
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

  it("Permission Status - No Env", async () => {
    const cmd = new PermissionStatus();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      ["aad-app-manifest"]: "aadAppManifest",
      ["teams-app-manifest"]: "teamsAppManifest",
    };
    CLIUserInteraction.interactive = false;

    const result = await cmd.runCommand(args);
    expect(result.isErr()).equals(true);
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

  it("Permission Grant - No Env", async () => {
    const cmd = new PermissionGrant();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      ["aad-app-manifest"]: "aadAppManifest",
      ["teams-app-manifest"]: "teamsAppManifest",
      ["email"]: "email",
    };

    const result = await cmd.runCommand(args);
    expect(result.isErr()).equals(true);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.GrantPermissionStart,
      TelemetryEvent.GrantPermission,
    ]);
  });
});
