// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import { ok, TeamsAppManifest } from "@microsoft/teamsfx-api";
import { v4 as uuid } from "uuid";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import { CreateTeamsAppDriver } from "../../../../src/component/driver/teamsApp/create";
import { CreateAppPackageDriver } from "../../../../src/component/driver/teamsApp/createAppPackage";
import { CreateTeamsAppArgs } from "../../../../src/component/driver/teamsApp/interfaces/CreateTeamsAppArgs";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";
import {
  MockedLogProvider,
  MockedM365Provider,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import { AppStudioClient } from "../../../../src/component/resource/appManifest/appStudioClient";
import { AppDefinition } from "./../../../../src/component/resource/appManifest/interfaces/appDefinition";
import { Constants } from "./../../../../src/component/resource/appManifest/constants";

describe("teamsApp/create", async () => {
  const teamsAppDriver = new CreateTeamsAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    logProvider: new MockedLogProvider(),
    ui: new MockedUserInteraction(),
  };

  const appDef: AppDefinition = {
    appName: "fake",
    teamsAppId: uuid(),
    userList: [],
  };

  afterEach(() => {
    sinon.restore();
  });

  it("should throw error if file not exists", async () => {
    const args: CreateTeamsAppArgs = {
      manifestTemplatePath: "fakePath",
    };

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(AppStudioError.FileNotFoundError.name, result.error.name);
    }
  });

  it("happy path", async () => {
    const args: CreateTeamsAppArgs = {
      manifestTemplatePath: "fakePath",
    };

    const zipFileName =
      "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip";

    sinon
      .stub(CreateAppPackageDriver.prototype, "run")
      .resolves(ok(new Map([["TEAMS_APP_PACKAGE_PATH", zipFileName]])));
    sinon.stub(AppStudioClient, "getApp").throws(new Error("404"));
    sinon.stub(AppStudioClient, "importApp").resolves(appDef);
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(new TeamsAppManifest())));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    console.log(JSON.stringify(result));
    chai.assert.isTrue(result.isOk());
  });
});
