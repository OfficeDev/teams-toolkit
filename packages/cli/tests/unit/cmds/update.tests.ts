// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Tools, UserError, err, ok } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { expect } from "chai";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import Update, { UpdateAadApp, UpdateTeamsApp } from "../../../src/cmds/update";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import CLIUIInstance from "../../../src/userInteraction";
import { mockLogProvider, mockTelemetry, mockYargs } from "../utils";
import { MissingRequiredArgumentError, MissingRequiredOptionError } from "../../../src/error";

describe("Update Aad Manifest Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let telemetryEvents: string[] = [];

  beforeEach(() => {
    mockYargs(sandbox, options);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as Tools)));
  });

  afterEach(() => {
    sandbox.restore();
    options = [];
    telemetryEvents = [];
  });

  it("should pass builder check -- aad", () => {
    const cmd = new UpdateAadApp();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
  });

  it("Run command failed without env", async () => {
    sandbox.stub(FxCore.prototype, "deployAadManifest").resolves(ok(undefined));
    const cmd = new Update();
    const updateAadManifest = cmd.subCommands.find((cmd) => cmd.commandHead === "aad-app");
    const args = {
      folder: "fake_test_aaa",
      "manifest-file-path": "./aad.manifest.template.json",
      interactive: "false",
    };
    CLIUIInstance.interactive = false;
    const res = await updateAadManifest!.runCommand(args);
    expect(res.isErr()).to.be.true;
    if (res.isErr()) {
      expect(res.error instanceof MissingRequiredOptionError).to.be.true;
    }
  });

  it("Run command success -- aad", async () => {
    sandbox.stub(FxCore.prototype, "deployAadManifest").resolves(ok(undefined));
    const cmd = new Update();
    const updateAadManifest = cmd.subCommands.find((cmd) => cmd.commandHead === "aad-app");
    const args = {
      folder: "fake_test",
      env: "dev",
      "manifest-file-path": "./aad.manifest.template.json",
    };
    const result = await updateAadManifest!.runCommand(args);
    expect(result.isOk()).to.be.true;
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateAadAppStart,
      TelemetryEvent.UpdateAadApp,
    ]);
  });

  it("Run command with exception", async () => {
    sandbox
      .stub(FxCore.prototype, "deployAadManifest")
      .resolves(err(new UserError("Fake_Err", "Fake_Err_name", "Fake_Err_msg")));
    const cmd = new Update();
    const updateAadManifest = cmd.subCommands.find((cmd) => cmd.commandHead === "aad-app");
    const args = {
      folder: "fake_test",
      env: "dev",
      "manifest-file-path": "./aad.manifest.json",
    };
    const result = await updateAadManifest!.runCommand(args);
    expect(result.isErr()).to.be.true;
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateAadAppStart,
      TelemetryEvent.UpdateAadApp,
    ]);
    if (result.isErr()) {
      expect(result.error).instanceOf(UserError);
      expect(result.error.name).equals("Fake_Err_name");
      expect(result.error.message).equals("Fake_Err_msg");
    }
  });
});

describe("Update Teams app manifest Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let telemetryEvents: string[] = [];

  beforeEach(() => {
    mockYargs(sandbox, options);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as Tools)));
  });

  afterEach(() => {
    sandbox.restore();
    options = [];
    telemetryEvents = [];
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should pass builder check", () => {
    const cmd = new UpdateTeamsApp();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
  });

  it("Run command success", async () => {
    sandbox.stub(FxCore.prototype, "deployTeamsManifest").resolves(ok(undefined));
    const cmd = new Update();
    const updateTeamsAppManifest = cmd.subCommands.find((cmd) => cmd.commandHead === "teams-app");
    const args = {
      folder: "fake_test",
      env: "dev",
      "manifest-file-path": "./appPackage/manifest.json",
    };
    const result = await updateTeamsAppManifest!.runCommand(args);
    expect(result.isOk()).to.be.true;
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateTeamsAppStart,
      TelemetryEvent.UpdateTeamsApp,
    ]);
  });

  it("Run command with exception", async () => {
    sandbox
      .stub(FxCore.prototype, "deployTeamsManifest")
      .resolves(err(new UserError("Fake_Err", "Fake_Err_name", "Fake_Err_msg")));
    const cmd = new Update();
    const updateTeamsAppManifes = cmd.subCommands.find((cmd) => cmd.commandHead === "teams-app");
    const args = {
      folder: "fake_test",
      env: "dev",
      "manifest-file-path": "./appPackage/manifest.template.json",
    };
    const result = await updateTeamsAppManifes!.runCommand(args);
    expect(result.isErr()).to.be.true;
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateTeamsAppStart,
      TelemetryEvent.UpdateTeamsApp,
    ]);
    if (result.isErr()) {
      expect(result.error).instanceOf(UserError);
      expect(result.error.name).equals("Fake_Err_name");
      expect(result.error.message).equals("Fake_Err_msg");
    }
  });

  it("Update Teams app - Run command failed without env", async () => {
    sandbox.stub(FxCore.prototype, "deployTeamsManifest").resolves(ok(undefined));
    const cmd = new Update();
    const updateTeamsAppManifest = cmd.subCommands.find((cmd) => cmd.commandHead === "teams-app");
    const args = {
      folder: "fake_test",
      "manifest-file-path": "./appPackage/manifest.json",
    };
    const res = await updateTeamsAppManifest!.runCommand(args);
    expect(res.isErr()).to.be.true;
    if (res.isErr()) {
      expect(res.error instanceof MissingRequiredOptionError).to.be.true;
    }
  });
});
