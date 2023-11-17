// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigFolderName, TeamsAppManifest } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { MetadataV3 } from "./versionMetadata";

export function validateProjectSettings(projectSettings: any): string | undefined {
  if (!projectSettings) return "empty projectSettings";
  if (!projectSettings.solutionSettings) return undefined;
  const solutionSettings = projectSettings.solutionSettings;
  let validateRes = validateStringArray(solutionSettings.azureResources);
  if (validateRes) {
    return `solutionSettings.azureResources validation failed: ${validateRes}`;
  }
  validateRes = validateStringArray(solutionSettings.capabilities);
  if (validateRes) {
    return `solutionSettings.capabilities validation failed: ${validateRes}`;
  }
  validateRes = validateStringArray(solutionSettings.activeResourcePlugins);
  if (validateRes) {
    return `solutionSettings.activeResourcePlugins validation failed: ${validateRes}`;
  }

  if (projectSettings?.solutionSettings?.migrateFromV1) {
    return "The project created before v2.0.0 is only supported in the Teams Toolkit before v3.4.0.";
  }

  return undefined;
}

function validateStringArray(arr?: any, enums?: string[]) {
  if (!arr) {
    return "is undefined";
  }
  if (!Array.isArray(arr)) {
    return "is not array";
  }
  for (const element of arr) {
    if (typeof element !== "string") {
      return "array elements is not string type";
    }
    if (enums && !enums.includes(element)) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `array elements is out of scope: ${enums}`;
    }
  }
  return undefined;
}

export function isValidProject(workspacePath?: string): boolean {
  if (!workspacePath) return false;
  try {
    return isValidProjectV3(workspacePath) || isValidProjectV2(workspacePath);
  } catch (e) {
    return false;
  }
}

export function isValidProjectV3(workspacePath: string): boolean {
  const ymlFilePath = path.join(workspacePath, MetadataV3.configFile);
  const localYmlPath = path.join(workspacePath, MetadataV3.localConfigFile);
  if (fs.pathExistsSync(ymlFilePath) || fs.pathExistsSync(localYmlPath)) {
    return true;
  }
  return false;
}

export function isValidProjectV2(workspacePath: string): boolean {
  const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`, "configs");
  const settingsFile = path.resolve(confFolderPath, "projectSettings.json");
  if (!fs.existsSync(settingsFile)) {
    return false;
  }
  const projectSettings: any = fs.readJsonSync(settingsFile);
  if (validateProjectSettings(projectSettings)) return false;
  return true;
}

export function isVSProject(projectSettings?: any): boolean {
  return projectSettings?.programmingLanguage === "csharp";
}

async function scanProjectFiles(projectPath: string, stats: ProjectStats) {
  const files = fs.readdirSync(projectPath);
  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await scanProjectFiles(filePath, stats);
    } else {
      // count file extension
      const parsedPath = path.parse(filePath);
      const fileExtension = parsedPath.ext;
      const count = stats.fileCounts[fileExtension] || 0;
      stats.fileCounts[fileExtension] = count + 1;
      if (file.toLowerCase().includes("manifest") && file.toLowerCase().endsWith(".json")) {
        try {
          const manifestContent = fs.readFileSync(filePath, "utf-8");
          const manifestObject = JSON.parse(manifestContent) as TeamsAppManifest;
          const schemaLink = manifestObject["$schema"];
          const targetSchema = "https://developer.microsoft.com/en-us/json-schemas/teams";
          if (schemaLink && schemaLink.startsWith(targetSchema)) {
            stats.manifests.push(manifestObject);
          }
        } catch (error) {}
      } else if (file.toLowerCase() === "package.json") {
        try {
          const packageJsonContent = fs.readFileSync(filePath, "utf-8");
          const packageJsonObject = JSON.parse(packageJsonContent);
          if (packageJsonObject?.dependencies?.["@microsoft/teamsfx"]) {
            stats.packageJsons.push(packageJsonObject);
          }
        } catch (error) {}
      }
    }
  }
  return undefined;
}

export interface ProjectStats {
  manifests: TeamsAppManifest[];
  packageJsons: any[];
  fileCounts: { [key in string]: number };
}

export interface ProjectType {
  isTeamsAppProject: boolean;
  dependsOnTeamsJs: boolean;
  lauguage: "typescript" | "javascript" | "csharp" | "java" | "python" | "unknown";
}

export async function checkProjectType(projectPath: string) {
  const stats: ProjectStats = {
    manifests: [],
    packageJsons: [],
    fileCounts: {},
  };
  const result: ProjectType = {
    isTeamsAppProject: false,
    dependsOnTeamsJs: false,
    lauguage: "unknown",
  };
  await scanProjectFiles(projectPath, stats);

  result.dependsOnTeamsJs = stats.packageJsons.length > 0;
  result.isTeamsAppProject = stats.manifests.length > 0;

  const counts = Array.from(Object.keys(stats.fileCounts).map((key) => stats.fileCounts[key]));

  return stats;
}
