// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { MetadataV3 } from "./versionMetadata";
import { parseDocument } from "yaml";

export enum TeamsfxConfigType {
  projectSettingsJson = "projectSettings.json",
  teamsappYml = "teamsapp.yml",
}
export const TeamsJsModule = "@microsoft/teams-js";

export interface ProjectTypeResult {
  isTeamsFx: boolean;
  teamsfxConfigType?: TeamsfxConfigType;
  teamsfxConfigVersion?: string;
  teamsfxTrackingId?: string;
  manifest?: any;
  packageJson?: any;
  tsconfigJson?: any;
  hasTeamsManifest: boolean;
  manifestCapabilities?: string[];
  dependsOnTeamsJs?: boolean;
  lauguages: ("typescript" | "javascript" | "csharp" | "java" | "python" | "c")[];
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
  getCapabilities(manifest: any): string[] {
    const capabilities: string[] = [];
    if (manifest.staticTabs && manifest.staticTabs.length > 0) {
      capabilities.push("staticTab");
    }
    if (manifest.configurableTabs && manifest.configurableTabs.length > 0) {
      capabilities.push("configurableTab");
    }
    if (manifest.bots && manifest.bots.length > 0) {
      capabilities.push("Bot");
    }
    if (manifest.composeExtensions) {
      capabilities.push("composeExtension");
    }
    if (manifest.extensions && manifest.extensions.length > 0) {
      capabilities.push("extension");
    }
    return capabilities;
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
          data.hasTeamsManifest = true;
          data.manifestCapabilities = this.getCapabilities(manifestObject);
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
      data.lauguages.push("typescript");
      return false;
    } else if (fileName === "package.json") {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const json = JSON.parse(content);
        data.packageJson = json;
        if (!(await fs.pathExists(path.join(parsed.dir, "tsconfig.json"))))
          data.lauguages.push("javascript");
        return false;
      } catch (error) {}
    } else if (fileName.toLowerCase().endsWith(".csproj")) {
      data.lauguages.push("csharp");
      return false;
    } else if (fileName === "pom.xml" || fileName === "build.gradle") {
      data.lauguages.push("java");
      return false;
    } else if (fileName.toLowerCase() === "makefile") {
      data.lauguages.push("c");
      return false;
    } else if (fileName === "requirements.txt" || fileName === "pyproject.toml") {
      data.lauguages.push("python");
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
        data.teamsfxConfigType = TeamsfxConfigType.projectSettingsJson;
        const json = await fs.readJson(settingFile);
        data.teamsfxConfigVersion = json.version;
        data.teamsfxTrackingId = json.projectId;
        return false;
      }
    } else if (fileName === MetadataV3.configFile || fileName === MetadataV3.localConfigFile) {
      data.isTeamsFx = true;
      data.teamsfxConfigType = TeamsfxConfigType.teamsappYml;
      if (fileName === MetadataV3.configFile) {
        const yamlFileContent: string = await fs.readFile(filePath, "utf8");
        const appYaml = parseDocument(yamlFileContent);
        data.teamsfxConfigVersion = appYaml.get("version") as string;
        data.teamsfxTrackingId = appYaml.get("projectId") as string;
      }
      return false;
    }
    return true;
  }
  async checkProjectType(projectPath: string) {
    const result: ProjectTypeResult = {
      isTeamsFx: false,
      hasTeamsManifest: false,
      dependsOnTeamsJs: false,
      lauguages: [],
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
    if (result.packageJson?.dependencies?.[TeamsJsModule]) {
      result.dependsOnTeamsJs = true;
    }
    return result;
  }
}

export const projectTypeChecker = new ProjectTypeChecker();
