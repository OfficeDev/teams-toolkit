import {
  AppPackageFolderName,
  ArchiveFolderName,
  ConfigFolderName,
  ConfigMap,
  EnvConfig,
  EnvInfo,
  Json,
  ProductName,
  ProjectSettings,
  ProjectSettingsFileName,
  SolutionContext,
  V1ManifestFileName,
  v3,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import { ConstantString } from "../common/constants";
import { GLOBAL_CONFIG } from "../plugins/solution/fx-solution/constants";
import { environmentManager } from "./environment";
import crypto from "crypto";
import * as os from "os";
import { validateProjectSettings } from "../common/projectSettingsValidator";

export function validateProject(solutionContext: SolutionContext): string | undefined {
  const res = validateSettings(solutionContext.projectSettings);
  return res;
}

export function validateSettings(projectSettings?: ProjectSettings): string | undefined {
  if (!projectSettings) return "empty projectSettings";
  return validateProjectSettings(projectSettings);
}

export function isValidProject(workspacePath?: string): boolean {
  if (!workspacePath) return false;
  try {
    const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`, "configs");
    const settingsFile = path.resolve(confFolderPath, ProjectSettingsFileName);
    const projectSettings: ProjectSettings = fs.readJsonSync(settingsFile);
    if (validateSettings(projectSettings)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// TODO: add an async version
export async function validateV1Project(
  workspacePath: string | undefined
): Promise<string | undefined> {
  if (!workspacePath) {
    return "The workspace path cannot be empty.";
  }

  const v2ConfigFolder = path.resolve(workspacePath, `.${ConfigFolderName}`);
  if (await fs.pathExists(v2ConfigFolder)) {
    return `Folder '.${ConfigFolderName}' already exists.`;
  }

  const packageJsonPath = path.resolve(workspacePath, "package.json");
  let packageSettings: any | undefined;

  try {
    packageSettings = await fs.readJson(packageJsonPath);
  } catch (error: any) {
    return `Cannot read 'package.json'. ${error?.message}`;
  }

  if (!packageSettings?.msteams) {
    return "Teams Toolkit V1 settings cannot be found in 'package.json'.";
  }

  const manifestPath = path.resolve(workspacePath, AppPackageFolderName, V1ManifestFileName);
  if (!(await fs.pathExists(manifestPath))) {
    return "The project should be created after version 1.2.0";
  }

  try {
    // Exclude Bot SSO project
    const envFilePath = path.resolve(workspacePath, ".env");
    const envFileContent = await fs.readFile(envFilePath, ConstantString.UTF8Encoding);
    if (envFileContent.includes("connectionName")) {
      return `Bot sso project has not been supported.`;
    }
  } catch (e: any) {
    // If the project does not contain a valid .env file, it is still a valid v1 project
  }

  const archiveFolder = path.resolve(workspacePath, ArchiveFolderName);
  if (await fs.pathExists(archiveFolder)) {
    return `Archive folder '${ArchiveFolderName}' already exists. Rollback the project or remove '${ArchiveFolderName}' folder.`;
  }

  return undefined;
}

export async function isMigrateFromV1Project(workspacePath?: string): Promise<boolean> {
  if (!workspacePath) return false;
  try {
    const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`, "configs");
    const settingsFile = path.resolve(confFolderPath, ProjectSettingsFileName);
    const projectSettings: ProjectSettings = await fs.readJson(settingsFile);
    if (validateSettings(projectSettings)) return false;
    return !!projectSettings?.solutionSettings?.migrateFromV1;
  } catch (e) {
    return false;
  }
}

export function newEnvInfo(
  envName?: string,
  config?: EnvConfig,
  state?: Map<string, any>
): EnvInfo {
  return {
    envName: envName ?? environmentManager.getDefaultEnvName(),
    config: config ?? {
      manifest: {
        appName: {
          short: "teamsfx_app",
        },
      },
    },
    state: state ?? new Map<string, any>([[GLOBAL_CONFIG, new ConfigMap()]]),
  };
}

export function newEnvInfoV3(
  envName?: string,
  config?: EnvConfig,
  state?: v3.ResourceStates
): v3.EnvInfoV3 {
  return {
    envName: envName ?? environmentManager.getDefaultEnvName(),
    config: config ?? {
      manifest: {
        appName: {
          short: "teamsfx_app",
        },
      },
    },
    state: state ?? { solution: {} },
  };
}

export function getLockFolder(projectPath: string): string {
  return path.join(
    os.tmpdir(),
    `${ProductName}-${crypto.createHash("md5").update(projectPath).digest("hex")}`
  );
}

// flattens output/secrets fields in config map for backward compatibility
// e.g. { "a": { "output": {"b": 1}, "secrets": { "value": 9 } }, "c": 2 } will be converted to
// { "a": { "b": 1, "value": 9 }, "c": 2 }
export function flattenConfigJson(configJson: Json): Json {
  const config: Json = {};
  for (const [k, v] of Object.entries(configJson)) {
    if (v instanceof Object) {
      const value = flattenConfigJson(v);
      if (k === "output" || k === "secrets") {
        for (const [k, v] of Object.entries(value)) {
          config[k] = v;
        }
      } else {
        config[k] = value;
      }
    } else {
      config[k] = v;
    }
  }

  return config;
}
