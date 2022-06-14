// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import { AppStudioPlugin } from "./../../../../../src/plugins/resource/appstudio";
import { AppStudioPluginImpl } from "./../../../../../src/plugins/resource/appstudio/plugin";
import { AppStudioClient } from "./../../../../../src/plugins/resource/appstudio/appStudio";
import { AppDefinition } from "../../../../../src/plugins/resource/appstudio/interfaces/appDefinition";
import { ConfigMap, PluginContext, Platform } from "@microsoft/teamsfx-api";
import { getAzureProjectRoot } from "./../helper";
import { newEnvInfo } from "../../../../../src";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { mockTokenProviderM365 } from "./../../aad/helper";
import { v4 as uuid } from "uuid";

describe("Provision Teams app with Azure", () => {
  const sandbox = sinon.createSandbox();
  let plugin: AppStudioPlugin;
  let ctx: PluginContext;

  const appDef: AppDefinition = {
    appName: "my app",
    teamsAppId: "appId",
    userList: [
      {
        tenantId: uuid(),
        aadId: uuid(),
        displayName: "displayName",
        userPrincipalName: "principalName",
        isAdministrator: true,
      },
    ],
  };

  beforeEach(async () => {
    plugin = new AppStudioPlugin();
    ctx = {
      root: getAzureProjectRoot(),
      envInfo: newEnvInfo(),
      config: new ConfigMap(),
      m365TokenProvider: mockTokenProviderM365(),
      answers: { platform: Platform.VSCode },
      cryptoProvider: new LocalCrypto(""),
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Provision Bot only app", async () => {
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
        activeResourcePlugins: ["fx-resource-bot"],
      },
    };

    sandbox.stub(AppStudioClient, "createApp").resolves(appDef);

    const teamsAppId = await plugin.provision(ctx);
    chai.assert.isTrue(teamsAppId.isOk());
    if (teamsAppId.isOk()) {
      chai.assert.isNotEmpty(teamsAppId.value);
    }
  });

  it("Post provision Bot only app", async () => {
    ctx.projectSettings = {
      appName: "my app",
      projectId: uuid(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        capabilities: ["Bot"],
        activeResourcePlugins: ["fx-resource-bot"],
      },
    };

    sandbox.stub(AppStudioClient, "updateApp").resolves(appDef);
    sandbox.stub(AppStudioPluginImpl.prototype, "getConfigForCreatingManifest" as any).returns({
      tabEndpoint: "https://www.endpoint.com/",
      tabDomain: undefined,
      tabIndexPath: "/index",
      aadId: uuid(),
      botDomain: "botDomain",
      botId: uuid(),
      webApplicationInfoResource: "webApplicationInfoResource",
      teamsAppId: uuid(),
    });

    // TODO: why get capabilities via manifest
    const teamsAppId = await plugin.postProvision(ctx);
    console.log(teamsAppId);
    chai.assert.isTrue(teamsAppId.isOk());
  });
});
