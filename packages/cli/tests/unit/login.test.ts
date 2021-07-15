
import AzureAccountManager from "../../src/commonlib/azureLogin";
import sinon from "sinon";

describe("Help Parameter Tests", function () {
    const sandbox = sinon.createSandbox();

    before(() => {
        sandbox.stub(AzureAccountManager, "getJsonObject");
    });

    it("Azure login/getAccountInfo", () => {
        AzureAccountManager.getAccountInfo();
    });

    it("Azure login/getSelectedSubscription", () => {
        AzureAccountManager.getSelectedSubscription();
    });
});