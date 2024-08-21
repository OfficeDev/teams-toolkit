import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { UriHandler, setUriEventHandler } from "../../src/uriHandler";
import { TelemetryTriggerFrom } from "../../src/telemetry/extTelemetryEvents";
import { featureFlagManager, FeatureFlags, QuestionNames } from "@microsoft/teamsfx-core";
import { syncManifestHandler } from "../../src/handlers/manifestHandlers";
import * as shared from "../../src/handlers/sharedOpts";
import { err, FxError, Inputs, Result, Stage, UserError, ok } from "@microsoft/teamsfx-api";

describe("uri handler", () => {
  const sandbox = sinon.createSandbox();

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
      TelemetryTriggerFrom.ExternalUrl,
      "hello-world-teams-tab-and-outlook-add-in"
    );
  });
  it("valid sync manifest uri", async () => {
    const handler = new UriHandler();
    const uri = vscode.Uri.parse(
      "vscode://TeamsDevApp.ms-teams-vscode-extension?referrer=syncmanifest&appId=123"
    );
    const currentFeatureFlag = featureFlagManager.getBooleanValue(FeatureFlags.SyncManifest);
    featureFlagManager.setBooleanValue(FeatureFlags.SyncManifest, true);
    const executeCommand = sandbox
      .stub(vscode.commands, "executeCommand")
      .callsFake(async (command: string, ...args: any[]) => {
        const res = await syncManifestHandler(args);
        chai.assert.isTrue(res.isOk());
      });
    sandbox
      .stub(shared, "runCommand")
      .callsFake((stage: Stage, inputs: Inputs | undefined): Promise<Result<any, FxError>> => {
        if (inputs && inputs[QuestionNames.TeamsAppId] === "123") {
          return Promise.resolve(ok(undefined));
        }
        return Promise.resolve(err(new UserError("ut", "error", "", "")));
      });
    await handler.handleUri(uri);
    featureFlagManager.setBooleanValue(FeatureFlags.SyncManifest, currentFeatureFlag);
    chai.assert.isTrue(executeCommand.calledOnce);
  });

  it("sync manifest uri, missing app Id", async () => {
    const handler = new UriHandler();
    const currentFeatureFlag = featureFlagManager.getBooleanValue(FeatureFlags.SyncManifest);
    featureFlagManager.setBooleanValue(FeatureFlags.SyncManifest, true);
    const executeCommand = sandbox.stub(vscode.commands, "executeCommand").throws("error");
    const uri = vscode.Uri.parse(
      "vscode://TeamsDevApp.ms-teams-vscode-extension?referrer=syncmanifest"
    );
    await handler.handleUri(uri);

    const uri1 = vscode.Uri.parse(
      "vscode://TeamsDevApp.ms-teams-vscode-extension?referrer=syncmanifest&appId="
    );
    await handler.handleUri(uri1);
    featureFlagManager.setBooleanValue(FeatureFlags.SyncManifest, currentFeatureFlag);
    chai.assert.isTrue(executeCommand.notCalled);
  });

  it("not registered referrer", async () => {
    const handler = new UriHandler();
    const executeCommand = sandbox.stub(vscode.commands, "executeCommand").throws("error");
    const uri = vscode.Uri.parse("vscode://TeamsDevApp.ms-teams-vscode-extension?referrer=fake");
    await handler.handleUri(uri);
    chai.assert.isTrue(executeCommand.notCalled);
  });

  it("set uri handler", async () => {
    const uriHandler = new UriHandler();
    setUriEventHandler(uriHandler);
  });
});
