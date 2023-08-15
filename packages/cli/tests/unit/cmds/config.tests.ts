// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError, err, ok } from "@microsoft/teamsfx-api";
import "mocha";
import { RestoreFn } from "mocked-env";
import sinon from "sinon";
import yargs from "yargs";
import Config, { ConfigGet, ConfigSet } from "../../../src/cmds/config";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { UserSettings } from "../../../src/userSetttings";
import { expect, mockLogProvider, mockTelemetry, mockYargs } from "../utils";

describe("Config Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let positionals: string[] = [];
  let telemetryEvents: string[] = [];
  let logs: string[] = [];
  const mockedEnvRestore: RestoreFn = () => {};
  const config: { [key: string]: string } = {
    telemetry: "on",
  };

  beforeEach(() => {
    mockYargs(sandbox, options, positionals);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox, logs);
    sandbox.stub(UserSettings, "getConfigSync").returns(ok(config));
    sandbox.stub(UserSettings, "setConfigSync").callsFake((opt: { [key: string]: string }) => {
      config.telemetry = opt.telemetry;
      return ok(undefined);
    });
  });

  afterEach(() => {
    options = [];
    positionals = [];
    telemetryEvents = [];
    logs = [];
    config.telemetry = "on";
    mockedEnvRestore();
    sandbox.restore();
  });

  it("builder check", () => {
    const cmd = new Config();
    cmd.builder(yargs);
  });
  it("Config runCommand", () => {
    const cmd = new Config();
    cmd.runCommand({});
  });
  it("get - has configured proper parameters", () => {
    const cmd = new Config();
    expect(cmd.subCommands.length).equals(2);
    expect(cmd.subCommands[0].command).equals("get [option]");
  });

  it("get - prints all global config when running 'config get'", async () => {
    const cmd = new Config();
    const result = await cmd.subCommands[0].runCommand({});
    expect(result.isErr()).equals(false);

    expect(logs.length).equals(1);
    expect(logs[0]).includes(JSON.stringify(config, null, 2));

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("get - prints all global config when running 'config get test'", async () => {
    const cmd = new Config();
    const result = await cmd.subCommands[0].runCommand({
      option: "test",
    });
    expect(result.isErr()).equals(false);

    expect(logs.length).equals(1);
    expect(logs[0]).includes(JSON.stringify(config, null, 2));

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("get - only prints specific global config when running 'config get telemetry'", async () => {
    const cmd = new Config();
    const result = await cmd.subCommands[0].runCommand({
      option: "telemetry",
    });
    expect(result.isErr()).equals(false);

    expect(logs.length).equals(1);
    expect(logs[0]).includes(JSON.stringify(config.telemetry, null, 2));

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigGet]);
  });

  it("set - has configured proper parameters", () => {
    const cmd = new Config();
    expect(cmd.subCommands.length).equals(2);
    expect(cmd.subCommands[1].command).equals("set <option> <value>");
  });

  it("set - global config when running 'config set telemetry off'", async () => {
    const cmd = new Config();
    const result = await cmd.subCommands[1].runCommand({
      option: "telemetry",
      value: "off",
    });
    expect(result.isErr()).equals(false);

    expect(config.telemetry).equals("off");
    expect(logs.length).equals(1);
    expect(logs[0]).includes("Successfully configured user setting telemetry.");

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigSet]);
  });

  it("set - not global config when running 'config set test off'", async () => {
    const cmd = new Config();
    const result = await cmd.subCommands[1].runCommand({
      option: "test",
      value: "off",
    });
    expect(result.isErr()).equals(false);

    expect(config.telemetry).equals("on");
    expect(config["test"]).undefined;
    expect(logs.length).equals(1);
    expect(logs[0]).includes("No user setting test.");

    expect(telemetryEvents).deep.equals([TelemetryEvent.ConfigSet]);
  });
});

describe("ConfigGet", function () {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("configGet ", async () => {
    const cmd = new ConfigGet();
    sandbox.stub(cmd, "printGlobalConfig").returns(err(new UserError({})));
    const result = await cmd.runCommand({});
    expect(result.isErr()).equals(true);
  });
  it("configGet with option", async () => {
    const cmd = new ConfigGet();
    sandbox.stub(cmd, "printGlobalConfig").returns(err(new UserError({})));
    const result = await cmd.runCommand({ option: "test" });
    expect(result.isErr()).equals(true);
  });
});

describe("ConfigSet", function () {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("ConfigSet ", async () => {
    const cmd = new ConfigSet();
    sandbox.stub(cmd, "setGlobalConfig").returns(err(new UserError({})));
    const result = await cmd.runCommand({});
    expect(result.isErr()).equals(true);
  });
  it("ConfigSet with option", async () => {
    const cmd = new ConfigSet();
    sandbox.stub(cmd, "setGlobalConfig").returns(err(new UserError({})));
    const result = await cmd.runCommand({ option: "test", value: "test" });
    expect(result.isErr()).equals(true);
  });
});
