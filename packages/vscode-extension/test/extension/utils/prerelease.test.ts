import * as sinon from "sinon";
import * as chai from "chai";
import { PrereleasePage } from "../../../src/utils/prerelease";
import { ExtensionContext } from "vscode";
import mockedEnv, { RestoreFn } from "mocked-env";
import { assert } from "console";

enum PrereleaseState {
  Version = "teamsToolkit:prerelease:version",
}

describe("versionUtil", () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn;
  let context: ExtensionContext;
  const setKeysForSync = (keys: readonly string[]) => {};
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "true" });
    sandbox.stub(PrereleasePage.prototype, "show").resolves();
    context = {
      subscriptions: [],
    } as unknown as ExtensionContext;
  });
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });
  it("checkAndShow success", async () => {
    context.globalState.update(PrereleaseState.Version, "4.99.0");
    sandbox.stub(PrereleasePage.prototype, "getTeamsToolkitVersion").returns("4.3.0");
    const instance = new PrereleasePage(context);
    const spyChecker = sandbox.spy(context.globalState, "update");
    await instance.checkAndShow();
    assert(spyChecker.callCount == 1);
    spyChecker.restore();
  });
});
