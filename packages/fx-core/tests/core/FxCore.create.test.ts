// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, ok, Platform, Stage, UserError } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import fs from "fs-extra";
import { AppDefinition, FxCore } from "../../src";
import {
  CoreQuestionNames,
  ScratchOptionNoVSC,
  ScratchOptionYesVSC,
} from "../../src/core/question";
import { BotOptionItem, TabOptionItem, TabSPFxItem } from "../../src/component/constants";
import { deleteFolder, MockTools, randomAppName } from "./utils";
import { SPFXQuestionNames } from "../../src/component/generator/spfx/utils/questions";
import { setTools } from "../../src/core/globalVars";
import { environmentManager } from "../../src/core/environment";
import { Generator } from "../../src/component/generator/generator";
import {
  CapabilityOptions,
  ProjectTypeOptions,
  QuestionNames,
  ScratchOptions,
} from "../../src/question/create";
import { coordinator } from "../../src/component/coordinator";

describe("FxCore.createProject", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  beforeEach(() => {});
  afterEach(() => {
    sandbox.restore();
  });
  it("happy path", async () => {
    sandbox.stub(coordinator, "create").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
      [QuestionNames.Capabilities]: CapabilityOptions.tab().id,
      [QuestionNames.ProgrammingLanguage]: "javascript",
      [QuestionNames.Folder]: os.tmpdir(),
      [QuestionNames.AppName]: randomAppName(),
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isOk());
  });

  it("coordinator error", async () => {
    sandbox.stub(coordinator, "create").resolves(err(new UserError({})));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
      [QuestionNames.Capabilities]: CapabilityOptions.tab().id,
      [QuestionNames.ProgrammingLanguage]: "javascript",
      [QuestionNames.Folder]: os.tmpdir(),
      [QuestionNames.AppName]: randomAppName(),
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isErr());
  });

  it("TDP input error", async () => {
    const appDefinition: AppDefinition = {
      teamsAppId: "mock-id",
      appId: "mock-id",
      staticTabs: [
        {
          name: "tab1",
          entityId: "tab1",
          contentUrl: "mock-contentUrl",
          websiteUrl: "mock-websiteUrl",
          context: [],
          scopes: [],
        },
      ],
      bots: [
        {
          botId: "mock-bot-id",
          isNotificationOnly: false,
          needsChannelSelector: false,
          supportsCalling: false,
          supportsFiles: false,
          supportsVideo: false,
          scopes: [],
          teamCommands: [],
          groupChatCommands: [],
          personalCommands: [],
        },
      ],
      connectors: [
        {
          name: "connector1",
          configurationUrl: "https://test.com",
          scopes: [],
        },
      ],
    };
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
      [QuestionNames.Capabilities]: CapabilityOptions.tab().id,
      [QuestionNames.ProgrammingLanguage]: "javascript",
      [QuestionNames.Folder]: os.tmpdir(),
      [QuestionNames.AppName]: randomAppName(),
      teamsAppFromTdp: appDefinition,
    };
    const core = new FxCore(tools);
    const res = await core.createProject(inputs);
    assert.isTrue(res.isErr());
  });
});
