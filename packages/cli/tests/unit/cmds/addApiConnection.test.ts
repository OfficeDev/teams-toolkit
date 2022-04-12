// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { FxError, Inputs, LogLevel, ok, Func } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import Add from "../../../src/cmds/add";
import { expect } from "../utils";

describe("Add api-connector Command Tests", () => {
  const sandbox = sinon.createSandbox();
  const registeredCommands: string[] = [];
  let options: string[] = [];
  const positionals: string[] = [];
  const telemetryEvents: string[] = [];

  beforeEach(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").callsFake(() => {
      return {};
    });
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
      positionals.push(name);
      return yargs;
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Builder Check", () => {
    const cmd = new Add();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["add <feature>", "api-connection"]);
  });

  it("Add api-connection Command Running Check", async () => {
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        expect(func).deep.equals({
          namespace: "fx-solution-azure/fx-resource-api-connector",
          method: "connectExistingApi",
        });
        return ok("");
      });
    const cmd = new Add();
    const cicd = cmd.subCommands.find((cmd) => cmd.commandHead === "api-connection");
    await cicd!.handler({});
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.ConnectExistingApiStart,
      TelemetryEvent.ConnectExistingApi,
    ]);
  });
});
