import {
  err,
  ok,
  Platform,
  SubscriptionInfo,
  SystemError,
  UserError,
  v2,
} from "@microsoft/teamsfx-api";
import "mocha";
import chai from "chai";
import * as sinon from "sinon";
import { ComponentNames, SolutionError } from "../../src/component/constants";
import { M365TenantRes, provisionUtils } from "../../src/component/provisionUtils";
import { createContextV3 } from "../../src/component/utils";
import { resourceGroupHelper } from "../../src/component/utils/ResourceGroupHelper";
import {
  MockAzureAccountProvider,
  MockM365TokenProvider,
  MockTelemetryReporter,
  MockTools,
  MockUserInteraction,
} from "../core/utils";
import {
  MockedAzureAccountProvider,
  MockedUserInteraction,
  MyTokenCredential,
} from "../plugins/solution/util";
import { assert } from "console";
import { setTools } from "../../src/core/globalVars";
import mockedEnv, { RestoreFn } from "mocked-env";
import {
  InvalidAzureCredentialError,
  InvalidAzureSubscriptionError,
  ResourceGroupNotExistError,
  SelectSubscriptionError,
} from "../../src/error/azure";
import { getResourceManagementClientForArmDeployment } from "../../src/component/arm";
import { M365TenantIdNotFoundInTokenError, M365TokenJSONNotFoundError } from "../../src/error/m365";

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
    it("provision getSelectedSubscription failed case 1", async () => {
      const context = createContextV3();
      const envInfo = {
        envName: "test",
        config: {},
        state: { solution: {} },
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
        .resolves(undefined);
      const res = await provisionUtils.checkProvisionSubscription(
        context,
        envInfo,
        tools.tokenProvider.azureAccountProvider,
        undefined,
        "test",
        false
      );

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error instanceof SelectSubscriptionError).equal(true);
      }
    });
    it("provision getSelectedSubscription failed case 2", async () => {
      const context = createContextV3();
      const envInfo = {
        envName: "test",
        config: {},
        state: { solution: { subscriptionId: "sub-id-in-solution" } },
      };
      mocker.stub(context.logProvider, "log").resolves(true);
      mocker
        .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(tools.tokenProvider.azureAccountProvider, "listSubscriptions").resolves([
        {
          subscriptionName: "mockSubName",
          subscriptionId: "cli-sub-1",
          tenantId: "mockTenantId",
        },
      ]);
      mocker
        .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
        .resolves(undefined);
      const res = await provisionUtils.checkProvisionSubscription(
        context,
        envInfo,
        tools.tokenProvider.azureAccountProvider,
        undefined,
        "test",
        false
      );

      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error instanceof InvalidAzureSubscriptionError).equal(true);
      }
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
        expect(res.error instanceof InvalidAzureSubscriptionError).equal(true);
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
        expect(res.error instanceof InvalidAzureSubscriptionError).equal(true);
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
    it("fail with InvalidAzureCredentialError", async () => {
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
      mocker.stub(azureAccountProvider, "getIdentityCredentialAsync").resolves(undefined);
      mocker.stub(provisionUtils, "checkProvisionSubscription").resolves(
        ok({
          hasSwitchedSubscription: false,
        })
      );

      const tokenProvider = { azureAccountProvider };

      const res = await provisionUtils.fillInAzureConfigs(
        context,
        inputs,
        envInfo,
        tokenProvider as any
      );
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        expect(res.error instanceof InvalidAzureCredentialError).equal(true);
      }
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
        expect(res.error instanceof ResourceGroupNotExistError).equal(true);
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
        expect(res.error instanceof ResourceGroupNotExistError).equal(true);
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
      mocker.stub(azureAccountProvider, "setSubscription");
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(undefined);
      const res = await provisionUtils.ensureResourceGroup(azureAccountProvider, "mockSubId");
      assert(res.isErr());
    });
    it("fail: given invalid resource group 2", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "setSubscription");
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
      mocker.stub(azureAccountProvider, "setSubscription");
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
    it("failed: resource group not exist", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "setSubscription");
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(ok(undefined));
      const res = await provisionUtils.ensureResourceGroup(
        azureAccountProvider,
        "mockSubId",
        "mockRG"
      );
      assert(res.isErr());
      if (res.isErr()) {
        assert(res.error instanceof ResourceGroupNotExistError);
      }
    });
    it("success: ask resource group 1", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "setSubscription");
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

    it("success: ask resource group 2", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "setSubscription");
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

  describe("askForProvisionConsentV3", () => {
    const mocker = sinon.createSandbox();
    afterEach(() => {
      mocker.restore();
    });

    it("confirm provision successfully", async () => {
      const ctx = {
        ui: new MockedUserInteraction(),
        azureAccountProvider: new MockedAzureAccountProvider(),
        telemetryReporter: new MockTelemetryReporter(),
      };
      mocker.stub(ctx.azureAccountProvider, "getJsonObject").resolves({ unique_name: "name" });
      mocker.stub(ctx.ui, "showMessage").resolves(ok("Provision"));
      mocker.stub(ctx.telemetryReporter, "sendTelemetryEvent").resolves();
      const azureSubInfo: SubscriptionInfo = {
        subscriptionName: "sub",
        subscriptionId: "sub-id",
        tenantId: "tenant-id",
      };
      const m365tenant: M365TenantRes = {
        tenantUserName: "m365-name",
        tenantIdInToken: "tenantId",
      };

      const res = await provisionUtils.askForProvisionConsentV3(
        ctx as any,
        m365tenant,
        azureSubInfo,
        "test"
      );

      chai.assert.isTrue(res.isOk());
    });

    it("confirm provision without m365 successfully", async () => {
      const ctx = {
        ui: new MockedUserInteraction(),
        azureAccountProvider: new MockedAzureAccountProvider(),
        telemetryReporter: new MockTelemetryReporter(),
      };
      mocker.stub(ctx.azureAccountProvider, "getJsonObject").resolves({ unique_name: "name" });
      const ui = mocker.stub(ctx.ui, "showMessage").resolves(ok("Provision"));
      mocker.stub(ctx.telemetryReporter, "sendTelemetryEvent").resolves();
      const azureSubInfo: SubscriptionInfo = {
        subscriptionName: "sub",
        subscriptionId: "sub-id",
        tenantId: "tenant-id",
      };
      const res = await provisionUtils.askForProvisionConsentV3(
        ctx as any,
        undefined,
        azureSubInfo,
        "test"
      );

      chai.assert.isFalse((ui.args[0][1] as string).includes("365"));
      chai.assert.isTrue(res.isOk());
    });

    it("confirm provision cancel", async () => {
      const ctx = {
        ui: new MockedUserInteraction(),
        azureAccountProvider: new MockedAzureAccountProvider(),
        telemetryReporter: new MockTelemetryReporter(),
      };
      mocker.stub(ctx.azureAccountProvider, "getJsonObject").resolves({ unique_name: "name" });
      mocker.stub(ctx.ui, "showMessage").resolves(ok("Cancel"));
      mocker.stub(ctx.telemetryReporter, "sendTelemetryEvent").resolves();
      const azureSubInfo: SubscriptionInfo = {
        subscriptionName: "sub",
        subscriptionId: "sub-id",
        tenantId: "tenant-id",
      };
      const m365tenant: M365TenantRes = {
        tenantUserName: "m365-name",
        tenantIdInToken: "tenantId",
      };

      const res = await provisionUtils.askForProvisionConsentV3(
        ctx as any,
        m365tenant,
        azureSubInfo,
        "test"
      );

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "CancelProvision");
      }
    });

    it("confirm provision error", async () => {
      const ctx = {
        ui: new MockedUserInteraction(),
        azureAccountProvider: new MockedAzureAccountProvider(),
        telemetryReporter: new MockTelemetryReporter(),
      };
      mocker.stub(ctx.azureAccountProvider, "getJsonObject").resolves({ unique_name: "name" });
      mocker.stub(ctx.ui, "showMessage").resolves(err(new SystemError("error", "error", "", "")));
      mocker.stub(ctx.telemetryReporter, "sendTelemetryEvent").resolves();
      const azureSubInfo: SubscriptionInfo = {
        subscriptionName: "sub",
        subscriptionId: "sub-id",
        tenantId: "tenant-id",
      };
      const m365tenant: M365TenantRes = {
        tenantUserName: "m365-name",
        tenantIdInToken: "tenantId",
      };

      const res = await provisionUtils.askForProvisionConsentV3(
        ctx as any,
        m365tenant,
        azureSubInfo,
        "test"
      );

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "CancelProvision");
      }
    });
  });

  describe("ensureM365TenantMatchesV3", () => {
    let mockedEnvRestore: RestoreFn | undefined;

    afterEach(() => {
      if (mockedEnvRestore) {
        mockedEnvRestore();
      }
    });
    it("no related actions", async () => {
      const actions: string[] = [];
      const tenantId = "tid";

      const res = await provisionUtils.ensureM365TenantMatchesV3(
        actions,
        tenantId,
        "local",
        "coorinator"
      );

      chai.assert.isTrue(res.isOk());
    });

    it("missing tenant id", async () => {
      const actions = ["aadApp/create"];
      const tenantId = "";

      const res = await provisionUtils.ensureM365TenantMatchesV3(
        actions,
        tenantId,
        "local",
        "coorinator"
      );

      chai.assert.isTrue(res.isOk());
    });

    it("not provisioned before", async () => {
      const actions = ["aadApp/create"];
      const tenantId = "tid";

      const res = await provisionUtils.ensureM365TenantMatchesV3(
        actions,
        tenantId,
        "local",
        "coorinator"
      );

      chai.assert.isTrue(res.isOk());
    });

    it("provisioned before and same tenant", async () => {
      const actions = ["aadApp/create"];
      const tenantId = "tid";
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "tid",
      });

      const res = await provisionUtils.ensureM365TenantMatchesV3(
        actions,
        tenantId,
        "local",
        "coorinator"
      );

      chai.assert.isTrue(res.isOk());
    });

    it("provisioned before and switch tenant", async () => {
      const actions = ["aadApp/create"];
      const tenantId = "tid";
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old-tid",
        AAD_APP_CLIENT_ID: "aad-id",
      });

      const res = await provisionUtils.ensureM365TenantMatchesV3(
        actions,
        tenantId,
        "local",
        "coorinator"
      );

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error.message.includes("AAD_APP_CLIENT_ID"));
      }
    });

    it("provisioned before and switch tenant", async () => {
      const actions = ["aadApp/create", "botFramework/create"];
      const tenantId = "tid";
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old-tid",
        AAD_APP_CLIENT_ID: "aad-id",
        BOT_ID: "bot-id",
      });

      const res = await provisionUtils.ensureM365TenantMatchesV3(
        actions,
        tenantId,
        "local",
        "coorinator"
      );

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error.message.includes("AAD_APP_CLIENT_ID"));
        chai.assert.isTrue(res.error.message.includes("BOT_ID"));
      }
    });

    it("provisioned before and switch tenant missing id", async () => {
      const actions = ["aadApp/create", "botAadApp/create"];
      const tenantId = "tid";
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old-tid",
        AAD_APP_CLIENT_ID: "aad-id",
      });

      const res = await provisionUtils.ensureM365TenantMatchesV3(
        actions,
        tenantId,
        "local",
        "coorinator"
      );

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error.message.includes("AAD_APP_CLIENT_ID"));
        chai.assert.isFalse(res.error.message.includes("BOT_ID"));
      }
    });
  });
  describe("getM365TenantId", () => {
    let mockedEnvRestore: RestoreFn | undefined;
    const mocker = sinon.createSandbox();
    afterEach(() => {
      if (mockedEnvRestore) {
        mockedEnvRestore();
      }
      mocker.restore();
    });
    it("M365TokenJSONNotFoundError", async () => {
      mocker.stub(tools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok(""));
      mocker
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(err(new UserError({})));
      const res = await provisionUtils.getM365TenantId(tools.tokenProvider.m365TokenProvider);
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof M365TokenJSONNotFoundError);
      }
    });

    it("M365TenantIdNotFoundInTokenError", async () => {
      mocker.stub(tools.tokenProvider.m365TokenProvider, "getAccessToken").resolves(ok(""));
      mocker.stub(tools.tokenProvider.m365TokenProvider, "getJsonObject").resolves(ok({}));
      const res = await provisionUtils.getM365TenantId(tools.tokenProvider.m365TokenProvider);
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof M365TenantIdNotFoundInTokenError);
      }
    });
  });
  describe("arm", () => {
    let mockedEnvRestore: RestoreFn | undefined;
    const mocker = sinon.createSandbox();
    afterEach(() => {
      if (mockedEnvRestore) {
        mockedEnvRestore();
      }
      mocker.restore();
    });
    it("getResourceManagementClientForArmDeployment", async () => {
      mocker
        .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(undefined);
      try {
        await getResourceManagementClientForArmDeployment(
          tools.tokenProvider.azureAccountProvider,
          "mksub"
        );
        chai.assert.fail("Should not reach here.");
      } catch (e) {
        chai.assert.isTrue(e instanceof InvalidAzureCredentialError);
      }
    });
  });
});
