// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ok, Platform, TeamsAppManifest, v2 } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import "mocha";
import "reflect-metadata";
import sinon from "sinon";
import * as uuid from "uuid";
import { manifestUtils } from "../../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import { MissingEnvironmentVariablesError } from "../../../../src/error/common";

describe("getManifest V3", () => {
  const sandbox = sinon.createSandbox();
  let inputs: v2.InputsWithProjectPath;
  let manifest: TeamsAppManifest;
  const manifestTemplate = `{
      "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
      "manifestVersion": "1.14",
      "version": "1.0.0",
      "id": "{{state.fx-resource-appstudio.teamsAppId}}",
      "packageName": "com.microsoft.teams.extension",
      "developer": {
          "name": "Teams App, Inc.",
          "websiteUrl": "{{{state.fx-resource-frontend-hosting.endpoint}}}",
          "privacyUrl": "https://www.example.com/termofuse",
          "termsOfUseUrl": "https://www.example.com/privacy"
      },
      "icons": {
          "color": "{{config.manifest.icons.color}}",
          "outline": "{{config.manifest.icons.outline}}"
      },
      "name": {
          "short": "{{config.manifest.appName.short}}",
          "full": "{{config.manifest.appName.full}}"
      },
      "description": {
          "short": "{{config.manifest.description.short}}",
          "full": "{{config.manifest.description.full}}"
      },
      "accentColor": "#FFFFFF",
      "bots": [],
      "composeExtensions": [],
      "permissions": [
          "identity",
          "messageTeamMembers"
      ],
      "validDomains": [
          "{{state.fx-resource-frontend-hosting.domain}}"
      ],
      "webApplicationInfo": {
          "id": "{{state.fx-resource-aad-app-for-teams.clientId}}",
          "resource": "{{{state.fx-resource-aad-app-for-teams.applicationIdUris}}}"
      }
  }`;
  beforeEach(async () => {
    inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    manifest = JSON.parse(manifestTemplate) as TeamsAppManifest;
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok(manifest));
  });

  afterEach(async () => {
    sandbox.restore();
  });
  it("getManifest", async () => {
    const envInfo = newEnvInfoV3();
    envInfo.envName = "local";
    const res1 = await manifestUtils.getManifest("", envInfo, false);
    envInfo.envName = "dev";
    const res2 = await manifestUtils.getManifest("", envInfo, false);
    chai.assert.isTrue(res1.isErr());
    chai.assert.isTrue(res2.isErr());
  });

  it("getManifest ignoring missing config", async () => {
    const envInfo = newEnvInfoV3();
    envInfo.state = {
      solution: {},
      "teams-bot": {
        botId: uuid.v4(),
      },
    };
    envInfo.envName = "local";
    const res1 = await manifestUtils.getManifest("", envInfo, true);
    chai.assert.isTrue(res1.isOk());
  });

  it("getManifestV3 unresolved placeholder Error", async () => {
    const envInfo = newEnvInfoV3();
    envInfo.envName = "dev";
    manifest.name.short = "${{MY_APP_NAME}}";
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(manifest));
    const res = await manifestUtils.getManifestV3("");
    chai.assert.isTrue(res.isErr() && res.error instanceof MissingEnvironmentVariablesError);
  });

  it("getManifestV3 teams app id resolved", async () => {
    const manifest = new TeamsAppManifest();
    manifest.id = uuid.v4();
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(manifest));
    const res = await manifestUtils.getManifestV3("");
    chai.assert.isTrue(res.isOk());
  });
});
