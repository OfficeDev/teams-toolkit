// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import path from "path";
import sinon from "sinon";
import {
  ProjectTypeResult,
  SPFxKey,
  TeamsfxConfigType,
  TeamsfxVersionState,
  getCapabilities,
  projectTypeChecker,
} from "../../src/common/projectTypeChecker";
import { MetadataV3 } from "../../src/common/versionMetadata";

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
      const capabilities = getCapabilities(manifest);
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
      const capabilities = getCapabilities(manifest);
      assert.deepEqual(capabilities, []);
    });
    it("empty capabilities", async () => {
      const manifest = {};
      const capabilities = getCapabilities(manifest);
      assert.deepEqual(capabilities, []);
    });
  });
  describe("findManifestCallback", () => {
    it("found", async () => {
      sandbox.stub(fs, "readFile").resolves(
        JSON.stringify({
          $schema:
            "https://developer.microsoft.com/en-us/json-schemas/teams/MicrosoftTeams.schema.json",
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
      assert.isTrue(result.hasTeamsManifest);
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
      assert.isFalse(result.hasTeamsManifest);
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
      assert.deepEqual(result.lauguages, ["ts"]);
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
    it("isTeamsFx < v5 but invalid projectSettings.json", async () => {
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
      assert.equal(result.teamsfxProjectId, "xxx-xxx-xxx");
      assert.equal(result.teamsfxVersionState, TeamsfxVersionState.Invalid);
    });
    it("isTeamsFx < v5 but version state is unsupported", async () => {
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readJson").resolves({
        solutionSettings: {
          activeResourcePlugins: [],
        },
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
      assert.equal(result.teamsfxProjectId, "xxx-xxx-xxx");
      assert.equal(result.teamsfxVersionState, TeamsfxVersionState.Unsupported);
    });
    it("isTeamsFx < v5 but version state is upgradable", async () => {
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readJson").resolves({
        solutionSettings: {
          activeResourcePlugins: [],
        },
        version: "2.1.0",
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
      assert.equal(result.teamsfxConfigVersion, "2.1.0");
      assert.equal(result.teamsfxProjectId, "xxx-xxx-xxx");
      assert.equal(result.teamsfxVersionState, TeamsfxVersionState.Upgradable);
    });
    it("isTeamsFx = v5 and version state unsupported", async () => {
      const mockYamlContent = `# yaml-language-server: $schema=https://aka.ms/teams-toolkit/1.0.0/yaml.schema.json
      # Visit https://aka.ms/teamsfx-v5.0-guide for details on this file
      # Visit https://aka.ms/teamsfx-actions for details on actions
      version: 2.0.0
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
      assert.equal(result.teamsfxConfigVersion, "2.0.0");
      assert.equal(result.teamsfxProjectId, "xxx-xxx-xxx");
      assert.equal(result.teamsfxVersionState, TeamsfxVersionState.Unsupported);
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
      assert.isTrue(res);
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

  describe("findSPFxCallback", () => {
    it("not found", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        isSPFx: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findSPFxCallback(path.join("./abc.json"), result);
      assert.isTrue(res);
      assert.isFalse(result.isSPFx);
    });
    it("found", async () => {
      sandbox.stub(fs, "readJson").resolves({
        [SPFxKey]: "xxx-xxx-xxx",
      });
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        isSPFx: false,
        lauguages: [],
      };
      const res = await projectTypeChecker.findSPFxCallback(path.join("./.yo-rc.json"), result);
      assert.isFalse(res);
      assert.isTrue(result.isSPFx);
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
            data.dependsOnTeamsJs = true;
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
