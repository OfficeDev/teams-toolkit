import chai from "chai";
import * as sinon from "sinon";
import "mocha";
import fs from "fs-extra";
import { SyncManifestDriver } from "../../../../src/component/driver/teamsApp/syncManifest";
import { AppStudioError } from "../../../../src/component/driver/teamsApp/errors";
import { SyncManifestArgs } from "../../../../src/component/driver/teamsApp/interfaces/SyncManifest";
import { MockedLogProvider, MockedM365Provider } from "../../../plugins/solution/util";
import { envUtil } from "../../../../src/component/utils/envUtil";
import { manifestUtils } from "../../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { ok, err, TeamsAppManifest, Err, UserError } from "@microsoft/teamsfx-api";
import * as appStudio from "../../../../src/component/driver/teamsApp/appStudio";

describe("teamsApp/syncManifest", async () => {
  const syncManifestDriver = new SyncManifestDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    logProvider: new MockedLogProvider(),
  };

  afterEach(() => {
    sinon.restore();
  });

  it("should throw error if projectPath or env is empty", async () => {
    const emptyMap = new Map<string, string>();
    const args: SyncManifestArgs = {
      projectPath: emptyMap.get("projectPath") as string,
      env: emptyMap.get("env") as string,
    };
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(AppStudioError.SyncManifestFailedError.name, result.error.name);
    }
  });

  it("should handle getTeamsAppIdAndManifestTemplatePath error", async () => {
    const args: SyncManifestArgs = {
      projectPath: "fakePath",
      env: "dev",
    };
    sinon
      .stub(syncManifestDriver, "getTeamsAppIdAndManifestTemplatePath" as keyof SyncManifestDriver)
      .resolves(err(new Error("fake error")));
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal("fake error", result.error.message);
    }
  });

  it("should save new manifest and return ok", async () => {
    const args: SyncManifestArgs = {
      projectPath: "fakePath",
      env: "dev",
    };
    const teamsAppId = "mockedTeamsAppId";
    const manifestTemplatePath = "mockedManifestTemplatePath";
    sinon
      .stub(syncManifestDriver, "getTeamsAppIdAndManifestTemplatePath" as keyof SyncManifestDriver)
      .resolves(
        ok(
          new Map([
            ["teamsAppId", teamsAppId],
            ["manifestTemplatePath", manifestTemplatePath],
          ])
        )
      );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(envUtil, "readEnv").resolves(ok({}));
    sinon.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(JSON.stringify({})),
      })
    );
    sinon.stub(manifestUtils, "_readAppManifest").resolves(ok({} as TeamsAppManifest));
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
  });

  it("should return error if new manifest does not exist", async () => {
    const args: SyncManifestArgs = {
      projectPath: "fakePath",
      env: "dev",
    };
    sinon
      .stub(syncManifestDriver, "getTeamsAppIdAndManifestTemplatePath" as keyof SyncManifestDriver)
      .resolves(
        ok(
          new Map([
            ["teamsAppId", "mockedTeamsAppId"],
            ["manifestTemplatePath", "mockedManifestTemplatePath"],
          ])
        )
      );
    sinon.stub(appStudio, "getAppPackage").resolves(err(new UserError("source", "name", "", "")));
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isErr());
  });
});
