import {
  ConfigFolderName,
  SolutionContext,
  ProjectSettings,
  AzureSolutionSettings,
  EnvInfo,
  ConfigMap,
  AppPackageFolderName,
  ArchiveFolderName,
  V1ManifestFileName,
  ProjectSettingsFileName,
  EnvConfig,
  InputConfigsFolderName,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { GLOBAL_CONFIG, PluginNames } from "../plugins/solution/fx-solution/constants";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  BotOptionItem,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  TabOptionItem,
} from "../plugins/solution/fx-solution/question";
import { environmentManager } from "./environment";
import * as dotenv from "dotenv";
import { ConstantString } from "../common/constants";
import { isMultiEnvEnabled } from "../common";

export function validateProject(solutionContext: SolutionContext): string | undefined {
  const res = validateSettings(solutionContext.projectSettings);
  return res;
}

export function validateSettings(projectSettings?: ProjectSettings): string | undefined {
  if (!projectSettings) return "empty projectSettings";
  if (!projectSettings.solutionSettings) return "empty solutionSettings";
  const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
  if (solutionSettings.hostType === undefined) return "empty solutionSettings.hostType";
  if (
    solutionSettings.activeResourcePlugins === undefined ||
    solutionSettings.activeResourcePlugins.length === 0
  )
    return "empty solutionSettings.activeResourcePlugins";
  const capabilities = solutionSettings.capabilities || [];
  const azureResources = solutionSettings.azureResources || [];
  const plugins = solutionSettings.activeResourcePlugins || [];
  const v1 = solutionSettings?.migrateFromV1;
  // if(!configJson[PluginNames.LDEBUG]) return "local debug config is missing";
  if (!plugins.includes(PluginNames.LDEBUG))
    return `${PluginNames.LDEBUG} setting is missing in settings.json`;
  if (solutionSettings.hostType === HostTypeOptionSPFx.id) {
    // if(!configJson[PluginNames.SPFX]) return "SPFx config is missing";
    if (!plugins.includes(PluginNames.SPFX))
      return "SPFx setting is missing in activeResourcePlugins";
  } else {
    if (capabilities.includes(TabOptionItem.id)) {
      // if(!configJson[PluginNames.FE]) return "Frontend hosting config is missing";
      if (!plugins.includes(PluginNames.FE) && !v1)
        return `${PluginNames.FE} setting is missing in settings.json`;

      // if(!configJson[PluginNames.AAD]) return "AAD config is missing";
      if (!plugins.includes(PluginNames.AAD) && !v1)
        return `${PluginNames.AAD} setting is missing in settings.json`;

      // if(!configJson[PluginNames.SA]) return "Simple auth config is missing";
      if (!plugins.includes(PluginNames.SA) && !v1)
        return `${PluginNames.SA} setting is missing in settings.json`;
    }
    if (capabilities.includes(BotOptionItem.id)) {
      // if(!configJson[PluginNames.BOT]) return "Bot config is missing";
      if (!plugins.includes(PluginNames.BOT))
        return `${PluginNames.BOT} setting is missing in settings.json`;
    }
    if (capabilities.includes(MessageExtensionItem.id)) {
      // if(!configJson[PluginNames.BOT]) return "MessagingExtension config is missing";
      if (!plugins.includes(PluginNames.BOT))
        return `${PluginNames.BOT} setting is missing in settings.json`;
    }
    if (azureResources.includes(AzureResourceSQL.id)) {
      // if(!configJson[PluginNames.SQL]) return "Azure SQL config is missing";
      if (!plugins.includes(PluginNames.SQL))
        return `${PluginNames.SQL} setting is missing in settings.json`;
      // if(!configJson[PluginNames.MSID]) return "SQL identity config is missing";
      if (!plugins.includes(PluginNames.MSID))
        return `${PluginNames.MSID} setting is missing in settings.json`;
    }
    if (azureResources.includes(AzureResourceFunction.id)) {
      // if(!configJson[PluginNames.FUNC]) return "Azure functions config is missing";
      if (!plugins.includes(PluginNames.FUNC))
        return `${PluginNames.FUNC} setting is missing in settings.json`;
    }
    if (azureResources.includes(AzureResourceApim.id)) {
      // if(!configJson[PluginNames.APIM]) return "API Management config is missing";
      if (!plugins.includes(PluginNames.APIM))
        return `${PluginNames.APIM} setting is missing in settings.json`;
    }
  }
  return undefined;
}

export function isValidProject(workspacePath?: string): boolean {
  if (!workspacePath) return false;
  try {
    const confFolderPath = isMultiEnvEnabled()
      ? path.resolve(workspacePath, `.${ConfigFolderName}`, "configs")
      : path.resolve(workspacePath, `.${ConfigFolderName}`);
    const settingsFile = path.resolve(
      confFolderPath,
      isMultiEnvEnabled() ? ProjectSettingsFileName : "settings.json"
    );
    const projectSettings: ProjectSettings = fs.readJsonSync(settingsFile);
    if (validateSettings(projectSettings)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

export function getActiveEnv(projectRoot: string): string | undefined {
  if (!isMultiEnvEnabled()) {
    return "default";
  }
  try {
    if (isValidProject(projectRoot)) {
      const settingsJsonPath = path.join(
        projectRoot,
        `.${ConfigFolderName}/${InputConfigsFolderName}/${ProjectSettingsFileName}`
      );
      const settingsJson = JSON.parse(fs.readFileSync(settingsJsonPath, "utf8"));
      return settingsJson.activeEnvironment;
    }
  } catch (e) {
    return undefined;
  }
}

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
    const confFolderPath = path.resolve(workspacePath, `.${ConfigFolderName}`);
    const settingsFile = path.resolve(confFolderPath, "settings.json");
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
  profile?: Map<string, any>
): EnvInfo {
  return {
    envName: envName ?? environmentManager.getDefaultEnvName(),
    config: config ?? {
      manifest: {
        values: {
          appName: {
            short: "",
          },
        },
      },
    },
    profile: profile ?? new Map<string, any>([[GLOBAL_CONFIG, new ConfigMap()]]),
  };
}

export function base64Encode(str: string): string {
  return Buffer.from(str, "binary").toString("base64");
}
