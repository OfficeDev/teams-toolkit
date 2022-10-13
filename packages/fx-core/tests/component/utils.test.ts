// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { InputsWithProjectPath, Platform, v3, ok } from "@microsoft/teamsfx-api";
import { expect } from "chai";
import { convertContext } from "../../src/component/resource/aadApp/utils";
import {
  addFeatureNotify,
  createContextV3,
  newProjectSettingsV3,
  resetEnvInfoWhenSwitchM365,
  scaffoldRootReadme,
} from "../../src/component/utils";
import { BuiltInFeaturePluginNames } from "../../src/plugins/solution/fx-solution/v3/constants";
import { MockTools } from "../core/utils";
import sinon from "sinon";
import { deployUtils } from "../../src/component/deployUtils";
import { assert } from "chai";
import {
  FindFunctionAppError,
  PackDirectoryExistenceError,
  ResourceNotFoundError,
} from "../../src/component/error";
import { setTools } from "../../src/core/globalVars";
import { newEnvInfoV3 } from "../../src/core/environment";
import fs from "fs-extra";
import { MyTokenCredential } from "../plugins/solution/util";
import { expandEnvironmentVariable } from "../../src/component/utils/common";
import mockedEnv, { RestoreFn } from "mocked-env";

describe("resetEnvInfoWhenSwitchM365", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  afterEach(() => {
    sandbox.restore();
  });

  it("clear keys and apim", () => {
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.aad]: {},
        [BuiltInFeaturePluginNames.appStudio]: {},
        [BuiltInFeaturePluginNames.apim]: {
          apimClientAADObjectId: "mockId",
          apimClientAADClientSecret: "mockSecret",
        },
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };

    resetEnvInfoWhenSwitchM365(envInfo);

    const expected = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.apim]: {},
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };
    expect(envInfo).to.eql(expected);
  });

  it("clear bot id", () => {
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.appStudio]: {},
        [BuiltInFeaturePluginNames.bot]: {
          resourceId: "mockResourceId",
          botId: "mockBotId",
          random: "random",
        },
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };

    resetEnvInfoWhenSwitchM365(envInfo);

    const expected = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.bot]: {
          random: "random",
        },
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };
    expect(envInfo).to.eql(expected);
  });

  it("convertContext", () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const envInfo = newEnvInfoV3();
    const context = createContextV3();
    context.envInfo = envInfo;
    const ctx = convertContext(context, inputs);
    expect(ctx !== undefined).to.eql(true);
  });
  it("addFeatureNotify", () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    addFeatureNotify(inputs, context.userInteraction, "Resource", ["sql", "apim"]);
    addFeatureNotify(inputs, context.userInteraction, "Capability", ["Tab"]);
    expect(true).to.eql(true);
  });

  it("checkDeployAzureSubscription case 1", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();

    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionName: "mockSubName",
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
    });
    const envInfo = newEnvInfoV3();
    const res = await deployUtils.checkDeployAzureSubscription(
      context,
      envInfo,
      tools.tokenProvider.azureAccountProvider
    );
    assert.isTrue(res.isOk());
  });

  it("checkDeployAzureSubscription case 2", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
      .resolves(undefined);
    const envInfo = newEnvInfoV3();
    const res = await deployUtils.checkDeployAzureSubscription(
      context,
      envInfo,
      tools.tokenProvider.azureAccountProvider
    );
    assert.isTrue(res.isErr());
  });

  it("checkDeployAzureSubscription case 3", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
      .resolves(undefined);
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(undefined);
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "listSubscriptions").resolves([
      {
        subscriptionName: "mockSubName",
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
      },
    ]);
    const envInfo = newEnvInfoV3();
    envInfo.state.solution.subscriptionId = "mockSubId";
    const res = await deployUtils.checkDeployAzureSubscription(
      context,
      envInfo,
      tools.tokenProvider.azureAccountProvider
    );
    assert.isTrue(res.isOk());
  });

  it("checkDeployAzureSubscription case 3", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
      .resolves(undefined);
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(undefined);
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "listSubscriptions").resolves([
      {
        subscriptionName: "mockSubName",
        subscriptionId: "mockSubId2",
        tenantId: "mockTenantId",
      },
    ]);
    const envInfo = newEnvInfoV3();
    envInfo.state.solution.subscriptionId = "mockSubId";
    const res = await deployUtils.checkDeployAzureSubscription(
      context,
      envInfo,
      tools.tokenProvider.azureAccountProvider
    );
    assert.isTrue(res.isErr());
  });

  it("askForDeployConsent", async () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    sandbox.stub(tools.ui, "showMessage").resolves(ok("Deploy"));
    const envInfo = newEnvInfoV3();
    envInfo.state.solution.subscriptionId = "mockSubId";
    const res = await deployUtils.askForDeployConsent(
      context,
      tools.tokenProvider.azureAccountProvider,
      envInfo
    );
    assert.isTrue(res.isErr());
  });
  it("errors", async () => {
    const error1 = new PackDirectoryExistenceError("FE");
    assert.isDefined(error1);
    const error2 = new ResourceNotFoundError("test", "");
    assert.isDefined(error2);
    const error3 = new FindFunctionAppError("FE");
    assert.isDefined(error3);
  });
  it("scaffoldRootReadme", async () => {
    sandbox.stub(fs, "pathExists").onFirstCall().resolves(true).onSecondCall().resolves(false);
    sandbox.stub(fs, "copy").resolves();
    const projectSettings = newProjectSettingsV3();
    projectSettings.components = [
      {
        name: "teams-tab",
      },
      {
        name: "teams-bot",
      },
    ];
    await scaffoldRootReadme(projectSettings, ".");
  });
});

describe("expandEnvironmentVariable", () => {
  const template = "ENV_A value:${{ENV_A}}" + "ENV_B value:${{ENV_B}}";

  let envRestore: RestoreFn | undefined;

  afterEach(() => {
    if (envRestore) {
      envRestore();
      envRestore = undefined;
    }
  });

  it("should expand all environment variables", () => {
    envRestore = mockedEnv({
      ENV_A: "A",
      ENV_B: "B",
    });

    const result = expandEnvironmentVariable(template);

    expect(result).to.equal("ENV_A value:A" + "ENV_B value:B");
  });

  it("should not expand placeholder when specified environment variable not exist", () => {
    envRestore = mockedEnv({
      ENV_A: "A",
    });

    const result = expandEnvironmentVariable(template);

    expect(result).to.equal("ENV_A value:A" + "ENV_B value:${{ENV_B}}");
  });

  it("should not modify original string", () => {
    envRestore = mockedEnv({
      ENV_A: "A",
      ENV_B: "B",
    });

    expandEnvironmentVariable(template);

    expect(template).to.equal("ENV_A value:${{ENV_A}}" + "ENV_B value:${{ENV_B}}");
  });

  it("should do nothing with non valid placeholder", () => {
    const template = "placeholder:${{}}";

    const result = expandEnvironmentVariable(template);

    expect(result).to.equal("placeholder:${{}}");
  });

  it("should allow leading and trailing whitespaces in environment variable name", () => {
    const template = "placeholder: ${{ ENV_A }}";

    envRestore = mockedEnv({
      ENV_A: "A",
    });

    const result = expandEnvironmentVariable(template);

    expect(result).to.equal("placeholder: A");
  });
});
