import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import { UriHandler } from "../../src/uriHandler";

describe("uri handler", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    sandbox.restore();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("invalid uri missing query", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse("vscode://test.test");
    const showMessage = sandbox.stub(vscode.window, "showErrorMessage");
    await handler.handleUri(uri);

    sandbox.assert.calledOnce(showMessage);
  });

  it("invalid uri missing referer", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse("vscode://test.test?query=1");
    const showMessage = sandbox.stub(vscode.window, "showErrorMessage");
    await handler.handleUri(uri);

    sandbox.assert.calledOnce(showMessage);
  });

  it("invalid uri missing app id", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse("vscode://test.test?test=1&referrer=developerportal");
    const showMessage = sandbox.stub(vscode.window, "showErrorMessage");
    await handler.handleUri(uri);

    sandbox.assert.calledOnce(showMessage);
  });

  it("valid uri", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse(
      "vscode://test.test?appId=1&referrer=developerportal&login_hint=test"
    );

    const executeCommand = sandbox
      .stub(vscode.commands, "executeCommand")
      .returns(Promise.resolve(""));
    await handler.handleUri(uri);

    chai.assert.isTrue(executeCommand.calledOnce);
    sandbox.assert.calledOnceWithExactly(executeCommand, "fx-extension.openFromTdp", "1", "test");
  });

  it("error hanlding uri", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse(
      "vscode://test.test?appId=1&referrer=developerportal&login_hint=test"
    );

    const executeCommand = sandbox
      .stub(vscode.commands, "executeCommand")
      .returns(Promise.reject(""));
    await handler.handleUri(uri);

    chai.assert.isTrue(executeCommand.calledOnce);
    sandbox.assert.calledOnceWithExactly(executeCommand, "fx-extension.openFromTdp", "1", "test");
  });

  it("dev portal running", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse(
      "vscode://test.test?appId=1&referrer=developerportal&login_hint=test"
    );

    const showMessage = sandbox.stub(vscode.window, "showWarningMessage");
    handler.handleUri(uri);
    // call twice to trigger isRunning logic
    await handler.handleUri(uri);

    chai.assert.isTrue(showMessage.calledOnce);
  });

  it("valid code spaces callback uri", async () => {
    try {
      const handler = new UriHandler();
      const uri = vscode.Uri.parse(
        "vscode://TeamsDevApp.ms-teams-vscode-extension/auth-complete?code=abc"
      );
      await handler.handleUri(uri);
    } catch (e) {
      chai.assert.isTrue(false);
    }
  });

  it("invalid uri missing sampleId", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse(
      "vscode://TeamsDevApp.ms-teams-vscode-extension?referrer=officedoc"
    );
    const showMessage = sandbox.stub(vscode.window, "showErrorMessage");
    await handler.handleUri(uri);

    sandbox.assert.calledOnce(showMessage);
  });

  it("valid designated sample callback uri", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse(
      "vscode://TeamsDevApp.ms-teams-vscode-extension?referrer=officedoc&sampleId=hello-world-teams-tab-and-outlook-add-in"
    );

    const executeCommand = sandbox
      .stub(vscode.commands, "executeCommand")
      .returns(Promise.reject(""));
    await handler.handleUri(uri);

    chai.assert.isTrue(executeCommand.calledOnce);
    sandbox.assert.calledOnceWithExactly(
      executeCommand,
      "fx-extension.openSamples",
      false,
      "hello-world-teams-tab-and-outlook-add-in"
    );
  });
});
