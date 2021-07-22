// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { err, Func, FxError, Inputs, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import Capability, {
  CapabilityAdd,
  CapabilityAddTab,
  CapabilityAddBot,
  CapabilityAddMessageExtension,
} from "../../../src/cmds/capability";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import * as Utils from "../../../src/utils";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import { NotSupportedProjectType } from "../../../src/error";

describe("Capability Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let telemetryEventStatus: string | undefined = undefined;

  before(() => {
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
        expect(func).deep.equals({
          namespace: "fx-solution-azure",
          method: "addCapability",
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    sandbox.stub(LogProvider, "necessaryLog").returns();
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registeredCommands = [];
    options = [];
    telemetryEvents = [];
    telemetryEventStatus = undefined;
  });

  it("Builder Check", () => {
    const cmd = new Capability();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals([
      "capability <action>",
      "add <capability>",
      "tab",
      "bot",
      "messaging-extension",
    ]);
  });

  it("Capability Command Running Check", async () => {
    const cmd = new Capability();
    await cmd.handler({});
  });

  it("Capability Add Command Running Check", async () => {
    const cmd = new CapabilityAdd();
    await cmd.handler({});
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
});
