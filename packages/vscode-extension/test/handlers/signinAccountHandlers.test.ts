import * as sinon from "sinon";
import * as chai from "chai";
import * as vscode from "vscode";
import { UserCancelError } from "@microsoft/teamsfx-core";
import { AzureAccountManager } from "../../src/commonlib/azureLogin";
import { signinAzureCallback, signinM365Callback } from "../../src/handlers/signinAccountHandlers";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { setTools, tools } from "../../src/globalVariables";
import { ok } from "@microsoft/teamsfx-api";
import VsCodeLogInstance from "../../src/commonlib/log";
import { VsCodeUI } from "../../src/qm/vsc_ui";
import { getExpService } from "../../src/exp";
import M365TokenInstance from "../../src/commonlib/m365Login";

describe("SigninAccountHandlers", () => {
  describe("signinAzureCallback", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    beforeEach(() => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    });

    it("Happy path", async () => {
      sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns(undefined);
      const getIdentityCredentialStub = sandbox.stub(
        AzureAccountManager.prototype,
        "getIdentityCredentialAsync"
      );

      await signinAzureCallback({}, { status: 0 });

      chai.assert.isTrue(getIdentityCredentialStub.calledOnce);
    });

    it("signinAzureCallback with error", async () => {
      sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns({});
      sandbox.stub(AzureAccountManager.prototype, "getIdentityCredentialAsync").throws(new Error());

      const res = await signinAzureCallback({}, { status: 0 });

      chai.assert.isTrue(res.isErr());
    });

    it("signinAzureCallback with cancel error", async () => {
      sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns({});
      sandbox
        .stub(AzureAccountManager.prototype, "getIdentityCredentialAsync")
        .throws(new UserCancelError(""));

      const res = await signinAzureCallback({}, { status: 0 });

      chai.assert.isTrue(res.isOk());
    });

    it("Signed in status", async () => {
      sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns(undefined);
      const getIdentityCredentialStub = sandbox.stub(
        AzureAccountManager.prototype,
        "getIdentityCredentialAsync"
      );

      await signinAzureCallback({}, { status: 2 });

      chai.assert.isTrue(getIdentityCredentialStub.notCalled);
    });
  });

  describe("signinM365Callback", () => {
    const sandbox = sinon.createSandbox();
    setTools({
      logProvider: VsCodeLogInstance,
      tokenProvider: {
        azureAccountProvider: AzureAccountManager.prototype,
        m365TokenProvider: M365TokenInstance,
      },
      telemetryReporter: ExtTelemetry.reporter,
      ui: new VsCodeUI(<vscode.ExtensionContext>{}),
      expServiceProvider: getExpService(),
    });

    afterEach(() => {
      sandbox.restore();
    });

    beforeEach(() => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    });

    it("Happy path", async () => {
      const setSignedInStub = sandbox.stub();
      const getJsonObjectStub = sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .returns(Promise.resolve(ok({ upn: "test" })));

      await signinM365Callback(
        {},
        {
          status: 0,
          setSignedIn: (args: any) => {
            setSignedInStub(args);
          },
        }
      );

      chai.assert.isTrue(getJsonObjectStub.calledOnce);
      chai.assert.isTrue(setSignedInStub.calledOnceWith("test"));
    });

    it("Signed in", async () => {
      const setSignedInStub = sandbox.stub();
      const getJsonObjectStub = sandbox
        .stub(tools.tokenProvider.m365TokenProvider, "getJsonObject")
        .returns(Promise.resolve(ok({ upn: "test" })));

      await signinM365Callback(
        {},
        {
          status: 2,
          setSignedIn: (args: any) => {
            setSignedInStub(args);
          },
        }
      );

      chai.assert.isTrue(getJsonObjectStub.notCalled);
      chai.assert.isTrue(setSignedInStub.notCalled);
    });
  });
});
