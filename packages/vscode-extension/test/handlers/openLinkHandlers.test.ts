import { ok } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import * as sinon from "sinon";
import * as chai from "chai";
import * as vscode from "vscode";
import {
  openDevelopmentLinkHandler,
  openEnvLinkHandler,
  openLifecycleLinkHandler,
  openHelpFeedbackLinkHandler,
  openDocumentLinkHandler,
  openM365AccountHandler,
  openAzureAccountHandler,
  openBotManagement,
  openAccountLinkHandler,
  openReportIssues,
  openDocumentHandler,
  openExternalHandler,
  openResourceGroupInPortal,
  openSubscriptionInPortal,
} from "../../src/handlers/openLinkHandlers";
import * as vsc_ui from "../../src/qm/vsc_ui";
import * as envTreeUtils from "../../src/utils/envTreeUtils";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import * as localizeUtils from "../../src/utils/localizeUtils";

describe("Open link handlers", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent").resolves();
    sandbox.stub(vsc_ui, "VS_CODE_UI").value(new vsc_ui.VsCodeUI(<vscode.ExtensionContext>{}));
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("openEnvLinkHandler", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openEnvLinkHandler([]);
      assert.isTrue(res.isOk());
    });
  });

  describe("openDevelopmentLinkHandler", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDevelopmentLinkHandler([]);
      assert.isTrue(res.isOk());
    });
  });

  describe("openLifecycleLinkHandler", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openLifecycleLinkHandler([]);
      assert.isTrue(res.isOk());
    });
  });

  describe("openHelpFeedbackLinkHandler", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openHelpFeedbackLinkHandler([]);
      assert.isTrue(res.isOk());
    });
  });

  describe("openM365AccountHandler", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openM365AccountHandler();
      assert.isTrue(res.isOk());
    });
  });

  describe("openAzureAccountHandler", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openAzureAccountHandler();
      assert.isTrue(res.isOk());
    });
  });

  describe("openBotManagement", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openBotManagement();
      assert.isTrue(res.isOk());
    });
  });

  describe("openAccountLinkHandler", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openAccountLinkHandler([]);
      assert.isTrue(res.isOk());
    });
  });

  describe("openReportIssues", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openReportIssues([]);
      assert.isTrue(res.isOk());
    });
  });

  describe("openExternalHandler", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openExternalHandler([{ url: "abc" }]);
      assert.isTrue(res.isOk());
    });
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openExternalHandler([]);
      assert.isTrue(res.isOk());
    });
  });

  describe("openDocumentHandler", () => {
    it("happy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentHandler(["", ""]);
      assert.isTrue(res.isOk());
    });
    it("happy learnmore", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentHandler(["", "learnmore"]);
      assert.isTrue(res.isOk());
    });
  });

  describe("openDocumentLinkHandler", () => {
    it("signinAzure", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentLinkHandler([{ contextValue: "signinAzure" }]);
      assert.isTrue(res.isOk());
    });
    it("fx-extension.create", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentLinkHandler([{ contextValue: "fx-extension.create" }]);
      assert.isTrue(res.isOk());
    });
    it("fx-extension.provision", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentLinkHandler([{ contextValue: "fx-extension.provision" }]);
      assert.isTrue(res.isOk());
    });
    it("fx-extension.build", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentLinkHandler([{ contextValue: "fx-extension.build" }]);
      assert.isTrue(res.isOk());
    });
    it("fx-extension.deploy", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentLinkHandler([{ contextValue: "fx-extension.deploy" }]);
      assert.isTrue(res.isOk());
    });
    it("fx-extension.publish", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentLinkHandler([{ contextValue: "fx-extension.publish" }]);
      assert.isTrue(res.isOk());
    });
    it("fx-extension.publishInDeveloperPortal", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentLinkHandler([
        { contextValue: "fx-extension.publishInDeveloperPortal" },
      ]);
      assert.isTrue(res.isOk());
    });
    it("empty", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentLinkHandler([]);
      assert.isTrue(res.isOk());
    });
    it("none", async () => {
      sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));
      const res = await openDocumentLinkHandler([{ contextValue: "" }]);
      assert.isTrue(res.isOk());
    });
  });

  describe("openSubscriptionInPortal", () => {
    it("subscriptionInfo not found", async () => {
      sandbox.stub(envTreeUtils, "getSubscriptionInfoFromEnv");
      const res = await openSubscriptionInPortal("local");
      chai.assert.equal(res.isErr() ? res.error.name : "Not Error", "EnvResourceInfoNotFoundError");
    });

    it("happy path", async () => {
      sandbox.stub(envTreeUtils, "getSubscriptionInfoFromEnv").returns({
        subscriptionName: "subscriptionName",
        subscriptionId: "subscriptionId",
        tenantId: "tenantId",
      } as any);
      const openExternalStub = sandbox.stub(vscode.env, "openExternal");
      await openSubscriptionInPortal("local");
      chai.assert.equal(openExternalStub.callCount, 1);
      chai.assert.deepEqual(
        openExternalStub.args[0][0],
        vscode.Uri.parse(
          `https://portal.azure.com/#@tenantId/resource/subscriptions/subscriptionId`
        )
      );
    });
  });

  describe("openResourceGroupInPortal", () => {
    it("subscriptionInfo not found", async () => {
      sandbox.stub(localizeUtils, "localize").returns("Unable to load %s info for environment %s.");
      sandbox.stub(envTreeUtils, "getSubscriptionInfoFromEnv");
      sandbox.stub(envTreeUtils, "getResourceGroupNameFromEnv").returns("resourceGroupName" as any);
      const res = await openResourceGroupInPortal("local");
      chai.assert.equal(
        res.isErr() ? res.error.message : "Not Error",
        "Unable to load Subscription info for environment local."
      );
    });

    it("resourceGroupName not found", async () => {
      sandbox.stub(localizeUtils, "localize").returns("Unable to load %s info for environment %s.");
      sandbox.stub(envTreeUtils, "getSubscriptionInfoFromEnv").returns({
        subscriptionName: "subscriptionName",
        subscriptionId: "subscriptionId",
        tenantId: "tenantId",
      } as any);
      sandbox.stub(envTreeUtils, "getResourceGroupNameFromEnv");
      const res = await openResourceGroupInPortal("local");
      chai.assert.equal(
        res.isErr() ? res.error.message : "Not Error",
        "Unable to load Resource Group info for environment local."
      );
    });

    it("subscriptionInfo and resourceGroupName not found", async () => {
      sandbox.stub(envTreeUtils, "getSubscriptionInfoFromEnv");
      sandbox.stub(envTreeUtils, "getResourceGroupNameFromEnv");
      const res = await openResourceGroupInPortal("local");
      chai.assert.equal(
        res.isErr() ? res.error.message : "Not Error",
        "Unable to load Subscription and Resource Group info for environment local."
      );
    });

    it("happy path", async () => {
      sandbox.stub(envTreeUtils, "getSubscriptionInfoFromEnv").returns({
        subscriptionName: "subscriptionName",
        subscriptionId: "subscriptionId",
        tenantId: "tenantId",
      } as any);
      sandbox.stub(envTreeUtils, "getResourceGroupNameFromEnv").returns("resourceGroupName" as any);
      const openExternalStub = sandbox.stub(vscode.env, "openExternal");
      await openResourceGroupInPortal("local");
      chai.assert.equal(openExternalStub.callCount, 1);
      chai.assert.deepEqual(
        openExternalStub.args[0][0],
        vscode.Uri.parse(
          `https://portal.azure.com/#@tenantId/resource/subscriptions/subscriptionId/resourceGroups/resourceGroupName`
        )
      );
    });
  });
});
