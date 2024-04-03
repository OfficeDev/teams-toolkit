// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import fs from "fs-extra";
import { pluginManifestUtils } from "../../../../src/component/driver/teamsApp/utils/PluginManifestUtils";
import { PluginManifestSchema, TeamsAppManifest, ok } from "@microsoft/teamsfx-api";
import { FileNotFoundError, JSONSyntaxError } from "../../../../src";
import path from "path";

describe("pluginManifestUtils", () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });

  const pluginManifest: PluginManifestSchema = {
    schema_version: "2.0",
    name_for_human: "test",
    description_for_human: "test",
    runtimes: [
      {
        type: "OpenApi",
        auth: { type: "none" },
        spec: {
          url: "openapi.yaml",
        },
      },
      {
        type: "LocalPlugin",
        spec: {
          local_endpoint: "localEndpoint",
        },
        runs_for_functions: ["add_todo"],
      },
    ],
  };

  const teamsManifest: TeamsAppManifest = {
    $schema:
      "https://developer.microsoft.com/en-us/json-schemas/teams/v1.9/MicrosoftTeams.schema.json",
    manifestVersion: "1.9",
    version: "1.0.0",
    id: "test",
    packageName: "test",
    developer: {
      name: "test",
      websiteUrl: "https://test.com",
      privacyUrl: "https://test.com/privacy",
      termsOfUseUrl: "https://test.com/termsofuse",
    },
    icons: {
      color: "icon-color.png",
      outline: "icon-outline.png",
    },
    name: {
      short: "test",
      full: "test",
    },
    description: {
      short: "test",
      full: "test",
    },
    accentColor: "#FFFFFF",
    bots: [],
    composeExtensions: [],
    configurableTabs: [],
    staticTabs: [],
    permissions: [],
    validDomains: [],
    plugins: [
      {
        pluginFile: "resources/plugin.json",
        id: "plugin1",
      },
    ],
  };

  it("readPluginManifestFile success", async () => {
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves(JSON.stringify(pluginManifest) as any);

    const result = await pluginManifestUtils.readPluginManifestFile("path");
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.deepEqual(result.value, pluginManifest);
    }
  });

  it("readPluginManifestFile error: JsonSyntaxError", async () => {
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves("invalid json" as any);

    const result = await pluginManifestUtils.readPluginManifestFile("path");
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof JSONSyntaxError);
    }
  });

  it("readPluginManifestFile error: file does not exist", async () => {
    sandbox.stub(fs, "pathExists").resolves(false);

    const result = await pluginManifestUtils.readPluginManifestFile("path");
    chai.assert.isTrue(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });

  it("getApiSpecFilePathFromTeamsManifest sucess", async () => {
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves(JSON.stringify(pluginManifest) as any);
    const res = await pluginManifestUtils.getApiSpecFilePathFromTeamsManifest(
      teamsManifest,
      "/test/path"
    );
    chai.assert.isTrue(res.isOk());

    if (res.isOk()) {
      chai.assert.isTrue(res.value.length === 1);
      chai.assert.equal(res.value[0], path.resolve("/test/resources/openapi.yaml"));
    }
  });

  it("getApiSpecFilePathFromTeamsManifest error: plugin file not exist", async () => {
    sandbox.stub(fs, "pathExists").resolves(false);
    const readPlugin = sandbox.stub(fs, "readFile").resolves(JSON.stringify(pluginManifest) as any);
    const res = await pluginManifestUtils.getApiSpecFilePathFromTeamsManifest(
      teamsManifest,
      "path"
    );
    chai.assert.isTrue(res.isErr());

    if (res.isErr()) {
      chai.assert.isTrue(res.error instanceof FileNotFoundError);
      chai.assert.isTrue(readPlugin.notCalled);
    }
  });

  it("getApiSpecFilePathFromTeamsManifest error: spec file not exist", async () => {
    sandbox.stub(fs, "pathExists").callsFake(async (testPath) => {
      if (testPath === path.resolve("/test/resources/openapi.yaml")) {
        return false;
      } else {
        return true;
      }
    });
    sandbox.stub(fs, "readFile").resolves(JSON.stringify(pluginManifest) as any);
    const res = await pluginManifestUtils.getApiSpecFilePathFromTeamsManifest(
      teamsManifest,
      "/test/path"
    );
    chai.assert.isTrue(res.isOk());

    if (res.isOk()) {
      chai.assert.equal(res.value.length, 0);
    }
  });

  it("getApiSpecFilePathFromTeamsManifest error: runtime without url", async () => {
    const testPluginManifest = {
      ...pluginManifest,
      runtimes: [
        {
          type: "OpenApi",
          auth: { type: "none" },
          spec: {
            url: "",
          },
        },
      ],
    };
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves(JSON.stringify(testPluginManifest) as any);
    const res = await pluginManifestUtils.getApiSpecFilePathFromTeamsManifest(
      teamsManifest,
      "/test/path"
    );
    chai.assert.isTrue(res.isOk());

    if (res.isOk()) {
      chai.assert.equal(res.value.length, 0);
    }
  });

  it("getApiSpecFilePathFromTeamsManifest error: teams manifest without plugin", async () => {
    sandbox.stub(fs, "pathExists").resolves(true);

    const res = await pluginManifestUtils.getApiSpecFilePathFromTeamsManifest(
      { ...teamsManifest, plugins: [] },
      "/test/path"
    );
    chai.assert.isTrue(res.isErr());
  });
});
