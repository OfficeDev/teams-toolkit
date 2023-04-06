// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import fs from "fs-extra";
import { CreateAppPackageDriver } from "../../../../src/component/driver/teamsApp/createAppPackage";
import { CreateAppPackageArgs } from "../../../../src/component/driver/teamsApp/interfaces/CreateAppPackageArgs";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";
import { MockedM365Provider } from "../../../plugins/solution/util";
import { FileNotFoundError } from "../../../../src/error/common";
import { manifestUtils } from "../../../../src/component/resource/appManifest/utils/ManifestUtils";
import { ok, TeamsAppManifest } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";

describe("teamsApp/createAppPackage", async () => {
  const teamsAppDriver = new CreateAppPackageDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    projectPath: "./",
  };

  afterEach(() => {
    sinon.restore();
  });

  it("should throw error if file not exists case 1", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "fakepath",
      outputZipPath: "fakePath",
      outputJsonPath: "fakePath",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(new TeamsAppManifest()));
    sinon.stub(fs, "pathExists").onFirstCall().resolves(false);
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });
  it("should throw error if file not exists case 2", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "fakepath",
      outputZipPath: "fakePath",
      outputJsonPath: "fakePath",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(new TeamsAppManifest()));
    sinon.stub(fs, "pathExists").onFirstCall().resolves(true).onSecondCall().resolves(false);
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });
  it("should throw error if file not exists case 3", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "fakepath",
      outputZipPath: "fakePath",
      outputJsonPath: "fakePath",
    };
    const manifest = new TeamsAppManifest();
    manifest.localizationInfo = {
      additionalLanguages: [{ file: "aaa", languageTag: "zh" }],
      defaultLanguageTag: "en",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sinon
      .stub(fs, "pathExists")
      .onFirstCall()
      .resolves(true)
      .onSecondCall()
      .resolves(true)
      .onThirdCall()
      .resolves(false);
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });
  it("invalid param error", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "",
      outputZipPath: "",
      outputJsonPath: "",
    };
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal("InvalidActionInputError", result.error.name);
    }
  });

  it("happy path", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    process.env.CONFIG_TEAMS_APP_NAME = "fakeName";
    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
    if (await fs.pathExists(args.outputZipPath)) {
      await fs.remove(args.outputZipPath);
    }

    const executeResult = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(executeResult.result.isOk());
  });

  it("happy path - withEmptyCapabilities", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    process.env.CONFIG_TEAMS_APP_NAME = "fakeName";
    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
    if (await fs.pathExists(args.outputZipPath)) {
      await fs.remove(args.outputZipPath);
    }
  });
});
