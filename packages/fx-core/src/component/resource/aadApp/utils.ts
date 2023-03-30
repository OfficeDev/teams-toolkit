// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigMap,
  ContextV3,
  EnvConfig,
  EnvInfo,
  err,
  FxError,
  Inputs,
  InputsWithProjectPath,
  ok,
  PluginContext,
  Result,
  SystemError,
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import { getLocalizedString } from "../../../common/localizeUtils";
import { unzip } from "../../../common/template-utils/templatesUtils";
import { isV3Enabled } from "../../../common/tools";
import { FileNotFoundError } from "../../../error/common";
import { getTemplatesFolder } from "../../../folder";
import { AddSsoParameters, Language, SolutionError, SolutionSource } from "../../constants";
import { convertEnvStateV3ToV2, convertProjectSettingsV3ToV2 } from "../../migrate";

export function convertContext(context: ContextV3, inputs: InputsWithProjectPath): PluginContext {
  const projectSetting = convertProjectSettingsV3ToV2(context.projectSetting);
  const stateV2 = convertEnvStateV3ToV2(context.envInfo!.state!);
  stateV2["fx-resource-aad-app-for-teams"] ??= {};
  const value = ConfigMap.fromJSON(stateV2);
  const pluginCtx: PluginContext = {
    cryptoProvider: context.cryptoProvider,
    config: new ConfigMap(),
    logProvider: context.logProvider,
    m365TokenProvider: context.tokenProvider?.m365TokenProvider,
    ui: context.userInteraction,
    projectSettings: projectSetting,
    permissionRequestProvider: context.permissionRequestProvider,
    root: inputs.projectPath,
    envInfo: {
      config: context.envInfo?.config as EnvConfig,
      envName: inputs.env,
      state: value,
    } as EnvInfo,
  };
  return pluginCtx;
}

export async function createAuthFiles(
  input: Inputs,
  language: string,
  needTab: boolean,
  needBot: boolean,
  isVsProject = false
): Promise<Result<unknown, FxError>> {
  const projectPath = input.projectPath;
  if (!projectPath) {
    const e = new SystemError(
      SolutionSource,
      SolutionError.InvalidProjectPath,
      getLocalizedString("core.addSsoFiles.emptyProjectPath")
    );
    return err(e);
  }

  const languageFolderResult = validateAndParseLanguage(language);
  if (languageFolderResult.isErr()) {
    return err(languageFolderResult.error);
  }
  const languageFolderName = languageFolderResult.value;

  const projectFolderExists = await fs.pathExists(projectPath!);
  if (!projectFolderExists) {
    const e = new FileNotFoundError("aad", projectPath);
    return err(e);
  }

  const authFolder = path.join(
    projectPath!,
    isV3Enabled() ? AddSsoParameters.V3AuthFolder : isVsProject ? "Auth" : "auth"
  );
  const tabFolder = path.join(authFolder, AddSsoParameters.Tab);
  const botFolder = path.join(authFolder, AddSsoParameters.Bot);
  try {
    const authFolderExists = await fs.pathExists(authFolder);
    if (!authFolderExists) {
      await fs.ensureDir(authFolder);
    }

    if (isV3Enabled()) {
      const templateFolder = getTemplatesFolder();
      const v3TemplateFolder = path.join(
        templateFolder,
        AddSsoParameters.filePath,
        AddSsoParameters.V3
      );

      const sampleZip = new AdmZip();
      sampleZip.addLocalFolder(v3TemplateFolder);
      await unzip(sampleZip, authFolder);
      return ok(undefined);
    }

    if (needTab) {
      const tabFolderExists = await fs.pathExists(tabFolder);
      if (!tabFolderExists) {
        await fs.ensureDir(tabFolder);
      }

      const templateFolder = getTemplatesFolder();
      const tabTemplateFolder = path.join(
        templateFolder,
        AddSsoParameters.filePath,
        AddSsoParameters.Tab
      );
      if (isVsProject) {
        // README.md
        const readmeSourcePath = path.join(tabTemplateFolder, AddSsoParameters.ReadmeCSharp);
        const readmeTargetPath = path.join(tabFolder, AddSsoParameters.ReadmeCSharp);
        const readme = await fs.readFile(readmeSourcePath);
        fs.writeFile(readmeTargetPath, readme);

        // Sample Code
        const sampleSourceFolder = path.join(tabTemplateFolder, languageFolderName);
        const sampleZip = new AdmZip();
        sampleZip.addLocalFolder(sampleSourceFolder);
        await unzip(sampleZip, tabFolder);

        // Update appsettings
        const appSettingsPath = path.join(projectPath!, AddSsoParameters.AppSettings);
        const appSettingsDevPath = path.join(projectPath!, AddSsoParameters.AppSettingsDev);

        if (await fs.pathExists(appSettingsPath)) {
          const appSettings = await fs.readJson(appSettingsPath);
          if (!appSettings.TeamsFx) {
            appSettings.TeamsFx = AddSsoParameters.AppSettingsToAdd;
          }
          await fs.writeFile(appSettingsPath, JSON.stringify(appSettings, null, "\t"), "utf-8");
        }
        if (await fs.pathExists(appSettingsDevPath)) {
          const appSettings = await fs.readJson(appSettingsDevPath);
          if (!appSettings.TeamsFx) {
            appSettings.TeamsFx = AddSsoParameters.AppSettingsToAdd;
          }
          await fs.writeFile(appSettingsDevPath, JSON.stringify(appSettings, null, "\t"), "utf-8");
        }
      } else {
        // README.md
        const readmeSourcePath = path.join(tabTemplateFolder, AddSsoParameters.Readme);
        const readmeTargetPath = path.join(tabFolder, AddSsoParameters.Readme);
        const readme = await fs.readFile(readmeSourcePath);
        fs.writeFile(readmeTargetPath, readme);

        // Sample Code
        const sampleSourceFolder = path.join(tabTemplateFolder, languageFolderName);
        const sampleZip = new AdmZip();
        sampleZip.addLocalFolder(sampleSourceFolder);
        await unzip(sampleZip, tabFolder);
      }
    }

    if (needBot) {
      const botFolderExists = await fs.pathExists(botFolder);
      if (!botFolderExists) {
        await fs.ensureDir(botFolder);
      }

      const templateFolder = getTemplatesFolder();
      const botTemplateFolder = path.join(
        templateFolder,
        AddSsoParameters.filePath,
        AddSsoParameters.Bot
      );
      if (isVsProject) {
        // README.md
        const readmeSourcePath = path.join(botTemplateFolder, AddSsoParameters.ReadmeCSharp);
        const readmeTargetPath = path.join(botFolder, AddSsoParameters.ReadmeCSharp);
        const readme = await fs.readFile(readmeSourcePath);
        fs.writeFile(readmeTargetPath, readme);

        // Sample Code
        const sampleSourceFolder = path.join(botTemplateFolder, languageFolderName);
        const sampleZip = new AdmZip();
        sampleZip.addLocalFolder(sampleSourceFolder);
        await unzip(sampleZip, botFolder);

        // Update appsettings
        const appSettingsPath = path.join(projectPath!, AddSsoParameters.AppSettings);
        const appSettingsDevPath = path.join(projectPath!, AddSsoParameters.AppSettingsDev);

        if (await fs.pathExists(appSettingsPath)) {
          const appSettings = await fs.readJson(appSettingsPath);
          if (
            !appSettings.TeamsFx ||
            !appSettings.TeamsFx.Authentication ||
            !appSettings.TeamsFx.Authentication.Bot
          ) {
            appSettings.TeamsFx = AddSsoParameters.AppSettingsToAddForBot;
          }
          await fs.writeFile(appSettingsPath, JSON.stringify(appSettings, null, "\t"), "utf-8");
        }
        if (await fs.pathExists(appSettingsDevPath)) {
          const appSettings = await fs.readJson(appSettingsDevPath);
          if (
            !appSettings.TeamsFx ||
            !appSettings.TeamsFx.Authentication ||
            !appSettings.TeamsFx.Authentication.Bot
          ) {
            appSettings.TeamsFx = AddSsoParameters.AppSettingsToAddForBot;
          }
          await fs.writeFile(appSettingsDevPath, JSON.stringify(appSettings, null, "\t"), "utf-8");
        }
      } else {
        // README.md
        const readmeSourcePath = path.join(botTemplateFolder, AddSsoParameters.Readme);
        const readmeTargetPath = path.join(botFolder, AddSsoParameters.Readme);
        const readme = await fs.readFile(readmeSourcePath);
        fs.writeFile(readmeTargetPath, readme);

        // Sample Code
        const sampleSourceFolder = path.join(botTemplateFolder, languageFolderName);
        const sampleZip = new AdmZip();
        sampleZip.addLocalFolder(sampleSourceFolder);
        await unzip(sampleZip, botFolder);
      }
    }
  } catch (error) {
    if (isV3Enabled() && (await fs.pathExists(authFolder))) {
      await fs.remove(authFolder);
    }
    if (!isV3Enabled() && needTab && (await fs.pathExists(tabFolder))) {
      await fs.remove(tabFolder);
    }
    if (!isV3Enabled() && needBot && (await fs.pathExists(botFolder))) {
      await fs.remove(botFolder);
    }
    const e = new SystemError(
      SolutionSource,
      SolutionError.FailedToCreateAuthFiles,
      getLocalizedString("core.addSsoFiles.FailedToCreateAuthFiles", error.message)
    );
    return err(e);
  }

  return ok(undefined);
}

export function validateAndParseLanguage(language: string): Result<string, FxError> {
  if (language.toLowerCase() == Language.TypeScript) {
    return ok("ts");
  }

  if (language.toLowerCase() == Language.JavaScript) {
    return ok("js");
  }

  if (language.toLowerCase() == Language.CSharp) {
    return ok("csharp");
  }

  const e = new SystemError(
    SolutionSource,
    SolutionError.InvalidInput,
    getLocalizedString("core.addSsoFiles.invalidLanguage")
  );
  return err(e);
}
