import * as chai from "chai";
import * as fs from "fs";
import * as sinon from "sinon";
import { ExtensionContext } from "vscode";

import * as globalVariables from "../../../src/globalVariables";

suite("Global Variables", () => {
  suite("isSPFxProject", () => {
    test("return false for non-spfx project", async () => {
      sinon.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return false;
      });

      globalVariables.initializeExtensionVariables({} as ExtensionContext);

      chai.expect(globalVariables.isSPFxProject).equals(false);

      sinon.restore();
    });

    test("return true for spfx project", async () => {
      sinon.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return true;
      });

      globalVariables.initializeExtensionVariables({} as ExtensionContext);

      chai.expect(globalVariables.isSPFxProject).equals(true);

      sinon.restore();
    });
  });
});
