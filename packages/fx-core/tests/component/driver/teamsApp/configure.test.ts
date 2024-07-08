// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppManifest } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import chai from "chai";
import fs from "fs-extra";
import "mocha";
import * as sinon from "sinon";
import { v4 as uuid } from "uuid";
import { teamsDevPortalClient } from "../../../../src/client/teamsDevPortalClient";
import { ConfigureTeamsAppDriver } from "../../../../src/component/driver/teamsApp/configure";
import { AppStudioError } from "../../../../src/component/driver/teamsApp/errors";
import { ConfigureTeamsAppArgs } from "../../../../src/component/driver/teamsApp/interfaces/ConfigureTeamsAppArgs";
import {
  MockedLogProvider,
  MockedM365Provider,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import { Constants } from "./../../../../src/component/driver/teamsApp/constants";
import { AppDefinition } from "./../../../../src/component/driver/teamsApp/interfaces/appdefinitions/appDefinition";

describe("teamsApp/update", async () => {
  const teamsAppDriver = new ConfigureTeamsAppDriver();
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
  };

  afterEach(() => {
    sinon.restore();
  });

  it("should throw error if file not exists", async () => {
    const args: ConfigureTeamsAppArgs = {
      appPackagePath: "fakePath",
    };

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(AppStudioError.FileNotFoundError.name, result.error.name);
    }
  });

  it("File not found - manifest.json", async () => {
    const args: ConfigureTeamsAppArgs = {
      appPackagePath: "fakePath",
    };

    sinon.stub(teamsDevPortalClient, "importApp").resolves(appDef);
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      if (result.isErr()) {
        chai.assert.equal(AppStudioError.FileNotFoundError.name, result.error.name);
      }
    }
  });

  it("invalid param error", async () => {
    const args: ConfigureTeamsAppArgs = {
      appPackagePath: "",
    };

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal("InvalidActionInputError", result.error.name);
    }
  });

  it("invalid teams app id", async () => {
    const args: ConfigureTeamsAppArgs = {
      appPackagePath: "fakePath",
    };

    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      const manifest = new TeamsAppManifest();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest)));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });

    const result = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(result.result.isErr());
    if (result.result.isErr()) {
      chai.assert.equal(AppStudioError.InvalidTeamsAppIdError.name, result.result.error.name);
    }
  });

  it("API failure", async () => {
    const args: ConfigureTeamsAppArgs = {
      appPackagePath: "fakePath",
    };
    sinon.stub(teamsDevPortalClient, "getApp").resolves(appDef);
    sinon.stub(teamsDevPortalClient, "importApp").throws(new Error("409"));
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      const manifest = new TeamsAppManifest();
      manifest.id = uuid();
      manifest.staticTabs = [
        {
          entityId: "index",
          name: "Personal Tab",
          contentUrl: "https://www.example.com",
          websiteUrl: "https://www.example.com",
          scopes: ["personal"],
        },
      ];
      manifest.bots = [
        {
          botId: uuid(),
          scopes: [],
        },
      ];
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest)));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert.isTrue(result.isErr());
  });

  it("happy path", async () => {
    const args: ConfigureTeamsAppArgs = {
      appPackagePath: "fakePath",
    };

    sinon.stub(teamsDevPortalClient, "importApp").resolves(appDef);
    sinon.stub(teamsDevPortalClient, "getApp").resolves(appDef);
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      const manifest = new TeamsAppManifest();
      manifest.id = uuid();
      manifest.staticTabs = [
        {
          entityId: "index",
          name: "Personal Tab",
          contentUrl: "https://www.example.com",
          websiteUrl: "https://www.example.com",
          scopes: ["personal"],
        },
      ];
      manifest.bots = [
        {
          botId: uuid(),
          scopes: [],
        },
      ];
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest)));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    console.log(JSON.stringify(result));
    chai.assert.isTrue(result.isOk());
  });

  it("execute", async () => {
    const args: ConfigureTeamsAppArgs = {
      appPackagePath: "fakePath",
    };

    sinon.stub(teamsDevPortalClient, "importApp").resolves(appDef);
    sinon.stub(teamsDevPortalClient, "getApp").resolves(appDef);
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readFile").callsFake(async () => {
      const zip = new AdmZip();
      const manifest = new TeamsAppManifest();
      manifest.id = uuid();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest)));
      zip.addFile("color.png", new Buffer(""));
      zip.addFile("outlie.png", new Buffer(""));

      const archivedFile = zip.toBuffer();
      return archivedFile;
    });

    const result = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(result.result.isOk());
  });
});
