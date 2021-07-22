// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import sinon from "sinon";
import yargs, { Options } from "yargs";

import { FxError, Inputs, LogLevel, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import New from "../../../src/cmds/new";
import CliTelemetry from "../../../src/telemetry/cliTelemetry";
import { RootFolderNode } from "../../../src/constants";
import HelpParamGenerator from "../../../src/helpParamGenerator";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import * as constants from "../../../src/constants";
import LogProvider from "../../../src/commonlib/log";
import {
  createFileIfNotExist,
  createFolderIfNotExist,
  deleteFolderIfExists,
  expect,
  getDirFiles,
  TestFolder,
} from "../utils";

describe("New Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let registeredCommands: string[] = [];
  let options: string[] = [];
  let positionals: string[] = [];
  let telemetryEvents: string[] = [];
  let logs: string[] = [];

  before(() => {
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
    sandbox.stub<any, any>(FxCore.prototype, "createProject").callsFake((inputs: Inputs) => {
      return ok("");
    });
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
  });

  it("Builder Check", () => {
    const cmd = new New();
    cmd.builder(yargs);
    expect(registeredCommands).deep.equals(
      ["template <template-name>", "list"],
      JSON.stringify(registeredCommands)
    );
    expect(options).includes("interactive", JSON.stringify(options));
    expect(options).includes(RootFolderNode.data.name, JSON.stringify(options));
    expect(positionals).deep.equals(["template-name"], JSON.stringify(positionals));
  });

  it("New Command Running Check", async () => {
    const cmd = new New();
    await cmd.handler({});
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.CreateProjectStart,
      TelemetryEvent.CreateProject,
    ]);
  });

  describe("New Template Command Running Check", () => {
    const cmd = new New();
    const sampleAppName = "todo-list-SPFx";

    it("Sub Command Check", () => {
      expect(cmd.subCommands.length).equals(1);
      expect(cmd.subCommands[0].command).equals("template <template-name>");
    });

    it("Input Wrong Folder Path", async () => {
      try {
        await cmd.subCommands[0].handler({ folder: "/unknownFolder" });
      } catch (e) {
        expect(e).instanceOf(UserError);
        expect(e.name).equals("NotFoundInputFolder");
      }
    });

    it("Folder not exists", async function () {
      this.timeout(5000);
      const folder = path.join(TestFolder, sampleAppName);
      deleteFolderIfExists(folder);
      await cmd.subCommands[0].handler({
        folder: TestFolder,
        "template-name": sampleAppName,
      });
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.DownloadSampleStart,
        TelemetryEvent.DownloadSample,
      ]);

      const files = getDirFiles(folder);
      expect(files.length).gt(5);
      expect(files).includes(".fx");
    });

    it("Folder exists", async () => {
      createFolderIfNotExist(path.join(TestFolder, sampleAppName));
      createFileIfNotExist(path.join(TestFolder, sampleAppName, "test.txt"));
      try {
        await cmd.subCommands[0].handler({
          folder: TestFolder,
          "template-name": sampleAppName,
        });
      } catch (e) {
        expect(e).instanceOf(UserError);
        expect(e.name).equals("ProjectFolderExist");
      }
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.DownloadSampleStart,
        TelemetryEvent.DownloadSample,
      ]);
    });
  });

  it("New Template List Command Running Check", async () => {
    const cmd = new New();
    const listCmd = (cmd.subCommands[0] as any)["subCommands"][0];
    await listCmd.handler({});
    expect(logs.length).equals(3);
    expect(logs[1]).includes(JSON.stringify(constants.templates, undefined, 4));
    expect(logs[2]).includes("teamsfx new template <sampleAppName>");
  });
});
