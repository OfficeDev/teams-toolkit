// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";
import { err, Func, FxError, Inputs, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import Manifest from "../../../src/cmds/manifest";
import { expect } from "../utils";
import * as constants from "../../../src/constants";
import { NotSupportedProjectType } from "../../../src/error";

describe("Manifest Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let telemetryEvents: string[] = [];
  let telemetryEventStatus: string | undefined = undefined;

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registeredCommands = [];
    options = [];
    telemetryEvents = [];
    telemetryEventStatus = undefined;
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
  });

  it("Builder Check", () => {
    const cmd = new Manifest();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["manifest <action>", "update"]);
  });

  it("Update Command Running Check", async () => {
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure/fx-resource-appstudio",
          method: "updateManifest",
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    const cmd = new Manifest();
    const update = cmd.subCommands.find((cmd) => cmd.commandHead === "update");
    const args = {
      [constants.RootFolderNode.data.name as string]: "real",
    };
    await update!.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateManifestStart,
      TelemetryEvent.UpdateManifest,
    ]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Update Command Running Check with Error", async () => {
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure/fx-resource-appstudio",
          method: "updateManifest",
        });
        if (inputs.projectPath?.includes("real")) return ok("");
        else return err(NotSupportedProjectType());
      });
    const cmd = new Manifest();
    const update = cmd.subCommands.find((cmd) => cmd.commandHead === "update");
    const args = {
      [constants.RootFolderNode.data.name as string]: "fake",
    };
    try {
      await update!.handler(args);
      throw new Error("Should throw an error.");
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.UpdateManifestStart,
        TelemetryEvent.UpdateManifest,
      ]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NotSupportedProjectType");
    }
  });
});
