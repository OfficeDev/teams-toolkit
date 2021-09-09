// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";
import * as dotenv from "dotenv";

import { FxError, Inputs, LogLevel, Result, ok, err, UserError } from "@microsoft/teamsfx-api";
import * as core from "@microsoft/teamsfx-core";

import Env from "../../../src/cmds/env";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import { RootFolderNode } from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import * as Utils from "../../../src/utils";
import { UserSettings } from "../../../src/userSetttings";
import { NonTeamsFxProjectFolder } from "../../../src/error";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import { iteratee } from "underscore";
import { WorkspaceNotSupported } from "../../../src/cmds/preview/errors";

describe("Env List Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let telemetryEvents: string[] = [];
  let logs = "";
  let decrypted: string[] = [];
  let validProject = true;
  let checkedRootDir = "";
  let envList = ["dev", "test", "staging"];

  before(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").callsFake(() => {
      return {};
    });
    sandbox.stub(Utils, "isWorkspaceSupported").callsFake((rootDir: string): boolean => {
      checkedRootDir = rootDir;
      return validProject;
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
    sandbox.stub(core.environmentManager, "listEnvConfigs").callsFake(async (projectPath) => {
      return ok(envList);
    });
    sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs += message + "\n";
    });
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    registeredCommands = [];
    options = [];
    positionals = [];
    telemetryEvents = [];
    logs = "";
    decrypted = [];
    validProject = true;
  });

  it("prints all env names", async () => {
    // Arrange
    validProject = true;
    const cmd = new Env();
    const args = {};

    // Act
    await cmd.subCommands[0].handler(args);

    // Assert
    expect(logs).to.equal("dev\ntest\nstaging\n");
  });

  it("accepts --folder parameter", async () => {
    // Arrange
    validProject = true;
    const testRootFolder = "test/root/folder";
    const cmd = new Env();
    const args = {
      [constants.RootFolderNode.data.name as string]: testRootFolder,
    };

    // Act
    await cmd.subCommands[0].handler(args);

    // Assert
    expect(checkedRootDir).to.equal(testRootFolder);
  });

  it("prints nothing without an env", async () => {
    // Arrange
    validProject = true;
    envList = [];
    const cmd = new Env();
    const args = {};

    // Act
    await cmd.subCommands[0].handler(args);

    // Assert
    expect(logs).to.equal("\n");
  });

  it("throws on non-Teamsfx project", async () => {
    // Arrange
    validProject = false;
    const cmd = new Env();
    const args = {};
    let exceptionThrown = false;

    // Act
    try {
      await cmd.subCommands[0].handler(args);
    } catch (error) {
      exceptionThrown = true;

      // Assert
      expect(error).instanceOf(UserError);
      expect(error.name).equals("WorkspaceNotSupported");
    }

    expect(exceptionThrown);
  });
});
