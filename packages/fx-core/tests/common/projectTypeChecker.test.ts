// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import sinon from "sinon";
import path from "path";
import {
  ProjectTypeResult,
  TeamsfxConfigType,
  TeamsfxVersionState,
  projectTypeChecker,
} from "../../src/common/projectTypeChecker";
import { MetadataV3 } from "../../src/common/versionMetadata";
import { TeamsAppManifest } from "@microsoft/teamsfx-api";
import * as yaml from "yaml";

describe("ProjectTypeChecker", () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });
  describe("scanFolder", () => {
    it("file in ignore list", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const callback = async (filePath: string, data: ProjectTypeResult) => {
        return true;
      };
      const res = await projectTypeChecker.scanFolder("dir", ["dir"], result, callback, 2, 0);
      assert.isTrue(res);
    });
    it("file callback return false", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const callback = async (filePath: string, data: ProjectTypeResult) => {
        return false;
      };
      const res = await projectTypeChecker.scanFolder("dir", [], result, callback, 2, 0);
      assert.isFalse(res);
    });
    it("is dir and reach max depth", async () => {
      sandbox.stub(fs, "stat").resolves({ isDirectory: () => true } as any);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const callback = async (filePath: string, data: ProjectTypeResult) => {
        return true;
      };
      const res = await projectTypeChecker.scanFolder("dir", [], result, callback, 1, 1);
      assert.isTrue(res);
    });
    it("is dir and sub-call return false", async () => {
      sandbox.stub(fs, "readdir").resolves(["sub-dir"] as any);
      sandbox.stub(fs, "stat").resolves({ isDirectory: () => true } as any);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      let index = 0;
      const callback = async (filePath: string, data: ProjectTypeResult) => {
        if (index === 0) {
          index++;
          return true;
        } else {
          return false;
        }
      };
      const res = await projectTypeChecker.scanFolder("dir", [], result, callback, 2, 0);
      assert.isFalse(res);
    });
    it("is dir and sub-call return true", async () => {
      sandbox.stub(fs, "readdir").resolves(["sub-dir"] as any);
      sandbox.stub(fs, "stat").resolves({ isDirectory: () => true } as any);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const callback = async (filePath: string, data: ProjectTypeResult) => {
        return true;
      };
      const res = await projectTypeChecker.scanFolder("dir", ["sub-dir"], result, callback, 2, 0);
      assert.isTrue(res);
    });
  });
  describe("getCapabilities", () => {
    it("all capabilities", async () => {
      const manifest = {
        staticTabs: [1],
        configurableTabs: [1],
        bots: [1],
        composeExtensions: [1],
        extensions: [1],
      };
      const capabilities = projectTypeChecker.getCapabilities(manifest);
      assert.deepEqual(capabilities, [
        "staticTab",
        "configurableTab",
        "bot",
        "composeExtension",
        "extension",
      ]);
    });
    it("empty manifest", async () => {
      const manifest = {
        staticTabs: [],
        configurableTabs: [],
        bots: [],
        composeExtensions: [],
        extensions: [],
      };
      const capabilities = projectTypeChecker.getCapabilities(manifest);
      assert.deepEqual(capabilities, []);
    });
    it("empty capabilities", async () => {
      const manifest = {};
      const capabilities = projectTypeChecker.getCapabilities(manifest);
      assert.deepEqual(capabilities, []);
    });
  });
  describe("findManifestCallback", () => {
    it("found", async () => {
      sandbox.stub(fs, "readFile").resolves(
        JSON.stringify({
          $schema: "https://developer.microsoft.com/en-us/json-schemas/teams",
        }) as any
      );
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findManifestCallback("./manifest.json", result);
      assert.isFalse(res);
      assert.isDefined(result.manifest);
    });

    it("file name match, but schema is not correct", async () => {
      sandbox.stub(fs, "readFile").resolves(JSON.stringify({}) as any);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findManifestCallback("./manifest.json", result);
      assert.isTrue(res);
      assert.isUndefined(result.manifest);
    });

    it("file name match, but throw error", async () => {
      sandbox.stub(fs, "readFile").rejects(new Error("error"));
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findManifestCallback("./manifest.json", result);
      assert.isTrue(res);
      assert.isUndefined(result.manifest);
    });
  });

  describe("findProjectLanguateCallback", () => {
    it("ts", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./tsconfig.json", result);
      assert.isFalse(res);
      assert.deepEqual(result.lauguages, ["ts"]);
    });
    it("ts", async () => {
      sandbox.stub(fs, "readFile").resolves(JSON.stringify({}) as any);
      sandbox.stub(fs, "pathExists").resolves(true);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./package.json", result);
      assert.isFalse(res);
      assert.deepEqual(result.lauguages, []);
    });
    it("js", async () => {
      sandbox.stub(fs, "readFile").resolves(JSON.stringify({}) as any);
      sandbox.stub(fs, "pathExists").resolves(false);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./package.json", result);
      assert.isFalse(res);
      assert.deepEqual(result.lauguages, ["js"]);
    });
    it("read package.json throw error", async () => {
      sandbox.stub(fs, "readFile").rejects(new Error());
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./package.json", result);
      assert.isTrue(res);
      assert.deepEqual(result.lauguages, []);
    });

    it(".csproj", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./abc.csproj", result);
      assert.isFalse(res);
      assert.deepEqual(result.lauguages, ["csharp"]);
    });

    it("java", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./pom.xml", result);
      assert.isFalse(res);
      assert.deepEqual(result.lauguages, ["java"]);
    });

    it("java", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./build.gradle", result);
      assert.isFalse(res);
      assert.deepEqual(result.lauguages, ["java"]);
    });

    it("c", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./makefile", result);
      assert.isFalse(res);
      assert.deepEqual(result.lauguages, ["c"]);
    });

    it("python", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback(
        "./requirements.txt",
        result
      );
      assert.isFalse(res);
      assert.deepEqual(result.lauguages, ["python"]);
    });

    it("python", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./pyproject.toml", result);
      assert.isFalse(res);
      assert.deepEqual(result.lauguages, ["python"]);
    });
  });
  describe("findTeamsFxCallback", () => {
    it("isTeamsFx < v5", async () => {
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readJson").resolves({
        version: "1.0.0",
        projectId: "xxx-xxx-xxx",
      });
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findTeamsFxCallback(path.resolve("./.fx"), result);
      assert.isFalse(res);
      assert.isTrue(result.isTeamsFx);
      assert.equal(result.teamsfxConfigType, TeamsfxConfigType.projectSettingsJson);
      assert.equal(result.teamsfxConfigVersion, "1.0.0");
      assert.equal(result.teamsfxTrackingId, "xxx-xxx-xxx");
    });
    it("isTeamsFx = v5", async () => {
      const mockYamlContent = `# yaml-language-server: $schema=https://aka.ms/teams-toolkit/1.0.0/yaml.schema.json
      # Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
      # Visit https://aka.ms/teamsfx-actions for details on actions
      version: 1.0.0
      projectId: xxx-xxx-xxx
      `;
      sandbox.stub(fs, "readFile").resolves(mockYamlContent as any);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findTeamsFxCallback(
        path.join("./", MetadataV3.configFile),
        result
      );
      assert.isFalse(res);
      assert.isTrue(result.isTeamsFx);
      assert.equal(result.teamsfxConfigType, TeamsfxConfigType.teamsappYml);
      assert.equal(result.teamsfxConfigVersion, "1.0.0");
      assert.equal(result.teamsfxTrackingId, "xxx-xxx-xxx");
    });
    it("isTeamsFx = v5", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findTeamsFxCallback(
        path.join("./", MetadataV3.localConfigFile),
        result
      );
      assert.isFalse(res);
      assert.isTrue(result.isTeamsFx);
    });
    it("isTeamsFx = false", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findTeamsFxCallback(path.join("./abc.json"), result);
      assert.isTrue(res);
      assert.isFalse(result.isTeamsFx);
    });
  });

  describe("checkProjectType", () => {
    it("has manifest and depends on teams-js", async () => {
      sandbox
        .stub(projectTypeChecker, "scanFolder")
        .callsFake(
          async (
            currentPath: string,
            ignoreFolderName: string[],
            data: ProjectTypeResult,
            fileCallback: (filePath: string, data: ProjectTypeResult) => Promise<boolean>,
            maxDepth: number
          ) => {
            data.hasTeamsManifest = true;
            data.packageJson = {
              dependencies: { "@microsoft/teams-js": "1.0.0" },
            };
            return true;
          }
        );

      const res = await projectTypeChecker.checkProjectType(path.join("./abc.json"));
      assert.isTrue(res.hasTeamsManifest);
      assert.isTrue(res.dependsOnTeamsJs);
    });
    it("has no manifest and not depend on teams-js", async () => {
      sandbox
        .stub(projectTypeChecker, "scanFolder")
        .callsFake(
          async (
            currentPath: string,
            ignoreFolderName: string[],
            data: ProjectTypeResult,
            fileCallback: (filePath: string, data: ProjectTypeResult) => Promise<boolean>,
            maxDepth: number
          ) => {
            return true;
          }
        );

      const res = await projectTypeChecker.checkProjectType(path.join("./abc.json"));
      assert.isFalse(res.hasTeamsManifest);
      assert.isFalse(res.dependsOnTeamsJs);
    });
  });
});
