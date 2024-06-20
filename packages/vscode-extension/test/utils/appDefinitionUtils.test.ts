import * as chai from "chai";
import * as sinon from "sinon";
import * as appDefinitionUtils from "../../src/utils/appDefinitionUtils";
import * as globalVariables from "../../src/globalVariables";
import { MockCore } from "../mocks/mockCore";
import { Uri } from "vscode";
import { UserError, err, ok } from "@microsoft/teamsfx-api";
import { envUtil, metadataUtil, pathUtils } from "@microsoft/teamsfx-core";

describe("AppDefinitionUtils", () => {
  describe("getAppName", async () => {
    const sandbox = sinon.createSandbox();
    const core = new MockCore();

    beforeEach(() => {
      sandbox.stub(globalVariables, "core").value(core);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(core, "getTeamsAppName").resolves(ok("mock-app-name"));
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      const result = await appDefinitionUtils.getAppName();
      chai.expect(result).equals("mock-app-name");
    });

    it("workspaceUri is undefined", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(undefined);
      const result = await appDefinitionUtils.getAppName();
      chai.expect(result).equals(undefined);
    });

    it("return error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getTeamsAppName").resolves(err(new UserError({})));
      const result = await appDefinitionUtils.getAppName();
      chai.expect(result).equals(undefined);
    });

    it("throw error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getTeamsAppName").rejects(new UserError({}));
      const result = await appDefinitionUtils.getAppName();
      chai.expect(result).equals(undefined);
    });

    it("should return undefined if getTeamsAppName returns empty string", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getTeamsAppName").resolves(ok(""));
      const result = await appDefinitionUtils.getAppName();
      chai.expect(result).equals(undefined);
    });
  });

  describe("getV3TeamsAppId", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("returns teamsAppId successfully", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(pathUtils, "getYmlFilePath");
      sandbox.stub(metadataUtil, "parse").resolves(
        ok({
          provision: {
            driverDefs: [
              { uses: "teamsApp/create", writeToEnvironmentFile: { teamsAppId: "TeamsAppId" } },
            ],
          },
        } as any)
      );
      sandbox.stub(envUtil, "readEnv").resolves(ok({ TeamsAppId: "testId" } as any));

      const result = await appDefinitionUtils.getV3TeamsAppId("testProjectPath", "test");
      chai.expect(result).equals("testId");
    });

    it("readEnv throws error", async () => {
      sandbox.stub(envUtil, "readEnv").resolves(err("error") as any);

      appDefinitionUtils.getV3TeamsAppId("testProjectPath", "test").catch((e) => {
        chai.expect(e).equals("error");
      });
    });

    it("throws error if Teams app id is missing", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(pathUtils, "getYmlFilePath");
      sandbox.stub(metadataUtil, "parse").resolves(
        ok({
          provision: {
            driverDefs: [
              { uses: "teamsApp/create", writeToEnvironmentFile: { teamsAppId: "NonExist" } },
            ],
          },
        } as any)
      );
      sandbox.stub(envUtil, "readEnv").resolves(ok({ TeamsAppId: "testId" } as any));

      appDefinitionUtils.getV3TeamsAppId("testProjectPath", "test").catch((e) => {
        chai.expect(e).to.be.an.instanceOf(UserError);
        chai.expect(e.message).equals("TEAMS_APP_ID is missing in test environment.");
      });
    });
  });

  describe("getTeamsAppKeyName", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("returns teamsAppId successfully", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(pathUtils, "getYmlFilePath");
      sandbox.stub(metadataUtil, "parse").resolves(
        ok({
          provision: {
            driverDefs: [
              { uses: "teamsApp/create", writeToEnvironmentFile: { teamsAppId: "TeamsAppId" } },
            ],
          },
        } as any)
      );

      const result = await appDefinitionUtils.getTeamsAppKeyName("test");
      chai.expect(result).equals("TeamsAppId");
    });

    it("returns undefined if failed to parse", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(pathUtils, "getYmlFilePath");
      sandbox.stub(metadataUtil, "parse").resolves(err({ error: "error" } as any));

      const result = await appDefinitionUtils.getTeamsAppKeyName("test");
      chai.expect(result).is.undefined;
    });

    it("returns undefined if no driverDefs", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(pathUtils, "getYmlFilePath");
      sandbox.stub(metadataUtil, "parse").resolves(
        ok({
          provision: {
            driverDefs: [],
          },
        } as any)
      );

      const result = await appDefinitionUtils.getTeamsAppKeyName("test");
      chai.expect(result).is.undefined;
    });

    it("returns undefined if no teamsApp/create in driverDefs", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(pathUtils, "getYmlFilePath");
      sandbox.stub(metadataUtil, "parse").resolves(
        ok({
          provision: {
            driverDefs: [
              { uses: "teamsApp/fake", writeToEnvironmentFile: { teamsAppId: "TeamsAppId" } },
            ],
          },
        } as any)
      );

      const result = await appDefinitionUtils.getTeamsAppKeyName("test");
      chai.expect(result).is.undefined;
    });

    it("returns undefined if no writeToEnvironmentFile is defined", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(pathUtils, "getYmlFilePath");
      sandbox.stub(metadataUtil, "parse").resolves(
        ok({
          provision: {
            driverDefs: [{ uses: "teamsApp/create" }],
          },
        } as any)
      );

      const result = await appDefinitionUtils.getTeamsAppKeyName("test");
      chai.expect(result).is.undefined;
    });
  });
});
