import * as chai from "chai";
import * as fs from "fs";
import * as sinon from "sinon";
import { ExtensionContext } from "vscode";

import * as globalVariables from "../../src/globalVariables";
import { UriHandler } from "../../src/uriHandler";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Global Variables", () => {
  describe("isSPFxProject", () => {
    it("return false for non-spfx project", async () => {
      sinon.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return false;
      });

      globalVariables.initializeGlobalVariables({
        globalState: {
          get: () => undefined,
        },
      } as unknown as ExtensionContext);

      if (!isV3Enabled()) {
        chai.expect(globalVariables.isSPFxProject).equals(false);
      }

      sinon.restore();
    });

    it("return true for spfx project", async () => {
      sinon.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return true;
      });

      globalVariables.initializeGlobalVariables({
        globalState: {
          get: () => undefined,
        },
      } as unknown as ExtensionContext);

      if (!isV3Enabled()) {
        chai.expect(globalVariables.isSPFxProject).equals(true);
      }

      sinon.restore();
    });

    it("set uri handler", async () => {
      const uriHandler = new UriHandler();
      globalVariables.setUriEventHandler(uriHandler);

      sinon.restore();
    });
  });
});
