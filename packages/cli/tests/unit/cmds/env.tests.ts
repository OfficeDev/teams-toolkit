// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import os from "os";

import sinon, { SinonSandbox } from "sinon";
import yargs, { Options } from "yargs";

import { err, FxError, Inputs, LogLevel, ok, Result, UserError } from "@microsoft/teamsfx-api";
import * as core from "@microsoft/teamsfx-core";

import { CoreHookContext, VersionCheckRes, VersionState } from "@microsoft/teamsfx-core";
import Env from "../../../src/cmds/env";
import LogProvider from "../../../src/commonlib/log";
import * as constants from "../../../src/constants";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import * as Utils from "../../../src/utils";
import { YargsCommand } from "../../../src/yargsCommand";
import { expect } from "../utils";

enum CommandName {
  Add = "add",
  List = "list",
  Activate = "activate",
}

type Reference<T> = { value: T };
function makeReference<T>(value: T) {
  return { value: value };
}

function getCommand(cmd: Env, name: string): YargsCommand {
  return cmd.subCommands.find((cmd) => cmd.commandHead === name)!;
}

class MockVars {
  registeredCommands: string[] = [];
  options: string[] = [];
  positionals: string[] = [];

  telemetryEvents: string[] = [];
  logs = "";
}

function mockYargs(sandbox: SinonSandbox, vars: Reference<MockVars>) {
  sandbox
    .stub<any, any>(yargs, "command")
    .callsFake((command: string, description: string, builder: any, handler: any) => {
      vars.value.registeredCommands.push(command);
      builder(yargs);
    });
  sandbox.stub(yargs, "options").callsFake((ops: { [key: string]: Options }) => {
    if (typeof ops === "string") {
      vars.value.options.push(ops);
    } else {
      vars.value.options = vars.value.options.concat(...Object.keys(ops));
    }
    return yargs;
  });
  sandbox.stub(yargs, "positional").callsFake((name: string) => {
    vars.value.positionals.push(name);
    return yargs;
  });
  sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
    throw err;
  });
  sandbox.stub(process, "exit");
}

function mockCommonUtils(sandbox: SinonSandbox, vars: Reference<MockVars>) {
  sandbox.stub(CliTelemetry, "sendTelemetryEvent").callsFake((eventName: string) => {
    vars.value.telemetryEvents.push(eventName);
  });
  sandbox
    .stub(CliTelemetry, "sendTelemetryErrorEvent")
    .callsFake((eventName: string, error: FxError) => {
      vars.value.telemetryEvents.push(eventName);
    });

  sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
    vars.value.logs += message + "\n";
  });

  sandbox.stub(LogProvider, "outputInfo").callsFake((message: string) => {
    vars.value.logs += message + "\n";
  });

  sandbox.stub(LogProvider, "outputSuccess").callsFake((message: string) => {
    vars.value.logs += message + "\n";
  });

  sandbox.stub(LogProvider, "outputError").callsFake((message: string) => {
    vars.value.logs += message + "\n";
  });
}

describe("Env Add Command Tests", function () {
  const sandbox = sinon.createSandbox();
  const vars = { value: new MockVars() };
  let checkedRootDir = "";
  let validProject = true;
  let envList = ["dev", "test", "staging"];
  const sourceEnvFromArgs = envList[2];
  let createEnvError: FxError | undefined = undefined;

  let sourceEnvName: string | undefined;
  let newTargetEnvName: string | undefined;

  before(() => {
    mockYargs(sandbox, vars);
    mockCommonUtils(sandbox, vars);
    sandbox.stub(Utils, "isWorkspaceSupported").callsFake((rootDir: string): boolean => {
      checkedRootDir = rootDir;
      return validProject;
    });
    sandbox.stub(core.environmentManager, "listRemoteEnvConfigs").callsFake(async (projectPath) => {
      return ok(envList);
    });
    sandbox.stub(core.environmentManager, "listAllEnvConfigs").callsFake(async (projectPath) => {
      return ok(envList);
    });
    sandbox
      .stub(core.FxCore.prototype, "createEnv")
      .callsFake(
        async (inputs: Inputs, ctx?: CoreHookContext): Promise<Result<undefined, FxError>> => {
          if (createEnvError) {
            return err(createEnvError);
          }
          sourceEnvName = inputs.sourceEnvName;
          newTargetEnvName = inputs.newTargetEnvName;
          return ok(undefined);
        }
      );
    sandbox.stub(core.FxCore.prototype, "projectVersionCheck").resolves(
      ok<VersionCheckRes, FxError>({
        isSupport: VersionState.compatible,
        versionSource: "",
        currentVersion: "1.0.0",
        trackingId: "",
      })
    );
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    vars.value = new MockVars();
    validProject = true;
    envList = ["dev", "test", "staging"];
  });
  it("Env", async () => {
    const cmd = new Env();
    const res = await cmd.runCommand({});
    expect(res.isOk()).to.be.true;
  });
  it("adds a new env by copying from the active env", async () => {
    // Arrange
    validProject = true;
    const cmd = new Env();
    const addCmd = getCommand(cmd, CommandName.Add);
    const args = {
      name: "production",
    };

    // Act
    const result = addCmd.handler(args);

    // Assert
    expect(result).to.eventually.rejected;
  });

  it("adds a new env by copying from the specified env", async () => {
    // Arrange
    validProject = true;
    const cmd = new Env();
    const addCmd = getCommand(cmd, CommandName.Add);
    const args = {
      name: "production",
      env: sourceEnvFromArgs,
    };

    // Act
    await addCmd.handler(args);

    // Assert
    expect(sourceEnvName).to.equal(sourceEnvFromArgs);
    expect(newTargetEnvName).to.equal(args.name);
  });

  it("handles error if target env exists", async () => {
    // Arrange
    validProject = true;
    const cmd = new Env();
    const addCmd = getCommand(cmd, CommandName.Add);
    let exceptionThrown = false;
    const args = {
      name: envList[0],
    };

    // Act
    try {
      await addCmd.handler(args);
    } catch (error) {
      exceptionThrown = true;

      // Assert
      expect(error).instanceOf(UserError);
      expect(error.name).equals("ProjectEnvAlreadyExistError");
      expect(vars.value.logs).to.contain(
        "Core.ProjectEnvAlreadyExistError: Project environment dev already exists.\n"
      );
    }

    expect(exceptionThrown).to.be.true;
  });

  it("handles error if target env name is of wrong format", async () => {
    // Arrange
    validProject = true;
    const cmd = new Env();
    const addCmd = getCommand(cmd, CommandName.Add);
    let exceptionThrown = false;
    const args = {
      name: "invalid?env!",
    };

    // Act
    try {
      await addCmd.handler(args);
    } catch (error) {
      exceptionThrown = true;

      // Assert
      expect(error).instanceOf(UserError);
      expect(error.name).equals("InvalidEnvNameError");
      expect(vars.value.logs).to.contain(
        "Core.InvalidEnvNameError: Environment name can only contain letters, digits, _ and -.\n"
      );
    }

    expect(exceptionThrown).to.be.true;
  });

  it("handles error if createEnv returns error", async () => {
    // Arrange
    validProject = true;
    const cmd = new Env();
    const addCmd = getCommand(cmd, CommandName.Add);
    createEnvError = new UserError("CLII", "MockCreateEnvError", "mock createEnv error");

    let exceptionThrown = false;
    const args = {
      name: "production",
    };

    // Act
    try {
      await addCmd.handler(args);
    } catch (error) {
      exceptionThrown = true;

      // Assert
      expect(error).instanceOf(UserError);
      expect(error.name).equals("MockCreateEnvError");
      expect(vars.value.logs).to.contain("CLII.MockCreateEnvError: mock createEnv error\n");
    }

    expect(exceptionThrown).to.be.true;
  });

  it("throws on non-Teamsfx project", async () => {
    // Arrange
    validProject = false;
    const cmd = new Env();
    const addCmd = getCommand(cmd, CommandName.Add);
    const args = {};
    let exceptionThrown = false;

    // Act
    try {
      await addCmd.handler(args);
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
  const vars = { value: new MockVars() };
  let validProject = true;
  let checkedRootDir = "";
  let envList = ["dev", "test", "staging"];
  const allEnvList = ["dev", "test", "staging", "local"];

  before(() => {
    mockYargs(sandbox, vars);
    mockCommonUtils(sandbox, vars);
    sandbox.stub(Utils, "isWorkspaceSupported").callsFake((rootDir: string): boolean => {
      checkedRootDir = rootDir;
      return validProject;
    });
    sandbox.stub(core.environmentManager, "listRemoteEnvConfigs").callsFake(async (projectPath) => {
      return ok(envList);
    });
    sandbox.stub(core.environmentManager, "listAllEnvConfigs").callsFake(async (projectPath) => {
      return ok(allEnvList);
    });
    sandbox.stub(core.FxCore.prototype, "projectVersionCheck").resolves(
      ok<VersionCheckRes, FxError>({
        isSupport: VersionState.compatible,
        versionSource: "",
        currentVersion: "1.0.0",
        trackingId: "",
      })
    );
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    vars.value = new MockVars();
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
    expect(vars.value.logs).to.equal(`dev${os.EOL}test${os.EOL}staging\n`);
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
    expect(vars.value.logs).to.equal("\n");
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
