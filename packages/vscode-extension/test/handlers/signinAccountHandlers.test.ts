import * as sinon from "sinon";
import * as chai from "chai";
import { UserCancelError } from "@microsoft/teamsfx-core";
import { AzureAccountManager } from "../../src/commonlib/azureLogin";
import { signinAzureCallback } from "../../src/handlers/signinAccountHandlers";

describe("callBackFunctions", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("signinAzureCallback", async () => {
    sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns({});
    const getIdentityCredentialStub = sandbox.stub(
      AzureAccountManager.prototype,
      "getIdentityCredentialAsync"
    );

    await signinAzureCallback([{}, { status: 0 }]);

    chai.assert.isTrue(getIdentityCredentialStub.calledOnce);
  });

  it("signinAzureCallback with error", async () => {
    sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns({});
    sandbox.stub(AzureAccountManager.prototype, "getIdentityCredentialAsync").throws(new Error());

    const res = await signinAzureCallback([{}, { status: 0 }]);

    chai.assert.isTrue(res.isErr());
  });

  it("signinAzureCallback with cancel error", async () => {
    sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns({});
    sandbox
      .stub(AzureAccountManager.prototype, "getIdentityCredentialAsync")
      .throws(new UserCancelError(""));

    const res = await signinAzureCallback([{}, { status: 0 }]);

    chai.assert.isTrue(res.isOk());
  });
});
