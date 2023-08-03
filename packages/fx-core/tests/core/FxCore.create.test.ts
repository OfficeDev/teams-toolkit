// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, Inputs, ok, Platform, UserError } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as os from "os";
import sinon from "sinon";
import { AppDefinition, FxCore } from "../../src";
import { coordinator } from "../../src/component/coordinator";
import { setTools } from "../../src/core/globalVars";
import { CapabilityOptions, ProjectTypeOptions, ScratchOptions } from "../../src/question/create";
import { QuestionNames } from "../../src/question/questionNames";
import { MockTools, randomAppName } from "./utils";

describe("FxCore.createProject", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  beforeEach(() => {});
  afterEach(() => {
    sandbox.restore();
  });
  it("happy path", async () => {
    sandbox.stub(coordinator, "create").resolves(ok({ projectPath: "" }));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
      [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTab().id,
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
