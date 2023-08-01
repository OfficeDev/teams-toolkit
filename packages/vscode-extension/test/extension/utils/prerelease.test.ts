import * as sinon from "sinon";
import * as chai from "chai";
import { PrereleasePage } from "../../../src/utils/prerelease";
import { ExtensionContext, Memento } from "vscode";
import { ExtTelemetry } from "../../../src/telemetry/extTelemetry";
import * as spies from "chai-spies";
import * as vscode from "vscode";
chai.use(spies);
const spy = chai.spy;
const ShowWhatIsNewNotification = "show-what-is-new-notification";
const reporterSpy = spy.interface({
  sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {},
});
function gloablStateKeys(): readonly string[] {
  return ["PrereleaseState.Version"];
}

function globalStateUpdate(key: string, value: any): any {}

function globalStateGet(key: string): string {
  return "0.0.0";
}

describe("versionUtil", () => {
  const sandbox = sinon.createSandbox();
  let context: ExtensionContext;
  const mockGlobalState: Memento = {
    keys: gloablStateKeys,
    get: globalStateGet,
    update: globalStateUpdate,
  };
  before(() => {
    chai.util.addProperty(ExtTelemetry, "reporter", () => reporterSpy);
  });
  beforeEach(() => {
    sandbox.restore();
    sandbox.stub(vscode.workspace, "openTextDocument").resolves();
    sandbox.stub(vscode.commands, "executeCommand").resolves();
    context = {
      subscriptions: [],
      globalState: mockGlobalState,
    } as unknown as ExtensionContext;
  });
  afterEach(() => {
    sandbox.restore();
  });
  it("checkAndShow success", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("5.1.2023072000");
    sandbox.stub(context.globalState, "get").returns("5.0.1");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    chai.assert(spyChecker.callCount == 1);
    chai.expect(reporterSpy.sendTelemetryEvent).to.have.been.called.with(ShowWhatIsNewNotification);
    spyChecker.restore();
  });
  it("checkAndShow return prerelease version undefined", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("5.1.2023072000");
    sandbox.stub(context.globalState, "get").returns(undefined);
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    chai.expect(reporterSpy.sendTelemetryEvent).to.have.been.called.with(ShowWhatIsNewNotification);
    await instance.checkAndShow();
    chai.assert(spyChecker.callCount == 1);
    spyChecker.restore();
  });
  it("checkAndShow return failed if not prerelease", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("5.0.1");
    sandbox.stub(context.globalState, "get").returns("5.0.0");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    chai.assert(spyChecker.callCount == 0);
    spyChecker.restore();
  });
  it("checkAndShow with Same version", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("5.1.2023072000");
    sandbox.stub(context.globalState, "get").returns("5.1.2023072000");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    chai.assert(spyChecker.callCount == 0);
    spyChecker.restore();
  });
  it("checkandshow with undefined version", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns(undefined);
    sandbox.stub(context.globalState, "get").returns("5.0.0");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    chai.assert(spyChecker.callCount == 0);
    spyChecker.restore();
  });
  it("check show command", async () => {
    sandbox.restore();
    const openText = sandbox.stub(vscode.workspace, "openTextDocument").resolves();
    const execMethod = sandbox.stub(vscode.commands, "executeCommand").resolves();
    const instance = new PrereleasePage(context);
    await instance.show();
    chai.expect(openText.callCount == 1);
    chai.expect(execMethod.callCount == 1);
    chai.expect(execMethod.getCall(0).args[0] == "markdown.showPreview");
  });
});
