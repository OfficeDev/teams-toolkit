// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettingsV3,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { createV2Context, newEnvInfoV3, setTools } from "../../src";
import * as templateAction from "../../src/common/template-utils/templatesActions";
import "../../src/component/core";
import { executeAction, getAction, planAction, runAction } from "../../src/component/workflow";
import { getProjectSettingsPath } from "../../src/core/middleware/projectSettingsLoader";
import { MockTools, randomAppName } from "./utils";

describe("Workflow test for v3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  let context: ContextV3;
  beforeEach(() => {
    sandbox.restore();
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Confirm"));
    setTools(tools);
  });

  afterEach(() => {
    sandbox.restore();
    // console.log(projectPath);
  });

  it("fx.init", async () => {
    context = createV2Context({} as ProjectSettingsV3) as ContextV3;
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      "app-name": appName,
    };
    await runAction("fx.init", context, inputs);
    assert.equal(context.projectSetting!.appName, appName);
    assert.deepEqual(context.projectSetting.components, []);
    assert.isTrue(fs.pathExistsSync(getProjectSettingsPath(inputs.projectPath)));
    assert.isTrue(
      fs.pathExistsSync(
        path.join(inputs.projectPath, "templates", "appPackage", "manifest.template.json")
      )
    );
  });

  it("fx.addBot", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      feature: "Bot",
      language: "typescript",
    };
    sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
    const res = await runAction("fx.addBot", context, inputs);
    assert.isTrue(res.isOk());
  });

  it("fx.addSql", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const res = await runAction("fx.addSql", context, inputs);
    assert.isTrue(res.isOk());
  });

  // it("fx.provision", async () => {
  //   const inputs: InputsWithProjectPath = {
  //     projectPath: projectPath,
  //     platform: Platform.VSCode,
  //   };
  //   context.envInfo = newEnvInfoV3();
  //   context.tokenProvider = tools.tokenProvider;
  //   const action = await getAction("fx.provision", context, inputs);
  //   assert.isDefined(action);
  //   if (action) {
  //     await runAction(action, context, inputs);
  //   }
  //   console.log(context.envInfo.state);
  // });
});
