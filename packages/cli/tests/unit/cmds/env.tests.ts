// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options, string } from "yargs";

import {
  err,
  FxError,
  Inputs,
  LogLevel,
  ok,
  Result,
  returnUserError,
  UserError,
  Void,
} from "@microsoft/teamsfx-api";
import * as core from "@microsoft/teamsfx-core";

import Env from "../../../src/cmds/env";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import * as constants from "../../../src/constants";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import * as Utils from "../../../src/utils";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import { YargsCommand } from "../../../src/yargsCommand";
import { FxCore } from "@microsoft/teamsfx-core";

enum CommandName {
  List = "list",
  Activate = "activate",
}

function getCommand(cmd: Env, name: string): YargsCommand {
  return cmd.subCommands.find((cmd) => cmd.commandHead === name)!;
}

describe("Env Show Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let telemetryEvents: string[] = [];
  let logs = "";
  let validProject = true;
  let checkedRootDir = "";
  let getActiveEnvError: FxError | undefined = undefined;
  const activeEnv = "testing";

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
    sandbox
      .stub(core.environmentManager, "getActiveEnv")
      .callsFake((projectPath: string): Result<string, FxError> => {
        if (getActiveEnvError) {
          return err(getActiveEnvError);
        } else {
          return ok(activeEnv);
        }
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
    validProject = true;
    getActiveEnvError = undefined;
  });

  it("prints active env", async () => {
    // Arrange
    validProject = true;
    const cmd = new Env();
    const args = {};

    // Act
    await cmd.handler(args);

    // Assert
    expect(logs).to.equal(activeEnv + "\n");
  });

  it("returns error on getActiveEnv errors.", async () => {
    // Arrange
    validProject = true;
    getActiveEnvError = returnUserError(
      new Error("fake user error message"),
      "CLI",
      "FakeUserError"
    );
    const cmd = new Env();
    const args = {};

    // Act
    try {
      await cmd.handler(args);
    } catch (error) {
      expect(error).instanceOf(UserError);
      expect(error.name === "FakeUserError");
    }

    // Assert
    expect(logs).to.equal("[CLI.FakeUserError]: fake user error message\n");
  });

  it("throws on non-Teamsfx project", async () => {
    // Arrange
    validProject = false;
    const cmd = new Env();
    const args = {};
    let exceptionThrown = false;

    // Act
    try {
      await cmd.handler(args);
    } catch (error) {
      exceptionThrown = true;

      // Assert
      expect(error).instanceOf(UserError);
      expect(error.name).equals("WorkspaceNotSupported");
    }

    expect(exceptionThrown);
  });
});

describe("Env List Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let telemetryEvents: string[] = [];
  let logs = "";
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
    sandbox
      .stub(core.environmentManager, "getActiveEnv")
      .callsFake((projectPath: string): Result<string, FxError> => {
        return ok(envList[0]);
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
    validProject = true;
  });

  it("prints all env names", async () => {
    // Arrange
    validProject = true;
    const cmd = new Env();
    const listCmd = getCommand(cmd, CommandName.List);
    const args = {};

    // Act
    await listCmd.handler(args);

    // Assert
    expect(logs).to.equal("dev (active)\ntest\nstaging\n");
  });

  it("accepts --folder parameter", async () => {
    // Arrange
    validProject = true;
    const testRootFolder = "test/root/folder";
    const cmd = new Env();
    const listCmd = getCommand(cmd, CommandName.List);
    const args = {
      [constants.RootFolderNode.data.name as string]: testRootFolder,
    };

    // Act
    await listCmd.handler(args);

    // Assert
    expect(checkedRootDir).to.equal(testRootFolder);
  });

  it("prints nothing without an env", async () => {
    // Arrange
    validProject = true;
    envList = [];
    const cmd = new Env();
    const listCmd = getCommand(cmd, CommandName.List);
    const args = {};

    // Act
    await listCmd.handler(args);

    // Assert
    expect(logs).to.equal("\n");
  });

  it("throws on non-Teamsfx project", async () => {
    // Arrange
    validProject = false;
    const cmd = new Env();
    const listCmd = getCommand(cmd, CommandName.List);
    const args = {};
    let exceptionThrown = false;

    // Act
    try {
      await listCmd.handler(args);
    } catch (error) {
      exceptionThrown = true;

      // Assert
      expect(error).instanceOf(UserError);
      expect(error.name).equals("WorkspaceNotSupported");
    }

    expect(exceptionThrown);
  });
});

describe("Env Activate Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let telemetryEvents: string[] = [];
  let logs = "";
  let validProject = true;
  let checkedRootDir = "";
  const envList = ["dev", "test", "staging"];
  let activatedEnv: string | undefined = undefined;

  before(() => {
    sandbox.stub(HelpParamGenerator, "getYargsParamForHelp").callsFake(() => {
      return {};
    });
    sandbox.stub(Utils, "isWorkspaceSupported").callsFake((rootDir: string): boolean => {
      checkedRootDir = rootDir;
      return validProject;
    });
    sandbox
      .stub(FxCore.prototype, "activateEnv")
      .callsFake(
        async (inputs: Inputs, ctx?: core.CoreHookContext): Promise<Result<Void, FxError>> => {
          activatedEnv = inputs.env;
          return ok(Void);
        }
      );
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
    sandbox
      .stub(core.environmentManager, "getActiveEnv")
      .callsFake((projectPath: string): Result<string, FxError> => {
        return ok(envList[0]);
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
    validProject = true;
  });

  it("passes env to core", async () => {
    // Arrange
    validProject = true;
    const cmd = new Env();
    const listCmd = getCommand(cmd, CommandName.Activate);
    const args = {
      [constants.EnvNodeNoCreate.data.name!]: envList[0],
    };

    // Act
    await listCmd.handler(args);

    // Assert
    expect(activatedEnv).to.equal(envList[0]);
  });

  it("throws on non-Teamsfx project", async () => {
    // Arrange
    validProject = false;
    const cmd = new Env();
    const listCmd = getCommand(cmd, CommandName.List);
    const args = {};
    let exceptionThrown = false;

    // Act
    try {
      await listCmd.handler(args);
    } catch (error) {
      exceptionThrown = true;

      // Assert
      expect(error).instanceOf(UserError);
      expect(error.name).equals("WorkspaceNotSupported");
    }

    expect(exceptionThrown);
  });
});
