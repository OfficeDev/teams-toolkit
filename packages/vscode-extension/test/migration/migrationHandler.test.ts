// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppMigrationHandler } from "../../src/migration/migrationHandler";
import vsCodeLogProvider from "../../src/commonlib/log";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as replaceTsSDK from "../../src/migration/migrationTool/ts/replaceTsSDK";
import * as fs from "fs-extra";
import * as sinon from "sinon";
import * as chai from "chai";
import { teamsClientSDKVersion } from "../../src/migration/constants";
const PackageJson = require("@npmcli/package-json");

describe("TeamsAppMigrationHandler", () => {
  describe("updateCodes", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(fs, "readdir").resolves(["test.ts", "test.js"] as any);
      sandbox.stub(fs, "stat").resolves({
        isDirectory: () => false,
        isFile: () => true,
      } as any);
      sandbox.stub(fs, "readFile").resolves(Buffer.from(""));
      sandbox.stub(vsCodeLogProvider, "info").resolves();
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(replaceTsSDK, "default").returns("");
      sandbox.stub(fs, "writeFile").resolves();

      const migrationHandler = new TeamsAppMigrationHandler("test");
      const result = await migrationHandler.updateCodes();
      chai.expect(result.isOk()).equals(true);
    });
  });

  describe("updatePackageJson", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(fs, "pathExists").resolves(true);
      let packageJson;
      sandbox.stub(PackageJson, "load").resolves({
        content: {
          dependencies: {
            "@microsoft/teams-js": "1.0.0",
          },
        },
        update: (content: any) => {
          packageJson = content;
        },
        save: () => {},
      });
      const migrationHandler = new TeamsAppMigrationHandler("test");
      const result = await migrationHandler.updatePackageJson();
      if (result.isErr()) {
        console.log(result.error);
      }
      chai.expect(result.isOk()).equals(true);
      chai.expect((result as any).value).equals(true);
      chai.expect(packageJson).deep.equals({
        dependencies: {
          "@microsoft/teams-js": teamsClientSDKVersion,
        },
        devDependencies: undefined,
      });
    });

    it("no package.json", async () => {
      sandbox.stub(fs, "pathExists").resolves(false);
      const migrationHandler = new TeamsAppMigrationHandler("test");
      const result = await migrationHandler.updatePackageJson();
      chai.expect(result.isOk()).equals(true);
      chai.expect((result as any).value).equals(false);
    });
  });
});
