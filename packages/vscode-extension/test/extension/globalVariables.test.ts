import * as chai from "chai";
import * as fs from "fs-extra";
import * as sinon from "sinon";
import { ExtensionContext } from "vscode";

import * as globalVariables from "../../src/globalVariables";
import { UriHandler } from "../../src/uriHandler";
import { isV3Enabled } from "@microsoft/teamsfx-core";
import * as commonTools from "@microsoft/teamsfx-core/build/common/tools";
import * as projectSettingHelper from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";

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

    it("return false for non-spfx project -v3", async () => {
      sinon.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return false;
      });
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(projectSettingHelper, "isValidProject").returns(true);
      sinon.stub(globalVariables, "workspaceUri").returns({ fsPath: "/test" });
      sinon.stub(fs, "readdirSync").returns(["package.json"] as any);

      globalVariables.initializeGlobalVariables({
        globalState: {
          get: () => undefined,
        },
      } as unknown as ExtensionContext);

      chai.expect(globalVariables.isSPFxProject).equals(false);

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

    it("return true for spfx project -v3", async () => {
      sinon.stub(fs, "existsSync").callsFake((path: fs.PathLike) => {
        return false;
      });
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(projectSettingHelper, "isValidProject").returns(true);
      sinon.stub(globalVariables, "workspaceUri").value({ fsPath: "/test" });
      sinon.stub(fs, "readdirSync").returns([".yo-rc.json"] as any);
      sinon
        .stub(fs, "readJsonSync")
        .returns({ "@microsoft/generator-sharepoint": { version: " 1.16.0" } });

      globalVariables.initializeGlobalVariables({
        globalState: {
          get: () => undefined,
        },
      } as unknown as ExtensionContext);

      chai.expect(globalVariables.isSPFxProject).equals(true);

      sinon.restore();
    });

    it("set uri handler", async () => {
      const uriHandler = new UriHandler();
      globalVariables.setUriEventHandler(uriHandler);

      sinon.restore();
    });
  });
});
