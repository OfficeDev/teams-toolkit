import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import VsCodeLogInstance from "../../src/commonlib/log";
import * as handlers from "../../src/handlers/copilotChatHandlers";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import * as extTelemetryEvents from "../../src/telemetry/extTelemetryEvents";
import * as versionUtils from "../../src/utils/versionUtil";
import { err, ok, SystemError } from "@microsoft/teamsfx-api";
import * as vsc_ui from "../../src/qm/vsc_ui";

after(() => {
  sinon.restore();
});

describe("invokeTeamsAgent", async () => {
  const sandbox = sinon.createSandbox();
  let clock: sinon.SinonFakeTimers;

  afterEach(() => {
    sandbox.restore();
    if (clock) {
      clock.restore();
    }
  });

  beforeEach(() => {
    sandbox.stub(ExtTelemetry, "dispose");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
    sandbox.stub(VsCodeLogInstance, "outputChannel").value({
      name: "name",
      append: (value: string) => {},
      appendLine: (value: string) => {},
      replace: (value: string) => {},
      clear: () => {},
      show: (...params: any[]) => {},
      hide: () => {},
      dispose: () => {},
    });
    sandbox.stub(vsc_ui, "VS_CODE_UI").value(new vsc_ui.VsCodeUI(<vscode.ExtensionContext>{}));
  });

  it("no need to install Github Copilot", async () => {
    sandbox.stub(vscode.extensions, "getExtension").returns({ name: "github.copilot" } as any);
    sandbox.stub(vscode.commands, "executeCommand").resolves();

    const res = await handlers.invokeTeamsAgent([
      extTelemetryEvents.TelemetryTriggerFrom.CreateAppQuestionFlow,
    ]);

    chai.assert.isTrue(res.isOk());
  });

  it("install Github Copilot and invoke Teams Agent", async () => {
    clock = sandbox.useFakeTimers();
    sandbox.stub(versionUtils, "isVSCodeInsiderVersion").returns(true);
    sandbox
      .stub(vscode.extensions, "getExtension")
      .onFirstCall()
      .returns(undefined)
      .onSecondCall()
      .returns({ name: "github.copilot" } as any);
    const commandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();
    sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Install GitHub Copilot" as unknown as vscode.MessageItem);

    const job = handlers.invokeTeamsAgent([extTelemetryEvents.TelemetryTriggerFrom.TreeView]);
    await clock.tickAsync(6000);
    const res = await job;

    if (res.isErr()) {
      console.log(res.error);
    }

    chai.assert.isTrue(res.isOk());
    chai.assert.equal(commandStub.callCount, 3);
    chai.assert.isTrue(
      (commandStub.getCall(2).args[1].query as string).startsWith("@teamsapp Use ")
    );
  });

  it("View Teams Agent link successfully", async () => {
    clock = sandbox.useFakeTimers();
    sandbox.stub(versionUtils, "isVSCodeInsiderVersion").returns(true);
    sandbox
      .stub(vscode.extensions, "getExtension")
      .onFirstCall()
      .returns(undefined)
      .onSecondCall()
      .returns({ name: "github.copilot" } as any);
    sandbox.stub(vscode.commands, "executeCommand").resolves();
    sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Install @teamsapp" as unknown as vscode.MessageItem);
    const openUrlStub = sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));

    const res = await handlers.invokeTeamsAgent([extTelemetryEvents.TelemetryTriggerFrom.TreeView]);

    if (res.isErr()) {
      console.log(res.error);
    }

    chai.assert.isTrue(res.isOk());
    chai.assert.isTrue(openUrlStub.called);
  });

  it("Failed to view Teams Agent link", async () => {
    clock = sandbox.useFakeTimers();
    sandbox.stub(versionUtils, "isVSCodeInsiderVersion").returns(true);
    sandbox
      .stub(vscode.extensions, "getExtension")
      .onFirstCall()
      .returns(undefined)
      .onSecondCall()
      .returns({ name: "github.copilot" } as any);
    sandbox.stub(vscode.commands, "executeCommand").resolves();
    sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Install @teamsapp" as unknown as vscode.MessageItem);
    sandbox
      .stub(vsc_ui.VS_CODE_UI, "openUrl")
      .resolves(err(new SystemError("source", "name", "", "")));
    const res = await handlers.invokeTeamsAgent([extTelemetryEvents.TelemetryTriggerFrom.TreeView]);

    chai.assert.isTrue(res.isErr() && res.error.source === "source");
  });

  it("install Github Copilot, wait and invoke Teams Agent", async () => {
    clock = sandbox.useFakeTimers();
    sandbox.stub(versionUtils, "isVSCodeInsiderVersion").returns(true);
    sandbox
      .stub(vscode.extensions, "getExtension")
      .onFirstCall()
      .returns(undefined)
      .onSecondCall()
      .returns(undefined)
      .onThirdCall()
      .returns({ name: "github.copilot" } as any);
    const commandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();
    sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Install GitHub Copilot" as unknown as vscode.MessageItem);

    const job = handlers.invokeTeamsAgent();
    await clock.tickAsync(6000);
    const res = await job;

    chai.assert.isTrue(res.isOk());
    chai.assert.equal(commandStub.callCount, 3);
  });

  it("Install github copilot extension error", async () => {
    sandbox.stub(versionUtils, "isVSCodeInsiderVersion").returns(true);
    sandbox.stub(vscode.extensions, "getExtension").onFirstCall().returns(undefined);
    const commandStub = sandbox
      .stub(vscode.commands, "executeCommand")
      .callsFake(async (command: string) => {
        if (command === "workbench.extensions.installExtension") {
          throw new Error("Install Error");
        } else {
          return {};
        }
      });
    sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Install GitHub Copilot" as unknown as vscode.MessageItem);
    sandbox.stub(VsCodeLogInstance, "error").resolves();

    const res = await handlers.invokeTeamsAgent();

    chai.assert.isTrue(res.isErr());
    if (res.isErr()) {
      chai.assert.equal(res.error.source, "installCopilotChat");
    }
    chai.assert.equal(commandStub.callCount, 1);
  });

  it("Install github copilot extension cancel", async () => {
    sandbox.stub(versionUtils, "isVSCodeInsiderVersion").returns(true);
    const loggerStub = sandbox.stub(VsCodeLogInstance, "error").resolves();
    sandbox
      .stub(vscode.extensions, "getExtension")
      .onFirstCall()
      .returns(undefined)
      .onSecondCall()
      .returns(undefined)
      .onThirdCall()
      .returns({ name: "github.copilot" } as any);
    const commandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();

    sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Cancel" as unknown as vscode.MessageItem);

    const res = await handlers.invokeTeamsAgent();

    chai.assert.isTrue(res.isErr());
    if (res.isErr()) {
      chai.assert.equal(res.error.name, "UserCancelError");
    }
    chai.assert.equal(commandStub.callCount, 0);
    chai.assert.equal(loggerStub.callCount, 0);
  });

  it("Verify installation error", async () => {
    clock = sandbox.useFakeTimers();
    sandbox.stub(versionUtils, "isVSCodeInsiderVersion").returns(true);
    sandbox.stub(vscode.extensions, "getExtension").returns(undefined);
    const commandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();
    sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Install GitHub Copilot" as unknown as vscode.MessageItem);

    const job = handlers.invokeTeamsAgent();
    await clock.tickAsync(30000);
    const res = await job;

    chai.assert.isTrue(res.isErr());
    if (res.isErr()) {
      chai.assert.equal(res.error.name, "CannotVerifyGithubCopilotChat");
    }
    chai.assert.equal(commandStub.callCount, 1);
  });

  it("invoke Copilot chat error", async () => {
    sandbox.stub(versionUtils, "isVSCodeInsiderVersion").returns(true);
    sandbox.stub(vscode.extensions, "getExtension").returns({ name: "github.copilot" } as any);
    const commandStub = sandbox
      .stub(vscode.commands, "executeCommand")
      .callsFake(async (command: string) => {
        if (command === "workbench.panel.chat.view.copilot.focus") {
          throw new Error("Install Error");
        } else {
          return {};
        }
      });
    sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Install GitHub Copilot" as unknown as vscode.MessageItem);
    const loggerError = sandbox.stub(VsCodeLogInstance, "error").resolves();

    const res = await handlers.invokeTeamsAgent();

    chai.assert.isTrue(res.isErr());
    if (res.isErr()) {
      chai.assert.equal(res.error.source, "openCopilotChat");
    }
    chai.assert.equal(commandStub.callCount, 1);
    chai.assert.equal(loggerError.callCount, 2);
  });
});
