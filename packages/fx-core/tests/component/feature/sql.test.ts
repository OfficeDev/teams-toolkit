// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  InputsWithProjectPath,
  Platform,
  ProjectSettingsV3,
  TeamsAppManifest,
  UserError,
  ok,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { createSandbox } from "sinon";
import * as utils from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../core/utils";
import "../../../src/component/core";
import path from "path";
import Container from "typedi";
import * as os from "os";
import * as telemetry from "../../../src/core/telemetry";
import { Sql } from "../../../src/component/feature/sql";
import { cloneDeep } from "lodash";
import { ComponentNames } from "../../../src/component/constants";
import mockedEnv, { RestoreFn } from "mocked-env";

describe("sql feature", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const originContext = utils.createContextV3();
  const projectSetting: ProjectSettingsV3 = {
    appName: "",
    projectId: "",
    programmingLanguage: "typescript",
    components: [
      {
        name: "teams-tab",
        hosting: "azure-storage",
        deploy: true,
        provision: true,
        build: true,
        folder: "tabs",
      },
    ],
  };
  originContext.projectSetting = projectSetting;
  const manifest = {} as TeamsAppManifest;
  let restore: RestoreFn;
  beforeEach(() => {
    sandbox.stub(telemetry, "sendErrorTelemetryThenReturnError").returns(
      new UserError({
        name: "mock error",
        message: "mock error message",
        displayMessage: "error message",
        source: "mocked source",
      })
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("add sql with api setting", async () => {
    restore = mockedEnv({ TEAMSFX_V3: "false" });
    const context = cloneDeep(originContext);
    context.projectSetting.components.push({
      name: "teams-api",
    });
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };

    const component = Container.get<Sql>("sql");
    const res = await component.add(context, inputs);
    assert.isTrue(res.isOk());
    restore();
  });

  it("add sql without api setting", async () => {
    // const context = cloneDeep(originContext);
    // context.projectSetting.components.push({
    //   name: "teams-api",
    // });
    restore = mockedEnv({ TEAMSFX_V3: "false" });
    const apiComponent = Container.get(ComponentNames.TeamsApi) as any;
    sandbox.stub(apiComponent, "add").resolves(ok(undefined));
    const inputs: InputsWithProjectPath = {
      projectPath: projectPath,
      platform: Platform.VSCode,
      language: "typescript",
      "app-name": appName,
    };

    const component = Container.get<Sql>("sql");
    const res = await component.add(originContext, inputs);
    assert.isTrue(res.isOk());
    restore();
  });
});
