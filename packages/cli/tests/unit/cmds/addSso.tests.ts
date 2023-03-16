// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";

import { Func, FxError, Inputs, LogLevel, ok } from "@microsoft/teamsfx-api";

import LogProvider from "../../../src/commonlib/log";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import { expect } from "../utils";
import Add from "../../../src/cmds/add";
import mockedEnv from "mocked-env";
import { FxCore } from "@microsoft/teamsfx-core";
import { isPreviewFeaturesEnabled } from "@microsoft/teamsfx-core/build/common/featureFlags";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";

describe("Add SSO Command Tests", function () {
  const sandbox = sinon.createSandbox();
  const registeredCommands: string[] = [];
  let options: string[] = [];
  const positionals: string[] = [];
  const telemetryEvents: string[] = [];
  const logs: string[] = [];
  let mockedEnvRestore: () => void;

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_AAD_MANIFEST: "true",
      TEAMSFX_V3: "false",
    });

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

    sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs.push(message);
    });
  });

  this.afterEach(() => {
    mockedEnvRestore();
    sandbox.restore();
  });

  it("Builder Check", () => {
    const cmd = new Add();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(
      isPreviewFeaturesEnabled()
        ? [
            "add <feature>",
            "notification",
            "command-and-response",
            "workflow",
            "sso-tab",
            "tab",
            "spfx-tab",
            "bot",
            "message-extension",
            "azure-function",
            "azure-apim",
            "azure-sql",
            "azure-keyvault",
            "sso",
            "cicd",
          ]
        : ["add <feature>", "sso", "cicd"]
    );
  });

  it("Add SSO", async () => {
    sandbox
      .stub(FxCore.prototype, "executeUserTask")
      .callsFake(async (func: Func, inputs: Inputs) => {
        return ok("");
      });
    const cmd = new Add();
    const sso = cmd.subCommands.find((cmd) => cmd.commandHead === "sso");
    await sso!.handler({});
    expect(telemetryEvents).deep.equals([TelemetryEvent.AddSsoStart, TelemetryEvent.AddSso]);
  });
});
