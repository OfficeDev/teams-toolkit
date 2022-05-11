// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  InputsWithProjectPath,
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
import { executeAction, getAction, planAction } from "../../src/component/workflow";
import { getProjectSettingsPath } from "../../src/core/middleware/projectSettingsLoader";
import { MockTools, randomAppName } from "./utils";

async function runAction(
  action: Action,
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<void> {
  console.log(`------------------------run action: ${action.name} start!------------------------`);
  await planAction(action, context, cloneDeep(inputs));
  await executeAction(action, context, inputs);
  await fs.writeFile(
    getProjectSettingsPath(inputs.projectPath),
    JSON.stringify(context.projectSetting, undefined, 4)
  );
  console.log(`------------------------run action: ${action.name} finish!------------------------`);
}

describe("Workflow test for v3", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  let context: ContextV3;
  beforeEach(() => {
    sandbox.restore();
    setTools(tools);
  });

  afterEach(() => {
    sandbox.restore();
    console.log(projectPath);
  });

  it("fx.init", async () => {
    context = createV2Context({} as ProjectSettingsV3) as ContextV3;
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      "app-name": appName,
    };
    const action = await getAction("fx.init", context, inputs);
    assert.isDefined(action);
    if (action) {
      await runAction(action, context, inputs);
    }
    assert.equal(context.projectSetting.appName, appName);
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
      hosting: "azure-web-app",
      folder: "bot",
      scenario: "default",
      language: "typescript",
    };
    sandbox.stub(templateAction, "scaffoldFromTemplates").resolves();
    const action = await getAction("fx.addBot", context, inputs);
    assert.isDefined(action);
    if (action) {
      await runAction(action, context, inputs);
    }
    assert.deepEqual(context.projectSetting.components, [
      {
        name: "teams-bot",
        hosting: "azure-web-app",
        folder: "bot",
      },
      {
        name: "azure-web-app",
        connections: ["teams-bot"],
      },
      {
        name: "bot-service",
        provision: true,
      },
      {
        name: "bot-code",
        hosting: "azure-web-app",
        folder: "bot",
        scenario: "default",
        language: "typescript",
        build: true,
      },
    ]);
  });

  it("fx.addSql", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
    };
    const action = await getAction("fx.addSql", context, inputs);
    assert.isDefined(action);
    if (action) {
      await runAction(action, context, inputs);
    }
    assert.deepEqual(context.projectSetting.components, [
      {
        name: "teams-bot",
        hosting: "azure-web-app",
        folder: "bot",
      },
      {
        name: "azure-web-app",
        connections: ["teams-bot", "azure-sql"],
      },
      {
        name: "bot-service",
        provision: true,
      },
      {
        name: "bot-code",
        hosting: "azure-web-app",
        folder: "bot",
        scenario: "default",
        language: "typescript",
        build: true,
      },
      {
        name: "azure-sql",
        provision: true,
      },
    ]);
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
