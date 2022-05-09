// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  FunctionAction,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettingsV3,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import { cloneDeep } from "lodash";
import "mocha";
import * as os from "os";
import * as path from "path";
import sinon from "sinon";
import { createV2Context, setTools } from "../../src";
import { executeAction, getAction, planAction } from "../../src/component/workflow";
import { deleteFolder, MockTools, randomAppName } from "./utils";
import fs from "fs-extra";
import { getProjectSettingsPath } from "../../src/core/middleware/projectSettingsLoader";
import "../../src/component/core";
import { Container } from "typedi";
import { BotCodeProvider } from "../../src/component/botCode";
import * as templateAction from "../../src/common/template-utils/templatesActions";

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
  let appName = randomAppName();
  let projectPath = path.resolve(os.tmpdir(), appName);
  beforeEach(() => {
    sandbox.restore();
    setTools(tools);
  });

  afterEach(() => {
    sandbox.restore();
    console.log(projectPath);
    // deleteFolder(projectPath);
  });
  it("fx.init + fx.addBot + fx.addSql", async () => {
    projectPath = path.join(os.homedir(), "TeamsApps", appName);
    const context = createV2Context({} as ProjectSettingsV3) as ContextV3;
    // fx.init
    {
      appName = `unittest${randomAppName()}`;
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
    }
    // fx.addBot
    {
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
    }
    // addSql
    {
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
    }
  });
});
