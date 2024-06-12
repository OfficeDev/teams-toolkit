import * as chai from "chai";
import * as sinon from "sinon";
import * as globalVariables from "../../../src/globalVariables";
import { Uri } from "vscode";
import { envUtil, metadataUtil, pathUtils } from "@microsoft/teamsfx-core";
import * as envTreeUtils from "../../../src/utils/envTreeUtils";
import { ok } from "@microsoft/teamsfx-api";

describe("EnvTreeUtils", () => {
  describe("getProvisionSucceedFromEnv", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("returns false if teamsAppId is empty", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(envUtil, "readEnv").resolves(
        ok({
          TEAMS_APP_ID: "",
        })
      );

      const result = await envTreeUtils.getProvisionSucceedFromEnv("test");

      chai.expect(result).equals(false);
    });

    it("returns true if teamsAppId is not empty", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(envUtil, "readEnv").resolves(
        ok({
          TEAMS_APP_ID: "xxx",
        })
      );
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(pathUtils, "getYmlFilePath");
      sandbox.stub(metadataUtil, "parse").resolves(ok({} as any));

      const result = await envTreeUtils.getProvisionSucceedFromEnv("test");

      chai.expect(result).equals(true);
    });

    it("returns false if teamsAppId has error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(envUtil, "readEnv").resolves(ok({}));

      const result = await envTreeUtils.getProvisionSucceedFromEnv("test");

      chai.expect(result).equals(false);
    });
  });
});
