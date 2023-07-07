import * as sinon from "sinon";
import * as chai from "chai";
import { PrereleasePage } from "../../../src/utils/prerelease";
import { ExtensionContext, Memento } from "vscode";
import { ExtTelemetry } from "../../../src/telemetry/extTelemetry";
import * as spies from "chai-spies";
import * as commonTools from "@microsoft/teamsfx-core";
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
    sandbox.stub(PrereleasePage.prototype, "show").resolves();
    context = {
      subscriptions: [],
      globalState: mockGlobalState,
    } as unknown as ExtensionContext;
  });
  afterEach(() => {
    sandbox.restore();
  });
  it("checkAndShow success", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("4.99.1");
    sandbox.stub(context.globalState, "get").returns("4.99.0");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    chai.assert(spyChecker.callCount == 1);
    chai.expect(reporterSpy.sendTelemetryEvent).to.have.been.called.with(ShowWhatIsNewNotification);
    spyChecker.restore();
  });
  it("checkAndShow return prerelease version undefined", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("4.99.0");
    sandbox.stub(context.globalState, "get").returns(undefined);
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    chai.expect(reporterSpy.sendTelemetryEvent).to.have.been.called.with(ShowWhatIsNewNotification);
    await instance.checkAndShow();
    chai.assert(spyChecker.callCount == 1);
    spyChecker.restore();
  });
  it("checkAndShow return failed if not prerelease", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("4.1.0");
    sandbox.stub(context.globalState, "get").returns("4.99.0");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    chai.assert(spyChecker.callCount == 0);
    spyChecker.restore();
  });
  it("checkAndShow with Same version", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("4.99.0");
    sandbox.stub(context.globalState, "get").returns("4.99.0");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    chai.assert(spyChecker.callCount == 0);
    spyChecker.restore();
  });
});
