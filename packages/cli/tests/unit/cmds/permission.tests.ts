// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import * as Utils from "../../../src/utils";
import yargs from "yargs";
import { err, FxError, Inputs, ok } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { NotSupportedProjectType } from "../../../src/error";
import LogProvider from "../../../src/commonlib/log";
import Permission, { PermissionGrant, PermissionStatus } from "../../../src/cmds/permission";
import { expect } from "chai";
import * as commonTools from "@microsoft/teamsfx-core/build/common/tools";
import mockedEnv, { RestoreFn } from "mocked-env";

describe("Permission Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let registeredCommands: string[] = [];
  let mockedEnvRestore: RestoreFn = () => {};
  beforeEach(() => {
    telemetryEvents = [];
    registeredCommands = [];
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: string, description: string, builder: any, handler: any) => {
        registeredCommands.push(command);
        builder(yargs);
      });
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").callsFake(() => {
      return {};
    });
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });

    sandbox.stub(CliTelemetry, "sendTelemetryEvent").callsFake((eventName: string) => {
      telemetryEvents.push(eventName);
    });
    sandbox
      .stub(CliTelemetry, "sendTelemetryErrorEvent")
      .callsFake((eventName: string, error: FxError) => {
        telemetryEvents.push(eventName);
      });

    sandbox.stub(FxCore.prototype, "checkPermission").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) return ok("");
      else return err(NotSupportedProjectType());
    });
    sandbox.stub(FxCore.prototype, "grantPermission").callsFake(async (inputs: Inputs) => {
      return ok("");
    });
    sandbox.stub(LogProvider, "necessaryLog").returns();
    sandbox.stub(Utils, "isRemoteCollaborationEnabled").returns(true);
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("Permission - Configs", () => {
    const cmd = new Permission();
    cmd.builder(yargs);
    expect(registeredCommands).deep.equals(["status", "grant"], JSON.stringify(registeredCommands));
  });

  it("Permission Status - Happy Path", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new PermissionStatus();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    sandbox.stub(Utils, "isSpfxProject").resolves(ok(false));

    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.CheckPermissionStart,
      TelemetryEvent.CheckPermission,
    ]);
  });

  it("Permission Grant - Happy Path", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new PermissionGrant();
    sandbox.stub(Utils, "isSpfxProject").resolves(ok(false));
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      [constants.CollaboratorEmailNode.data.name as string]: "email",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.GrantPermissionStart,
      TelemetryEvent.GrantPermission,
    ]);
  });

  it("Permission Status SPFX - Happy Path", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new PermissionStatus();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    sandbox.stub(Utils, "isSpfxProject").resolves(ok(true));
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.CheckPermissionStart,
      TelemetryEvent.CheckPermission,
    ]);
  });

  it("Permission Grant SPFX - Happy Path", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
    const cmd = new PermissionGrant();
    sandbox.stub(Utils, "isSpfxProject").resolves(ok(true));
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      [constants.CollaboratorEmailNode.data.name as string]: "email",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.GrantPermissionStart,
      TelemetryEvent.GrantPermission,
    ]);
  });
});

describe("Permission Command Tests V3", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let registeredCommands: string[] = [];

  beforeEach(() => {
    telemetryEvents = [];
    registeredCommands = [];
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: string, description: string, builder: any, handler: any) => {
        registeredCommands.push(command);
        builder(yargs);
      });
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").callsFake(() => {
      return {};
    });
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });

    sandbox.stub(CliTelemetry, "sendTelemetryEvent").callsFake((eventName: string) => {
      telemetryEvents.push(eventName);
    });
    sandbox
      .stub(CliTelemetry, "sendTelemetryErrorEvent")
      .callsFake((eventName: string, error: FxError) => {
        telemetryEvents.push(eventName);
      });

    sandbox.stub(FxCore.prototype, "checkPermission").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real")) return ok("");
      else return err(NotSupportedProjectType());
    });
    sandbox.stub(FxCore.prototype, "grantPermission").callsFake(async (inputs: Inputs) => {
      return ok("");
    });
    sandbox.stub(FxCore.prototype, "listCollaborator").callsFake(async (inputs: Inputs) => {
      return ok("");
    });
    sandbox.stub(LogProvider, "necessaryLog").returns();
    sandbox.stub(commonTools, "isV3Enabled").returns(true);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Permission - Configs", () => {
    const cmd = new Permission();
    cmd.builder(yargs);
    expect(registeredCommands).deep.equals(["status", "grant"], JSON.stringify(registeredCommands));
  });

  it("Permission Status - Happy Path", async () => {
    const cmd = new PermissionStatus();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
      ["aad-app-manifest"]: "aadAppManifest",
      ["teams-app-manifest"]: "teamsAppManifest",
      ["env"]: "env",
    };

    await cmd.handler(args);
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

    await cmd.handler(args);
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

    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.GrantPermissionStart,
      TelemetryEvent.GrantPermission,
    ]);
  });
});
