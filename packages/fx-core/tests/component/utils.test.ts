import { InputsWithProjectPath, Platform, v3, ok } from "@microsoft/teamsfx-api";
import { expect } from "chai";
import { newEnvInfoV3, setTools } from "../../src";
import { convertContext } from "../../src/component/resource/aadApp/utils";
import {
  addFeatureNotify,
  createContextV3,
  resetEnvInfoWhenSwitchM365,
} from "../../src/component/utils";
import { BuiltInFeaturePluginNames } from "../../src/plugins/solution/fx-solution/v3/constants";
import { MockTools } from "../core/utils";
import sinon from "sinon";
import { deployUtils } from "../../src/component/deployUtils";
import { assert } from "chai";
import { TestHelper } from "../plugins/resource/frontend/helper";
import { MyTokenCredential } from "../plugins/resource/bot/unit/utils";
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
});
