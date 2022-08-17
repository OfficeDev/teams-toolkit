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
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import * as path from "path";
import { v4 } from "uuid";
import _ from "lodash";
import * as util from "util";
import isUUID from "validator/lib/isUUID";
import {
  AppStudioScopes,
  compileHandlebarsTemplateString,
  getAppDirectory,
} from "../../../common/tools";
import { HelpLinks } from "../../../common/constants";
import { AppStudioClient } from "../../../plugins/resource/appstudio/appStudio";
import { Constants } from "../../../plugins/resource/appstudio/constants";
import { AppStudioError } from "../../../plugins/resource/appstudio/errors";
import { AppStudioResultFactory } from "../../../plugins/resource/appstudio/results";
import { readAppManifest, getTeamsAppManifestPath } from "./utils";
import { ComponentNames } from "../../constants";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { getCustomizedKeys } from "../../../plugins/resource/appstudio/utils/utils";
import { TelemetryPropertyKey } from "../../../plugins/resource/appstudio/utils/telemetry";

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
  } else {
    const buildPackage = await buildTeamsAppPackage(inputs.projectPath, envInfo!, true);
    if (buildPackage.isErr()) {
      return err(buildPackage.error);
    }
    archivedFile = await fs.readFile(buildPackage.value);
    teamsAppId = envInfo.state[ComponentNames.AppManifest]?.teamsAppId;
  }
  let create = true;
  if (teamsAppId) {
    try {
      await AppStudioClient.getApp(teamsAppId, appStudioToken, ctx.logProvider);
      create = false;
    } catch (error) {}
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
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppCreateFailedError.name,
          AppStudioError.TeamsAppCreateFailedError.message(e)
        )
      );
    }
  } else {
    return ok(teamsAppId);
  }
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
    const buildPackage = await buildTeamsAppPackage(inputs.projectPath, envInfo!);
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
    let description = `The app ${existApp.displayName} has already been submitted to tenant App Catalog.\nStatus: ${existApp.publishingState}\n`;
    if (existApp.lastModifiedDateTime) {
      description =
        description + `Last Modified: ${existApp.lastModifiedDateTime?.toLocaleString()}\n`;
    }
    description = description + "Do you want to submit a new update?";
    const res = await ctx.userInteraction.showMessage("warn", description, true, "Confirm");
    if (res?.isOk() && res.value === "Confirm") executePublishUpdate = true;

    if (executePublishUpdate) {
      const appId = await AppStudioClient.publishTeamsAppUpdate(
        manifest.id,
        archivedFile,
        appStudioTokenRes.value
      );
      return ok({ publishedAppId: appId, appName: manifest.name.short, update: true });
    } else {
      throw AppStudioResultFactory.SystemError(
        AppStudioError.TeamsAppPublishCancelError.name,
        AppStudioError.TeamsAppPublishCancelError.message(manifest.name.short)
      );
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
  projectPath: string,
  envInfo: v3.EnvInfoV3,
  withEmptyCapabilities = false,
  telemetryProps?: Record<string, string>
): Promise<Result<string, FxError>> {
  const buildFolderPath = path.join(projectPath, BuildFolderName, AppPackageFolderName);
  await fs.ensureDir(buildFolderPath);
  const manifestRes = await getManifest(projectPath, envInfo, telemetryProps);
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

  const zipFileName = path.join(buildFolderPath, `appPackage.${envInfo.envName}.zip`);
  zip.writeZip(zipFileName);

  const manifestFileName = path.join(buildFolderPath, `manifest.${envInfo.envName}.json`);
  if (await fs.pathExists(manifestFileName)) {
    await fs.chmod(manifestFileName, 0o777);
  }
  await fs.writeFile(manifestFileName, JSON.stringify(manifest, null, 4));
  await fs.chmod(manifestFileName, 0o444);

  return ok(zipFileName);
}

/**
 * Validate manifest
 * @returns an array of validation error strings
 */
export async function validateManifest(
  manifest: TeamsAppManifest
): Promise<Result<string[], FxError>> {
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
  }
}

export async function getManifest(
  projectPath: string,
  envInfo: v3.EnvInfoV3,
  telemetryProps?: Record<string, string>
): Promise<Result<TeamsAppManifest, FxError>> {
  // Read template
  const manifestTemplateRes = await readAppManifest(projectPath);
  if (manifestTemplateRes.isErr()) {
    return err(manifestTemplateRes.error);
  }
  let manifestString = JSON.stringify(manifestTemplateRes.value);
  const customizedKeys = getCustomizedKeys("", JSON.parse(manifestString));
  if (telemetryProps) {
    telemetryProps[TelemetryPropertyKey.customizedKeys] = JSON.stringify(customizedKeys);
  }
  // Render mustache template with state and config
  const view = {
    config: envInfo.config,
    state: envInfo.state,
  };
  manifestString = compileHandlebarsTemplateString(manifestString, view);

  const manifest: TeamsAppManifest = JSON.parse(manifestString);

  return ok(manifest);
}

export async function updateManifest(
  ctx: ResourceContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  const teamsAppId = ctx.envInfo.state[ComponentNames.AppManifest]?.teamsAppId;
  let manifest: any;
  const manifestResult = await getManifest(inputs.projectPath, ctx.envInfo);
  if (manifestResult.isErr()) {
    ctx.logProvider?.error(getLocalizedString("error.appstudio.updateManifestFailed"));
    const isProvisionSucceeded = ctx.envInfo.state["solution"].provisionSucceeded as boolean;
    if (
      manifestResult.error.name === AppStudioError.GetRemoteConfigFailedError.name &&
      !isProvisionSucceeded
    ) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.GetRemoteConfigFailedError.name,
          AppStudioError.GetRemoteConfigFailedError.message(
            getLocalizedString("error.appstudio.updateManifestFailed"),
            isProvisionSucceeded
          ),
          HelpLinks.WhyNeedProvision
        )
      );
    } else {
      return err(manifestResult.error);
    }
  } else {
    manifest = manifestResult.value;
  }

  const manifestFileName = await getTeamsAppManifestPath(inputs.projectPath);
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
    await buildTeamsAppPackage(inputs.projectPath, ctx.envInfo);
  }
  const existingManifest = await fs.readJSON(manifestFileName);
  delete manifest.id;
  delete existingManifest.id;
  if (!_.isEqual(manifest, existingManifest)) {
    const res = await ctx.userInteraction.showMessage(
      "warn",
      getLocalizedString("plugins.appstudio.updateManifestTip"),
      true,
      "Preview only",
      "Preview and update"
    );

    const error = AppStudioResultFactory.UserError(
      AppStudioError.UpdateManifestCancelError.name,
      AppStudioError.UpdateManifestCancelError.message(manifest.name.short)
    );
    if (res?.isOk() && res.value === "Preview only") {
      buildTeamsAppPackage(inputs.projectPath, ctx.envInfo);
      return err(error);
    } else if (res?.isOk() && res.value === "Preview and update") {
      buildTeamsAppPackage(inputs.projectPath, ctx.envInfo);
    } else {
      return err(error);
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
        const res = await ctx.userInteraction.showMessage(
          "warn",
          getLocalizedString("plugins.appstudio.updateOverwriteTip"),
          true,
          "Overwrite and update"
        );

        if (!(res?.isOk() && res.value === "Overwrite and update")) {
          const error = AppStudioResultFactory.UserError(
            AppStudioError.UpdateManifestCancelError.name,
            AppStudioError.UpdateManifestCancelError.message(manifest.name.short)
          );
          return err(error);
        }
      }
    }

    const result = await updateTeamsApp(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
    if (result.isErr()) {
      return err(result.error);
    }

    ctx.logProvider?.info(getLocalizedString("plugins.appstudio.teamsAppUpdatedLog", teamsAppId));
    ctx.userInteraction
      .showMessage(
        "info",
        getLocalizedString("plugins.appstudio.teamsAppUpdatedNotice"),
        false,
        Constants.VIEW_DEVELOPER_PORTAL
      )
      .then((res) => {
        if (res?.isOk() && res.value === Constants.VIEW_DEVELOPER_PORTAL) {
          ctx.userInteraction.openUrl(
            util.format(Constants.DEVELOPER_PORTAL_APP_PACKAGE_URL, result.value)
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
