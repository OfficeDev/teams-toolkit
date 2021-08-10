// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import {
  err,
  FxError,
  Result,
  ok,
  Inputs,
  Platform,
  Stage,
  SolutionContext,
  QTreeNode,
  Func,
  InputTextConfig,
  InputTextResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleSelectConfig,
  SingleSelectResult,
  OptionItem,
  traverse,
  Plugin,
  ProjectSettings,
} from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import sinon from "sinon";
import { Container } from "typedi";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import { ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import { ResourcePluginAdapter } from "../../../../../src/plugins/resource/utils4v2";
import { FrontendPluginV2 } from "../../../../../src/plugins/resource/frontend/v2/index";
import "reflect-metadata";
import "../../../../../src/index";
import { MockTools, randomAppName } from "../../../../core/utils";
import * as uuid from "uuid";
import { TabLanguage } from "../../../../../src/plugins/resource/frontend/resources/templateInfo";

describe("Frontend hosting V2", () => {
  const sandbox = sinon.createSandbox();

  const tools = new MockTools();
  // const ui = tools.ui;
  // let appName = randomAppName();

  beforeEach(() => {
    // sandbox.stub<any, any>(defaultSolutionLoader, "loadSolution").resolves(mockSolution);
    // sandbox.stub<any, any>(defaultSolutionLoader, "loadGlobalSolutions").resolves([mockSolution]);
  });

  afterEach(async () => {
    sandbox.restore();
    // await fs.rmdir(projectPath, { recursive: true });
  });

  it("Check plugin name and displayName", async () => {
    const pluginV1 = Container.get<Plugin>(ResourcePlugins.FrontendPlugin);
    const pluginV2 = Container.get<FrontendPluginV2>(ResourcePluginsV2.FrontendPlugin);
    assert.equal(pluginV1.name, pluginV2.name);
    assert.equal(pluginV1.displayName, pluginV2.displayName);
    assert.isTrue(pluginV1 === pluginV2.plugin);
  });

  it("Scaffold - happy path", async () => {
    /**
     * frontend scaffold depends on:
     *  ctx.projectSettings.solutionSettings.activeResourcePlugins
     *  ctx.projectSettings.programmingLanguage
     *  ctx.root (inputs.projectPath)
     */

    const pluginV2 = Container.get<FrontendPluginV2>(ResourcePluginsV2.FrontendPlugin);
    const appName = randomAppName();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: path.resolve(os.tmpdir(), appName),
    };
    const projectSettings: ProjectSettings = {
      appName: appName,
      projectId: uuid.v4(),
      version: "2",
      programmingLanguage: TabLanguage.JavaScript,
      solutionSettings: {
        name: "solution",
        activeResourcePlugins: [pluginV2.name], // no function
      },
    };

    const context: Context = {
      userInteraction: tools.ui,
      logProvider: tools.logProvider,
      telemetryReporter: tools.telemetryReporter,
      cryptoProvider: tools.cryptoProvider,
      projectSetting: projectSettings,
    };

    const res = await pluginV2.scaffoldSourceCode(context, inputs);

    assert.isTrue(res.isOk());

    assert.isTrue(fs.pathExistsSync(path.join(inputs.projectPath, "tabs")));
    assert.isTrue(fs.pathExistsSync(path.join(inputs.projectPath, "tabs", "src")));
    assert.isTrue(fs.pathExistsSync(path.join(inputs.projectPath, "tabs", "package.json")));

    await fs.rmdir(inputs.projectPath, { recursive: true });
  });
});
