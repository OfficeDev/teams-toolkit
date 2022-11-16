// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";
import { err, FxError, ok } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import Init, { InitDebug, InitInfra } from "../../../src/cmds/init";
import { expect, TestFolder } from "../utils";
import { NonTeamsFxProjectFolder } from "../../../src/error";

describe("Init Command Tests", () => {
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
    sandbox.stub(FxCore.prototype, "initInfra").callsFake((inputs) => {
      if (inputs.projectPath?.includes("fake"))
        return Promise.resolve(err(NonTeamsFxProjectFolder()));
      return Promise.resolve(ok<undefined, FxError>(undefined));
    });
    sandbox.stub(FxCore.prototype, "initDebug").resolves(ok(undefined));
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
    const cmd = new Init();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["init <part>", "infra", "debug"]);
  });

  it("Command Running Check - init infra", async () => {
    const cmd = new InitInfra();
    const args = {
      folder: TestFolder,
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.InitInfraStart, TelemetryEvent.InitInfra]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });

  it("Command Running Check - init infra - error", async () => {
    const cmd = new InitInfra();
    const args = {
      folder: "fake",
    };
    await expect(cmd.handler(args)).rejected;
  });

  it("Command Running Check - init debug", async () => {
    const cmd = new InitDebug();
    const args = {
      folder: TestFolder,
    };
    await cmd.handler(args);
    expect(telemetryEvents).deep.equals([TelemetryEvent.InitDebugStart, TelemetryEvent.InitDebug]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
  });
});
