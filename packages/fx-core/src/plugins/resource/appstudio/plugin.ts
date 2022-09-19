// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ok,
  err,
  AzureSolutionSettings,
  ConfigFolderName,
  FxError,
  Result,
  PluginContext,
  TeamsAppManifest,
  AppPackageFolderName,
  BuildFolderName,
  ManifestUtil,
  UserError,
} from "@microsoft/teamsfx-api";
import { AppStudioClient } from "./appStudio";
import { AppDefinition } from "./interfaces/appDefinition";
import { AppUser } from "./interfaces/appUser";
import {
  AzureSolutionQuestionNames,
  BotOptionItem,
  BotScenario,
  MessageExtensionItem,
  TabOptionItem,
} from "../../solution/fx-solution/question";
import {
  REMOTE_AAD_ID,
  BOT_DOMAIN,
  WEB_APPLICATION_INFO_SOURCE,
  PluginNames,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../solution/fx-solution/constants";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import {
  Constants,
  FRONTEND_ENDPOINT,
  FRONTEND_DOMAIN,
  BOT_ID,
  REMOTE_MANIFEST,
  ErrorMessages,
  MANIFEST_TEMPLATE,
  STATIC_TABS_TPL_FOR_MULTI_ENV,
  CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV,
  BOTS_TPL_FOR_MULTI_ENV,
  COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV,
  COLOR_TEMPLATE,
  OUTLINE_TEMPLATE,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_OUTLINE_PNG_FILENAME,
  MANIFEST_RESOURCES,
  FRONTEND_INDEX_PATH,
  TEAMS_APP_MANIFEST_TEMPLATE_V3,
  WEB_APPLICATION_INFO_MULTI_ENV,
  M365_SCHEMA,
  M365_MANIFEST_VERSION,
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE,
  BOTS_TPL_FOR_NOTIFICATION,
  COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV_M365,
  DEFAULT_DEVELOPER,
} from "./constants";
import AdmZip from "adm-zip";
import * as fs from "fs-extra";
import { getTemplatesFolder } from "../../../folder";
import path from "path";
import * as util from "util";
import { v4 } from "uuid";
import isUUID from "validator/lib/isUUID";
import { ResourcePermission, TeamsAppAdmin } from "../../../common/permissionInterface";
import Mustache from "mustache";
import { getCustomizedKeys, renderTemplate } from "./utils/utils";
import { TelemetryPropertyKey } from "./utils/telemetry";
import _ from "lodash";
import { HelpLinks, ResourcePlugins } from "../../../common/constants";
import { getCapabilities, getManifestTemplatePath, loadManifest } from "./manifestTemplate";
import { environmentManager } from "../../../core/environment";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { getProjectTemplatesFolderPath } from "../../../common/utils";
import { PluginBot } from "../../resource/bot/resources/strings";
import {
  AppStudioScopes,
  getAppDirectory,
  isAADEnabled,
  isSPFxProject,
} from "../../../common/tools";

export class AppStudioPluginImpl {
  public commonProperties: { [key: string]: string } = {};

  constructor() {}

  public async provision(ctx: PluginContext): Promise<Result<string, FxError>> {
    const provisionProgress = ctx.ui?.createProgressBar(
      getLocalizedString("plugins.appstudio.provisionTitle"),
      1
    );
    await provisionProgress?.start();
    await provisionProgress?.next(
      getLocalizedString("plugins.appstudio.provisionProgress", ctx.projectSettings!.appName)
    );
    let remoteTeamsAppId = await this.getTeamsAppId(ctx);

    let create = false;
    if (!remoteTeamsAppId) {
      create = true;
    } else {
      const appStudioTokenRes = await ctx?.m365TokenProvider!.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (appStudioTokenRes.isErr()) {
        return err(appStudioTokenRes.error);
      }
      const appStudioToken = appStudioTokenRes.value;
      try {
        await AppStudioClient.getApp(remoteTeamsAppId, appStudioToken, ctx.logProvider);
      } catch (error) {
        create = true;
      }
    }

    if (create) {
      const result = await this.createApp(ctx, false);
      if (result.isErr()) {
        await provisionProgress?.end(false);
        return err(result.error);
      }
      remoteTeamsAppId = result.value.teamsAppId!;
      ctx.logProvider?.info(
        getLocalizedString("plugins.appstudio.teamsAppCreatedNotice", remoteTeamsAppId)
      );
    }
    ctx.envInfo.state.get(PluginNames.APPST)?.set(Constants.TEAMS_APP_ID, remoteTeamsAppId);
    await provisionProgress?.end(true);
    return ok(remoteTeamsAppId);
  }

  public async postProvision(ctx: PluginContext): Promise<Result<string, FxError>> {
    const postProvisionProgress = ctx.ui?.createProgressBar(
      getLocalizedString("plugins.appstudio.provisionTitle"),
      1
    );
    await postProvisionProgress?.start(
      getLocalizedString("plugins.appstudio.postProvisionProgress", ctx.projectSettings!.appName)
    );
    await postProvisionProgress?.next();

    const result = await this.updateApp(ctx, false);
    if (result.isErr()) {
      await postProvisionProgress?.end(false);
      return err(result.error);
    }

    ctx.logProvider?.info(getLocalizedString("plugins.appstudio.teamsAppUpdatedLog", result.value));
    await postProvisionProgress?.end(true);
    return ok(result.value);
  }

  public async validateManifest(
    ctx: PluginContext,
    isLocalDebug: boolean
  ): Promise<Result<string[], FxError>> {
    let manifestString: string | undefined = undefined;
    if (isSPFxProject(ctx.projectSettings)) {
      manifestString = await this.getSPFxManifest(ctx);
      const manifest = JSON.parse(manifestString);
      if (!isUUID(manifest.id)) {
        manifest.id = v4();
      }
      manifestString = JSON.stringify(manifest, null, 4);
    } else {
      const manifestRes = await this.getManifest(ctx, isLocalDebug);
      if (manifestRes.isErr()) {
        ctx.logProvider?.error(getLocalizedString("plugins.appstudio.validationFailedNotice"));
        return err(manifestRes.error);
      } else {
        manifestString = JSON.stringify(manifestRes.value);
      }
    }
    const manifest: TeamsAppManifest = JSON.parse(manifestString);

    let errors: string[];
    const res = await this.validateManifestAgainstSchema(manifest);
    if (res.isOk()) {
      errors = res.value;
    } else {
      return err(res.error);
    }

    const appDirectory = await getAppDirectory(ctx.root);
    if (manifest.icons.outline) {
      if (
        manifest.icons.outline.startsWith("https://") ||
        manifest.icons.outline.startsWith("http://")
      ) {
        errors.push(getLocalizedString("plugins.appstudio.relativePathTip", "icons.outline"));
      } else {
        const outlineFile = path.join(appDirectory, manifest.icons.outline);
        if (!(await fs.pathExists(outlineFile))) {
          errors.push(getLocalizedString("error.appstudio.fileNotFoundError", outlineFile));
        }
      }
    }

    if (manifest.icons.color) {
      if (
        manifest.icons.color.startsWith("https://") ||
        manifest.icons.color.startsWith("http://")
      ) {
        errors.push(getLocalizedString("plugins.appstudio.relativePathTip", "icons.color"));
      } else {
        const colorFile = path.join(appDirectory, manifest.icons.color);
        if (!(await fs.pathExists(colorFile))) {
          errors.push(getLocalizedString("error.appstudio.fileNotFoundError", colorFile));
        }
      }
    }
    return ok(errors);
  }

  public async updateManifest(
    ctx: PluginContext,
    isLocalDebug: boolean
  ): Promise<Result<string, FxError>> {
    const teamsAppId = await this.getTeamsAppId(ctx);
    let manifest: any;
    let manifestString: string;
    const manifestResult = await loadManifest(ctx.root);
    if (manifestResult.isErr()) {
      return err(manifestResult.error);
    } else {
      manifestString = JSON.stringify(manifestResult.value);
    }

    if (isSPFxProject(ctx.projectSettings)) {
      manifestString = await this.getSPFxManifest(ctx);
      manifest = JSON.parse(manifestString);
    } else {
      const appManifest = await this.getManifest(ctx, isLocalDebug);
      if (appManifest.isErr()) {
        ctx.logProvider?.error(getLocalizedString("error.appstudio.updateManifestFailed"));
        const isProvisionSucceeded = !!(ctx.envInfo.state
          .get("solution")
          ?.get(SOLUTION_PROVISION_SUCCEEDED) as boolean);
        if (
          appManifest.error.name === AppStudioError.GetRemoteConfigFailedError.name &&
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
          return err(appManifest.error);
        }
      }
      manifest = appManifest.value;
    }

    const manifestFileName =
      `${ctx.root}/${BuildFolderName}/${AppPackageFolderName}/manifest.` +
      (isLocalDebug ? environmentManager.getLocalEnvName() : ctx.envInfo.envName) +
      `.json`;
    if (!(await fs.pathExists(manifestFileName))) {
      const isProvisionSucceeded = !!(ctx.envInfo.state
        .get("solution")
        ?.get(SOLUTION_PROVISION_SUCCEEDED) as boolean);
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
      await this.buildTeamsAppPackage(ctx, isLocalDebug);
    }
    const existingManifest = await fs.readJSON(manifestFileName);
    delete manifest.id;
    delete existingManifest.id;
    if (!_.isEqual(manifest, existingManifest)) {
      const res = await ctx.ui?.showMessage(
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
        this.buildTeamsAppPackage(ctx, isLocalDebug);
        return err(error);
      } else if (res?.isOk() && res.value === "Preview and update") {
        this.buildTeamsAppPackage(ctx, isLocalDebug);
      } else {
        return err(error);
      }
    }

    const appStudioTokenRes = await ctx?.m365TokenProvider!.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;
    try {
      const localUpdateTime = isLocalDebug
        ? undefined
        : (ctx.envInfo.state.get(PluginNames.APPST)?.get(Constants.TEAMS_APP_UPDATED_AT) as number);
      if (localUpdateTime) {
        const app = await AppStudioClient.getApp(teamsAppId, appStudioToken, ctx.logProvider);
        const devPortalUpdateTime = new Date(app.updatedAt!)?.getTime() ?? -1;
        if (localUpdateTime < devPortalUpdateTime) {
          const res = await ctx.ui?.showMessage(
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

      const result = await this.updateApp(ctx, false);
      if (result.isErr()) {
        return err(result.error);
      }

      ctx.logProvider?.info(getLocalizedString("plugins.appstudio.teamsAppUpdatedLog", teamsAppId));
      ctx.ui
        ?.showMessage(
          "info",
          getLocalizedString("plugins.appstudio.teamsAppUpdatedNotice"),
          false,
          Constants.VIEW_DEVELOPER_PORTAL
        )
        .then((res) => {
          if (res?.isOk() && res.value === Constants.VIEW_DEVELOPER_PORTAL) {
            ctx.ui?.openUrl(util.format(Constants.DEVELOPER_PORTAL_APP_PACKAGE_URL, result.value));
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

  public async scaffold(ctx: PluginContext): Promise<any> {
    let manifest: TeamsAppManifest | undefined;
    const templatesFolder = getTemplatesFolder();

    // cannot use getAppDirectory before creating the manifest file
    const appDir = path.join(await getProjectTemplatesFolderPath(ctx.root), "appPackage");

    if (isSPFxProject(ctx.projectSettings)) {
      const templateManifestFolder = path.join(templatesFolder, "plugins", "resource", "spfx");
      const manifestFile = path.resolve(
        templateManifestFolder,
        "./solution/manifest_multi_env.json"
      );
      const manifestString = (await fs.readFile(manifestFile)).toString();
      manifest = JSON.parse(manifestString);
    } else {
      const solutionSettings: AzureSolutionSettings = ctx.projectSettings
        ?.solutionSettings as AzureSolutionSettings;
      const hasFrontend = solutionSettings.capabilities.includes(TabOptionItem.id);
      const hasBot = solutionSettings.capabilities.includes(BotOptionItem.id);
      const scenarios = ctx.answers?.[AzureSolutionQuestionNames.Scenarios];
      const hasCommandAndResponseBot =
        scenarios?.includes && scenarios.includes(BotScenario.CommandAndResponseBot);
      const hasNotificationBot =
        scenarios?.includes && scenarios.includes(BotScenario.NotificationBot);
      const hasMessageExtension = solutionSettings.capabilities.includes(MessageExtensionItem.id);
      const hasAad = isAADEnabled(solutionSettings);
      const isM365 = ctx.projectSettings?.isM365;
      manifest = await createManifest(
        hasFrontend,
        hasBot,
        hasNotificationBot,
        hasCommandAndResponseBot,
        hasMessageExtension,
        false,
        hasAad,
        isM365
      );
    }
    await fs.ensureDir(appDir);
    const manifestTemplatePath = await getManifestTemplatePath(ctx.root);
    await fs.writeFile(manifestTemplatePath, JSON.stringify(manifest, null, 4));

    const defaultColorPath = path.join(templatesFolder, COLOR_TEMPLATE);
    const defaultOutlinePath = path.join(templatesFolder, OUTLINE_TEMPLATE);
    const resourcesDir = path.join(appDir, MANIFEST_RESOURCES);
    await fs.ensureDir(resourcesDir);
    await fs.copy(defaultColorPath, path.join(resourcesDir, DEFAULT_COLOR_PNG_FILENAME));
    await fs.copy(defaultOutlinePath, path.join(resourcesDir, DEFAULT_OUTLINE_PNG_FILENAME));

    return undefined;
  }

  public async buildTeamsAppPackage(ctx: PluginContext, isLocalDebug: boolean): Promise<string> {
    // Validate manifest
    const validationResult = await this.validateManifest(ctx, isLocalDebug);
    if (validationResult.isOk() && validationResult.value.length > 0) {
      const errMessage = AppStudioError.ValidationFailedError.message(validationResult.value);
      const validationFailed = AppStudioResultFactory.UserError(
        AppStudioError.ValidationFailedError.name,
        errMessage
      );
      throw validationFailed;
    }
    let manifestString: string | undefined = undefined;

    if (!ctx.envInfo?.envName) {
      throw AppStudioResultFactory.SystemError("InvalidInputError", [
        getDefaultString("error.appstudio.noEnvInfo"),
        getLocalizedString("error.appstudio.noEnvInfo"),
      ]);
    }

    const appDirectory = await getAppDirectory(ctx.root);
    let zipFileName: string;
    if (isLocalDebug) {
      zipFileName = path.join(
        ctx.root,
        BuildFolderName,
        AppPackageFolderName,
        "appPackage.local.zip"
      );
    } else {
      zipFileName = path.join(
        ctx.root,
        BuildFolderName,
        AppPackageFolderName,
        `appPackage.${ctx.envInfo.envName}.zip`
      );
    }

    if (isSPFxProject(ctx.projectSettings)) {
      manifestString = await this.getSPFxManifest(ctx);
      const manifest = JSON.parse(manifestString);
      if (!isUUID(manifest.id)) {
        manifest.id = v4();
      }
      manifestString = JSON.stringify(manifest, null, 4);
    } else {
      const manifest = await this.getManifest(ctx, isLocalDebug);
      if (manifest.isOk()) {
        manifestString = JSON.stringify(manifest.value, null, 4);
      } else {
        ctx.logProvider?.error(getLocalizedString("plugins.appstudio.buildFailedNotice"));
        const isProvisionSucceeded = !!(ctx.envInfo.state
          .get("solution")
          ?.get(SOLUTION_PROVISION_SUCCEEDED) as boolean);
        if (
          manifest.error.name === AppStudioError.GetRemoteConfigFailedError.name &&
          !isProvisionSucceeded
        ) {
          throw AppStudioResultFactory.UserError(
            AppStudioError.GetRemoteConfigFailedError.name,
            AppStudioError.GetRemoteConfigFailedError.message(
              getLocalizedString("plugins.appstudio.buildFailedNotice"),
              isProvisionSucceeded
            ),
            HelpLinks.WhyNeedProvision
          );
        } else {
          throw manifest.error;
        }
      }
    }
    const status = await fs.lstat(appDirectory);
    if (!status.isDirectory()) {
      throw AppStudioResultFactory.UserError(
        AppStudioError.NotADirectoryError.name,
        AppStudioError.NotADirectoryError.message(appDirectory)
      );
    }
    const zip = new AdmZip();
    zip.addFile(Constants.MANIFEST_FILE, Buffer.from(manifestString));

    const manifest: TeamsAppManifest = JSON.parse(manifestString);

    // color icon
    if (manifest.icons.color && !manifest.icons.color.startsWith("https://")) {
      const colorFile = `${appDirectory}/${manifest.icons.color}`;
      const fileExists = await fs.pathExists(colorFile);
      if (!fileExists) {
        throw AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(colorFile)
        );
      }

      const dir = path.dirname(manifest.icons.color);
      zip.addLocalFile(colorFile, dir === "." ? "" : dir);
    }

    // outline icon
    if (manifest.icons.outline && !manifest.icons.outline.startsWith("https://")) {
      const outlineFile = `${appDirectory}/${manifest.icons.outline}`;
      const fileExists = await fs.pathExists(outlineFile);
      if (!fileExists) {
        throw AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(outlineFile)
        );
      }

      const dir = path.dirname(manifest.icons.outline);
      zip.addLocalFile(outlineFile, dir === "." ? "" : dir);
    }

    await fs.ensureDir(path.dirname(zipFileName));

    const manifestFileName =
      `${ctx.root}/${BuildFolderName}/${AppPackageFolderName}/manifest.` +
      (isLocalDebug ? "local" : ctx.envInfo.envName) +
      `.json`;
    if (await fs.pathExists(manifestFileName)) {
      await fs.chmod(manifestFileName, 0o777);
    }
    await fs.writeFile(manifestFileName, manifestString);
    await fs.chmod(manifestFileName, 0o444);

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

    zip.writeZip(zipFileName);

    if (isSPFxProject(ctx.projectSettings)) {
      const spfxTeamsPath = `${ctx.root}/SPFx/teams`;
      await fs.copyFile(zipFileName, path.join(spfxTeamsPath, "TeamsSPFxApp.zip"));

      for (const file of await fs.readdir(`${ctx.root}/SPFx/teams/`)) {
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

    if (appDirectory === path.join(ctx.root, `.${ConfigFolderName}`)) {
      await fs.ensureDir(path.join(ctx.root, `${AppPackageFolderName}`));

      const formerZipFileName = `${appDirectory}/appPackage.zip`;
      if (await fs.pathExists(formerZipFileName)) {
        await fs.remove(formerZipFileName);
      }
      const projectTemplatesFolderPath = await getProjectTemplatesFolderPath(ctx.root);
      await fs.move(
        path.join(appDirectory, "manifest.icons.color"),
        path.join(
          projectTemplatesFolderPath,
          "appPackage",
          MANIFEST_RESOURCES,
          manifest.icons.color
        )
      );
      await fs.move(
        path.join(appDirectory, "manifest.icons.outline"),
        path.join(
          projectTemplatesFolderPath,
          "appPackage",
          MANIFEST_RESOURCES,
          manifest.icons.outline
        )
      );
      await fs.move(
        path.join(appDirectory, REMOTE_MANIFEST),
        path.join(projectTemplatesFolderPath, "appPackage", MANIFEST_TEMPLATE)
      );
    }

    return zipFileName;
  }

  public async publish(ctx: PluginContext): Promise<{ name: string; id: string; update: boolean }> {
    let manifest: TeamsAppManifest | undefined;

    const appDirectory = await getAppDirectory(ctx.root);
    if (isSPFxProject(ctx.projectSettings)) {
      const manifestString = await this.getSPFxManifest(ctx);
      manifest = JSON.parse(manifestString);
    } else {
      const fillinRes = await this.getManifest(ctx, false);
      if (fillinRes.isOk()) {
        manifest = fillinRes.value;
      } else {
        throw fillinRes.error;
      }
    }

    if (!manifest) {
      throw AppStudioResultFactory.SystemError(
        AppStudioError.ManifestLoadFailedError.name,
        AppStudioError.ManifestLoadFailedError.message("")
      );
    }

    // manifest.id === externalID
    const appStudioTokenRes = await ctx?.m365TokenProvider!.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      throw appStudioTokenRes.error;
    }
    const appStudioToken = appStudioTokenRes.value;
    const existApp = await AppStudioClient.getAppByTeamsAppId(manifest.id, appStudioToken);
    if (existApp) {
      let executePublishUpdate = false;
      let description = getLocalizedString(
        "plugins.appstudio.updatePublishedAppNotice",
        existApp.displayName,
        existApp.publishingState
      );
      if (existApp.lastModifiedDateTime) {
        description =
          description +
          getLocalizedString(
            "plugins.appstudio.lastModifiedTip",
            existApp.lastModifiedDateTime?.toLocaleString()
          );
      }
      description = description + getLocalizedString("plugins.appstudio.updatePublihsedAppConfirm");
      const res = await ctx.ui?.showMessage("warn", description, true, "Confirm");
      if (res?.isOk() && res.value === "Confirm") executePublishUpdate = true;

      if (executePublishUpdate) {
        const appId = await this.beforePublish(ctx, appDirectory, JSON.stringify(manifest), true);
        return { id: appId, name: manifest.name.short, update: true };
      } else {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppPublishCancelError.name,
          AppStudioError.TeamsAppPublishCancelError.message(manifest.name.short)
        );
      }
    } else {
      const appId = await this.beforePublish(ctx, appDirectory, JSON.stringify(manifest), false);
      return { id: appId, name: manifest.name.short, update: false };
    }
  }

  public async postLocalDebug(ctx: PluginContext): Promise<Result<string, FxError>> {
    const res = await this.updateApp(ctx, true);
    if (res.isErr()) {
      return res;
    }
    const teamsAppId = res.value;
    ctx.envInfo.state.get(ResourcePlugins.AppStudio).set(Constants.TEAMS_APP_ID, teamsAppId);
    return ok(teamsAppId);
  }

  public async checkPermission(
    ctx: PluginContext,
    userInfo: AppUser
  ): Promise<ResourcePermission[]> {
    const appStudioTokenRes = await ctx?.m365TokenProvider!.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      throw appStudioTokenRes.error;
    }
    const appStudioToken = appStudioTokenRes.value;

    const teamsAppId = await this.getTeamsAppId(ctx);
    if (!teamsAppId) {
      throw new Error(ErrorMessages.GetConfigError(Constants.TEAMS_APP_ID, PluginNames.APPST));
    }

    const teamsAppRoles = await AppStudioClient.checkPermission(
      teamsAppId,
      appStudioToken as string,
      userInfo.aadId
    );

    const result: ResourcePermission[] = [
      {
        name: Constants.PERMISSIONS.name,
        roles: [teamsAppRoles as string],
        type: Constants.PERMISSIONS.type,
        resourceId: teamsAppId,
      },
    ];

    return result;
  }

  public async listCollaborator(ctx: PluginContext): Promise<TeamsAppAdmin[]> {
    const appStudioTokenRes = await ctx?.m365TokenProvider!.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      throw appStudioTokenRes.error;
    }
    const appStudioToken = appStudioTokenRes.value;
    const teamsAppId = await this.getTeamsAppId(ctx);
    if (!teamsAppId) {
      throw new Error(ErrorMessages.GetConfigError(Constants.TEAMS_APP_ID, PluginNames.APPST));
    }

    let userLists;
    try {
      userLists = await AppStudioClient.getUserList(teamsAppId, appStudioToken as string);
      if (!userLists) {
        return [];
      }
    } catch (error) {
      if (error.name === 404) {
        error.message = ErrorMessages.TeamsAppNotFound(teamsAppId);
      }
      throw error;
    }

    const teamsAppAdmin: TeamsAppAdmin[] = userLists
      .filter((userList) => {
        return userList.isAdministrator;
      })
      .map((userList) => {
        return {
          userObjectId: userList.aadId,
          displayName: userList.displayName,
          userPrincipalName: userList.userPrincipalName,
          resourceId: teamsAppId,
        };
      });

    return teamsAppAdmin;
  }

  public async grantPermission(
    ctx: PluginContext,
    userInfo: AppUser
  ): Promise<ResourcePermission[]> {
    const appStudioTokenRes = await ctx?.m365TokenProvider!.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      throw appStudioTokenRes.error;
    }
    const appStudioToken = appStudioTokenRes.value;

    const teamsAppId = await this.getTeamsAppId(ctx);
    if (!teamsAppId) {
      const msgs = AppStudioError.GrantPermissionFailedError.message(
        ErrorMessages.GetConfigError(Constants.TEAMS_APP_ID, PluginNames.APPST)
      );
      throw new UserError(PluginNames.APPST, "GetConfigError", msgs[0], msgs[1]);
    }

    try {
      await AppStudioClient.grantPermission(teamsAppId, appStudioToken as string, userInfo);
    } catch (error) {
      const msgs = AppStudioError.GrantPermissionFailedError.message(error?.message, teamsAppId);
      throw new UserError(PluginNames.APPST, "GrantPermissionFailedError", msgs[0], msgs[1]);
    }

    const result: ResourcePermission[] = [
      {
        name: Constants.PERMISSIONS.name,
        roles: [Constants.PERMISSIONS.admin],
        type: Constants.PERMISSIONS.type,
        resourceId: teamsAppId,
      },
    ];

    return result;
  }

  private async beforePublish(
    ctx: PluginContext,
    appDirectory: string,
    manifestString: string,
    update: boolean
  ): Promise<string> {
    const manifest: TeamsAppManifest = JSON.parse(manifestString);
    const publishProgress = ctx.ui?.createProgressBar(`Publishing ${manifest.name.short}`, 3);
    try {
      // Validate manifest
      await publishProgress?.start(getLocalizedString("plugins.appstudio.validateProgressStart"));
      const validationResult = await this.validateManifestAgainstSchema(manifest);
      if (validationResult.isErr()) {
        throw validationResult.error;
      } else if (validationResult.value.length > 0) {
        throw AppStudioResultFactory.UserError(
          AppStudioError.ValidationFailedError.name,
          AppStudioError.ValidationFailedError.message(validationResult.value)
        );
      }

      // Update App in App Studio
      const remoteTeamsAppId = await this.getTeamsAppId(ctx);
      await publishProgress?.next(
        getLocalizedString("plugins.appstudio.publishProgressUpdate", remoteTeamsAppId)
      );
      const buildPackage = await this.buildTeamsAppPackage(ctx, false);
      const archivedFile = await fs.readFile(buildPackage);
      const appStudioTokenRes = await ctx?.m365TokenProvider!.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (appStudioTokenRes.isErr()) {
        throw appStudioTokenRes.error;
      }
      const appStudioToken = appStudioTokenRes.value;
      try {
        const app = await AppStudioClient.importApp(archivedFile, appStudioToken, undefined, true);

        if (app.updatedAt) {
          ctx.envInfo.state
            .get(PluginNames.APPST)
            ?.set(Constants.TEAMS_APP_UPDATED_AT, new Date(app.updatedAt).getTime());
        }
      } catch (e) {
        if (e.name === 404) {
          throw AppStudioResultFactory.UserError(
            AppStudioError.TeamsAppNotFoundError.name,
            AppStudioError.TeamsAppNotFoundError.message(remoteTeamsAppId)
          );
        }
      }

      // Build Teams App package
      // Platforms will be checked in buildTeamsAppPackage(ctx)
      await publishProgress?.next(
        getLocalizedString("plugins.appstudio.publishProgressBuild", appDirectory)
      );
      const appPackage = await this.buildTeamsAppPackage(ctx, false);

      const appContent = await fs.readFile(appPackage);
      await publishProgress?.next(
        getLocalizedString("plugins.appstudio.publishProgressPublish", manifest.name.short)
      );
      if (update) {
        // Update existing app in App Catalog
        return await AppStudioClient.publishTeamsAppUpdate(
          manifest.id,
          appContent,
          appStudioToken!
        );
      } else {
        // Publish Teams App
        return await AppStudioClient.publishTeamsApp(manifest.id, appContent, appStudioToken!);
      }
    } finally {
      await publishProgress?.end(true);
    }
  }

  private async getConfigForCreatingManifest(ctx: PluginContext): Promise<{
    tabEndpoint?: string;
    tabDomain?: string;
    tabIndexPath?: string;
    aadId: string;
    botDomain?: string;
    botId?: string;
    webApplicationInfoResource?: string;
    teamsAppId: string;
  }> {
    const tabEndpoint = ctx.envInfo.state.get(PluginNames.FE)?.get(FRONTEND_ENDPOINT) as string;
    const tabDomain = ctx.envInfo.state.get(PluginNames.FE)?.get(FRONTEND_DOMAIN) as string;
    const tabIndexPath = ctx.envInfo.state.get(PluginNames.FE)?.get(FRONTEND_INDEX_PATH) as string;
    const aadId = ctx.envInfo.state.get(PluginNames.AAD)?.get(REMOTE_AAD_ID) as string;
    const botId = ctx.envInfo.state.get(PluginNames.BOT)?.get(BOT_ID) as string;
    const botDomain = ctx.envInfo.state.get(PluginNames.BOT)?.get(BOT_DOMAIN) as string;
    const teamsAppId = await this.getTeamsAppId(ctx);

    // This config value is set by aadPlugin.setApplicationInContext. so aadPlugin.setApplicationInContext needs to run first.
    const webApplicationInfoResource = ctx.envInfo.state
      .get(PluginNames.AAD)
      ?.get(WEB_APPLICATION_INFO_SOURCE) as string;

    return {
      tabEndpoint,
      tabDomain,
      tabIndexPath,
      aadId,
      botDomain,
      botId,
      webApplicationInfoResource,
      teamsAppId,
    };
  }

  // TODO: remove isLocalDebug later after merging local and remote configs
  private async getTeamsAppId(ctx: PluginContext): Promise<string> {
    let teamsAppId = "";

    // User may manually update id in manifest template file, rather than configuration file
    // The id in manifest template file should override configurations
    const manifestResult = await loadManifest(ctx.root);
    if (manifestResult.isOk()) {
      teamsAppId = manifestResult.value.id;
    }
    if (!isUUID(teamsAppId)) {
      teamsAppId = ctx.envInfo.state.get(PluginNames.APPST)?.get(Constants.TEAMS_APP_ID) as string;
    }
    return teamsAppId;
  }

  private async createApp(
    ctx: PluginContext,
    isLocalDebug: boolean
  ): Promise<Result<AppDefinition, FxError>> {
    const appDirectory = await getAppDirectory(ctx.root);
    const status = await fs.lstat(appDirectory);

    if (!status.isDirectory()) {
      throw AppStudioResultFactory.UserError(
        AppStudioError.NotADirectoryError.name,
        AppStudioError.NotADirectoryError.message(appDirectory)
      );
    }
    const manifestResult = await loadManifest(ctx.root);
    if (manifestResult.isErr()) {
      return err(manifestResult.error);
    }
    let manifest: TeamsAppManifest = manifestResult.value;
    manifest.bots = undefined;
    manifest.composeExtensions = undefined;
    if (isLocalDebug || !isUUID(manifest.id)) {
      manifest.id = v4();
    }

    // Corner case: icons path defined in config file
    let manifestString = JSON.stringify(manifestResult.value);
    const view = {
      config: ctx.envInfo.config,
    };
    manifestString = renderTemplate(manifestString, view);
    manifest = JSON.parse(manifestString) as TeamsAppManifest;

    const colorFile = `${appDirectory}/${manifest.icons.color}`;
    if (!(await fs.pathExists(colorFile))) {
      throw AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(colorFile)
      );
    }

    const outlineFile = `${appDirectory}/${manifest.icons.outline}`;
    if (!(await fs.pathExists(outlineFile))) {
      throw AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(outlineFile)
      );
    }

    const zip = new AdmZip();
    zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest)));
    zip.addLocalFile(colorFile);
    zip.addLocalFile(outlineFile);

    const archivedFile = zip.toBuffer();
    const appStudioTokenRes = await ctx?.m365TokenProvider!.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;
    try {
      const appDefinition = await AppStudioClient.importApp(
        archivedFile,
        appStudioToken,
        ctx.logProvider
      );
      return ok(appDefinition);
    } catch (e) {
      return err(
        isLocalDebug
          ? AppStudioResultFactory.SystemError(
              AppStudioError.LocalAppIdCreateFailedError.name,
              AppStudioError.LocalAppIdCreateFailedError.message(e)
            )
          : AppStudioResultFactory.SystemError(
              AppStudioError.RemoteAppIdCreateFailedError.name,
              AppStudioError.RemoteAppIdCreateFailedError.message(e)
            )
      );
    }
  }

  private async updateApp(
    ctx: PluginContext,
    isLocalDebug: boolean
  ): Promise<Result<string, FxError>> {
    const appStudioTokenRes = await ctx?.m365TokenProvider!.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;

    try {
      const buildPackage = await this.buildTeamsAppPackage(ctx, isLocalDebug);
      const archivedFile = await fs.readFile(buildPackage);
      const app = await AppStudioClient.importApp(
        archivedFile,
        appStudioToken,
        ctx.logProvider,
        true
      );
      if (app.updatedAt) {
        const time = new Date(app.updatedAt).getTime();
        ctx.envInfo.state.get(PluginNames.APPST)?.set(Constants.TEAMS_APP_UPDATED_AT, time);
      }
      return ok(app.teamsAppId!);
    } catch (e: any) {
      if (e instanceof Error) {
        return err(
          isLocalDebug
            ? AppStudioResultFactory.SystemError(
                AppStudioError.LocalAppIdUpdateFailedError.name,
                AppStudioError.LocalAppIdUpdateFailedError.message(e)
              )
            : AppStudioResultFactory.SystemError(
                AppStudioError.RemoteAppIdUpdateFailedError.name,
                AppStudioError.RemoteAppIdUpdateFailedError.message(e)
              )
        );
      }
      throw e;
    }
  }

  private async validateManifestAgainstSchema(
    manifest: TeamsAppManifest
  ): Promise<Result<string[], FxError>> {
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

  private async getManifest(
    ctx: PluginContext,
    isLocalDebug: boolean
  ): Promise<Result<TeamsAppManifest, FxError>> {
    const {
      tabEndpoint,
      tabDomain,
      tabIndexPath,
      aadId,
      botDomain,
      botId,
      webApplicationInfoResource,
      teamsAppId,
    } = await this.getConfigForCreatingManifest(ctx);
    const isProvisionSucceeded = !!(ctx.envInfo.state
      .get("solution")
      ?.get(SOLUTION_PROVISION_SUCCEEDED) as boolean);

    const manifestResult = await loadManifest(ctx.root);
    if (manifestResult.isErr()) {
      return err(manifestResult.error);
    }

    let manifestString = JSON.stringify(manifestResult.value);

    // Bot only project, without frontend hosting
    let endpoint = tabEndpoint;
    let indexPath = tabIndexPath;

    let hasFrontend = false;
    const capabilities = await getCapabilities(ctx.root);
    if (capabilities.isErr()) {
      return err(capabilities.error);
    }
    hasFrontend =
      capabilities.value.includes("staticTab") || capabilities.value.includes("configurableTab");

    if (!endpoint && !hasFrontend) {
      endpoint = DEFAULT_DEVELOPER.websiteUrl;
      indexPath = "";
    }

    const customizedKeys = getCustomizedKeys("", JSON.parse(manifestString));
    this.commonProperties = {
      [TelemetryPropertyKey.customizedKeys]: JSON.stringify(customizedKeys),
    };
    const view = {
      config: ctx.envInfo.config,
      state: {
        "fx-resource-frontend-hosting": {
          endpoint: endpoint ?? "{{state.fx-resource-frontend-hosting.endpoint}}",
          indexPath: indexPath ?? "{{state.fx-resource-frontend-hosting.indexPath}}",
          domain: tabDomain ?? "{{state.fx-resource-frontend-hosting.domain}}",
        },
        "fx-resource-aad-app-for-teams": {
          clientId: aadId ?? "{{state.fx-resource-aad-app-for-teams.clientId}}",
          applicationIdUris:
            webApplicationInfoResource ??
            "{{state.fx-resource-aad-app-for-teams.applicationIdUris}}",
        },
        "fx-resource-appstudio": {
          teamsAppId: teamsAppId ?? v4(),
        },
        "fx-resource-bot": {
          botId: botId ?? "{{state.fx-resource-bot.botId}}",
          siteEndpoint:
            (ctx.envInfo.state.get(PluginNames.BOT)?.get(PluginBot.SITE_ENDPOINT) as string) ??
            "{{state.fx-resource-bot.siteEndpoint}}",
          siteName:
            (ctx.envInfo.state.get(PluginNames.BOT)?.get(PluginBot.SITE_NAME) as string) ??
            "{{state.fx-resource-bot.siteName}}",
          validDomain:
            (ctx.envInfo.state.get(PluginNames.BOT)?.get(PluginBot.VALID_DOMAIN) as string) ??
            "{{state.fx-resource-bot.validDomain}}",
        },
      },
    };
    manifestString = renderTemplate(manifestString, view);
    const tokens = [
      ...new Set(
        Mustache.parse(manifestString)
          .filter((x) => {
            return x[0] != "text" && x[1] != "state.fx-resource-appstudio.teamsAppId";
          })
          .map((x) => x[1])
      ),
    ];
    if (tokens.length > 0) {
      if (isLocalDebug) {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.GetLocalDebugConfigFailedError.name,
            AppStudioError.GetLocalDebugConfigFailedError.message(
              new Error(getLocalizedString("plugins.appstudio.dataRequired", tokens.join(",")))
            )
          )
        );
      } else {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.GetRemoteConfigFailedError.name,
            AppStudioError.GetRemoteConfigFailedError.message(
              getLocalizedString("plugins.appstudio.dataRequired", tokens.join(",")),
              isProvisionSucceeded
            ),
            HelpLinks.WhyNeedProvision
          )
        );
      }
    }

    let updatedManifest: TeamsAppManifest;
    try {
      updatedManifest = JSON.parse(manifestString) as TeamsAppManifest;
    } catch (error) {
      if (error.stack && error.stack.startsWith("SyntaxError")) {
        // teams app id in userData may be updated by user, result to invalid manifest
        const reg = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
        const result = teamsAppId.match(reg);
        if (!result) {
          return err(
            AppStudioResultFactory.UserError(
              AppStudioError.InvalidManifestError.name,
              AppStudioError.InvalidManifestError.message(error, "teamsAppId"),
              undefined,
              error.stack
            )
          );
        }
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.InvalidManifestError.name,
            AppStudioError.InvalidManifestError.message(error),
            undefined,
            error.stack
          )
        );
      } else {
        return err(error);
      }
    }

    // This should be removed in future, the valid domains will be rendered by states
    if (updatedManifest.validDomains?.length == 0 || isLocalDebug) {
      const validDomains: string[] = [];
      if (tabDomain) {
        validDomains.push(tabDomain);
      }
      if (tabEndpoint && isLocalDebug) {
        validDomains.push(tabEndpoint.slice(8));
      }

      if (botId) {
        if (!botDomain) {
          return err(
            AppStudioResultFactory.UserError(
              AppStudioError.GetRemoteConfigFailedError.name,
              AppStudioError.GetRemoteConfigFailedError.message(
                getLocalizedString("plugins.appstudio.dataRequired", BOT_DOMAIN),
                isProvisionSucceeded
              ),
              HelpLinks.WhyNeedProvision
            )
          );
        } else {
          validDomains.push(botDomain);
        }
      }

      for (const domain of validDomains) {
        if (updatedManifest.validDomains?.indexOf(domain) == -1) {
          updatedManifest.validDomains?.push(domain);
        }
      }
    }
    return ok(updatedManifest);
  }

  private async getSPFxManifest(ctx: PluginContext): Promise<string> {
    const manifestResult = await loadManifest(ctx.root);
    if (manifestResult.isErr()) {
      throw manifestResult.error;
    }
    let manifestString = JSON.stringify(manifestResult.value);
    const view = {
      config: ctx.envInfo.config,
      state: {
        "fx-resource-appstudio": {
          teamsAppId: await this.getTeamsAppId(ctx),
        },
      },
    };
    manifestString = renderTemplate(manifestString, view);
    return manifestString;
  }
}

export async function createManifest(
  hasFrontend: boolean,
  hasBot: boolean,
  hasNotificationBot: boolean,
  hasCommandAndResponseBot: boolean,
  hasMessageExtension: boolean,
  isSPFx: boolean,
  hasAad = true,
  isM365 = false
): Promise<TeamsAppManifest | undefined> {
  if (!hasBot && !hasMessageExtension && !hasFrontend && !hasAad) {
    throw new Error(`Invalid capability`);
  }
  if (!isSPFx || hasBot || hasMessageExtension || hasAad) {
    const manifestString = TEAMS_APP_MANIFEST_TEMPLATE_V3;
    const manifest: TeamsAppManifest = JSON.parse(manifestString);
    if (hasAad) {
      manifest.webApplicationInfo = WEB_APPLICATION_INFO_MULTI_ENV;
    }
    if (hasFrontend) {
      manifest.staticTabs = STATIC_TABS_TPL_FOR_MULTI_ENV;
      if (!isM365) {
        manifest.configurableTabs = CONFIGURABLE_TABS_TPL_FOR_MULTI_ENV;
      }
      manifest.validDomains?.push("{{state.fx-resource-frontend-hosting.domain}}");
    } else {
      manifest.developer = DEFAULT_DEVELOPER;
    }
    if (hasBot) {
      if (hasCommandAndResponseBot) {
        manifest.bots = BOTS_TPL_FOR_COMMAND_AND_RESPONSE;
      } else if (hasNotificationBot) {
        manifest.bots = BOTS_TPL_FOR_NOTIFICATION;
      } else {
        manifest.bots = BOTS_TPL_FOR_MULTI_ENV;
      }
      manifest.validDomains?.push("{{state.fx-resource-bot.validDomain}}");
    }
    if (hasMessageExtension) {
      manifest.composeExtensions = isM365
        ? COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV_M365
        : COMPOSE_EXTENSIONS_TPL_FOR_MULTI_ENV;
    }
    if (isM365) {
      manifest.$schema = M365_SCHEMA;
      manifest.manifestVersion = M365_MANIFEST_VERSION;
    }

    return manifest;
  }

  return undefined;
}
