// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";
import * as dotenv from "dotenv";

import { FxError, Inputs, LogLevel, Result, ok, err, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import Config from "../../../src/cmds/config";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import { RootFolderNode } from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import LogProvider from "../../../src/commonlib/log";
import { expect } from "../utils";
import * as Utils from "../../../src/utils";
import { UserSettings } from "../../../src/userSetttings";
import { NonTeamsFxProjectFolder } from "../../../src/error";

describe("Config Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let telemetryEvents: string[] = [];
  let logs: string[] = [];
  let decrypted: string[] = [];
  const config = {
    telemetry: "on",
    envCheckerValidateDotnetSdk: "true",
  };

  before(() => {
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
      .stub<any, any>(FxCore.prototype, "decrypt")
      .callsFake((ciphertext: string, inputs: Inputs) => {
        decrypted.push(ciphertext);
        return ok("decrypted");
      });
    sandbox.stub(UserSettings, "getConfigSync").returns(ok(config));
    sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs.push(message);
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
    logs = [];
    decrypted = [];
  });

  it("has configured proper parameters", () => {
    const cmd = new Config();
    cmd.builder(yargs);
    expect(registeredCommands).deep.equals(
      ["get [option]", "set <option> <value>"],
      JSON.stringify(registeredCommands)
    );
    expect(options).includes("global", JSON.stringify(options));
    expect(options).includes(RootFolderNode.data.name, JSON.stringify(options));
    expect(positionals).deep.equals(["option", "option", "value"], JSON.stringify(positionals));
  });
});

describe("Config Get Command Check", () => {
  const cmd = new Config();
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let logs: string[] = [];
  let decrypted: string[] = [];
  const config = {
    telemetry: "on",
    envCheckerValidateDotnetSdk: "true",
  };

  before(() => {
    sandbox.stub(CliTelemetry, "sendTelemetryEvent").callsFake((eventName: string) => {
      telemetryEvents.push(eventName);
    });
    sandbox
      .stub(CliTelemetry, "sendTelemetryErrorEvent")
      .callsFake((eventName: string, error: FxError) => {
        telemetryEvents.push(eventName);
      });
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });
    sandbox
      .stub<any, any>(FxCore.prototype, "decrypt")
      .callsFake((ciphertext: string, inputs: Inputs) => {
        decrypted.push(ciphertext);
        return ok("decrypted");
      });
    sandbox.stub(UserSettings, "getConfigSync").returns(ok(config));
    sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs.push(message);
    });
    // sandbox.stub(Utils, "readConfigs").returns(Promise.resolve(err(NonTeamsFxProjectFolder())));
    sandbox
      .stub(Utils, "readEnvJsonFile")
      .callsFake(async (rootFolder: string): Promise<Result<any, FxError>> => {
        if (rootFolder.endsWith("testProjectFolder")) {
          return ok({});
        }
        return err(NonTeamsFxProjectFolder());
      });
    sandbox
      .stub(Utils, "readProjectSecrets")
      .returns(Promise.resolve(ok(dotenv.parse("fx-resource-bot.botPassword=password\ntest=abc"))));
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    telemetryEvents = [];
    logs = [];
    decrypted = [];
  });

  it("has configured proper parameters", () => {
    expect(cmd.subCommands.length).equals(2);
    expect(cmd.subCommands[0].command).equals("get [option]");
  });

  it("only prints all global config when running 'config get' and not in a project folder", async () => {
    await cmd.subCommands[0].handler({});

    expect(logs.length).equals(1);
    expect(logs[0]).includes(JSON.stringify(config, null, 2));

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("only prints all global config when running 'config get --global' in a project folder", async () => {
    await cmd.subCommands[0].handler({
      global: true,
      [constants.RootFolderNode.data.name as string]: "testProjectFolder",
    });

    expect(logs.length).equals(1);
    expect(logs[0]).includes(JSON.stringify(config, null, 2));

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("prints all global config and project config when running 'config get' in a project folder", async () => {
    await cmd.subCommands[0].handler({
      [constants.RootFolderNode.data.name as string]: "testProjectFolder",
    });

    expect(logs.length).equals(3);
    expect(logs[0]).includes(JSON.stringify(config, null, 2));
    expect(logs[1]).includes("fx-resource-bot.botPassword: decrypted");
    expect(logs[2]).includes("test: abc");

    expect(decrypted).deep.equals(["password"]);

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("only prints specific global config when running 'config get telemetry' and not in a project folder", async () => {
    await cmd.subCommands[0].handler({
      option: "telemetry",
    });

    expect(logs.length).equals(2);
    expect(logs[0]).includes("Showing global config. You can add '-g' to specify global scope.");
    expect(logs[1]).includes(JSON.stringify(config.telemetry, null, 2));

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("only prints specific global config when running 'config get telemetry -g' and not in a project folder", async () => {
    await cmd.subCommands[0].handler({
      option: "telemetry",
      global: true,
    });

    expect(logs.length).equals(1);
    expect(logs[0]).includes(JSON.stringify(config.telemetry, null, 2));

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("only prints specific project config that doesn't need decryption when running 'config get test' in a project folder", async () => {
    await cmd.subCommands[0].handler({
      option: "test",
      [constants.RootFolderNode.data.name as string]: "testProjectFolder",
    });

    expect(logs.length).equals(1);
    expect(logs[0]).includes("test: abc");

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("only prints specific project config that needs decryption when running 'config get test' in a project folder", async () => {
    await cmd.subCommands[0].handler({
      option: "fx-resource-bot.botPassword",
      [constants.RootFolderNode.data.name as string]: "testProjectFolder",
    });

    expect(logs.length).equals(1);
    expect(logs[0]).includes("fx-resource-bot.botPassword: decrypted");

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("fails to print when running 'config get xxx' in a non-project folder", async () => {
    try {
      await cmd.subCommands[0].handler({
        option: "fx-resource-bot.botPassword",
      });
    } catch (e) {
      expect(logs.length).equals(2);
      expect(logs[0]).equals(
        "You can change to teamsfx project folder or use --folder to specify."
      );
      expect(logs[1]).equals(
        "[TeamsfxCLI.NonTeamsFxProjectFolder]: Current folder is not a TeamsFx project folder."
      );

      expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NonTeamsFxProjectFolder");
    }
  });
});

describe("Config Set Command Check", () => {
  const cmd = new Config();
  const sandbox = sinon.createSandbox();
  let telemetryEvents: string[] = [];
  let logs: string[] = [];
  let encrypted: string[] = [];
  let secretFile: dotenv.DotenvParseOutput;
  const config = {
    telemetry: "on",
    envCheckerValidateDotnetSdk: "true",
  };

  before(() => {
    sandbox.stub(CliTelemetry, "sendTelemetryEvent").callsFake((eventName: string) => {
      telemetryEvents.push(eventName);
    });
    sandbox
      .stub(CliTelemetry, "sendTelemetryErrorEvent")
      .callsFake((eventName: string, error: FxError) => {
        telemetryEvents.push(eventName);
      });
    sandbox.stub(yargs, "exit").callsFake((code: number, err: Error) => {
      throw err;
    });
    sandbox
      .stub<any, any>(FxCore.prototype, "encrypt")
      .callsFake((ciphertext: string, inputs: Inputs) => {
        encrypted.push(ciphertext);
        return ok("encrypted");
      });
    sandbox
      .stub(UserSettings, "setConfigSync")
      .callsFake((option: { [key: string]: string }): Result<null, FxError> => {
        if (option.telemetry) {
          config.telemetry = option.telemetry;
        }
        return ok(null);
      });
    sandbox.stub(LogProvider, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      logs.push(message);
    });
    sandbox
      .stub(Utils, "readEnvJsonFile")
      .callsFake(async (rootFolder: string): Promise<Result<any, FxError>> => {
        if (rootFolder.endsWith("testProjectFolder")) {
          return ok({});
        }
        return err(NonTeamsFxProjectFolder());
      });
    sandbox
      .stub(Utils, "writeSecretToFile")
      .callsFake((secrets: dotenv.DotenvParseOutput, rootFolder: string): void => {
        secretFile = secrets;
      });
    sandbox
      .stub(Utils, "readProjectSecrets")
      .returns(Promise.resolve(ok(dotenv.parse("fx-resource-bot.botPassword=password\ntest=abc"))));
  });

  after(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    telemetryEvents = [];
    logs = [];
    encrypted = [];
  });

  it("has configured proper parameters", () => {
    expect(cmd.subCommands.length).equals(2);
    expect(cmd.subCommands[1].command).equals("set <option> <value>");
  });

  it("successfully sets global config when running 'config set xx xx' and not in a project folder", async () => {
    await cmd.subCommands[1].handler({
      option: "telemetry",
      value: "off",
    });

    expect(config.telemetry).equals("off");
    expect(logs.length).equals(2);
    expect(logs[0]).includes("Setting user config. You can add '-g' to specify global scope.");
    expect(logs[1]).includes("Successfully configured user setting telemetry.");

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigSet]);
  });

  it("only sets global config when running 'config set xx xx --global' in a project folder", async () => {
    await cmd.subCommands[1].handler({
      global: true,
      option: "telemetry",
      value: "off",
      [constants.RootFolderNode.data.name as string]: "testProjectFolder",
    });

    expect(config.telemetry).equals("off");
    expect(logs.length).equals(1);
    expect(logs[0]).includes("Successfully configured user setting telemetry.");

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigSet]);
  });

  it("fail to set global config when running 'config set test off' and not in a project folder", async () => {
    try {
      await cmd.subCommands[1].handler({
        option: "test",
        value: "off",
      });
    } catch (e) {
      expect(logs.length).equals(2);
      expect(logs[0]).includes(
        "You can change to teamsfx project folder or use --folder to specify."
      );
      expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigSet]);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("NonTeamsFxProjectFolder");
    }
  });

  it("fail to set global config when running 'config set test off -g' and not in a project folder", async () => {
    await cmd.subCommands[1].handler({
      global: true,
      option: "test",
      value: "off",
    });

    expect(logs.length).equals(1);
    expect(logs[0]).includes("No user setting test.");
    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigSet]);
  });

  it("successfully set non-secret project config when running 'config set test off' in a project folder", async () => {
    await cmd.subCommands[1].handler({
      option: "test",
      value: "off",
      [constants.RootFolderNode.data.name as string]: "testProjectFolder",
    });

    expect(logs.length).equals(1);
    expect(logs[0]).includes("Successfully configured project setting test.");
    expect(secretFile.test).equals("off");
    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigSet]);
  });

  it("successfully set secret project config when running 'config set fx-resource-bot.botPassword pwd' in a project folder", async () => {
    await cmd.subCommands[1].handler({
      option: "fx-resource-bot.botPassword",
      value: "pwd",
      [constants.RootFolderNode.data.name as string]: "testProjectFolder",
    });

    expect(logs.length).equals(1);
    expect(logs[0]).includes(
      "Successfully configured project setting fx-resource-bot.botPassword."
    );
    expect(secretFile["fx-resource-bot.botPassword"]).equals("encrypted");
    expect(encrypted).deep.equals(["pwd"]);

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigSet]);
  });

  it("fail to set project config when running 'config set xx off' and in a project folder", async () => {
    try {
      await cmd.subCommands[1].handler({
        option: "xx",
        value: "off",
        [constants.RootFolderNode.data.name as string]: "testProjectFolder",
      });
    } catch (e) {
      expect(logs.length).equals(1);
      expect(logs[0]).includes(
        "[TeamsfxCLI.ConfigNameNotFound]: Config xx is not found in project."
      );
      expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigSet]);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("ConfigNameNotFound");
    }
  });
});
