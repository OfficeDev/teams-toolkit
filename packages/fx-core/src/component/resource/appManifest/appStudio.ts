// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AppPackageFolderName,
  BuildFolderName,
  err,
  FxError,
  InputsWithProjectPath,
  M365TokenProvider,
  ManifestUtil,
  ok,
  Result,
  ResourceContextV3,
  TeamsAppManifest,
  TokenProvider,
  v2,
  v3,
  ProjectSettingsV3,
  ProjectSettings,
  UserError,
  UserCancelError,
  SystemError,
  LogProvider,
  Platform,
  Colors,
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import * as path from "path";
import { v4 } from "uuid";
import _ from "lodash";
import * as util from "util";
import isUUID from "validator/lib/isUUID";
import { Container } from "typedi";
import { AppStudioScopes, getAppDirectory, isSPFxProject } from "../../../common/tools";
import { HelpLinks } from "../../../common/constants";
import { AppStudioClient } from "./appStudioClient";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import { ComponentNames } from "../../constants";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { manifestUtils } from "./utils/ManifestUtils";
import { environmentManager } from "../../../core/environment";
import { Constants, supportedLanguageCodes } from "./constants";
import { CreateAppPackageDriver } from "../../driver/teamsApp/createAppPackage";
import { ConfigureTeamsAppDriver, defaultOutputNames } from "../../driver/teamsApp/configure";
import { CreateAppPackageArgs } from "../../driver/teamsApp/interfaces/CreateAppPackageArgs";
import { ConfigureTeamsAppArgs } from "../../driver/teamsApp/interfaces/ConfigureTeamsAppArgs";
import { DriverContext } from "../../driver/interface/commonArgs";
import { envUtil } from "../../utils/envUtil";
import { AppPackage } from "./interfaces/appPackage";
import { basename, extname } from "path";
import set from "lodash/set";
import { CoreQuestionNames } from "../../../core/question";
import { actionName as createAppPackageActionName } from "../../driver/teamsApp/createAppPackage";
import { actionName as configureTeamsAppActionName } from "../../driver/teamsApp/configure";
import { FileNotFoundError } from "../../../error/common";

/**
 * Create Teams app if not exists
 * @param ctx
 * @param inputs
 * @param envInfo
 * @param tokenProvider
 * @returns Teams app id
 */
export async function createTeamsApp(
  ctx: v2.Context,
  inputs: InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider
): Promise<Result<string, FxError>> {
  const appStudioTokenRes = await tokenProvider.m365TokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }
  const appStudioToken = appStudioTokenRes.value;

  let teamsAppId;
  let archivedFile;
  let create = true;
  if (inputs.appPackagePath) {
    if (!(await fs.pathExists(inputs.appPackagePath))) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(inputs.appPackagePath)
        )
      );
    }
    archivedFile = await fs.readFile(inputs.appPackagePath);
    const zipEntries = new AdmZip(archivedFile).getEntries();
    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (!manifestFile) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(Constants.MANIFEST_FILE)
        )
      );
    }
    const manifestString = manifestFile.getData().toString();
    const manifest = JSON.parse(manifestString) as TeamsAppManifest;
    teamsAppId = manifest.id;
    if (teamsAppId) {
      try {
        await AppStudioClient.getApp(teamsAppId, appStudioToken, ctx.logProvider);
        create = false;
      } catch (error) {}
    }
  } else {
    // Corner case: users under same tenant cannot import app with same Teams app id
    // Generate a new Teams app id for local debug to avoid conflict
    teamsAppId = envInfo.state[ComponentNames.AppManifest]?.teamsAppId;
    if (teamsAppId) {
      try {
        await AppStudioClient.getApp(teamsAppId, appStudioToken, ctx.logProvider);
        create = false;
      } catch (error: any) {
        if (
          envInfo.envName === environmentManager.getLocalEnvName() &&
          error.message &&
          error.message.includes("404")
        ) {
          const exists = await AppStudioClient.checkExistsInTenant(
            teamsAppId,
            appStudioToken,
            ctx.logProvider
          );
          if (exists) {
            envInfo.state[ComponentNames.AppManifest].teamsAppId = v4();
          }
        }
      }
    }
    const buildPackage = await buildTeamsAppPackage(
      ctx.projectSetting,
      inputs.projectPath,
      envInfo!,
      true
    );
    if (buildPackage.isErr()) {
      return err(buildPackage.error);
    }
    archivedFile = await fs.readFile(buildPackage.value);
  }

  if (create) {
    try {
      const appDefinition = await AppStudioClient.importApp(
        archivedFile,
        appStudioTokenRes.value,
        ctx.logProvider
      );
      ctx.logProvider.info(
        getLocalizedString("plugins.appstudio.teamsAppCreatedNotice", appDefinition.teamsAppId!)
      );
      return ok(appDefinition.teamsAppId!);
    } catch (e: any) {
      if (e instanceof UserError || e instanceof SystemError) {
        return err(e);
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.TeamsAppCreateFailedError.name,
            AppStudioError.TeamsAppCreateFailedError.message(e)
          )
        );
      }
    }
  } else {
    return ok(teamsAppId);
  }
}

export async function checkIfAppInDifferentAcountSameTenant(
  teamsAppId: string,
  tokenProvider: M365TokenProvider,
  logger: LogProvider
): Promise<Result<boolean, FxError>> {
  const appStudioTokenRes = await tokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }

  const appStudioToken = appStudioTokenRes.value;

  try {
    await AppStudioClient.getApp(teamsAppId, appStudioToken, logger);
  } catch (error: any) {
    if (error.message && error.message.includes("404")) {
      const exists = await AppStudioClient.checkExistsInTenant(teamsAppId, appStudioToken, logger);

      return ok(exists);
    }
  }

  return ok(false);
}

/**
 * Update Teams app
 * @param ctx
 * @param inputs
 * @param envInfo
 * @param tokenProvider
 * @returns
 */
export async function updateTeamsApp(
  ctx: v2.Context,
  inputs: InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider
): Promise<Result<string, FxError>> {
  const appStudioTokenRes = await tokenProvider.m365TokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }
  const appStudioToken = appStudioTokenRes.value;

  let archivedFile;
  if (inputs.appPackagePath) {
    if (!(await fs.pathExists(inputs.appPackagePath))) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(inputs.appPackagePath)
        )
      );
    }
    archivedFile = await fs.readFile(inputs.appPackagePath);
  } else {
    const buildPackage = await buildTeamsAppPackage(
      ctx.projectSetting,
      inputs.projectPath,
      envInfo!
    );
    if (buildPackage.isErr()) {
      return err(buildPackage.error);
    }
    archivedFile = await fs.readFile(buildPackage.value);
  }

  try {
    const appDefinition = await AppStudioClient.importApp(
      archivedFile,
      appStudioToken,
      ctx.logProvider,
      true
    );
    ctx.logProvider.info(
      getLocalizedString("plugins.appstudio.teamsAppUpdatedLog", appDefinition.teamsAppId!)
    );
    return ok(appDefinition.teamsAppId!);
  } catch (e: any) {
    return err(
      AppStudioResultFactory.SystemError(
        AppStudioError.TeamsAppCreateFailedError.name,
        AppStudioError.TeamsAppCreateFailedError.message(e)
      )
    );
  }
}

export async function publishTeamsApp(
  ctx: v2.Context,
  inputs: InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: M365TokenProvider,
  telemetryProps?: Record<string, string>
): Promise<Result<{ appName: string; publishedAppId: string; update: boolean }, FxError>> {
  let archivedFile;
  // User provided zip file
  if (inputs.appPackagePath) {
    if (await fs.pathExists(inputs.appPackagePath)) {
      archivedFile = await fs.readFile(inputs.appPackagePath);
    } else {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(inputs.appPackagePath)
        )
      );
    }
  } else {
    const buildPackage = await buildTeamsAppPackage(
      ctx.projectSetting,
      inputs.projectPath,
      envInfo!,
      false,
      telemetryProps
    );
    if (buildPackage.isErr()) {
      return err(buildPackage.error);
    }
    archivedFile = await fs.readFile(buildPackage.value);
  }

  const zipEntries = new AdmZip(archivedFile).getEntries();

  const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
  if (!manifestFile) {
    return err(
      AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(Constants.MANIFEST_FILE)
      )
    );
  }
  const manifestString = manifestFile.getData().toString();
  const manifest = JSON.parse(manifestString) as TeamsAppManifest;

  // manifest.id === externalID
  const appStudioTokenRes = await tokenProvider.getAccessToken({ scopes: AppStudioScopes });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }
  const existApp = await AppStudioClient.getAppByTeamsAppId(manifest.id, appStudioTokenRes.value);
  if (existApp) {
    let executePublishUpdate = false;
    let description = getLocalizedString(
      "plugins.appstudio.pubWarn",
      existApp.displayName,
      existApp.publishingState
    );
    if (existApp.lastModifiedDateTime) {
      description =
        description +
        getLocalizedString(
          "plugins.appstudio.lastModified",
          existApp.lastModifiedDateTime?.toLocaleString()
        );
    }
    description = description + getLocalizedString("plugins.appstudio.updatePublihsedAppConfirm");
    const confirm = getLocalizedString("core.option.confirm");
    const res = await ctx.userInteraction.showMessage("warn", description, true, confirm);
    if (res?.isOk() && res.value === confirm) executePublishUpdate = true;

    if (executePublishUpdate) {
      const appId = await AppStudioClient.publishTeamsAppUpdate(
        manifest.id,
        archivedFile,
        appStudioTokenRes.value
      );
      return ok({ publishedAppId: appId, appName: manifest.name.short, update: true });
    } else {
      return err(UserCancelError);
    }
  } else {
    const appId = await AppStudioClient.publishTeamsApp(
      manifest.id,
      archivedFile,
      appStudioTokenRes.value
    );
    return ok({ publishedAppId: appId, appName: manifest.name.short, update: false });
  }
}

/**
 * Build appPackage.{envName}.zip
 * @returns Path for built Teams app package
 */
export async function buildTeamsAppPackage(
  projectSettings: ProjectSettingsV3 | ProjectSettings,
  projectPath: string,
  envInfo: v3.EnvInfoV3,
  withEmptyCapabilities = false,
  telemetryProps?: Record<string, string>
): Promise<Result<string, FxError>> {
  const buildFolderPath = path.join(projectPath, BuildFolderName, AppPackageFolderName);
  await fs.ensureDir(buildFolderPath);
  const manifestRes = await manifestUtils.getManifest(
    projectPath,
    envInfo,
    withEmptyCapabilities,
    telemetryProps
  );
  if (manifestRes.isErr()) {
    return err(manifestRes.error);
  }
  const manifest: TeamsAppManifest = manifestRes.value;
  if (!isUUID(manifest.id)) {
    manifest.id = v4();
  }
  if (withEmptyCapabilities) {
    manifest.bots = [];
    manifest.composeExtensions = [];
    manifest.configurableTabs = [];
    manifest.staticTabs = [];
    manifest.webApplicationInfo = undefined;
  }
  const appDirectory = await getAppDirectory(projectPath);
  const colorFile = path.join(appDirectory, manifest.icons.color);
  if (!(await fs.pathExists(colorFile))) {
    return err(
      AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(colorFile)
      )
    );
  }

  const outlineFile = path.join(appDirectory, manifest.icons.outline);
  if (!(await fs.pathExists(outlineFile))) {
    return err(
      AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(outlineFile)
      )
    );
  }

  const zip = new AdmZip();
  zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest, null, 4)));

  // outline.png & color.png, relative path
  let dir = path.dirname(manifest.icons.color);
  zip.addLocalFile(colorFile, dir === "." ? "" : dir);
  dir = path.dirname(manifest.icons.outline);
  zip.addLocalFile(outlineFile, dir === "." ? "" : dir);

  // localization file
  if (
    manifest.localizationInfo &&
    manifest.localizationInfo.additionalLanguages &&
    manifest.localizationInfo.additionalLanguages.length > 0
  ) {
    await Promise.all(
      manifest.localizationInfo.additionalLanguages.map(async function (language: any) {
        const file = language.file;
        const fileName = `${appDirectory}/${file}`;
        if (!(await fs.pathExists(fileName))) {
          throw AppStudioResultFactory.UserError(
            AppStudioError.FileNotFoundError.name,
            AppStudioError.FileNotFoundError.message(fileName)
          );
        }
        const dir = path.dirname(file);
        zip.addLocalFile(fileName, dir === "." ? "" : dir);
      })
    );
  }

  const zipFileName = path.join(buildFolderPath, `appPackage.${envInfo.envName}.zip`);
  zip.writeZip(zipFileName);

  const manifestFileName = path.join(buildFolderPath, `manifest.${envInfo.envName}.json`);
  if (await fs.pathExists(manifestFileName)) {
    await fs.chmod(manifestFileName, 0o777);
  }
  await fs.writeFile(manifestFileName, JSON.stringify(manifest, null, 4));
  await fs.chmod(manifestFileName, 0o444);

  if (isSPFxProject(projectSettings)) {
    const spfxTeamsPath = `${projectPath}/SPFx/teams`;
    await fs.copyFile(zipFileName, path.join(spfxTeamsPath, "TeamsSPFxApp.zip"));

    for (const file of await fs.readdir(`${projectPath}/SPFx/teams/`)) {
      if (
        file.endsWith("color.png") &&
        manifest.icons.color &&
        !manifest.icons.color.startsWith("https://")
      ) {
        const colorFile = `${appDirectory}/${manifest.icons.color}`;
        const color = await fs.readFile(colorFile);
        await fs.writeFile(path.join(spfxTeamsPath, file), color);
      } else if (
        file.endsWith("outline.png") &&
        manifest.icons.outline &&
        !manifest.icons.outline.startsWith("https://")
      ) {
        const outlineFile = `${appDirectory}/${manifest.icons.outline}`;
        const outline = await fs.readFile(outlineFile);
        await fs.writeFile(path.join(spfxTeamsPath, file), outline);
      }
    }
  }

  return ok(zipFileName);
}

/**
 * Validate manifest
 * @returns an array of validation error strings
 */
export async function validateManifest(
  manifest: TeamsAppManifest
): Promise<Result<string[], FxError>> {
  /*
  // Corner case: SPFx project validate without provision
  if (!isUUID(manifest.id)) {
    manifest.id = v4();
  }

  if (manifest.$schema) {
    try {
      const result = await ManifestUtil.validateManifest(manifest);
      return ok(result);
    } catch (e: any) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.ValidationFailedError.name,
          AppStudioError.ValidationFailedError.message([
            getLocalizedString(
              "error.appstudio.validateFetchSchemaFailed",
              manifest.$schema,
              e.message
            ),
          ]),
          HelpLinks.WhyNeedProvision
        )
      );
    }
  } else {
    return err(
      AppStudioResultFactory.UserError(
        AppStudioError.ValidationFailedError.name,
        AppStudioError.ValidationFailedError.message([
          getLocalizedString("error.appstudio.validateSchemaNotDefined"),
        ]),
        HelpLinks.WhyNeedProvision
      )
    );
  }*/
  return ok([]);
}

export async function updateManifest(
  ctx: ResourceContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<any, FxError>> {
  const teamsAppId = ctx.envInfo.state[ComponentNames.AppManifest]?.teamsAppId;
  let manifest: any;
  const manifestResult = await manifestUtils.getManifest(inputs.projectPath, ctx.envInfo, false);
  if (manifestResult.isErr()) {
    return err(manifestResult.error);
  } else {
    manifest = manifestResult.value;
  }

  const manifestFileName = await manifestUtils.getTeamsAppManifestPath(inputs.projectPath);
  if (!(await fs.pathExists(manifestFileName))) {
    const isProvisionSucceeded = ctx.envInfo.state["solution"].provisionSucceeded as boolean;
    if (!isProvisionSucceeded) {
      const msgs = AppStudioError.FileNotFoundError.message(manifestFileName);
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          [
            msgs[0] + getDefaultString("plugins.appstudio.provisionTip"),
            msgs[1] + getLocalizedString("plugins.appstudio.provisionTip"),
          ],
          HelpLinks.WhyNeedProvision
        )
      );
    }
    await buildTeamsAppPackage(ctx.projectSetting, inputs.projectPath, ctx.envInfo);
  }
  const existingManifest = await fs.readJSON(manifestFileName);
  delete manifest.id;
  delete existingManifest.id;
  if (!_.isEqual(manifest, existingManifest)) {
    const previewOnly = getLocalizedString("plugins.appstudio.previewOnly");
    const previewUpdate = getLocalizedString("plugins.appstudio.previewAndUpdate");
    const res = await ctx.userInteraction.showMessage(
      "warn",
      getLocalizedString("plugins.appstudio.updateManifestTip"),
      true,
      previewOnly,
      previewUpdate
    );

    if (res?.isOk() && res.value === previewOnly) {
      return await buildTeamsAppPackage(ctx.projectSetting, inputs.projectPath, ctx.envInfo);
    } else if (res?.isOk() && res.value === previewUpdate) {
      buildTeamsAppPackage(ctx.projectSetting, inputs.projectPath, ctx.envInfo);
    } else {
      return err(UserCancelError);
    }
  }

  const appStudioTokenRes = await ctx.tokenProvider.m365TokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }
  const appStudioToken = appStudioTokenRes.value;

  try {
    const localUpdateTime = ctx.envInfo.state[ComponentNames.AppManifest]
      .teamsAppUpdatedAt as number;
    if (localUpdateTime) {
      const app = await AppStudioClient.getApp(teamsAppId, appStudioToken, ctx.logProvider);
      const devPortalUpdateTime = new Date(app.updatedAt!)?.getTime() ?? -1;
      if (localUpdateTime < devPortalUpdateTime) {
        const option = getLocalizedString("plugins.appstudio.overwriteAndUpdate");
        const res = await ctx.userInteraction.showMessage(
          "warn",
          getLocalizedString("plugins.appstudio.updateOverwriteTip"),
          true,
          option
        );
        if (!(res?.isOk() && res.value === option)) {
          return err(UserCancelError);
        }
      }
    }

    const result = await updateTeamsApp(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
    if (result.isErr()) {
      return err(result.error);
    }

    ctx.logProvider?.info(getLocalizedString("plugins.appstudio.teamsAppUpdatedLog", teamsAppId));

    let loginHint = "";
    const accountRes = await ctx.tokenProvider.m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    if (accountRes.isOk()) {
      loginHint = accountRes.value.unique_name as string;
    }

    ctx.userInteraction
      .showMessage(
        "info",
        getLocalizedString("plugins.appstudio.teamsAppUpdatedNotice"),
        false,
        getLocalizedString("plugins.appstudio.viewDeveloperPortal")
      )
      .then((res) => {
        if (
          res?.isOk() &&
          res.value === getLocalizedString("plugins.appstudio.viewDeveloperPortal")
        ) {
          ctx.userInteraction.openUrl(
            util.format(Constants.DEVELOPER_PORTAL_APP_PACKAGE_URL, result.value, loginHint)
          );
        }
      });
    return ok(teamsAppId);
  } catch (error) {
    if (error.message && error.message.includes("404")) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.UpdateManifestWithInvalidAppError.name,
          AppStudioError.UpdateManifestWithInvalidAppError.message(teamsAppId)
        )
      );
    } else {
      return err(error);
    }
  }
}

export async function updateManifestV3(
  ctx: ResourceContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<Map<string, string>, FxError>> {
  const state = {
    TAB_ENDPOINT: process.env.TAB_ENDPOINT,
    TAB_DOMAIN: process.env.TAB_DOMAIN,
    BOT_ID: process.env.BOT_ID,
    BOT_DOMAIN: process.env.BOT_DOMAIN,
    ENV_NAME: process.env.TEAMSFX_ENV,
  };
  const teamsAppId = process.env.TEAMS_APP_ID;
  const manifestTemplatePath =
    inputs.manifestTemplatePath ??
    (await manifestUtils.getTeamsAppManifestPath(inputs.projectPath));
  const manifestFileName = path.join(
    inputs.projectPath,
    BuildFolderName,
    AppPackageFolderName,
    `manifest.${state.ENV_NAME}.json`
  );

  // Prepare for driver
  const buildDriver: CreateAppPackageDriver = Container.get(createAppPackageActionName);
  const createAppPackageArgs = generateCreateAppPackageArgs(
    inputs.projectPath,
    manifestTemplatePath,
    state.ENV_NAME!
  );
  const updateTeamsAppArgs: ConfigureTeamsAppArgs = {
    appPackagePath: createAppPackageArgs.outputZipPath,
  };
  const driverContext: DriverContext = generateDriverContext(ctx, inputs);
  await envUtil.readEnv(inputs.projectPath!, state.ENV_NAME!);

  // render manifest
  let manifest: any;
  const manifestResult = await manifestUtils.getManifestV3(manifestTemplatePath, state, false);
  if (manifestResult.isErr()) {
    return err(manifestResult.error);
  } else {
    manifest = manifestResult.value;
  }

  // read built manifest file
  if (!(await fs.pathExists(manifestFileName))) {
    const res = await buildDriver.run(createAppPackageArgs, driverContext);
    if (res.isErr()) {
      return err(res.error);
    }
  }
  const existingManifest = await fs.readJSON(manifestFileName);
  delete manifest.id;
  delete existingManifest.id;
  if (!_.isEqual(manifest, existingManifest)) {
    const previewOnly = getLocalizedString("plugins.appstudio.previewOnly");
    const previewUpdate = getLocalizedString("plugins.appstudio.previewAndUpdate");
    const res = await ctx.userInteraction.showMessage(
      "warn",
      getLocalizedString("plugins.appstudio.updateManifestTip"),
      true,
      previewUpdate,
      previewOnly
    );

    if (res?.isOk() && res.value === previewOnly) {
      return await buildDriver.run(createAppPackageArgs, driverContext);
    } else if (res?.isOk() && res.value === previewUpdate) {
      await buildDriver.run(createAppPackageArgs, driverContext);
    } else {
      return err(UserCancelError);
    }
  }

  const appStudioTokenRes = await ctx.tokenProvider.m365TokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }
  const appStudioToken = appStudioTokenRes.value;

  try {
    const localUpdateTime = process.env.TEAMS_APP_UPDATE_TIME;
    if (localUpdateTime) {
      const app = await AppStudioClient.getApp(teamsAppId!, appStudioToken, ctx.logProvider);
      const devPortalUpdateTime = new Date(app.updatedAt!)?.getTime() ?? -1;
      if (new Date(localUpdateTime).getTime() < devPortalUpdateTime) {
        const option = getLocalizedString("plugins.appstudio.overwriteAndUpdate");
        const res = await ctx.userInteraction.showMessage(
          "warn",
          getLocalizedString("plugins.appstudio.updateOverwriteTip"),
          true,
          option
        );
        if (!(res?.isOk() && res.value === option)) {
          return err(UserCancelError);
        }
      }
    }

    const configureDriver: ConfigureTeamsAppDriver = Container.get(configureTeamsAppActionName);
    const result = await configureDriver.run(updateTeamsAppArgs, driverContext);
    if (result.isErr()) {
      return err(result.error);
    }

    ctx.logProvider?.info(getLocalizedString("plugins.appstudio.teamsAppUpdatedLog", teamsAppId));

    let loginHint = "";
    const accountRes = await ctx.tokenProvider.m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    if (accountRes.isOk()) {
      loginHint = accountRes.value.unique_name as string;
    }

    const url = util.format(
      Constants.DEVELOPER_PORTAL_APP_PACKAGE_URL,
      result.value.get("TEAMS_APP_ID"),
      loginHint
    );
    if (inputs.platform === Platform.CLI) {
      const message = [
        {
          content: getLocalizedString("plugins.appstudio.teamsAppUpdatedCLINotice"),
          color: Colors.BRIGHT_GREEN,
        },
        { content: url, color: Colors.BRIGHT_CYAN },
      ];
      ctx.userInteraction.showMessage("info", message, false);
    } else {
      ctx.userInteraction
        .showMessage(
          "info",
          getLocalizedString("plugins.appstudio.teamsAppUpdatedNotice"),
          false,
          getLocalizedString("plugins.appstudio.viewDeveloperPortal")
        )
        .then((res) => {
          if (
            res?.isOk() &&
            res.value === getLocalizedString("plugins.appstudio.viewDeveloperPortal")
          ) {
            ctx.userInteraction.openUrl(url);
          }
        });
    }
    return result;
  } catch (error) {
    if (error.message && error.message.includes("404")) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.UpdateManifestWithInvalidAppError.name,
          AppStudioError.UpdateManifestWithInvalidAppError.message(teamsAppId!)
        )
      );
    } else {
      return err(error);
    }
  }
}

export async function updateTeamsAppV3ForPublish(
  ctx: ResourceContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<any, FxError>> {
  const driverContext: DriverContext = generateDriverContext(ctx, inputs);

  const updateTeamsAppArgs: ConfigureTeamsAppArgs = {
    appPackagePath: inputs[CoreQuestionNames.AppPackagePath],
  };

  const zipEntries = new AdmZip(updateTeamsAppArgs.appPackagePath).getEntries();
  const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
  let validationError: UserError | undefined;
  if (manifestFile) {
    try {
      const manifestString = manifestFile.getData().toString();
      const manifest = JSON.parse(manifestString) as TeamsAppManifest;
      if (!manifest.id || !isUUID(manifest.id)) {
        validationError = AppStudioResultFactory.UserError(
          AppStudioError.ValidationFailedError.name,
          AppStudioError.ValidationFailedError.message([
            getLocalizedString("error.appstudio.noManifestId"),
          ])
        );
      } else {
        const validationResult = await validateManifest(manifest);
        if (validationResult.isErr()) {
          validationError = validationResult.error;
        } else {
          if (validationResult.value.length > 0) {
            const errMessage = AppStudioError.ValidationFailedError.message(validationResult.value);
            validationError = AppStudioResultFactory.UserError(
              AppStudioError.ValidationFailedError.name,
              errMessage
            );
          }
        }
      }
    } catch (e) {
      validationError = AppStudioResultFactory.UserError(
        AppStudioError.ValidationFailedError.name,
        AppStudioError.ValidationFailedError.message([(e as any).message])
      );
      validationError.stack = (e as any).stack;
    }
  } else {
    // missing manifest file
    validationError = new FileNotFoundError("appManifest", "manifest.json");
  }

  if (validationError) {
    const suggestionDefaultMessage = getDefaultString(
      "error.appstudio.publishInDevPortalSuggestionForValidationError"
    );
    const suggestionMessage = getLocalizedString(
      "error.appstudio.publishInDevPortalSuggestionForValidationError"
    );
    validationError.message += ` ${suggestionDefaultMessage}`;
    validationError.displayMessage += ` ${suggestionMessage}`;
    ctx.logProvider?.error(getLocalizedString("plugins.appstudio.validationFailedNotice"));
    return err(validationError);
  }

  const configureDriver: ConfigureTeamsAppDriver = Container.get(configureTeamsAppActionName);
  const result = await configureDriver.run(updateTeamsAppArgs, driverContext);
  if (result.isErr()) {
    return err(result.error);
  }

  return ok(result.value.get(defaultOutputNames.teamsAppId));
}

export async function getAppPackage(
  teamsAppId: string,
  m365TokenProvider: M365TokenProvider,
  logProvider?: LogProvider
): Promise<Result<AppPackage, FxError>> {
  const appStudioTokenRes = await m365TokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  if (appStudioTokenRes.isErr()) {
    return err(appStudioTokenRes.error);
  }
  try {
    const data = await AppStudioClient.getAppPackage(
      teamsAppId,
      appStudioTokenRes.value,
      logProvider
    );

    const appPackage: AppPackage = {};

    const buffer = Buffer.from(data, "base64");
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries(); // an array of ZipEntry records

    zipEntries?.forEach(async function (zipEntry) {
      const data = zipEntry.getData();
      const name = zipEntry.entryName.toLowerCase();
      switch (name) {
        case "manifest.json":
          appPackage.manifest = data;
          break;
        case "color.png":
          appPackage.icons = { ...appPackage.icons, color: data };
          break;
        case "outline.png":
          appPackage.icons = { ...appPackage.icons, outline: data };
          break;
        default:
          const ext = extname(name);
          const base = basename(name, ext);
          // Since we don't support scene features, the remaining files are json files for language.
          if (supportedLanguageCodes.findIndex((code) => code === base) > -1) {
            set(appPackage, ["languages", base], data);
          } else {
            logProvider?.warning(getLocalizedString("plugins.appstudio.unprocessedFile", name));
          }
      }
    });
    return ok(appPackage);
  } catch (e) {
    return err(e);
  }
}

function generateDriverContext(
  ctx: ResourceContextV3,
  inputs: InputsWithProjectPath
): DriverContext {
  return {
    azureAccountProvider: ctx.tokenProvider!.azureAccountProvider,
    m365TokenProvider: ctx.tokenProvider!.m365TokenProvider,
    ui: ctx.userInteraction,
    progressBar: undefined,
    logProvider: ctx.logProvider,
    telemetryReporter: ctx.telemetryReporter,
    projectPath: ctx.projectPath!,
    platform: inputs.platform,
  };
}

function generateCreateAppPackageArgs(
  projectPath: string,
  manifestTemplatePath: string,
  envName: string
): CreateAppPackageArgs {
  const manifestFileName = path.join(
    projectPath,
    BuildFolderName,
    AppPackageFolderName,
    `manifest.${envName}.json`
  );

  return {
    manifestPath: manifestTemplatePath,
    outputZipPath: path.join(
      projectPath,
      BuildFolderName,
      AppPackageFolderName,
      `appPackage.${envName}.zip`
    ),
    outputJsonPath: manifestFileName,
  };
}
