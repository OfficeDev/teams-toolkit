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
import { ok, err, TeamsAppManifest, Err, UserError, Result, FxError } from "@microsoft/teamsfx-api";
import * as appStudio from "../../../../src/component/driver/teamsApp/appStudio";
import { DotenvOutput, getLocalizedString } from "../../../../build";
import { metadataUtil, pathUtils } from "../../../../src";
import { ILifecycle, ProjectModel } from "../../../../src/component/configManager/interface";

describe("teamsApp/syncManifest", async () => {
  const syncManifestDriver = new SyncManifestDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    logProvider: new MockedLogProvider(),
  };

  afterEach(() => {
    sinon.restore();
  });

  it("projectPath or env is empty", async () => {
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

  it("getTeamsAppIdAndManifestTemplatePath error", async () => {
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

  it("new manifest does not exist", async () => {
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
    if (result.isErr()) {
      chai.assert.equal("name", result.error.name);
    }
  });

  it("new manifest is empty", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(ok({}));
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal("SyncManifestFailed", result.error.name);
    }
  });

  it("cannot find current manifest", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(JSON.stringify({})),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(fs, "pathExists").resolves(false);
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.equal("FileNotFoundError", result.error.name);
    }
  });

  it("add diff", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            version: "1.0",
            id: "1",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "1",
      } as TeamsAppManifest)
    );
    sinon.stub(envUtil, "readEnv").throws("error");
    sinon.stub(envUtil, "writeEnv").throws("error");
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("delete diff", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "1",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "1",
        version: "1.0",
      } as TeamsAppManifest)
    );
    sinon.stub(envUtil, "readEnv").throws("error");
    sinon.stub(envUtil, "writeEnv").throws("error");
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("edit diff", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "id-11",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").resolves(
      ok({
        TEAMS_APP_ID: "2",
      } as DotenvOutput)
    );
    sinon
      .stub(envUtil, "writeEnv")
      .callsFake(
        (
          projectPath: string,
          env: string,
          newEnv: DotenvOutput
        ): Promise<Result<undefined, FxError>> => {
          if (
            projectPath === args.projectPath &&
            env === args.env &&
            JSON.stringify(newEnv) === JSON.stringify({ TEAMS_APP_ID: "11" })
          ) {
            return Promise.resolve(ok(undefined));
          } else {
            return Promise.resolve(
              err(new UserError("ut", "Invalid parameters passed to writeEnv", "", ""))
            );
          }
        }
      );

    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "id-${{TEAMS_APP_ID}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("edit diff with placeholder conflicts", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "11",
            version: "22",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").throws("error");
    sinon.stub(envUtil, "writeEnv").throws("error");
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "${{TEAMS_APP_ID}}",
        version: "${{TEAMS_APP_ID}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("edit diff with no placeholder in template", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "11",
            version: "22",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").throws("error");
    sinon.stub(envUtil, "writeEnv").throws("error");
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "111",
        version: "222",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("edit diff - cannot match template", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "11",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").throws("error");
    sinon.stub(envUtil, "writeEnv").throws("error");
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "app-${{TEAMS_APP_ID}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("edit diff - placeholder conflicts in one match", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "app-1-2",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").throws("error");
    sinon.stub(envUtil, "writeEnv").throws("error");
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "app-${{TEAMS_APP_ID}}-${{TEAMS_APP_ID}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("no diff", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "1",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").throws("error");
    sinon.stub(envUtil, "writeEnv").throws("error");
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "1",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("edit diff with same placeholders", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "1",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").resolves(
      ok({
        TEAMS_APP_ID: "1",
      } as DotenvOutput)
    );
    sinon.stub(envUtil, "writeEnv").throws("error");
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "${{TEAMS_APP_ID}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("edit diff with duplicate placeholders", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "1",
            packageName: "1",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").resolves(
      ok({
        TEAMS_APP_ID: "1",
      } as DotenvOutput)
    );
    sinon.stub(envUtil, "writeEnv").throws("error");
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "${{TEAMS_APP_ID}}",
        packageName: "${{TEAMS_APP_ID}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("read env failed", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "1",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").resolves(err(new UserError("ut", "error", "", "")));
    sinon.stub(envUtil, "writeEnv").throws("error");
    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "${{TEAMS_APP_ID}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.deepEqual(result.error.name, "error");
    }
  });

  it("read env failed in getTeamsAppIdAndManifestTemplatePath", async () => {
    const args: SyncManifestArgs = {
      projectPath: "fakePath",
      env: "dev",
    };
    sinon.stub(appStudio, "getAppPackage").throws("error");
    sinon.stub(fs, "mkdir").throws("error");
    sinon.stub(fs, "writeFile").throws("error");
    sinon.stub(envUtil, "readEnv").resolves(err(new UserError("ut", "error", "", "")));
    sinon.stub(envUtil, "writeEnv").throws("error");
    sinon.stub(manifestUtils, "_readAppManifest").throws("error");
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.deepEqual(result.error.name, "error");
    }
  });

  it("write env failed", async () => {
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
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "id-11",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").resolves(
      ok({
        TEAMS_APP_ID: "2",
      } as DotenvOutput)
    );
    sinon.stub(envUtil, "writeEnv").resolves(err(new UserError("ut", "error", "", "")));

    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "id-${{TEAMS_APP_ID}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.deepEqual(result.error.name, "error");
    }
  });

  it("happy path", async () => {
    const args: SyncManifestArgs = {
      projectPath: "fakePath",
      env: "dev",
    };
    const mockProjectModel: any = {
      projectId: "12345",
      provision: {
        name: "provision",
        driverDefs: [
          {
            uses: "teamsApp/create",
            with: {
              name: "testappname${{APP_NAME_SUFFIX}}",
            },
            writeToEnvironmentFile: {
              teamsAppId: "TEAMS_APP_ID",
            },
          },
          {
            uses: "teamsApp/zipAppPackage",
            with: {
              manifestPath: "./",
            },
            writeToEnvironmentFile: {
              teamsAppId: "TEAMS_APP_ID",
            },
          },
        ],
      },
    };
    sinon.stub(pathUtils, "getYmlFilePath").resolves("");
    sinon.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "1",
            version: "2.0",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").resolves(
      ok({
        VERSION: "1.0",
        TEAMS_APP_ID: "1",
      } as DotenvOutput)
    );
    sinon
      .stub(envUtil, "writeEnv")
      .callsFake(
        (
          projectPath: string,
          env: string,
          newEnv: DotenvOutput
        ): Promise<Result<undefined, FxError>> => {
          if (
            projectPath === args.projectPath &&
            env === args.env &&
            JSON.stringify(newEnv) === JSON.stringify({ VERSION: "2.0" })
          ) {
            return Promise.resolve(ok(undefined));
          } else {
            return Promise.resolve(
              err(new UserError("ut", "Invalid parameters passed to writeEnv", "", ""))
            );
          }
        }
      );

    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "1",
        version: "${{VERSION}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });

  it("happy path with teamsApp Id", async () => {
    const args: SyncManifestArgs = {
      projectPath: "fakePath",
      env: "dev",
      teamsAppId: "1",
    };
    const mockProjectModel: any = {
      projectId: "12345",
      provision: {
        name: "provision",
        driverDefs: [
          {
            uses: "teamsApp/create",
            with: {
              name: "testappname${{APP_NAME_SUFFIX}}",
            },
            writeToEnvironmentFile: {
              teamsAppId: "TEAMS_APP_ID",
            },
          },
          {
            uses: "teamsApp/zipAppPackage",
            with: {
              manifestPath: "./",
            },
            writeToEnvironmentFile: {
              teamsAppId: "TEAMS_APP_ID",
            },
          },
        ],
      },
    };
    sinon.stub(pathUtils, "getYmlFilePath").resolves("");
    sinon.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
    sinon.stub(appStudio, "getAppPackage").resolves(
      ok({
        manifest: Buffer.from(
          JSON.stringify({
            id: "1",
            version: "2.0",
          })
        ),
      })
    );
    sinon.stub(fs, "mkdir").resolves();
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(envUtil, "readEnv").resolves(
      ok({
        VERSION: "1.0",
      } as DotenvOutput)
    );
    sinon
      .stub(envUtil, "writeEnv")
      .callsFake(
        (
          projectPath: string,
          env: string,
          newEnv: DotenvOutput
        ): Promise<Result<undefined, FxError>> => {
          if (
            projectPath === args.projectPath &&
            env === args.env &&
            JSON.stringify(newEnv) === JSON.stringify({ VERSION: "2.0" })
          ) {
            return Promise.resolve(ok(undefined));
          } else {
            return Promise.resolve(
              err(new UserError("ut", "Invalid parameters passed to writeEnv", "", ""))
            );
          }
        }
      );

    sinon.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        id: "1",
        version: "${{VERSION}}",
      } as TeamsAppManifest)
    );
    const result = await syncManifestDriver.sync(args, mockedDriverContext);
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, new Map<string, string>());
    }
  });
});
