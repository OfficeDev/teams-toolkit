import { err, ok, Platform, SystemError, UserError, v2 } from "@microsoft/teamsfx-api";
import "mocha";
import chai from "chai";
import * as sinon from "sinon";
import { ComponentNames, SolutionError } from "../../src/component/constants";
import { provisionUtils } from "../../src/component/provisionUtils";
import { createContextV3 } from "../../src/component/utils";
import { resourceGroupHelper } from "../../src/component/utils/ResourceGroupHelper";
import {
  MockAzureAccountProvider,
  MockM365TokenProvider,
  MockTools,
  MockUserInteraction,
} from "../core/utils";
import { MockedTelemetryReporter, MyTokenCredential } from "../plugins/solution/util";
import { assert } from "console";
import { setTools } from "../../src/core/globalVars";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as backupFile from "../../src/component/utils/backupFiles";
import * as appSettingsUtils from "../../src/component/code/appSettingUtils";
import fs from "fs-extra";

const expect = chai.expect;

describe("provisionUtils", () => {
  const tools = new MockTools();
  setTools(tools);

  describe("checkProvisionSubscription", () => {
    const mocker = sinon.createSandbox();

    afterEach(() => {
      mocker.restore();
    });

    it("provision with CLI subscription succeeds", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {},
        state: { solution: {} },
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "cli-sub",
          tenantId: "mockTenantId",
        },
      ]);

      const res = await provisionUtils.checkProvisionSubscription(
        context,
        envInfo,
        azureAccountProvider,
        "cli-sub",
        "test",
        false
      );

      expect(res.isOk()).equal(true);
      if (res.isErr()) {
        console.log(res.error);
      }
      expect((envInfo.state.solution as any).subscriptionId).equal("cli-sub");
    });

    it("provision with CLI parameters error", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {},
        state: { solution: {} },
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "sub",
          tenantId: "mockTenantId",
        },
      ]);

      const res = await provisionUtils.checkProvisionSubscription(
        context,
        envInfo,
        azureAccountProvider,
        "cli-sub",
        "test",
        false
      );

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.name).equals(SolutionError.SubscriptionNotFound);
      }
    });

    it("provision with config error", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {
          azure: {
            subscriptionId: "mockSub",
          },
        },
        state: { solution: {} },
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "sub",
          tenantId: "mockTenantId",
        },
      ]);

      const res = await provisionUtils.checkProvisionSubscription(
        context,
        envInfo,
        azureAccountProvider,
        undefined,
        "test",
        false
      );

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.name).equals(SolutionError.SubscriptionNotFound);
      }
    });

    it("provision with config succeeds", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {
          azure: {
            subscriptionId: "mockSub",
          },
        },
        state: { solution: {} },
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "mockSub",
          tenantId: "mockTenantId",
        },
      ]);

      const res = await provisionUtils.checkProvisionSubscription(
        context,
        envInfo,
        azureAccountProvider,
        undefined,
        "test",
        false
      );

      expect(res.isOk()).equal(true);
      if (res.isErr()) {
        console.log(res.error);
      }
      expect((envInfo.state.solution as any).subscriptionId).equal("mockSub");
    });

    it("provision with resource group only from CLI succeeds", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {
          azure: {
            subscriptionId: "configSub",
          },
        },
        state: { solution: {} },
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "mockSub",
          tenantId: "mockTenantId",
        },
      ]);
      mocker.stub(azureAccountProvider, "getSelectedSubscription").resolves({
        subscriptionName: "mockSubName",
        subscriptionId: "mockSub",
        tenantId: "mockTenantId",
      });

      const res = await provisionUtils.checkProvisionSubscription(
        context,
        envInfo,
        azureAccountProvider,
        undefined,
        "test",
        true
      );

      expect(res.isOk()).equal(true);
      if (res.isErr()) {
        console.log(res.error);
      }
      expect((envInfo.state.solution as any).subscriptionId).equal("mockSub");
    });
  });

  describe("fillInAzureConfigs", () => {
    const mocker = sinon.createSandbox();

    afterEach(() => {
      mocker.restore();
    });

    it("provision with CLI parameters succeeds", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {},
        state: { solution: {} },
      };
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
        targetSubscriptionId: "cli-sub",
        targetResourceGroupName: "cli-rg",
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(
        ok({
          createNewResourceGroup: false,
          name: "cli-rg",
          location: "East US",
        })
      );
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "cli-sub",
          tenantId: "mockTenantId",
        },
      ]);
      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );

      if (res.isErr()) {
        console.log(res.error);
      }
      expect(res.isOk()).equal(true);
      expect((envInfo.state.solution as any).subscriptionId).equal("cli-sub");
      expect((envInfo.state.solution as any).resourceGroupName).equal("cli-rg");
    });

    it("provision with subscriptionId from CLI parameters succeeds", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {},
        state: { solution: { subscriptionId: "oldSubId", resourceGroupName: "oldRgName" } },
      };
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
        targetSubscriptionId: "cli-sub",
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "askResourceGroupInfo").resolves(
        ok({
          createNewResourceGroup: false,
          name: "newRg",
          location: "East US",
        })
      );
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "cli-sub",
          tenantId: "mockTenantId",
        },
      ]);
      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );

      if (res.isErr()) {
        console.log(res.error);
      }
      expect(res.isOk()).equal(true);
      expect((envInfo.state.solution as any).subscriptionId).equal("cli-sub");
      expect((envInfo.state.solution as any).resourceGroupName).equal("newRg");
    });

    it("provision with CLI parameters resource group not exist", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {},
        state: { solution: {} },
      };
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
        targetSubscriptionId: "cli-sub",
        targetResourceGroupName: "cli-rg",
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(ok(undefined));
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "cli-sub",
          tenantId: "mockTenantId",
        },
      ]);
      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.name).equal(SolutionError.ResourceGroupNotFound);
      }
    });

    it("provision with resource group name from config file succeeds", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {
          azure: {
            subscriptionId: "mockSub",
            resourceGroupName: "mockRg",
          },
        },
        state: { solution: {} },
      };
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(
        ok({
          createNewResourceGroup: false,
          name: "mockRg",
          location: "East US",
        })
      );
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "mockSub",
          tenantId: "mockTenantId",
        },
      ]);
      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );

      expect(res.isOk()).equal(true);
      expect((envInfo.state.solution as any).subscriptionId).equal("mockSub");
      expect((envInfo.state.solution as any).resourceGroupName).equal("mockRg");
    });

    it("provision with resource group name from config file not exist", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {
          azure: {
            subscriptionId: "mockSub",
            resourceGroupName: "mockRg",
          },
        },
        state: { solution: {} },
      };
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(ok(undefined));
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "mockSub",
          tenantId: "mockTenantId",
        },
      ]);
      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.name).equal(SolutionError.ResourceGroupNotFound);
      }
    });

    it("provision with resource group name from config file but missing subscription id", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {
          azure: {
            resourceGroupName: "mockRg",
          },
        },
        state: { solution: {} },
      };
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(ok(undefined));
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "mockSub",
          tenantId: "mockTenantId",
        },
      ]);
      mocker.stub(azureAccountProvider, "getSelectedSubscription").resolves({
        subscriptionName: "mockSubName",
        subscriptionId: "mockSub",
        tenantId: "mockTenantId",
      });
      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.name).equal(SolutionError.MissingSubscriptionIdInConfig);
      }
    });

    it("provision with state", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {},
        state: {
          solution: {
            subscriptionId: "mockSub",
            resourceGroupName: "mockRg",
            location: "East US",
          },
        },
      };
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "checkResourceGroupExistence").resolves(ok(true));
      mocker.stub(azureAccountProvider, "getSelectedSubscription").resolves({
        subscriptionName: "mockSubName",
        subscriptionId: "mockSub",
        tenantId: "mockTenantId",
      });
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "mockSub",
          tenantId: "mockTenantId",
        },
      ]);
      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );

      if (res.isErr()) {
        console.log(res.error);
      }
      expect(res.isOk()).equal(true);
      expect((envInfo.state.solution as any).subscriptionId).equal("mockSub");
      expect((envInfo.state.solution as any).resourceGroupName).equal("mockRg");
    });

    it("provision with CLI resource group only", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {
          azure: {
            subsciptionId: "not-exist-sub",
          },
        },
        state: {
          solution: {
            subscriptionId: "mockSub",
            resourceGroupName: "mockRg",
            location: "East US",
          },
        },
      };
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
        targetResourceGroupName: "cliRg",
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(
        ok({
          createNewResourceGroup: false,
          name: "cliRg",
          location: "East US",
        })
      );
      mocker.stub(azureAccountProvider, "getSelectedSubscription").resolves({
        subscriptionName: "mockSubName",
        subscriptionId: "mockSub",
        tenantId: "mockTenantId",
      });
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "mockSub",
          tenantId: "mockTenantId",
        },
      ]);
      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );

      if (res.isErr()) {
        console.log(res.error);
      }
      expect(res.isOk()).equal(true);
      expect((envInfo.state.solution as any).subscriptionId).equal("mockSub");
      expect((envInfo.state.solution as any).resourceGroupName).equal("cliRg");
    });

    it("provision with VS input", async () => {
      const context = createContextV3();
      const azureAccountProvider = new MockAzureAccountProvider();
      const envInfo = {
        envName: "test",
        config: {
          azure: {
            subscriptionId: "vsSub",
          },
        },
        state: {
          solution: {
            subscriptionId: "mockSub",
            resourceGroupName: "mockRg",
            location: "East US",
          },
        },
      };
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.VS,
        projectPath: "path",
        targetResourceGroupName: "cliRg",
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(
        ok({
          createNewResourceGroup: false,
          name: "cliRg",
          location: "East US",
        })
      );
      mocker.stub(azureAccountProvider, "getSelectedSubscription").resolves({
        subscriptionName: "mockSubName",
        subscriptionId: "mockSub",
        tenantId: "mockTenantId",
      });
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "mockSub",
          tenantId: "mockTenantId",
        },
        {
          subscriptionName: "mockVsSubName",
          subscriptionId: "vsSub",
          tenantId: "mockTenantId",
        },
      ]);
      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );

      if (res.isErr()) {
        console.log(res.error);
      }
      expect(res.isOk()).equal(true);
      expect((envInfo.state.solution as any).subscriptionId).equal("vsSub");
      expect((envInfo.state.solution as any).resourceGroupName).equal("cliRg");
    });
  });

  describe("preProvision", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("get m365 token error", async () => {
      const context = createContextV3();
      const envInfo = {
        envName: "test",
        config: {},
        state: { solution: {} },
      };
      context.envInfo = envInfo;
      context.tokenProvider = {
        azureAccountProvider: new MockAzureAccountProvider(),
        m365TokenProvider: new MockM365TokenProvider(),
      };
      sandbox
        .stub(context.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(err(new UserError("fakeError", "fakeName", "message", "message")));
      sandbox
        .stub(context.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
        targetSubscriptionId: "cli-sub",
        targetResourceGroupName: "cli-rg",
      };

      const res = await provisionUtils.preProvision(context, inputs);

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.userData.shouldSkipWriteEnvInfo).equal(true);
      }
    });

    it("create resource group error", async () => {
      const context = createContextV3();
      const envInfo = {
        envName: "test",
        config: {},
        state: { solution: {} },
      };
      context.envInfo = envInfo;
      context.projectSetting.components = [
        {
          name: ComponentNames.Function,
        },
      ];
      context.tokenProvider = {
        azureAccountProvider: new MockAzureAccountProvider(),
        m365TokenProvider: new MockM365TokenProvider(),
      };
      context.userInteraction = new MockUserInteraction();

      sandbox
        .stub(context.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(context.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockTid" }));
      sandbox
        .stub(context.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
      };
      sandbox.stub(context.tokenProvider.azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "mockSub",
          tenantId: "mockTenantId",
        },
      ]);
      sandbox.stub(context.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
        subscriptionName: "mockSubName",
        subscriptionId: "mockSub",
        tenantId: "mockTenantId",
      });
      sandbox.stub(resourceGroupHelper, "askResourceGroupInfo").resolves(
        ok({
          createNewResourceGroup: true,
          name: "cliRg",
          location: "East US",
        })
      );
      sandbox
        .stub(resourceGroupHelper, "createNewResourceGroup")
        .resolves(err(new UserError("fakeError", "fakeName", "message", "message")));
      sandbox.stub(context.userInteraction, "showMessage").resolves(ok("Provision"));

      const res = await provisionUtils.preProvision(context, inputs);

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.userData).equal(undefined);
      }
    });

    it("get consent error", async () => {
      const context = createContextV3();
      const envInfo = {
        envName: "test",
        config: {},
        state: {
          solution: {
            provisionSucceeded: true,
            teamsAppTenantId: "oldTid",
          },
          "app-manifest": {
            tenantId: "oldTid",
            teamsAppId: "mockTeamsAppId",
          },
        },
      };
      context.envInfo = envInfo;
      context.tokenProvider = {
        azureAccountProvider: new MockAzureAccountProvider(),
        m365TokenProvider: new MockM365TokenProvider(),
      };
      context.userInteraction = new MockUserInteraction();

      sandbox
        .stub(context.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      sandbox
        .stub(context.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(context.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockTid" }));
      sandbox
        .stub(context.userInteraction, "showMessage")
        .resolves(err(new UserError("errorSource", "Cancel", "Cancel", "Cancel")));
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
      };

      const res = await provisionUtils.preProvision(context, inputs);

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.userData.shouldSkipWriteEnvInfo).equal(true);
      }
    });

    it("check local debug tenant error", async () => {
      const context = createContextV3();
      const envInfo = {
        envName: "local",
        config: {},
        state: {
          solution: {
            provisionSucceeded: true,
            teamsAppTenantId: "oldTid",
          },
          "app-manifest": {
            tenantId: "oldTid",
            teamsAppId: "mockTeamsAppId",
          },
        },
      };
      context.envInfo = envInfo;
      context.tokenProvider = {
        azureAccountProvider: new MockAzureAccountProvider(),
        m365TokenProvider: new MockM365TokenProvider(),
      };

      sandbox
        .stub(context.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      sandbox
        .stub(context.tokenProvider.m365TokenProvider, "getAccessToken")
        .resolves(ok("fakeToken"));
      sandbox
        .stub(context.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ tid: "mockTid" }));
      const inputs: v2.InputsWithProjectPath = {
        platform: Platform.CLI,
        projectPath: "path",
      };

      const res = await provisionUtils.preProvision(context, inputs);

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.userData.shouldSkipWriteEnvInfo).equal(true);
      }
    });
  });

  describe("ensureSubscription", () => {
    const mocker = sinon.createSandbox();

    afterEach(() => {
      mocker.restore();
    });
    it("no givenSubscriptionId - fail to select", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "getSelectedSubscription").resolves(undefined);
      const res = await provisionUtils.ensureSubscription(azureAccountProvider);
      assert(res.isErr());
    });
    it("no givenSubscriptionId - success to select", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "getSelectedSubscription").resolves({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      });
      const res = await provisionUtils.ensureSubscription(azureAccountProvider);
      assert(res.isOk());
    });
    it("givenSubscriptionId - permission pass", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionId: "mockSubId",
          tenantId: "mockTenantId",
          subscriptionName: "mockSubName",
        },
      ]);
      const res = await provisionUtils.ensureSubscription(azureAccountProvider, "mockSubId");
      assert(res.isOk());
    });
    it("givenSubscriptionId - permission fail", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionId: "mockSubId2",
          tenantId: "mockTenantId",
          subscriptionName: "mockSubName",
        },
      ]);
      const res = await provisionUtils.ensureSubscription(azureAccountProvider, "mockSubId");
      assert(res.isOk());
    });
  });

  describe("ensureResourceGroup", () => {
    const mocker = sinon.createSandbox();
    afterEach(() => {
      mocker.restore();
    });
    it("fail: azure token undefined", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker.stub(azureAccountProvider, "getIdentityCredentialAsync").resolves(undefined);
      const res = await provisionUtils.ensureResourceGroup(azureAccountProvider, "mockSubId");
      assert(res.isErr());
    });
    it("fail: given invalid resource group 1", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(undefined);
      const res = await provisionUtils.ensureResourceGroup(azureAccountProvider, "mockSubId");
      assert(res.isErr());
    });
    it("fail: given invalid resource group 2", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker
        .stub(resourceGroupHelper, "getResourceGroupInfo")
        .resolves(err(new UserError({ source: "src", name: "TestError", message: "test" })));
      const res = await provisionUtils.ensureResourceGroup(
        azureAccountProvider,
        "mockSubId",
        "mockRG"
      );
      assert(res.isErr());
    });
    it("success: given valid resource group", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(
        ok({
          createNewResourceGroup: true,
          name: "test-rg",
          location: "East US",
        })
      );
      const res = await provisionUtils.ensureResourceGroup(
        azureAccountProvider,
        "mockSubId",
        "mockRG"
      );
      assert(res.isOk());
    });

    it("success: ask resource group", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "askResourceGroupInfoV3").resolves(
        ok({
          createNewResourceGroup: true,
          name: "test-rg",
          location: "East US",
        })
      );
      mocker.stub(resourceGroupHelper, "createNewResourceGroup").resolves(ok("mockRG"));
      const res = await provisionUtils.ensureResourceGroup(azureAccountProvider, "mockSubId");
      assert(res.isOk());
    });

    it("success: ask resource group", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(resourceGroupHelper, "askResourceGroupInfoV3").resolves(
        ok({
          createNewResourceGroup: true,
          name: "test-rg",
          location: "East US",
        })
      );
      mocker.stub(resourceGroupHelper, "createNewResourceGroup").resolves(ok("mockRG"));
      const res = await provisionUtils.ensureResourceGroup(azureAccountProvider, "mockSubId");
      assert(res.isOk());
    });
  });

  describe("handleWhenTenantSwitchedV3", () => {
    const mocker = sinon.createSandbox();
    let mockedEnvRestore: RestoreFn | undefined;

    afterEach(() => {
      mocker.restore();
      if (mockedEnvRestore) {
        mockedEnvRestore();
      }
    });

    it("get json object error", async () => {
      const m365TokenProvider = new MockM365TokenProvider();
      mocker
        .stub(m365TokenProvider, "getJsonObject")
        .resolves(err(new UserError("m365", "cancel", "msg", "msg")));

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "dev",
        "projectPath",
        false
      );
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.source).equal("m365");
      }
    });

    it("do nothing if no stored tenant id", async () => {
      const m365TokenProvider = new MockM365TokenProvider();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "dev",
        "projectPath",
        false
      );
      expect(res.isOk()).equal(true);
    });

    it("do nothing if tenant matches", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "tid",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "dev",
        "projectPath",
        false
      );
      expect(res.isOk()).equal(true);
    });

    it("do nothing if tenant matches and send telemetry", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "tid",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      const telemetryReporter = new MockedTelemetryReporter();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));
      const reporter = mocker.stub(telemetryReporter, "sendTelemetryEvent").resolves();

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "dev",
        "projectPath",
        false,
        telemetryReporter
      );
      expect(res.isOk()).equal(true);
      expect(reporter.calledOnce).equal(true);
    });

    it("backup if tenant switched", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old_tid",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      const telemetryReporter = new MockedTelemetryReporter();
      const reporter = mocker.stub(telemetryReporter, "sendTelemetryEvent").resolves();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));
      mocker.stub(fs, "pathExists").resolves(false);
      const backup = mocker.stub(backupFile, "backupV3Files").resolves(ok(undefined));

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "dev",
        "projectPath",
        false,
        telemetryReporter
      );
      expect(res.isOk()).equal(true);
      expect(backup.calledOnce).equal(true);
      expect(reporter.calledOnce).equal(true);
    });

    it("processing envs and backup if tenant switched", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old_tid",
        TEAMS_APP_ID: "old_teams_app_id",
        BOT_ID: "old_bot_id",
        AAD_APP_CLIENT_ID: "old_aad_app_client_id",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));
      const backup = mocker.stub(backupFile, "backupV3Files").resolves(ok(undefined));
      mocker.stub(fs, "pathExists").resolves(false);

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "dev",
        "projectPath",
        false
      );
      expect(res.isOk()).equal(true);
      expect(backup.calledOnce).equal(true);
    });

    it("processing envs and backup if tenant switched for CSharp project in local environment", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old_tid",
        TEAMS_APP_ID: "old_teams_app_id",
        BOT_ID: "old_bot_id",
        AAD_APP_CLIENT_ID: "old_aad_app_client_id",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));
      const appSettings = mocker
        .stub(appSettingsUtils, "resetAppSettingsDevelopment")
        .resolves(ok(undefined));
      const backup = mocker.stub(backupFile, "backupV3Files").resolves(ok(undefined));
      mocker.stub(fs, "pathExists").resolves(false);

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "local",
        "projectPath",
        true
      );
      expect(res.isOk()).equal(true);
      expect(backup.calledOnce).equal(true);
      expect(appSettings.calledOnce).equal(true);
    });

    it("processing envs and backup if tenant switched for CSharp project in non-local environment", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old_tid",
        TEAMS_APP_ID: "old_teams_app_id",
        BOT_ID: "old_bot_id",
        AAD_APP_CLIENT_ID: "old_aad_app_client_id",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));
      const appSettings = mocker
        .stub(appSettingsUtils, "resetAppSettingsDevelopment")
        .resolves(ok(undefined));
      const telemetryReporter = new MockedTelemetryReporter();
      const reporter = mocker.stub(telemetryReporter, "sendTelemetryEvent").resolves();
      const backup = mocker.stub(backupFile, "backupV3Files").resolves(ok(undefined));
      mocker.stub(fs, "pathExists").resolves(false);

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "dev",
        "projectPath",
        true,
        telemetryReporter
      );
      expect(res.isOk()).equal(true);
      expect(backup.calledOnce).equal(true);
      expect(appSettings.notCalled).equal(true);
      expect(reporter.calledOnce).equal(true);
    });

    it("backup error", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old_tid",
        AAD_APP_CLIENT_ID: "old_aad_app_client_id",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));
      const backup = mocker
        .stub(backupFile, "backupV3Files")
        .resolves(err(new SystemError("source", "error", "msg", "msg")));

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "dev",
        "projectPath",
        false
      );
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.name).equal("error");
      }
      expect(backup.calledOnce).equal(true);
    });

    it("handle app settings error", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old_tid",
        TEAMS_APP_ID: "old_teams_app_id",
        BOT_ID: "old_bot_id",
        AAD_APP_CLIENT_ID: "old_aad_app_client_id",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));
      const appSettings = mocker
        .stub(appSettingsUtils, "resetAppSettingsDevelopment")
        .resolves(err(new SystemError("source", "error", "msg", "msg")));
      const backup = mocker.stub(backupFile, "backupV3Files").resolves(ok(undefined));
      mocker.stub(fs, "pathExists").resolves(false);

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "local",
        "projectPath",
        true
      );
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.name).equal("error");
      }
      expect(backup.calledOnce).equal(true);
      expect(appSettings.calledOnce).equal(true);
    });

    it("error when local debug with notification store", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old_tid",
        TEAMS_APP_ID: "old_teams_app_id",
        BOT_ID: "old_bot_id",
        AAD_APP_CLIENT_ID: "old_aad_app_client_id",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));
      const appSettings = mocker
        .stub(appSettingsUtils, "resetAppSettingsDevelopment")
        .resolves(ok(undefined));
      const backup = mocker.stub(backupFile, "backupV3Files").resolves(ok(undefined));
      mocker.stub(fs, "pathExists").resolves(true);

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "local",
        "projectPath",
        true
      );
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error.name).equal(SolutionError.CannotLocalDebugInDifferentTenant);
      }
      expect(backup.notCalled).equal(true);
      expect(appSettings.notCalled).equal(true);
    });

    it("continue when provision with local notification store", async () => {
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old_tid",
        TEAMS_APP_ID: "old_teams_app_id",
        BOT_ID: "old_bot_id",
        AAD_APP_CLIENT_ID: "old_aad_app_client_id",
      });
      const m365TokenProvider = new MockM365TokenProvider();
      mocker.stub(m365TokenProvider, "getJsonObject").resolves(ok({ tid: "tid" }));
      const appSettings = mocker
        .stub(appSettingsUtils, "resetAppSettingsDevelopment")
        .resolves(ok(undefined));
      const backup = mocker.stub(backupFile, "backupV3Files").resolves(ok(undefined));
      mocker.stub(fs, "pathExists").resolves(true);

      const res = await provisionUtils.handleWhenTenantSwitchedV3(
        m365TokenProvider,
        "dev",
        "projectPath",
        true
      );
      expect(res.isOk()).equal(true);
      expect(backup.calledOnce).equal(true);
      expect(appSettings.notCalled).equal(true);
    });
  });
});
