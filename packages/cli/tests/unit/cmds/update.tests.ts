// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import yargs, { Options } from "yargs";
import { err, FxError, ok, UserError, Tools } from "@microsoft/teamsfx-api";
import { FxCore, envUtil } from "@microsoft/teamsfx-core";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import Update, { UpdateAadApp, UpdateTeamsApp } from "../../../src/cmds/update";
import { expect } from "chai";
import CLIUIInstance from "../../../src/userInteraction";
import * as activate from "../../../src/activate";
describe("Update Aad Manifest Command Tests", function () {
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
  it("should pass builder check -- aad", () => {
    const cmd = new UpdateAadApp();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["aad-app"]);
  });
  it("Run command failed without env", async () => {
    sandbox.stub(FxCore.prototype, "deployAadManifest").resolves(ok(""));
    const cmd = new Update();
    const updateAadManifest = cmd.subCommands.find((cmd) => cmd.commandHead === "aad-app");
    const args = {
      folder: "fake_test_aaa",
      "manifest-file-path": "./aad.manifest.template.json",
      interactive: "false",
    };
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as Tools)));
    CLIUIInstance.interactive = false;
    const res = await updateAadManifest!.runCommand(args);
    expect(res.isErr()).to.be.true;
    if (res.isErr()) {
      expect(res.error.message).equal("The --env argument is not specified");
    }
  });

  it("Run command success -- aad", async () => {
    sandbox.stub(FxCore.prototype, "deployAadManifest").resolves(ok(""));
    const cmd = new Update();
    const updateAadManifest = cmd.subCommands.find((cmd) => cmd.commandHead === "aad-app");
    const args = {
      folder: "fake_test",
      env: "dev",
      "manifest-file-path": "./aad.manifest.template.json",
    };
    await updateAadManifest!.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateAadAppStart,
      TelemetryEvent.UpdateAadApp,
    ]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
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
    try {
      await updateAadManifest!.handler(args);
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.UpdateAadAppStart,
        TelemetryEvent.UpdateAadApp,
      ]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("Fake_Err_name");
      expect(e.message).equals("Fake_Err_msg");
    }
  });
});

describe("Update Teams app manifest Command Tests", function () {
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
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
  });
  it("should pass builder check", () => {
    const cmd = new UpdateTeamsApp();
    yargs.command(cmd.command, cmd.description, cmd.builder.bind(cmd), cmd.handler.bind(cmd));
    expect(registeredCommands).deep.equals(["teams-app"]);
  });

  it("Run command success", async () => {
    sandbox.stub(FxCore.prototype, "deployTeamsManifest").resolves(ok(""));
    const cmd = new Update();
    const updateTeamsAppManifest = cmd.subCommands.find((cmd) => cmd.commandHead === "teams-app");
    const args = {
      folder: "fake_test",
      env: "dev",
      "manifest-file-path": "./appPackage/manifest.json",
    };
    await updateTeamsAppManifest!.handler(args);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.UpdateTeamsAppStart,
      TelemetryEvent.UpdateTeamsApp,
    ]);
    expect(telemetryEventStatus).equals(TelemetrySuccess.Yes);
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
    try {
      await updateTeamsAppManifes!.handler(args);
    } catch (e) {
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.UpdateTeamsAppStart,
        TelemetryEvent.UpdateTeamsApp,
      ]);
      expect(telemetryEventStatus).equals(TelemetrySuccess.No);
      expect(e).instanceOf(UserError);
      expect(e.name).equals("Fake_Err_name");
      expect(e.message).equals("Fake_Err_msg");
    }
  });
});
