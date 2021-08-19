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
import Permission, { PermissionStatus } from "../../../src/cmds/permission";
import { expect } from "chai";

describe("Permission Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let registeredCommands: string[] = [];

  before(() => {
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
    sandbox.stub(LogProvider, "necessaryLog").returns();
    sandbox.stub(Utils, "isRemoteCollaborationEnabled").returns(true);
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    telemetryEvents = [];
    registeredCommands = [];
  });

  it("Permission - Configs", () => {
    const cmd = new Permission();
    cmd.builder(yargs);
    expect(registeredCommands).deep.equals(["status"], JSON.stringify(registeredCommands));
  });

  it("Permission Status - Happy Path", async () => {
    const cmd = new PermissionStatus();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.CheckPermissionStart,
      TelemetryEvent.CheckPermission,
    ]);
  });
});
