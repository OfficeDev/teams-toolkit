import * as chai from "chai";
import * as fs from "fs-extra";
import * as sinon from "sinon";
import { ExtensionContext } from "vscode";

import * as globalVariables from "../../src/globalVariables";
import { UriHandler } from "../../src/uriHandler";

describe("Global Variables", () => {
  it("set uri handler", async () => {
    const uriHandler = new UriHandler();
    globalVariables.setUriEventHandler(uriHandler);

    sinon.restore();
  });

  it("set log folder", async () => {
    sinon.stub(globalVariables, "getWorkspacePath").returns(undefined);
    sinon.stub(fs, "pathExists").resolves(false);
    sinon.stub(fs, "mkdir").callsFake(async () => {});
    await globalVariables.initializeGlobalVariables({
      globalState: {
        get: () => undefined,
      },
      logUri: {
        fsPath: "fakePath",
      },
    } as unknown as ExtensionContext);
    chai.expect(globalVariables.defaultExtensionLogPath).equals("fakePath");
    sinon.restore();
  });

  it("set commandIsRunning", async () => {
    globalVariables.setCommandIsRunning(true);

    chai.expect(globalVariables.commandIsRunning).equals(true);
    sinon.restore();
  });
});
