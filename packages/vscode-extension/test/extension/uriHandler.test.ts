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

  it("invalid uri missing query", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse("vscode://test.test");
    sandbox.stub(featureFlags, "isTDPIntegrationEnabled").returns(true);
    const showMessage = sandbox.stub(vscode.window, "showErrorMessage");
    await handler.handleUri(uri);

    sandbox.assert.calledOnce(showMessage);
  });

  it("invalid uri missing app id", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse("vscode://test.test?test=1");
    sandbox.stub(featureFlags, "isTDPIntegrationEnabled").returns(true);
    const showMessage = sandbox.stub(vscode.window, "showErrorMessage");
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

  it("valid uri", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse("vscode://test.test?appId=1");
    sandbox.stub(featureFlags, "isTDPIntegrationEnabled").returns(true);

    const executeCommand = sandbox
      .stub(vscode.commands, "executeCommand")
      .returns(Promise.resolve(""));
    await handler.handleUri(uri);

    sandbox.assert.calledOnceWithExactly(executeCommand, "fx-extension.openFromTdp", "1");
  });
});
