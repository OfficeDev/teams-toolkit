// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import sinon from "sinon";
import path from "path";
import { ProjectTypeResult, projectTypeChecker } from "../../src/common/projectTypeChecker";
import { MetadataV3 } from "../../src/common/versionMetadata";
import { TeamsAppManifest } from "@microsoft/teamsfx-api";

describe("ProjectTypeChecker", () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });
  describe("scanFolder", () => {
    it("file in ignore list", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const callback = async (filePath: string, data: ProjectTypeResult) => {
        return true;
      };
      const res = await projectTypeChecker.scanFolder("dir", ["dir"], result, callback, 2, 0);
      assert.isTrue(res);
    });
    it("is dir and reach max depth", async () => {
      sandbox.stub(fs, "stat").resolves({ isDirectory: () => true } as any);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const callback = async (filePath: string, data: ProjectTypeResult) => {
        return false;
      };
      const res = await projectTypeChecker.scanFolder("dir", [], result, callback, 1, 1);
      assert.isTrue(res);
    });
    it("is dir and fast return false", async () => {
      sandbox.stub(fs, "readdir").resolves(["sub-dir"] as any);
      sandbox
        .stub(fs, "stat")
        .onFirstCall()
        .resolves({ isDirectory: () => true } as any)
        .onSecondCall()
        .resolves({ isDirectory: () => false } as any);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const callback = async (filePath: string, data: ProjectTypeResult) => {
        return false;
      };
      const res = await projectTypeChecker.scanFolder("dir", [], result, callback, 2, 0);
      assert.isFalse(res);
    });
    it("is dir and return true", async () => {
      sandbox.stub(fs, "readdir").resolves(["sub-dir"] as any);
      sandbox.stub(fs, "stat").resolves({ isDirectory: () => true } as any);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const callback = async (filePath: string, data: ProjectTypeResult) => {
        return false;
      };
      const res = await projectTypeChecker.scanFolder("dir", ["sub-dir"], result, callback, 2, 0);
      assert.isTrue(res);
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
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findManifestCallback("./manifest.json", result);
      assert.isFalse(res);
      assert.isDefined(result.manifest);
    });

    it("file name match, but schema is not correct", async () => {
      sandbox.stub(fs, "readFile").resolves(JSON.stringify({}) as any);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findManifestCallback("./manifest.json", result);
      assert.isTrue(res);
      assert.isUndefined(result.manifest);
    });

    it("file name match, but throw error", async () => {
      sandbox.stub(fs, "readFile").rejects(new Error("error"));
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findManifestCallback("./manifest.json", result);
      assert.isTrue(res);
      assert.isUndefined(result.manifest);
    });
  });

  describe("findProjectLanguateCallback", () => {
    it("typescript", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./tsconfig.json", result);
      assert.isFalse(res);
      assert.equal(result.lauguage, "typescript");
    });
    it("typescript", async () => {
      sandbox.stub(fs, "readFile").resolves(JSON.stringify({}) as any);
      sandbox.stub(fs, "pathExists").resolves(true);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./package.json", result);
      assert.isFalse(res);
      assert.equal(result.lauguage, "typescript");
    });
    it("javascript", async () => {
      sandbox.stub(fs, "readFile").resolves(JSON.stringify({}) as any);
      sandbox.stub(fs, "pathExists").resolves(false);
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./package.json", result);
      assert.isFalse(res);
      assert.equal(result.lauguage, "javascript");
    });
    it("read package.json throw error", async () => {
      sandbox.stub(fs, "readFile").rejects(new Error());
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./package.json", result);
      assert.isTrue(res);
      assert.equal(result.lauguage, "other");
    });

    it(".csproj", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./abc.csproj", result);
      assert.isFalse(res);
      assert.equal(result.lauguage, "csharp");
    });

    it("java", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./pom.xml", result);
      assert.isFalse(res);
      assert.equal(result.lauguage, "java");
    });

    it("java", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./build.gradle", result);
      assert.isFalse(res);
      assert.equal(result.lauguage, "java");
    });

    it("c", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./makefile", result);
      assert.isFalse(res);
      assert.equal(result.lauguage, "c");
    });

    it("python", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback(
        "./requirements.txt",
        result
      );
      assert.isFalse(res);
      assert.equal(result.lauguage, "python");
    });

    it("python", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findProjectLanguateCallback("./pyproject.toml", result);
      assert.isFalse(res);
      assert.equal(result.lauguage, "python");
    });
  });
  describe("findTeamsFxCallback", () => {
    it("isTeamsFx < v5", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findTeamsFxCallback(
        path.resolve("./.fx/configs/projectSettings.json"),
        result
      );
      assert.isFalse(res);
      assert.isTrue(result.isTeamsFx);
      assert.equal(result.teamsfxVersion, "<v5");
    });
    it("isTeamsFx = v5", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findTeamsFxCallback(
        path.join("./", MetadataV3.configFile),
        result
      );
      assert.isFalse(res);
      assert.isTrue(result.isTeamsFx);
      assert.equal(result.teamsfxVersion, "v5");
    });
    it("isTeamsFx = v5", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
      };
      const res = await projectTypeChecker.findTeamsFxCallback(
        path.join("./", MetadataV3.localConfigFile),
        result
      );
      assert.isFalse(res);
      assert.isTrue(result.isTeamsFx);
      assert.equal(result.teamsfxVersion, "v5");
    });
    it("isTeamsFx = false", async () => {
      const result: ProjectTypeResult = {
        isTeamsFx: false,
        manifest: undefined,
        packageJson: undefined,
        tsconfigJson: undefined,
        hasTeamsManifest: false,
        dependsOnTeamsJs: false,
        lauguage: "other",
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
            data.manifest = new TeamsAppManifest();
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
