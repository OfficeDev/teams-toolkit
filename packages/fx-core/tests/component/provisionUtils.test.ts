import {
  err,
  ok,
  Platform,
  SubscriptionInfo,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import chai from "chai";
import { assert } from "console";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as sinon from "sinon";
import { M365TenantRes, provisionUtils } from "../../src/component/provisionUtils";
import { resourceGroupHelper } from "../../src/component/utils/ResourceGroupHelper";
import { setTools } from "../../src/common/globalVars";
import { ResourceGroupNotExistError } from "../../src/error/azure";
import { M365TenantIdNotFoundInTokenError, M365TokenJSONNotFoundError } from "../../src/error/m365";
import { MockAzureAccountProvider, MockTelemetryReporter, MockTools } from "../core/utils";
import {
  MockedAzureAccountProvider,
  MockedUserInteraction,
  MyTokenCredential,
} from "../plugins/solution/util";

describe("provisionUtils", () => {
  const tools = new MockTools();
  setTools(tools);

  describe("ensureSubscription", () => {
    const mocker = sinon.createSandbox();
    beforeEach(() => {
      setTools(tools);
    });
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
      const res = await provisionUtils.ensureResourceGroup(
        { platform: Platform.VSCode, projectPath: "" },
        azureAccountProvider,
        "mockSubId"
      );
      assert(res.isErr());
    });
    it("fail: given invalid resource group 1", async () => {
      const azureAccountProvider = new MockAzureAccountProvider();
      mocker
        .stub(azureAccountProvider, "getIdentityCredentialAsync")
        .resolves(new MyTokenCredential());
      mocker.stub(azureAccountProvider, "setSubscription");
      mocker.stub(resourceGroupHelper, "getResourceGroupInfo").resolves(ok(undefined));
      const res = await provisionUtils.ensureResourceGroup(
        { platform: Platform.VSCode, projectPath: "" },
        azureAccountProvider,
        "mockSubId",
        "testrg"
      );
      assert(res.isErr() && res.error instanceof ResourceGroupNotExistError);
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
        { platform: Platform.VSCode, projectPath: "" },
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
        { platform: Platform.VSCode, projectPath: "" },
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
        { platform: Platform.VSCode, projectPath: "" },
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
      const res = await provisionUtils.ensureResourceGroup(
        { platform: Platform.VSCode, projectPath: "" },
        azureAccountProvider,
        "mockSubId"
      );
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
      const res = await provisionUtils.ensureResourceGroup(
        { platform: Platform.VSCode, projectPath: "" },
        azureAccountProvider,
        "mockSubId"
      );
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

      const res = await provisionUtils.ensureM365TenantMatchesV3(actions, tenantId);

      chai.assert.isTrue(res.isOk());
    });

    it("missing tenant id", async () => {
      const actions = ["aadApp/create"];
      const tenantId = "";

      const res = await provisionUtils.ensureM365TenantMatchesV3(actions, tenantId);

      chai.assert.isTrue(res.isOk());
    });

    it("not provisioned before", async () => {
      const actions = ["aadApp/create"];
      const tenantId = "tid";

      const res = await provisionUtils.ensureM365TenantMatchesV3(actions, tenantId);

      chai.assert.isTrue(res.isOk());
    });

    it("provisioned before and same tenant", async () => {
      const actions = ["aadApp/create"];
      const tenantId = "tid";
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "tid",
      });

      const res = await provisionUtils.ensureM365TenantMatchesV3(actions, tenantId);

      chai.assert.isTrue(res.isOk());
    });

    it("provisioned before and switch tenant", async () => {
      const actions = ["aadApp/create"];
      const tenantId = "tid";
      mockedEnvRestore = mockedEnv({
        TEAMS_APP_TENANT_ID: "old-tid",
        AAD_APP_CLIENT_ID: "aad-id",
      });

      const res = await provisionUtils.ensureM365TenantMatchesV3(actions, tenantId);

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

      const res = await provisionUtils.ensureM365TenantMatchesV3(actions, tenantId);

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

      const res = await provisionUtils.ensureM365TenantMatchesV3(actions, tenantId);

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
  });
});
