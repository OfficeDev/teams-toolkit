import { err, ok, Platform, UserError, v2 } from "@microsoft/teamsfx-api";
import chai from "chai";
import * as sinon from "sinon";
import { ComponentNames } from "../../src/component/constants";
import { provisionUtils } from "../../src/component/provisionUtils";
import { createContextV3 } from "../../src/component/utils";
import { SolutionError } from "../../src/plugins/solution/fx-solution/constants";
import { resourceGroupHelper } from "../../src/plugins/solution/fx-solution/utils/ResourceGroupHelper";
import {
  MockAzureAccountProvider,
  MockM365TokenProvider,
  MockUserInteraction,
} from "../core/utils";
import { TestHelper } from "../plugins/resource/frontend/helper";

const expect = chai.expect;

describe("preProvision", () => {
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(context.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(context.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(context.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
        .stub(context.tokenProvider.azureAccountProvider, "getAccountCredentialAsync")
        .resolves(TestHelper.fakeCredential);
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
});
