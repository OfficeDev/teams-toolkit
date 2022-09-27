// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { InputsWithProjectPath, Platform } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { Container } from "typedi";
import { ExistingTabOptionItem } from "../../src/plugins/solution/fx-solution/question";
import "../../src/component/core";
import { TeamsfxCore } from "../../src/component/core";
import "../../src/component/feature/bot/bot";
import "../../src/component/feature/sql";
import "../../src/component/resource/botService/botService";
import { createContextV3 } from "../../src/component/utils";
import { setTools } from "../../src/core/globalVars";
import { CoreQuestionNames } from "../../src/core/question";
import { deleteFolder, MockTools, randomAppName } from "../core/utils";
describe("Existing Tab test for v3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const context = createContextV3();
  const fx = Container.get<TeamsfxCore>("fx");
  let mockedEnvRestore: RestoreFn;
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_INIT_APP: "true" });
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  after(async () => {
    deleteFolder(projectPath);
  });

  it("create existing app", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      "app-name": appName,
      folder: path.join(os.homedir(), "TeamsApps"),
      capabilities: ExistingTabOptionItem.id,
      [CoreQuestionNames.ExistingTabEndpoint]: "https://localhost:3000",
      scratch: "yes",
    };
    const res = await fx.create(context, inputs);
    assert.isTrue(res.isOk());
    assert.equal(context.projectSetting!.appName, appName);
    assert.deepEqual(context.projectSetting.components, []);
  });
});
