import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { UriHandler } from "../../src/uriHandler";
import * as featureFlags from "@microsoft/teamsfx-core/build/common/featureFlags";

describe("uri handler", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("handle uri", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse("vscode://test.test?id=1");
    sandbox.stub(featureFlags, "isTDPIntegrationEnabled").returns(true);
    const showMessage = sandbox.stub(vscode.window, "showInformationMessage");
    await handler.handleUri(uri);

    sandbox.assert.calledOnce(showMessage);
  });

  it("do nothing if feature flag is not enabled", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse("vscode://test.test?id=1");
    sandbox.stub(featureFlags, "isTDPIntegrationEnabled").returns(false);
    const showMessage = sandbox.stub(vscode.window, "showInformationMessage").resolves();
    await handler.handleUri(uri);

    chai.assert.isTrue(showMessage.notCalled);
  });
});
