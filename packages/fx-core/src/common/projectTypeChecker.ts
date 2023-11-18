// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppManifest } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import path from "path";
import { MetadataV3 } from "./versionMetadata";

export interface ProjectTypeResult {
  isTeamsFx: boolean;
  teamsfxVersion?: "<v5" | "v5";
  manifest?: TeamsAppManifest;
  packageJson?: any;
  tsconfigJson?: any;
  hasTeamsManifest: boolean;
  dependsOnTeamsJs: boolean;
  lauguage: "typescript" | "javascript" | "csharp" | "java" | "python" | "c" | "other";
}

class ProjectTypeChecker {
  async scanFolder(
    currentPath: string,
    ignoreFolderName: string[],
    data: ProjectTypeResult,
    fileCallback: (filePath: string, data: ProjectTypeResult) => Promise<boolean>,
    maxDepth: number,
    currentDepth = 0
  ) {
    const fileName = path.parse(currentPath).base;
    if (ignoreFolderName.includes(fileName)) {
      return true;
    }
    const res = await fileCallback(currentPath, data);
    if (!res) {
      return false;
    }
    const stat = await fs.stat(currentPath);
    if (stat.isDirectory()) {
      if (currentDepth < maxDepth) {
        const subFiles = await fs.readdir(currentPath);
        for (const subFile of subFiles) {
          const subFilePath = path.join(currentPath, subFile);
          const res = await this.scanFolder(
            subFilePath,
            ignoreFolderName,
            data,
            fileCallback,
            maxDepth,
            currentDepth + 1
          );
          if (!res) {
            return false;
          }
        }
      }
    }
    return true;
  }

  async findManifestCallback(filePath: string, data: ProjectTypeResult): Promise<boolean> {
    const fileName = path.parse(filePath).base;
    if (fileName.toLowerCase().includes("manifest") && fileName.toLowerCase().endsWith(".json")) {
      try {
        const manifestContent = await fs.readFile(path.join(filePath, fileName), "utf-8");
        const manifestObject = JSON.parse(manifestContent);
        const schemaLink = manifestObject["$schema"];
        const targetSchema = "https://developer.microsoft.com/en-us/json-schemas/teams";
        if (schemaLink && schemaLink.startsWith(targetSchema)) {
          data.manifest = manifestObject;
          return false;
        }
      } catch (error) {}
    }
    return true;
  }

  async findProjectLanguateCallback(filePath: string, data: ProjectTypeResult): Promise<boolean> {
    const parsed = path.parse(filePath);
    const fileName = parsed.base;
    if (fileName === "tsconfig.json") {
      data.lauguage = "typescript";
      return false;
    } else if (fileName === "package.json") {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const json = JSON.parse(content);
        data.packageJson = json;
        if (await fs.pathExists(path.join(parsed.dir, "tsconfig.json")))
          data.lauguage = "typescript";
        else data.lauguage = "javascript";
        return false;
      } catch (error) {}
    } else if (fileName.toLowerCase().endsWith(".csproj")) {
      data.lauguage = "csharp";
      return false;
    } else if (fileName === "pom.xml" || fileName === "build.gradle") {
      data.lauguage = "java";
      return false;
    } else if (fileName.toLowerCase() === "makefile") {
      data.lauguage = "c";
      return false;
    } else if (fileName === "requirements.txt" || fileName === "pyproject.toml") {
      data.lauguage = "python";
      return false;
    }
    return true;
  }
  async findTeamsFxCallback(filePath: string, data: ProjectTypeResult): Promise<boolean> {
    const parsed = path.parse(filePath);
    const fileName = parsed.base;
    if (fileName === ".fx") {
      const settingFile = path.join(filePath, "configs", "projectSettings.json");
      const exists = await fs.pathExists(settingFile);
      if (exists) {
        data.isTeamsFx = true;
        data.teamsfxVersion = "<v5";
        return false;
      }
    } else if (fileName === MetadataV3.configFile || fileName === MetadataV3.localConfigFile) {
      data.isTeamsFx = true;
      data.teamsfxVersion = "v5";
      return false;
    }
    return true;
  }
  async checkProjectType(projectPath: string) {
    const result: ProjectTypeResult = {
      isTeamsFx: false,
      manifest: undefined,
      packageJson: undefined,
      tsconfigJson: undefined,
      hasTeamsManifest: false,
      dependsOnTeamsJs: false,
      lauguage: "other",
    };
    try {
      await this.scanFolder(
        projectPath,
        ["node_modules", "bin", "build", "dist", ".vscode"],
        result,
        this.findManifestCallback,
        2,
        0
      );
      await this.scanFolder(
        projectPath,
        ["node_modules", "bin", "build", "dist", ".vscode"],
        result,
        this.findProjectLanguateCallback,
        2,
        0
      );
      //only scan direct sub folder
      await this.scanFolder(
        projectPath,
        ["node_modules", "bin", "build", "dist", ".vscode"],
        result,
        this.findTeamsFxCallback,
        1,
        0
      );
    } catch (e) {}
    result.hasTeamsManifest = !!result.manifest;
    if (result.packageJson?.dependencies?.["@microsoft/teams-js"]) {
      result.dependsOnTeamsJs = true;
    }
    return result;
  }
}

export const projectTypeChecker = new ProjectTypeChecker();
