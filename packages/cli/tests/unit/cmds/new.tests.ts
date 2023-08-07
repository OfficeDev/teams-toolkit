// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, ok, UserError } from "@microsoft/teamsfx-api";
import { FxCore, sampleProvider, UserCancelError } from "@microsoft/teamsfx-core";
import fs from "fs-extra";
import "mocha";
import sinon from "sinon";
import yargs from "yargs";
import * as activate from "../../../src/activate";
import New from "../../../src/cmds/new";
import { RootFolderNode } from "../../../src/constants";
import { TelemetryEvent } from "../../../src/telemetry/cliTelemetryEvents";
import { expect, mockLogProvider, mockTelemetry, mockYargs } from "../utils";
import * as questionUtils from "../../../src/questionUtils";
import * as utils from "../../../src/utils";

describe("New Command Tests", function () {
  const sandbox = sinon.createSandbox();
  let options: string[] = [];
  let positionals: string[] = [];
  let telemetryEvents: string[] = [];
  let logs: string[] = [];

  beforeEach(() => {
    mockYargs(sandbox, options, positionals);
    mockTelemetry(sandbox, telemetryEvents);
    mockLogProvider(sandbox, logs);
    sandbox.stub(activate, "default").resolves(ok(new FxCore({} as any)));
    sandbox.stub(FxCore.prototype, "createProject").resolves(ok({ projectPath: "" }));
    sandbox.stub(FxCore.prototype, "createSampleProject").resolves(ok({ projectPath: "" }));
    sandbox.stub(questionUtils, "filterQTreeNode").resolves(RootFolderNode);
    sandbox.stub(utils, "flattenNodes").returns([RootFolderNode]);
    sandbox.stub(fs, "pathExistsSync").callsFake((filePath: string) => !filePath.includes("fake"));
    sandbox.stub(sampleProvider, "fetchSampleConfig").resolves();
  });

  afterEach(() => {
    sandbox.restore();
    options = [];
    positionals = [];
    telemetryEvents = [];
    logs = [];
  });

  it("Builder Check", async () => {
    sandbox.stub(FxCore.prototype, "getQuestions").resolves(ok(undefined));
    const cmd = new New();
    await cmd.builder(yargs);
    expect(options).includes(RootFolderNode.data.name, JSON.stringify(options));
  });

  it("Builder Check - error", async () => {
    const error = new UserCancelError();
    sandbox.stub(FxCore.prototype, "getQuestions").resolves(err(error));
    const cmd = new New();
    await expect(cmd.builder(yargs)).to.be.rejectedWith(error);
  });

  it("New Command Running Check", async () => {
    const cmd = new New();
    const result = await cmd.runCommand({});
    expect(result.isOk()).equals(true);
    expect(telemetryEvents).deep.equals([
      TelemetryEvent.CreateProjectStart,
      TelemetryEvent.CreateProject,
    ]);
  });

  describe("New Template Command Running Check", () => {
    const newCmd = new New();
    const newTemplateCmd = newCmd.subCommands[0];
    const sampleAppName = "todo-list-SPFx";

    it("Sub Command Check", () => {
      expect(newCmd.subCommands.length).equals(1);
      expect(newTemplateCmd).not.undefined;
    });

    it("Folder not exists", async () => {
      const result = await newTemplateCmd.runCommand({ folder: "fake" });
      expect(result.isErr()).equals(true);
      if (result.isErr()) {
        expect(result.error).instanceOf(UserError);
        expect(result.error.name).equals("FileNotFoundError");
      }
    });

    it("Folder exists", async function () {
      const result = await newTemplateCmd.runCommand({
        folder: "real",
        "template-name": sampleAppName.toLocaleLowerCase(),
      });
      expect(result.isOk()).equals(true);
      expect(telemetryEvents).deep.equals([
        TelemetryEvent.DownloadSampleStart,
        TelemetryEvent.DownloadSample,
      ]);
    });
  });

  it("New Template List Command Running Check", async () => {
    const newCmd = new New();
    const newTemplateCmd = newCmd.subCommands[0];
    const listCmd = (newTemplateCmd as any)["subCommands"][0];
    const result = await listCmd.runCommand({});
    expect(result.isOk()).equals(true);
    expect(logs.length).equals(3);
    expect(logs[1]).includes(JSON.stringify(await utils.getTemplates(), undefined, 4));
    expect(logs[2]).includes("teamsfx new template <sampleAppName>");
  });
});
