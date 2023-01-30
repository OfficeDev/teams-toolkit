import * as sinon from "sinon";
import * as chai from "chai";
import { PrereleasePage } from "../../../src/utils/prerelease";
import { ExtensionContext, Memento } from "vscode";
import mockedEnv, { RestoreFn } from "mocked-env";
import { assert } from "console";
import { update } from "lodash";

function gloablStateKeys(): readonly string[] {
  return ["PrereleaseState.Version"];
}

function globalStateUpdate(key: string, value: any): any {}

function globalStateGet(key: string): string {
  return "0.0.0";
}

describe("versionUtil", () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn;
  let context: ExtensionContext;
  const mockGlobalState: Memento = {
    keys: gloablStateKeys,
    get: globalStateGet,
    update: globalStateUpdate,
  };
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "true" });
    sandbox.stub(PrereleasePage.prototype, "show").resolves();
    context = {
      subscriptions: [],
      globalState: mockGlobalState,
    } as unknown as ExtensionContext;
  });
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });
  it("checkAndShow success", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("4.3.0");
    sandbox.stub(context.globalState, "get").returns("4.99.0");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    assert(spyChecker.callCount == 1);
    spyChecker.restore();
  });
  it("checkAndShow return prerelease version undefined", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("4.3.0");
    sandbox.stub(context.globalState, "get").returns(undefined);
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    assert(spyChecker.callCount == 1);
    spyChecker.restore();
  });
  it("checkAndShow return failed", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("4.99.10");
    sandbox.stub(context.globalState, "get").returns("4.99.0");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    assert(spyChecker.callCount == 0);
    spyChecker.restore();
  });
});
