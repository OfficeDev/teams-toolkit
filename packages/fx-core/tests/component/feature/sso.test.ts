// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { createSandbox } from "sinon";
import * as utils from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools, randomAppName } from "../../core/utils";
import "../../../src/component/core";
import { canAddSso } from "../../../src/component/feature/sso";
describe("Tab Feature", () => {
  const sandbox = createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const appName = `unittest${randomAppName()}`;
  const context = utils.createContextV3();
  const basicProjectSetting: ProjectSettingsV3 = {
    appName: "",
    projectId: "",
    programmingLanguage: "typescript",
    components: [],
  };
  context.projectSetting = basicProjectSetting;
  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });

  it("shouldn't AddSso in tab-sso project", async () => {
    const projectSetting: ProjectSettingsV3 = {
      ...basicProjectSetting,
      components: [
        {
          name: "teams-tab",
          hosting: "azure-storage",
          deploy: true,
          provision: true,
          build: true,
          folder: "tabs",
          sso: true,
        },
        {
          name: "aad-app",
          provision: true,
          deploy: true,
        },
      ],
    };
    const res = await canAddSso(projectSetting);
    assert.isFalse(res);
  });

  it("shouldn't AddSso in me project", async () => {
    const projectSetting: ProjectSettingsV3 = {
      ...basicProjectSetting,
      components: [
        {
          name: "teams-bot",
          hosting: "azure-web-app",
          deploy: true,
          capabilities: ["message-extension"],
          build: true,
          folder: "bot",
        },
        {
          name: "aad-app",
          provision: true,
          deploy: true,
        },
      ],
    };
    const res = await canAddSso(projectSetting);
    assert.isFalse(res);
  });

  it("shouldn't AddSso in bot project with function", async () => {
    const projectSetting: ProjectSettingsV3 = {
      ...basicProjectSetting,
      components: [
        {
          name: "teams-bot",
          hosting: "azure-function",
          deploy: true,
          capabilities: ["message-extension"],
          build: true,
          folder: "bot",
        },
        {
          name: "aad-app",
          provision: true,
          deploy: true,
        },
      ],
    };
    const res = await canAddSso(projectSetting);
    assert.isFalse(res);
  });
});
