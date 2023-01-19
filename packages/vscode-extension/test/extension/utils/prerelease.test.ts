import * as sinon from "sinon";
import * as chai from "chai";
import { PrereleasePage } from "../../../src/utils/prerelease";
import * as versionUtil from "../../../src/utils/versionUtil";
import * as vscode from "vscode";
import mockedEnv, { RestoreFn } from "mocked-env";
import { assert } from "console";

describe("versionUtil", () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn;
  let context: vscode.ExtensionContext;
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "true" });
    sandbox.stub(PrereleasePage.prototype, "show").resolves();
    context = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;
  });
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });
  it("checkAndShow success", async () => {
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("4.3.0");
    sandbox.stub(context.globalState, "get").returns("4.99.0");
    sandbox.stub(context.globalState, "update").resolves();
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    assert(spyChecker.callCount == 1);
    spyChecker.restore();
  });
});
