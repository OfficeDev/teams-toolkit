// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import { v4 as uuid } from "uuid";
import { TeamsAppManifest, ok, Platform } from "@microsoft/teamsfx-api";
import { PublishAppPackageDriver } from "../../../../src/component/driver/teamsApp/publishAppPackage";
import { PublishAppPackageArgs } from "../../../../src/component/driver/teamsApp/interfaces/PublishAppPackageArgs";
import { AppStudioError } from "../../../../src/component/driver/teamsApp/errors";
import {
  MockedLogProvider,
  MockedM365Provider,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import { AppStudioClient } from "../../../../src/component/driver/teamsApp/clients/appStudioClient";
import { Constants } from "./../../../../src/component/driver/teamsApp/constants";
import { PublishingState } from "../../../../src/component/driver/teamsApp/interfaces/appdefinitions/IPublishingAppDefinition";
import { UserCancelError } from "../../../../src/error/common";

describe("teamsApp/publishAppPackage", async () => {
  const teamsAppDriver = new PublishAppPackageDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    logProvider: new MockedLogProvider(),
    ui: new MockedUserInteraction(),
    projectPath: "./",
  };

  const state = {
    lastModifiedDateTime: new Date(),
    teamsAppId: "",
    displayName: "fakeName",
    publishingState: PublishingState.submitted,
  };

  afterEach(() => {
    sinon.restore();
  });

  it("should throw error if file not exists", async () => {
    const args: PublishAppPackageArgs = {
      appPackagePath: "fakepath",
    };

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(AppStudioError.FileNotFoundError.name, result.error.name);
    }
  });

  it("invalid param error", async () => {
    const args: PublishAppPackageArgs = {
      appPackagePath: "",
    };

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal("InvalidActionInputError", result.error.name);
    }
  });

  it("happy path", async () => {
    const args: PublishAppPackageArgs = {
      appPackagePath: "fakepath",
    };

    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(new TeamsAppManifest())));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });
    sinon.stub(AppStudioClient, "getAppByTeamsAppId").resolves(undefined);
    sinon.stub(AppStudioClient, "publishTeamsApp").resolves(uuid());

    const result = await teamsAppDriver.execute(args, mockedDriverContext);
    console.log(JSON.stringify(result));
    chai.assert.isTrue(result.result.isOk());
  });

  it("happy path - user cancel", async () => {
    const args: PublishAppPackageArgs = {
      appPackagePath: "fakepath",
    };

    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(new TeamsAppManifest())));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });
    sinon.stub(AppStudioClient, "getAppByTeamsAppId").resolves(state);
    sinon.stub(mockedDriverContext.ui, "showMessage").resolves(ok("Cancel"));

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof UserCancelError);
    }
  });

  it("happy path - update published app", async () => {
    const args: PublishAppPackageArgs = {
      appPackagePath: "fakepath",
    };

    mockedDriverContext.platform = Platform.CLI;

    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(new TeamsAppManifest())));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });
    sinon.stub(AppStudioClient, "getAppByTeamsAppId").resolves(state);
    sinon.stub(AppStudioClient, "publishTeamsAppUpdate").resolves(uuid());
    sinon.stub(mockedDriverContext.ui, "showMessage").resolves(ok("Confirm"));

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert.isTrue(result.isOk());
  });
});
