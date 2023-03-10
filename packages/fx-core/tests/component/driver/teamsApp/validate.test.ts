// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import fs from "fs-extra";
import { ValidateTeamsAppDriver } from "../../../../src/component/driver/teamsApp/validate";
import { ValidateTeamsAppArgs } from "../../../../src/component/driver/teamsApp/interfaces/ValidateTeamsAppArgs";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";
import { AppStudioClient } from "../../../../src/component/resource/appManifest/appStudioClient";
import {
  MockedLogProvider,
  MockedM365Provider,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import * as tools from "../../../../src/common/tools";
import { Platform, TeamsAppManifest } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import { Constants } from "../../../../src/component/resource/appManifest/constants";
import { metadataUtil } from "../../../../src/component/utils/metadataUtil";

describe("teamsApp/validate", async () => {
  const teamsAppDriver = new ValidateTeamsAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    logProvider: new MockedLogProvider(),
    ui: new MockedUserInteraction(),
    projectPath: "./",
  };

  afterEach(() => {
    sinon.restore();
  });

  it("file not found", async () => {
    sinon.stub(tools, "isValidationEnabled").resolves(true);
    const args: ValidateTeamsAppArgs = {
      appPackagePath: "fakepath",
    };

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(AppStudioError.FileNotFoundError.name, result.error.name);
    }
  });

  it("invalid param error", async () => {
    sinon.stub(tools, "isValidationEnabled").resolves(true);
    const args: ValidateTeamsAppArgs = {};

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(AppStudioError.InvalidParameterError.name, result.error.name);
    }
  });

  it("happy path", async () => {
    const args: ValidateTeamsAppArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
    };

    process.env.CONFIG_TEAMS_APP_NAME = "fakeName";

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
  });

  it("execute", async () => {
    const args: ValidateTeamsAppArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
    };

    process.env.CONFIG_TEAMS_APP_NAME = "fakeName";

    const result = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert(result.result.isOk());
  });

  it("happy path - VS", async () => {
    const args: ValidateTeamsAppArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
    };

    mockedDriverContext.platform = Platform.VS;

    process.env.CONFIG_TEAMS_APP_NAME = "fakeName";

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
  });

  it("happy path - partnerCenterValidation", async () => {
    sinon.stub(tools, "isValidationEnabled").resolves(true);
    sinon.stub(AppStudioClient, "partnerCenterAppPackageValidation").resolves({
      errors: [
        {
          id: "fakeId",
          content: "Reserved Tab Name property should not be specified.",
          filePath: "",
          helpUrl: "https://docs.microsoft.com",
          shortCodeNumber: 123,
          validationCategory: "tab",
          title: "tab name",
        },
      ],
      status: "Rejected",
      warnings: [
        {
          id: "fakeId",
          content: "Valid domains cannot contain a hosting site with a wildcard.",
          filePath: "",
          helpUrl: "https://docs.microsoft.com",
          shortCodeNumber: 123,
          validationCategory: "domain",
          title: "valid domain",
        },
      ],
      notes: [],
      addInDetails: {
        displayName: "fake name",
        developerName: "fake name",
        version: "1.14.1",
        manifestVersion: "1.14.1",
      },
    });
    sinon.stub(fs, "pathExists").resolves(true);
    // sinon.stub(fs, "readFile").resolves(Buffer.from(""));
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(new TeamsAppManifest())));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });
    sinon.stub(metadataUtil, "parseManifest");

    const args: ValidateTeamsAppArgs = {
      appPackagePath: "fakePath",
    };
    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
  });
});
