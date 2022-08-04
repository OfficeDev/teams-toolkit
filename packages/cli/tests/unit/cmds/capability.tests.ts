// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, Func, FxError, Inputs, ok, SystemError, UserError } from "@microsoft/teamsfx-api";
import { FxCore, ProjectSettingsHelper } from "@microsoft/teamsfx-core";

import {
  CapabilityAddTab,
  CapabilityAddBot,
  CapabilityAddMessageExtension,
  CapabilityAddNotification,
  CapabilityAddCommandAndResponse,
} from "../../../src/cmds/capability";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import { NotSupportedProjectType } from "../../../src/error";
import * as npmInstallHandler from "../../../src/cmds/preview/npmInstallHandler";
import AzureAccountManager from "../../../src/commonlib/azureLogin";

describe("Capability Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let telemetryEventStatus: string | undefined = undefined;

  beforeEach(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").returns({});
    sandbox
      .stub<any, any>(yargs, "command")
      .callsFake((command: string, description: string, builder: any, handler: any) => {
        registeredCommands.push(command);
        builder(yargs);
      });
    sandbox.stub(yargs, "options").callsFake((ops: { [key: string]: Options }) => {
      if (typeof ops === "string") {
        options.push(ops);
      } else {
        options = options.concat(...Object.keys(ops));
      }
      return yargs;
    });
    sandbox.stub(yargs, "positional").callsFake((name: string) => {
      return yargs;
    });
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });
    sandbox
      .stub(CliTelemetry, "sendTelemetryEvent")
      .callsFake((eventName: string, options?: { [_: string]: string }) => {
        telemetryEvents.push(eventName);
        if (options && TelemetryProperty.Success in options) {
          telemetryEventStatus = options[TelemetryProperty.Success];
        }
      });
    sandbox
      .stub(CliTelemetry, "sendTelemetryErrorEvent")
      .callsFake((eventName: string, error: FxError) => {
        telemetryEvents.push(eventName);
        telemetryEventStatus = TelemetrySuccess.No;
      });
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals(constants.AddFeatureFunc);
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    sandbox.stub(FxCore.prototype, "getProjectConfigV3").callsFake(async (inputs: Inputs) => {
      if (inputs.projectPath?.includes("real") || inputs.projectPath?.includes("fakeReal")) {
        return ok({ projectSettings: { appName: "test", projectId: "" }, envInfos: {} });
      } else {
        return err(NotSupportedProjectType());
      }
    });
    sandbox.stub(ProjectSettingsHelper, "includeFrontend").returns(false);
    sandbox.stub(ProjectSettingsHelper, "includeBot").returns(false);
    sandbox.stub(npmInstallHandler, "automaticNpmInstallHandler").callsFake(async () => {});
    sandbox.stub(LogProvider, "necessaryLog").returns();

    registeredCommands = [];
    options = [];
    telemetryEvents = [];
    telemetryEventStatus = undefined;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Capability Add Tab Command Running Check", async () => {
    const cmd = new CapabilityAddTab();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Capability Add Tab Command Running Check with Error", async () => {
    const cmd = new CapabilityAddTab();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Capability Add Tab Command Running Check with Activate Error", async () => {
    const cmd = new CapabilityAddTab();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fakeReal",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Capability Add Tab Command Running Check with Activate Error", async () => {
    sandbox.stub(AzureAccountManager, "setRootPath").throws(NotSupportedProjectType());
    const cmd = new CapabilityAddTab();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(SystemError);
      expect(e.name).equals("UnknownError");
    }
  });

  it("Capability Add Bot Command Running Check", async () => {
    const cmd = new CapabilityAddBot();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Capability Add Bot Command Running Check with Error", async () => {
    const cmd = new CapabilityAddBot();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Capability Add Messging-Extension Command Running Check", async () => {
    const cmd = new CapabilityAddMessageExtension();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Capability Add Messging-Extension Command Running Check with Error", async () => {
    const cmd = new CapabilityAddMessageExtension();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Capability Add Notification Command Running Check", async () => {
    sandbox.stub(process, "env").value({
      BOT_NOTIFICATION_ENABLED: "true",
    });
    const cmd = new CapabilityAddNotification();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Capability Add Notification Command Running Check with Error", async () => {
    sandbox.stub(process, "env").value({
      BOT_NOTIFICATION_ENABLED: "true",
    });
    const cmd = new CapabilityAddNotification();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });

  it("Capability Add Command-And-Response Command Running Check", async () => {
    sandbox.stub(process, "env").value({
      BOT_NOTIFICATION_ENABLED: "true",
    });
    const cmd = new CapabilityAddCommandAndResponse();
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Capability Add Command-And-Response Command Running Check with Error", async () => {
    sandbox.stub(process, "env").value({
      BOT_NOTIFICATION_ENABLED: "true",
    });
    const cmd = new CapabilityAddCommandAndResponse();
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await cmd.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([TelemetryEvent.AddCapStart, TelemetryEvent.AddCap]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });
});
