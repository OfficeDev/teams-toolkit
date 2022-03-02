// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, Platform, Stage } from "@microsoft/teamsfx-api";
import { ExistingTeamsAppType } from "@microsoft/teamsfx-api/build/types";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { FxCore, setTools } from "../../src";
import { CoreQuestionNames, ScratchOptionYesVSC } from "../../src/core/question";
import { deleteFolder, MockTools, randomAppName } from "./utils";
describe("Minimal app", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  let appName = randomAppName();
  const projectPath = path.resolve(os.tmpdir(), appName);
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    setTools(tools);
    mockedEnvRestore = mockedEnv({ TEAMSFX_APIV3: "false" });
  });
  afterEach(async () => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("create minimized project with existing Tab", async () => {
    appName = randomAppName();
    const newParam = { TEAMSFX_APIV3: "false" };
    mockedEnvRestore = mockedEnv(newParam);
    const core = new FxCore(tools);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      [CoreQuestionNames.AppName]: appName,
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      [CoreQuestionNames.Capabilities]: ["Tab"],
      stage: Stage.create,
      existingAppConfig: {
        isCreatedFromExistingApp: true,
        newAppTypes: [ExistingTeamsAppType.StaticTab],
      },
    };
    const createRes = await core.createProject(inputs);
    assert.isTrue(createRes.isOk());
    mockedEnvRestore();
    deleteFolder(inputs.projectPath);
  });
});
