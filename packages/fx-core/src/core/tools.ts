import {
  ConfigFolderName,
  ConfigMap,
  EnvConfig,
  EnvInfo,
  ProductName,
  ProjectSettings,
  ProjectSettingsFileName,
  SolutionContext,
  v3,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
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

// TODO: used to show migrate v1 retired notification
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
