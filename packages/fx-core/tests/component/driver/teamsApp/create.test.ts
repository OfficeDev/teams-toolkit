// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import { ok, TeamsAppManifest, err, UserError } from "@microsoft/teamsfx-api";
import { v4 as uuid } from "uuid";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import { CreateTeamsAppDriver } from "../../../../src/component/driver/teamsApp/create";
import { CreateAppPackageDriver } from "../../../../src/component/driver/teamsApp/createAppPackage";
import { CreateTeamsAppArgs } from "../../../../src/component/driver/teamsApp/interfaces/CreateTeamsAppArgs";
import {
  MockedLogProvider,
  MockedM365Provider,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import { AppStudioClient } from "../../../../src/component/driver/teamsApp/clients/appStudioClient";
import { AppDefinition } from "./../../../../src/component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { Constants } from "./../../../../src/component/driver/teamsApp/constants";
import { ExecutionResult } from "../../../../src/component/driver/interface/stepDriver";

describe("teamsApp/create", async () => {
  const teamsAppDriver = new CreateTeamsAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    logProvider: new MockedLogProvider(),
    ui: new MockedUserInteraction(),
    projectPath: "./",
  };

  const appDef: AppDefinition = {
    appName: "fake",
    teamsAppId: uuid(),
    userList: [],
    tenantId: uuid(),
  };

  afterEach(() => {
    sinon.restore();
  });

  it("invalid param error", async () => {
    const args: CreateTeamsAppArgs = {
      name: "",
    };
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal("InvalidActionInputError", result.error.name);
    }
  });

  it("happy path", async () => {
    const args: CreateTeamsAppArgs = {
      name: appDef.appName!,
    };

    const zipFileName =
      "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip";

    const stubResult: ExecutionResult = {
      summaries: [],
      result: ok(new Map([["TEAMS_APP_PACKAGE_PATH", zipFileName]])),
    };
    sinon.stub(CreateAppPackageDriver.prototype, "execute").resolves(stubResult);
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

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    console.log(JSON.stringify(result));
    chai.assert.isTrue(result.isOk());

    const executeResult = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(executeResult.result.isOk());
    chai.assert.isTrue(executeResult.summaries.length > 0);
  });

  it("app exists", async () => {
    const args: CreateTeamsAppArgs = {
      name: appDef.appName!,
    };

    process.env.TEAMS_APP_ID = uuid();
    sinon.stub(AppStudioClient, "getApp").resolves(appDef);

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    console.log(JSON.stringify(result));
    chai.assert.isTrue(result.isOk());

    process.env.TEAMS_APP_ID = undefined;
  });

  it("API failure", async () => {
    const args: CreateTeamsAppArgs = {
      name: appDef.appName!,
    };
    sinon.stub(AppStudioClient, "getApp").throws(new Error("404"));
    sinon.stub(AppStudioClient, "importApp").throws(new Error("409"));
    sinon.stub(fs, "pathExists").resolves(true);

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert.isTrue(result.isErr());
  });

  it("Token error", async () => {
    const args: CreateTeamsAppArgs = {
      name: appDef.appName!,
    };
    sinon.stub(MockedM365Provider.prototype, "getAccessToken").resolves(err(new UserError({})));
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert.isTrue(result.isErr());
  });
});
