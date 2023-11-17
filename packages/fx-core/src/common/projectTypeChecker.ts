// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppManifest } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import path from "path";

export interface ProjectTypeResult {
  isTeamsFx?: boolean;
  manifest?: TeamsAppManifest;
  packageJson?: any;
  tsconfigJson?: any;
  hasTeamsManifest: boolean;
  dependsOnTeamsJs: boolean;
  lauguage: "typescript" | "javascript" | "csharp" | "java" | "python" | "other";
}

class ProjectTypeChecker {
  async scanFolder(
    folder: string,
    ignoreFolderName: string[],
    data: ProjectTypeResult,
    fileCallback: (
      foler: string,
      file: string,
      depth: number,
      data: ProjectTypeResult
    ) => Promise<boolean>,
    depth = 0
  ) {
    const file = path.parse(folder).base;
    if (ignoreFolderName.includes(file)) {
      return true;
    }
    const files = await fs.readdir(folder);
    for (const file of files) {
      const filePath = path.join(folder, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        const res = await this.scanFolder(
          filePath,
          ignoreFolderName,
          data,
          fileCallback,
          depth + 1
        );
        if (!res) {
          return false;
        }
      } else {
        const res = await fileCallback(folder, file, depth, data);
        if (!res) {
          return false;
        }
      }
    }
    return true;
  }

  async findManifestCallback(
    folderPath: string,
    fileName: string,
    depth: number,
    data: ProjectTypeResult
  ): Promise<boolean> {
    if (depth > 4) return false;
    if (fileName.toLowerCase().includes("manifest") && fileName.toLowerCase().endsWith(".json")) {
      try {
        const manifestContent = await fs.readFile(path.join(folderPath, fileName), "utf-8");
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

  async findProjecTypeCallback(
    folderPath: string,
    fileName: string,
    depth: number,
    data: ProjectTypeResult
  ): Promise<boolean> {
    if (depth > 2) return false;
    if (fileName === "node_modules") return false;
    if (fileName === "tsconfig.json") {
      data.lauguage = "typescript";
      return false;
    } else if (fileName === "package.json") {
      try {
        const content = await fs.readFile(path.join(folderPath, fileName), "utf-8");
        const json = JSON.parse(content);
        data.packageJson = json;
        if (await fs.pathExists(path.join(folderPath, "tsconfig.json")))
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
    } else if (fileName === "requirements.txt" || fileName === "pyproject.toml") {
      data.lauguage = "python";
      return false;
    }
    return true;
  }

  async checkProjectType(projectPath: string) {
    const result: ProjectTypeResult = {
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
        0
      );
      await this.scanFolder(
        projectPath,
        ["node_modules", "bin", "build", "dist", ".vscode"],
        result,
        this.findProjecTypeCallback,
        0
      );
    } catch (e) {}
    result.hasTeamsManifest = !!result.manifest;
    if (result.packageJson?.dependencies?.["@microsoft/teamsfx"]) {
      result.dependsOnTeamsJs = true;
    }
    return result;
  }
}

export const projectTypeChecker = new ProjectTypeChecker();
