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
  Platform,
  LogProvider,
  ProjectSettings,
  IComposeExtension,
  IBot,
  AppPackageFolderName,
} from "@microsoft/teamsfx-api";
import { AppStudioClient } from "./appStudio";
import {
  IAppDefinition,
  IMessagingExtension,
  IAppDefinitionBot,
  ITeamCommand,
  IPersonalCommand,
  IGroupChatCommand,
} from "./interfaces/IAppDefinition";
import { ICommand, ICommandList } from "../../solution/fx-solution/appstudio/interface";
import {
  BotOptionItem,
  HostTypeOptionAzure,
  MessageExtensionItem,
  TabOptionItem,
} from "../../solution/fx-solution/question";
import {
  LOCAL_DEBUG_TAB_ENDPOINT,
  LOCAL_DEBUG_TAB_DOMAIN,
  LOCAL_DEBUG_AAD_ID,
  LOCAL_DEBUG_TEAMS_APP_ID,
  REMOTE_AAD_ID,
  LOCAL_DEBUG_BOT_DOMAIN,
  BOT_DOMAIN,
  LOCAL_WEB_APPLICATION_INFO_SOURCE,
  WEB_APPLICATION_INFO_SOURCE,
  PluginNames,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../solution/fx-solution/constants";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import {
  Constants,
  TEAMS_APP_MANIFEST_TEMPLATE,
  CONFIGURABLE_TABS_TPL,
  STATIC_TABS_TPL,
  BOTS_TPL,
  COMPOSE_EXTENSIONS_TPL,
  TEAMS_APP_SHORT_NAME_MAX_LENGTH,
  DEFAULT_DEVELOPER_WEBSITE_URL,
  DEFAULT_DEVELOPER_TERM_OF_USE_URL,
  DEFAULT_DEVELOPER_PRIVACY_URL,
  FRONTEND_ENDPOINT,
  FRONTEND_DOMAIN,
  LOCAL_BOT_ID,
  BOT_ID,
  REMOTE_MANIFEST,
  FRONTEND_ENDPOINT_ARM,
  FRONTEND_DOMAIN_ARM,
} from "./constants";
import { REMOTE_TEAMS_APP_ID } from "../../solution/fx-solution/constants";
import AdmZip from "adm-zip";
import * as fs from "fs-extra";
import { getTemplatesFolder } from "../../..";
import path from "path";
import { getArmOutput, isArmSupportEnabled, isMultiEnvEnabled } from "../../../common";
import {
  LocalSettingsAuthKeys,
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
  LocalSettingsTeamsAppKeys,
} from "../../../common/localSettingsConstants";

export class AppStudioPluginImpl {
  public async getAppDefinitionAndUpdate(
    ctx: PluginContext,
    type: "localDebug" | "remote",
    manifest: TeamsAppManifest
  ): Promise<Result<string, FxError>> {
    let appDefinition: IAppDefinition;
    let maybeTeamsAppId: Result<string, FxError>;
    let appDirectory: string;
    try {
      appDirectory = await this.getAppDirectory(ctx);
    } catch (error) {
      throw error;
    }
    const appStudioToken = await ctx.appStudioToken?.getAccessToken();

    if (type == "localDebug") {
      const maybeAppDefinition = await this.getConfigAndAppDefinition(ctx, true, manifest);

      if (maybeAppDefinition.isErr()) {
        return err(maybeAppDefinition.error);
      }

      appDefinition = maybeAppDefinition.value[0];

      const localTeamsAppID = isMultiEnvEnabled()
        ? ctx.localSettings?.teamsApp.get(LocalSettingsTeamsAppKeys.TeamsAppId)
        : (ctx.configOfOtherPlugins.get("solution")?.get(LOCAL_DEBUG_TEAMS_APP_ID) as string);

      let createIfNotExist = false;
      if (!localTeamsAppID) {
        createIfNotExist = true;
      } else {
        const appStudioToken = await ctx?.appStudioToken?.getAccessToken();
        try {
          await AppStudioClient.getApp(localTeamsAppID, appStudioToken!, ctx.logProvider);
        } catch (error) {
          createIfNotExist = true;
        }
      }

      maybeTeamsAppId = await this.updateApp(
        appDefinition,
        appStudioToken!,
        type,
        createIfNotExist,
        createIfNotExist ? undefined : localTeamsAppID,
        ctx.logProvider,
        appDirectory
      );

      console.log(maybeTeamsAppId);
      return maybeTeamsAppId;
    } else {
      appDefinition = this.convertToAppDefinition(manifest, true);

      maybeTeamsAppId = await this.updateApp(
        appDefinition,
        appStudioToken!,
        type,
        true,
        undefined,
        ctx.logProvider,
        appDirectory
      );

      return maybeTeamsAppId;
    }
  }

  /**
   * ask app common questions to generate app manifest
   * @param settings
   * @returns
   */
  public async createManifest(settings: ProjectSettings): Promise<TeamsAppManifest | undefined> {
    const solutionSettings: AzureSolutionSettings =
      settings.solutionSettings as AzureSolutionSettings;
    if (
      !solutionSettings.capabilities ||
      (!solutionSettings.capabilities.includes(BotOptionItem.id) &&
        !solutionSettings.capabilities.includes(MessageExtensionItem.id) &&
        !solutionSettings.capabilities.includes(TabOptionItem.id))
    ) {
      throw new Error(`Invalid capability: ${solutionSettings.capabilities}`);
    }
    if (
      HostTypeOptionAzure.id === solutionSettings.hostType ||
      solutionSettings.capabilities.includes(BotOptionItem.id) ||
      solutionSettings.capabilities.includes(MessageExtensionItem.id)
    ) {
      let manifestString = TEAMS_APP_MANIFEST_TEMPLATE;
      manifestString = this.replaceConfigValue(manifestString, "appName", settings.appName);
      manifestString = this.replaceConfigValue(manifestString, "version", "1.0.0");
      const manifest: TeamsAppManifest = JSON.parse(manifestString);
      if (solutionSettings.capabilities.includes(TabOptionItem.id)) {
        manifest.staticTabs = STATIC_TABS_TPL;
        manifest.configurableTabs = CONFIGURABLE_TABS_TPL;
      }
      if (solutionSettings.capabilities.includes(BotOptionItem.id)) {
        manifest.bots = BOTS_TPL;
      }
      if (solutionSettings.capabilities.includes(MessageExtensionItem.id)) {
        manifest.composeExtensions = COMPOSE_EXTENSIONS_TPL;
      }
      return manifest;
    }

    return undefined;
  }

  public async reloadManifestAndCheckRequiredFields(
    appDirectory: string
  ): Promise<Result<TeamsAppManifest, FxError>> {
    const result = await this.reloadManifest(appDirectory);
    return result.andThen((manifest) => {
      if (
        manifest === undefined ||
        manifest.name.short === undefined ||
        manifest.name.short.length === 0
      ) {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.ManifestLoadFailedError.name,
            AppStudioError.ManifestLoadFailedError.message("Name is missing")
          )
        );
      }
      return ok(manifest);
    });
  }

  public async provision(ctx: PluginContext): Promise<string> {
    let remoteTeamsAppId = ctx.configOfOtherPlugins
      .get("solution")
      ?.get(REMOTE_TEAMS_APP_ID) as string;

    let create = false;
    if (!remoteTeamsAppId) {
      create = true;
    } else {
      const appStudioToken = await ctx?.appStudioToken?.getAccessToken();
      try {
        await AppStudioClient.getApp(remoteTeamsAppId, appStudioToken!, ctx.logProvider);
      } catch (error) {
        create = true;
      }
    }

    if (create) {
      let manifest: TeamsAppManifest;
      let appDirectory: string;
      try {
        appDirectory = await this.getAppDirectory(ctx);
      } catch (error) {
        throw error;
      }
      const manifestResult = await this.reloadManifestAndCheckRequiredFields(appDirectory);
      if (manifestResult.isErr()) {
        throw manifestResult;
      } else {
        manifest = manifestResult.value;
      }

      const appDefinition: IAppDefinition = this.convertToAppDefinition(manifest, false);
      appDefinition.bots = undefined;
      appDefinition.messagingExtensions = undefined;

      const appStudioToken = await ctx?.appStudioToken?.getAccessToken();
      const result = await this.updateApp(
        appDefinition,
        appStudioToken!,
        "remote",
        true,
        undefined,
        ctx.logProvider,
        appDirectory
      );
      if (result.isErr()) {
        throw result;
      }

      ctx.logProvider?.info(`Teams app created ${result.value}`);
      remoteTeamsAppId = result.value;
    }
    return remoteTeamsAppId;
  }

  public async postProvision(ctx: PluginContext): Promise<string> {
    const remoteTeamsAppId = ctx.configOfOtherPlugins
      .get("solution")
      ?.get(REMOTE_TEAMS_APP_ID) as string;
    let manifest: TeamsAppManifest;
    let appDirectory: string;
    try {
      appDirectory = await this.getAppDirectory(ctx);
    } catch (error) {
      throw error;
    }
    const manifestResult = await this.reloadManifestAndCheckRequiredFields(appDirectory);
    if (manifestResult.isErr()) {
      throw manifestResult;
    } else {
      manifest = manifestResult.value;
    }

    let appDefinition: IAppDefinition;
    if (this.isSPFxProject(ctx)) {
      appDefinition = this.convertToAppDefinition(manifest, false);
    } else {
      // const selectedPlugins = this.getSelectedPlugins(ctx);
      const remoteManifest = this.createManifestForRemote(ctx, manifest);
      if (remoteManifest.isErr()) {
        throw remoteManifest;
      }
      [appDefinition] = remoteManifest.value;
    }

    const appStudioToken = await ctx?.appStudioToken?.getAccessToken();
    const result = await this.updateApp(
      appDefinition,
      appStudioToken!,
      "remote",
      false,
      remoteTeamsAppId,
      ctx.logProvider,
      appDirectory
    );
    if (result.isErr()) {
      throw result;
    }

    ctx.logProvider?.info(`Teams app updated: ${result.value}`);
    return remoteTeamsAppId;
  }

  public async validateManifest(ctx: PluginContext): Promise<Result<string[], FxError>> {
    const appStudioToken = await ctx?.appStudioToken?.getAccessToken();
    let manifestString: string | undefined = undefined;
    let appDirectory: string;
    try {
      appDirectory = await this.getAppDirectory(ctx);
    } catch (error) {
      return err(error);
    }
    if (this.isSPFxProject(ctx)) {
      manifestString = (await fs.readFile(`${appDirectory}/${REMOTE_MANIFEST}`)).toString();
    } else {
      const maybeManifest = await this.reloadManifestAndCheckRequiredFields(appDirectory);
      if (maybeManifest.isErr()) {
        return err(maybeManifest.error);
      }
      const manifestTpl = maybeManifest.value;
      // const maybeSelectedPlugins = this.getSelectedPlugins(ctx);
      const manifest = this.createManifestForRemote(ctx, manifestTpl).map((result) => result[1]);
      if (manifest.isOk()) {
        manifestString = JSON.stringify(manifest.value);
      } else {
        ctx.logProvider?.error("[Teams Toolkit] Manifest Validation failed!");
        const isProvisionSucceeded = !!(ctx.configOfOtherPlugins
          .get("solution")
          ?.get(SOLUTION_PROVISION_SUCCEEDED) as boolean);
        if (
          manifest.error.name === AppStudioError.GetRemoteConfigError.name &&
          !isProvisionSucceeded
        ) {
          return err(
            AppStudioResultFactory.UserError(
              AppStudioError.GetRemoteConfigError.name,
              AppStudioError.GetRemoteConfigError.message("Manifest validation failed")
            )
          );
        } else {
          return err(manifest.error);
        }
      }
    }
    return ok(await AppStudioClient.validateManifest(manifestString, appStudioToken!));
  }

  public createManifestForRemote(
    ctx: PluginContext,
    manifest: TeamsAppManifest
  ): Result<[IAppDefinition, TeamsAppManifest], FxError> {
    const maybeConfig = this.getConfigForCreatingManifest(ctx, false);
    if (maybeConfig.isErr()) {
      return err(maybeConfig.error);
    }

    const { tabEndpoint, tabDomain, aadId, botDomain, botId, webApplicationInfoResource } =
      maybeConfig.value;

    const validDomains: string[] = [];

    if (tabDomain) {
      validDomains.push(tabDomain);
    }

    if (botDomain) {
      validDomains.push(botDomain);
    }

    return ok(
      this.getDevAppDefinition(
        JSON.stringify(manifest),
        aadId,
        validDomains,
        webApplicationInfoResource,
        false,
        tabEndpoint,
        manifest.name.short,
        manifest.version,
        botId
      )
    );
  }

  public async scaffold(ctx: PluginContext): Promise<any> {
    let manifest: TeamsAppManifest | undefined;
    if (this.isSPFxProject(ctx)) {
      const templateManifestFolder = path.join(getTemplatesFolder(), "plugins", "resource", "spfx");
      const manifestFile = path.resolve(templateManifestFolder, "./solution/manifest.json");
      const manifestString = (await fs.readFile(manifestFile)).toString();
      manifest = JSON.parse(manifestString);
    } else {
      manifest = await this.createManifest(ctx.projectSettings!);
    }
    // await fs.writeFile(
    //   `${ctx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`,
    //   JSON.stringify(manifest, null, 4)
    // );
    await fs.writeFile(
      `${ctx.root}/${AppPackageFolderName}/${REMOTE_MANIFEST}`,
      JSON.stringify(manifest, null, 4)
    );
    return undefined;
  }

  public async buildTeamsAppPackage(ctx: PluginContext): Promise<string> {
    let manifestString: string | undefined = undefined;
    let appDirectory: string;
    let zipFileName: string;

    if (ctx.answers?.platform === Platform.VS) {
      appDirectory = ctx.answers![Constants.PUBLISH_PATH_QUESTION] as string;
      zipFileName = `${appDirectory}/appPackage.zip`;
    } else {
      try {
        appDirectory = await this.getAppDirectory(ctx);
      } catch (error) {
        throw error;
      }
      zipFileName = `${ctx.root}/${AppPackageFolderName}/appPackage.zip`;
    }

    if (this.isSPFxProject(ctx)) {
      manifestString = (await fs.readFile(`${appDirectory}/${REMOTE_MANIFEST}`)).toString();
    } else {
      const manifestTpl = await fs.readJSON(`${appDirectory}/${REMOTE_MANIFEST}`);
      const manifest = this.createManifestForRemote(ctx, manifestTpl).map((result) => result[1]);
      if (manifest.isOk()) {
        manifestString = JSON.stringify(manifest.value);
      } else {
        ctx.logProvider?.error("[Teams Toolkit] Teams Package build failed!");
        const isProvisionSucceeded = !!(ctx.configOfOtherPlugins
          .get("solution")
          ?.get(SOLUTION_PROVISION_SUCCEEDED) as boolean);
        if (
          manifest.error.name === AppStudioError.GetRemoteConfigFailedError.name &&
          !isProvisionSucceeded
        ) {
          throw AppStudioResultFactory.UserError(
            AppStudioError.GetRemoteConfigError.name,
            AppStudioError.GetRemoteConfigError.message("Teams package build failed")
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
    const manifest: TeamsAppManifest = JSON.parse(manifestString);
    const colorFile = `${appDirectory}/${manifest.icons.color}`;

    let fileExists = await this.checkFileExist(colorFile);
    if (!fileExists) {
      throw AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(colorFile)
      );
    }

    const outlineFile = `${appDirectory}/${manifest.icons.outline}`;
    fileExists = await this.checkFileExist(outlineFile);
    if (!fileExists) {
      throw AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(outlineFile)
      );
    }

    const zip = new AdmZip();
    zip.addFile(Constants.MANIFEST_FILE, Buffer.from(manifestString));
    zip.addLocalFile(colorFile);
    zip.addLocalFile(outlineFile);
    zip.writeZip(zipFileName);

    if (this.isSPFxProject(ctx)) {
      await fs.copyFile(zipFileName, `${ctx.root}/SPFx/teams/TeamsSPFxApp.zip`);
    }

    if (
      appDirectory === `${ctx.root}/.${ConfigFolderName}` &&
      ctx.answers?.platform !== Platform.VS
    ) {
      await fs.ensureDir(path.join(ctx.root, `${AppPackageFolderName}`));

      const formerZipFileName = `${appDirectory}/appPackage.zip`;
      if (await this.checkFileExist(formerZipFileName)) {
        await fs.remove(formerZipFileName);
      }

      await fs.move(
        `${appDirectory}/${manifest.icons.color}`,
        `${ctx.root}/${AppPackageFolderName}/${manifest.icons.color}`
      );
      await fs.move(
        `${appDirectory}/${manifest.icons.outline}`,
        `${ctx.root}/${AppPackageFolderName}/${manifest.icons.outline}`
      );
      await fs.move(
        `${appDirectory}/${REMOTE_MANIFEST}`,
        `${ctx.root}/${AppPackageFolderName}/${REMOTE_MANIFEST}`
      );
    }

    return zipFileName;
  }

  public async publish(ctx: PluginContext): Promise<{ name: string; id: string; update: boolean }> {
    let appDirectory: string | undefined = undefined;
    let manifest: TeamsAppManifest | undefined;

    // For vs platform, read the local manifest.json file
    // For cli/vsc platform, get manifest from ctx
    if (ctx.answers?.platform === Platform.VS) {
      appDirectory = ctx.answers![Constants.PUBLISH_PATH_QUESTION] as string;
      const manifestFile = `${appDirectory}/${Constants.MANIFEST_FILE}`;
      try {
        const manifestFileState = await fs.stat(manifestFile);
        if (manifestFileState.isFile()) {
          const manifestString = (await fs.readFile(manifestFile)).toString();
          manifest = JSON.parse(manifestString);
        } else {
          throw AppStudioResultFactory.SystemError(
            AppStudioError.FileNotFoundError.name,
            AppStudioError.FileNotFoundError.message(manifestFile)
          );
        }
      } catch (error) {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(manifestFile)
        );
      }
    } else {
      try {
        appDirectory = await this.getAppDirectory(ctx);
      } catch (error) {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.ParamUndefinedError.name,
          AppStudioError.ParamUndefinedError.message(Constants.PUBLISH_PATH_QUESTION)
        );
      }
      const manifestTpl: TeamsAppManifest = await fs.readJSON(`${appDirectory}/${REMOTE_MANIFEST}`);
      const fillinRes = this.createManifestForRemote(ctx, manifestTpl);
      if (fillinRes.isOk()) {
        manifest = fillinRes.value[1];
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
    const appStudioToken = await ctx?.appStudioToken?.getAccessToken();
    const existApp = await AppStudioClient.getAppByTeamsAppId(manifest.id, appStudioToken!);
    if (existApp) {
      // For VS Code/CLI platform, let the user confirm before publish
      // For VS platform, do not enable confirm
      let executePublishUpdate = false;
      if (ctx.answers?.platform === Platform.VS) {
        executePublishUpdate = true;
      } else {
        let description = `The app ${existApp.displayName} has already been submitted to tenant App Catalog.\nStatus: ${existApp.publishingState}\n`;
        if (existApp.lastModifiedDateTime) {
          description =
            description + `Last Modified: ${existApp.lastModifiedDateTime?.toLocaleString()}\n`;
        }
        description = description + "Do you want to submit a new update?";
        const res = await ctx.ui?.showMessage("warn", description, true, "Confirm");
        if (res?.isOk() && res.value === "Confirm") executePublishUpdate = true;
      }

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

  public async postLocalDebug(ctx: PluginContext): Promise<string> {
    let appDirectory: string;
    try {
      appDirectory = await this.getAppDirectory(ctx);
    } catch (error) {
      throw error;
    }
    const manifest = await this.reloadManifestAndCheckRequiredFields(appDirectory);
    if (manifest.isErr()) {
      throw manifest;
    }
    const teamsAppId = await this.getAppDefinitionAndUpdate(ctx, "localDebug", manifest.value);
    if (teamsAppId.isErr()) {
      throw teamsAppId;
    }
    return teamsAppId.value;
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
      await publishProgress?.start("Validating manifest file");
      const validationResult = await AppStudioClient.validateManifest(
        manifestString!,
        (await ctx.appStudioToken?.getAccessToken())!
      );
      if (validationResult.length > 0) {
        throw AppStudioResultFactory.UserError(
          AppStudioError.ValidationFailedError.name,
          AppStudioError.ValidationFailedError.message(validationResult)
        );
      }

      // Update App in App Studio
      let remoteTeamsAppId: string | undefined = undefined;
      if (ctx.answers?.platform === Platform.VS) {
        remoteTeamsAppId = ctx.answers![Constants.REMOTE_TEAMS_APP_ID] as string;
      } else {
        remoteTeamsAppId = ctx.configOfOtherPlugins
          .get("solution")
          ?.get(REMOTE_TEAMS_APP_ID) as string;
      }
      await publishProgress?.next(
        `Updating app definition for app ${remoteTeamsAppId} in app studio`
      );
      const appDefinition = this.convertToAppDefinition(manifest, true);
      let appStudioToken = await ctx?.appStudioToken?.getAccessToken();
      const colorIconContent =
        manifest.icons.color && !manifest.icons.color.startsWith("https://")
          ? (await fs.readFile(`${appDirectory}/${manifest.icons.color}`)).toString("base64")
          : undefined;
      const outlineIconContent =
        manifest.icons.outline && !manifest.icons.outline.startsWith("https://")
          ? (await fs.readFile(`${appDirectory}/${manifest.icons.outline}`)).toString("base64")
          : undefined;
      await AppStudioClient.updateApp(
        remoteTeamsAppId!,
        appDefinition,
        appStudioToken!,
        undefined,
        colorIconContent,
        outlineIconContent
      );

      // Build Teams App package
      // Platforms will be checked in buildTeamsAppPackage(ctx)
      await publishProgress?.next(`Building Teams app package in ${appDirectory}.`);
      const appPackage = await this.buildTeamsAppPackage(ctx);

      const appContent = await fs.readFile(appPackage);
      appStudioToken = await ctx.appStudioToken?.getAccessToken();
      await publishProgress?.next(`Publishing ${manifest.name.short}`);
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
      await publishProgress?.end();
    }
  }

  private isSPFxProject(ctx: PluginContext): boolean {
    const solutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
    if (solutionSettings) {
      const selectedPlugins = solutionSettings.activeResourcePlugins;
      return selectedPlugins && selectedPlugins.indexOf("fx-resource-spfx") !== -1;
    }
    return false;
  }

  private async checkFileExist(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  private replaceConfigValue(config: string, id: string, value: string): string {
    if (config && id && value) {
      const idTag = `{${id}}`;
      while (config.includes(idTag)) {
        config = config.replace(idTag, value);
      }
    }

    return config;
  }

  private convertToAppDefinitionMessagingExtensions(
    appManifest: TeamsAppManifest
  ): IMessagingExtension[] {
    const messagingExtensions: IMessagingExtension[] = [];

    if (appManifest.composeExtensions) {
      appManifest.composeExtensions.forEach((ext: IComposeExtension) => {
        const me: IMessagingExtension = {
          botId: ext.botId,
          canUpdateConfiguration: true,
          commands: ext.commands,
          messageHandlers: ext.messageHandlers ?? [],
        };

        messagingExtensions.push(me);
      });
    }

    return messagingExtensions;
  }

  private convertToAppDefinitionBots(appManifest: TeamsAppManifest): IAppDefinitionBot[] {
    const bots: IAppDefinitionBot[] = [];
    if (appManifest.bots) {
      appManifest.bots.forEach((manBot: IBot) => {
        const teamCommands: ITeamCommand[] = [];
        const groupCommands: IGroupChatCommand[] = [];
        const personalCommands: IPersonalCommand[] = [];

        manBot?.commandLists?.forEach((list: ICommandList) => {
          list.commands.forEach((command: ICommand) => {
            teamCommands.push({
              title: command.title,
              description: command.description,
            });

            groupCommands.push({
              title: command.title,
              description: command.description,
            });

            personalCommands.push({
              title: command.title,
              description: command.description,
            });
          });
        });

        const bot: IAppDefinitionBot = {
          botId: manBot.botId,
          isNotificationOnly: manBot.isNotificationOnly ?? false,
          supportsFiles: manBot.supportsFiles ?? false,
          scopes: manBot.scopes,
          teamCommands: teamCommands,
          groupChatCommands: groupCommands,
          personalCommands: personalCommands,
        };

        bots.push(bot);
      });
    }
    return bots;
  }

  private async reloadManifest(appDirectory: string): Promise<Result<TeamsAppManifest, FxError>> {
    try {
      const manifest = await fs.readJson(`${appDirectory}/${REMOTE_MANIFEST}`);
      if (!manifest) {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.ManifestLoadFailedError.name,
            AppStudioError.ManifestLoadFailedError.message(`Failed to load manifest file`)
          )
        );
      }
      // Object.assign(ctx.app, manifest);
      return ok(manifest);
    } catch (e) {
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.ManifestLoadFailedError.name,
          AppStudioError.ManifestLoadFailedError.message(
            `Failed to load manifest file from ${appDirectory}/${REMOTE_MANIFEST}`
          )
        )
      );
    }
  }

  private getConfigForCreatingManifest(
    ctx: PluginContext,
    localDebug: boolean
  ): Result<
    {
      tabEndpoint?: string;
      tabDomain?: string;
      aadId: string;
      botDomain?: string;
      botId?: string;
      webApplicationInfoResource: string;
    },
    FxError
  > {
    let tabEndpoint, tabDomain;
    if (isArmSupportEnabled()) {
      if (localDebug) {
        tabEndpoint = this.getTabEndpoint(ctx, localDebug);
        tabDomain = this.getTabDomain(ctx, localDebug);
      } else {
        tabEndpoint = getArmOutput(ctx, FRONTEND_ENDPOINT_ARM) as string;
        tabDomain = getArmOutput(ctx, FRONTEND_DOMAIN_ARM) as string;
      }
    } else {
      tabEndpoint = this.getTabEndpoint(ctx, localDebug);
      tabDomain = this.getTabDomain(ctx, localDebug);
    }
    const aadId = this.getAadClientId(ctx, localDebug);
    const botId = this.getBotId(ctx, localDebug);
    const botDomain = this.getBotDomain(ctx, localDebug);

    // This config value is set by aadPlugin.setApplicationInContext. so aadPlugin.setApplicationInContext needs to run first.
    const webApplicationInfoResource = this.getApplicationIdUris(ctx, localDebug);
    if (!webApplicationInfoResource) {
      return err(
        localDebug
          ? AppStudioResultFactory.SystemError(
              AppStudioError.GetLocalDebugConfigFailedError.name,
              AppStudioError.GetLocalDebugConfigFailedError.message(
                "webApplicationInfoResource",
                true
              )
            )
          : AppStudioResultFactory.SystemError(
              AppStudioError.GetRemoteConfigFailedError.name,
              AppStudioError.GetRemoteConfigFailedError.message("webApplicationInfoResource", true)
            )
      );
    }

    if (!aadId) {
      return err(
        localDebug
          ? AppStudioResultFactory.SystemError(
              AppStudioError.GetLocalDebugConfigFailedError.name,
              AppStudioError.GetLocalDebugConfigFailedError.message(LOCAL_DEBUG_AAD_ID, true)
            )
          : AppStudioResultFactory.SystemError(
              AppStudioError.GetRemoteConfigFailedError.name,
              AppStudioError.GetRemoteConfigFailedError.message(LOCAL_DEBUG_AAD_ID, true)
            )
      );
    }

    if (!tabEndpoint && !botId) {
      if (isArmSupportEnabled()) {
        return err(
          localDebug
            ? AppStudioResultFactory.SystemError(
                AppStudioError.GetLocalDebugConfigFailedError.name,
                AppStudioError.GetLocalDebugConfigFailedError.message(
                  LOCAL_DEBUG_TAB_ENDPOINT + ", " + LOCAL_BOT_ID,
                  false
                )
              )
            : AppStudioResultFactory.SystemError(
                AppStudioError.GetRemoteConfigFailedError.name,
                AppStudioError.GetRemoteConfigFailedError.message(
                  FRONTEND_ENDPOINT_ARM + ", " + BOT_ID,
                  false
                )
              )
        );
      } else {
        return err(
          localDebug
            ? AppStudioResultFactory.SystemError(
                AppStudioError.GetLocalDebugConfigFailedError.name,
                AppStudioError.GetLocalDebugConfigFailedError.message(
                  LOCAL_DEBUG_TAB_ENDPOINT + ", " + LOCAL_BOT_ID,
                  false
                )
              )
            : AppStudioResultFactory.SystemError(
                AppStudioError.GetRemoteConfigFailedError.name,
                AppStudioError.GetRemoteConfigFailedError.message(
                  FRONTEND_ENDPOINT + ", " + BOT_ID,
                  false
                )
              )
        );
      }
    }
    if ((tabEndpoint && !tabDomain) || (!tabEndpoint && tabDomain)) {
      if (isArmSupportEnabled()) {
        return err(
          localDebug
            ? AppStudioResultFactory.SystemError(
                AppStudioError.InvalidLocalDebugConfigurationDataError.name,
                AppStudioError.InvalidLocalDebugConfigurationDataError.message(
                  LOCAL_DEBUG_TAB_ENDPOINT,
                  tabEndpoint,
                  LOCAL_DEBUG_TAB_DOMAIN,
                  tabDomain
                )
              )
            : AppStudioResultFactory.SystemError(
                AppStudioError.InvalidRemoteConfigurationDataError.name,
                AppStudioError.InvalidRemoteConfigurationDataError.message(
                  FRONTEND_ENDPOINT_ARM,
                  tabEndpoint,
                  FRONTEND_DOMAIN_ARM,
                  tabDomain
                )
              )
        );
      } else {
        return err(
          localDebug
            ? AppStudioResultFactory.SystemError(
                AppStudioError.InvalidLocalDebugConfigurationDataError.name,
                AppStudioError.InvalidLocalDebugConfigurationDataError.message(
                  LOCAL_DEBUG_TAB_ENDPOINT,
                  tabEndpoint,
                  LOCAL_DEBUG_TAB_DOMAIN,
                  tabDomain
                )
              )
            : AppStudioResultFactory.SystemError(
                AppStudioError.InvalidRemoteConfigurationDataError.name,
                AppStudioError.InvalidRemoteConfigurationDataError.message(
                  FRONTEND_ENDPOINT,
                  tabEndpoint,
                  FRONTEND_DOMAIN,
                  tabDomain
                )
              )
        );
      }
    }
    if (botId) {
      if (!botDomain) {
        return err(
          localDebug
            ? AppStudioResultFactory.SystemError(
                AppStudioError.GetLocalDebugConfigFailedError.name,
                AppStudioError.GetLocalDebugConfigFailedError.message(LOCAL_DEBUG_BOT_DOMAIN, false)
              )
            : AppStudioResultFactory.SystemError(
                AppStudioError.GetRemoteConfigFailedError.name,
                AppStudioError.GetRemoteConfigFailedError.message(BOT_DOMAIN, false)
              )
        );
      }
    }

    return ok({ tabEndpoint, tabDomain, aadId, botDomain, botId, webApplicationInfoResource });
  }

  private getTabEndpoint(ctx: PluginContext, isLocalDebug: boolean): string {
    let tabEndpoint: string;

    if (isMultiEnvEnabled()) {
      tabEndpoint = isLocalDebug
        ? (ctx.localSettings?.frontend?.get(LocalSettingsFrontendKeys.TabEndpoint) as string)
        : (ctx.configOfOtherPlugins.get(PluginNames.FE)?.get(FRONTEND_ENDPOINT) as string);
    } else {
      tabEndpoint = isLocalDebug
        ? (ctx.configOfOtherPlugins
            .get(PluginNames.LDEBUG)
            ?.get(LOCAL_DEBUG_TAB_ENDPOINT) as string)
        : (ctx.configOfOtherPlugins.get(PluginNames.FE)?.get(FRONTEND_ENDPOINT) as string);
    }

    return tabEndpoint;
  }

  private getTabDomain(ctx: PluginContext, isLocalDebug: boolean): string {
    let tabDomain: string;

    if (isMultiEnvEnabled()) {
      tabDomain = isLocalDebug
        ? (ctx.localSettings?.frontend?.get(LocalSettingsFrontendKeys.TabDomain) as string)
        : (ctx.configOfOtherPlugins.get(PluginNames.FE)?.get(FRONTEND_DOMAIN) as string);
    } else {
      tabDomain = isLocalDebug
        ? (ctx.configOfOtherPlugins.get(PluginNames.LDEBUG)?.get(LOCAL_DEBUG_TAB_DOMAIN) as string)
        : (ctx.configOfOtherPlugins.get(PluginNames.FE)?.get(FRONTEND_DOMAIN) as string);
    }
    return tabDomain;
  }

  private getAadClientId(ctx: PluginContext, isLocalDebug: boolean): string {
    let clientId: string;

    if (isMultiEnvEnabled()) {
      clientId = isLocalDebug
        ? (ctx.localSettings?.auth?.get(LocalSettingsAuthKeys.ClientId) as string)
        : (ctx.configOfOtherPlugins.get(PluginNames.AAD)?.get(REMOTE_AAD_ID) as string);
    } else {
      clientId = ctx.configOfOtherPlugins
        .get(PluginNames.AAD)
        ?.get(isLocalDebug ? LOCAL_DEBUG_AAD_ID : REMOTE_AAD_ID) as string;
    }

    return clientId;
  }

  private getBotId(ctx: PluginContext, isLocalDebug: boolean): string {
    let botId: string;

    if (isMultiEnvEnabled()) {
      botId = isLocalDebug
        ? (ctx.localSettings?.bot?.get(LocalSettingsBotKeys.BotId) as string)
        : (ctx.configOfOtherPlugins.get(PluginNames.BOT)?.get(BOT_ID) as string);
    } else {
      botId = ctx.configOfOtherPlugins
        .get(PluginNames.BOT)
        ?.get(isLocalDebug ? LOCAL_BOT_ID : BOT_ID) as string;
    }

    return botId;
  }

  private getBotDomain(ctx: PluginContext, isLocalDebug: boolean): string {
    let botDomain: string;

    if (isMultiEnvEnabled()) {
      botDomain = isLocalDebug
        ? (ctx.localSettings?.bot?.get(LocalSettingsBotKeys.BotDomain) as string)
        : (ctx.configOfOtherPlugins.get(PluginNames.BOT)?.get(BOT_DOMAIN) as string);
    } else {
      botDomain = isLocalDebug
        ? (ctx.configOfOtherPlugins.get(PluginNames.LDEBUG)?.get(LOCAL_DEBUG_BOT_DOMAIN) as string)
        : (ctx.configOfOtherPlugins.get(PluginNames.BOT)?.get(BOT_DOMAIN) as string);
    }

    return botDomain;
  }

  private getApplicationIdUris(ctx: PluginContext, isLocalDebug: boolean): string {
    let applicationIdUris: string;

    if (isMultiEnvEnabled()) {
      applicationIdUris = isLocalDebug
        ? (ctx.localSettings?.auth?.get(LocalSettingsAuthKeys.ApplicationIdUris) as string)
        : (ctx.configOfOtherPlugins
            .get(PluginNames.AAD)
            ?.get(WEB_APPLICATION_INFO_SOURCE) as string);
    } else {
      applicationIdUris = ctx.configOfOtherPlugins
        .get(PluginNames.AAD)
        ?.get(
          isLocalDebug ? LOCAL_WEB_APPLICATION_INFO_SOURCE : WEB_APPLICATION_INFO_SOURCE
        ) as string;
    }

    return applicationIdUris;
  }

  private getDevAppDefinition(
    manifest: string,
    appId: string,
    domains: string[],
    webApplicationInfoResource: string,
    ignoreIcon: boolean,
    tabEndpoint?: string,
    appName?: string,
    version?: string,
    botId?: string,
    appNameSuffix?: string
  ): [IAppDefinition, TeamsAppManifest] {
    if (appName) {
      manifest = this.replaceConfigValue(manifest, "appName", appName);
    }
    if (version) {
      manifest = this.replaceConfigValue(manifest, "version", version);
    }
    if (botId) {
      manifest = this.replaceConfigValue(manifest, "botId", botId);
    }

    if (tabEndpoint) {
      manifest = this.replaceConfigValue(manifest, "baseUrl", tabEndpoint);
    }

    manifest = this.replaceConfigValue(manifest, "appClientId", appId);
    manifest = this.replaceConfigValue(manifest, "appid", appId);
    manifest = this.replaceConfigValue(
      manifest,
      "webApplicationInfoResource",
      webApplicationInfoResource
    );

    const updatedManifest = JSON.parse(manifest) as TeamsAppManifest;

    for (const domain of domains) {
      updatedManifest.validDomains?.push(domain);
    }

    if (!tabEndpoint && updatedManifest.developer) {
      updatedManifest.developer.websiteUrl = DEFAULT_DEVELOPER_WEBSITE_URL;
      updatedManifest.developer.termsOfUseUrl = DEFAULT_DEVELOPER_TERM_OF_USE_URL;
      updatedManifest.developer.privacyUrl = DEFAULT_DEVELOPER_PRIVACY_URL;
    }

    const appDefinition = this.convertToAppDefinition(updatedManifest, ignoreIcon);
    // For local debug teams app, the app name will have a suffix to differentiate from remote teams app
    // if the resulting short name length doesn't exceeds limit.
    if (appNameSuffix) {
      const shortNameLength = appNameSuffix.length + (appDefinition.shortName?.length ?? 0);
      if (shortNameLength <= TEAMS_APP_SHORT_NAME_MAX_LENGTH) {
        appDefinition.shortName = appDefinition.shortName + appNameSuffix;
        appDefinition.appName = appDefinition.shortName;
      }
    }

    return [appDefinition, updatedManifest];
  }

  private convertToAppDefinition(
    appManifest: TeamsAppManifest,
    ignoreIcon: boolean
  ): IAppDefinition {
    const appDefinition: IAppDefinition = {
      appName: appManifest.name.short,
      validDomains: appManifest.validDomains,
    };
    appDefinition.appId = appManifest.id;

    appDefinition.appName = appManifest.name.short;
    appDefinition.shortName = appManifest.name.short;
    appDefinition.version = appManifest.version;

    appDefinition.packageName = appManifest.packageName;
    appDefinition.websiteUrl = appManifest.developer.websiteUrl;
    appDefinition.privacyUrl = appManifest.developer.privacyUrl;
    appDefinition.termsOfUseUrl = appManifest.developer.termsOfUseUrl;

    appDefinition.shortDescription = appManifest.description.short;
    appDefinition.longDescription = appManifest.description.full;

    appDefinition.developerName = appManifest.developer.name;

    appDefinition.staticTabs = appManifest.staticTabs;
    appDefinition.configurableTabs = appManifest.configurableTabs;

    appDefinition.bots = this.convertToAppDefinitionBots(appManifest);
    appDefinition.messagingExtensions = this.convertToAppDefinitionMessagingExtensions(appManifest);

    if (appManifest.webApplicationInfo) {
      appDefinition.webApplicationInfoId = appManifest.webApplicationInfo.id;
      appDefinition.webApplicationInfoResource = appManifest.webApplicationInfo.resource;
    }

    if (!ignoreIcon && appManifest.icons.color) {
      appDefinition.colorIcon = appManifest.icons.color;
    }

    if (!ignoreIcon && appManifest.icons.outline) {
      appDefinition.outlineIcon = appManifest.icons.outline;
    }

    return appDefinition;
  }

  private async updateApp(
    appDefinition: IAppDefinition,
    appStudioToken: string,
    type: "localDebug" | "remote",
    createIfNotExist: boolean,
    teamsAppId?: string,
    logProvider?: LogProvider,
    appDirectory?: string
  ): Promise<Result<string, FxError>> {
    if (appStudioToken === undefined || appStudioToken.length === 0) {
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.AppStudioTokenGetFailedError.name,
          AppStudioError.AppStudioTokenGetFailedError.message
        )
      );
    }

    if (createIfNotExist) {
      const colorIconContent =
        appDirectory && appDefinition.colorIcon && !appDefinition.colorIcon.startsWith("https://")
          ? (await fs.readFile(`${appDirectory}/${appDefinition.colorIcon}`)).toString("base64")
          : undefined;
      const outlineIconContent =
        appDirectory &&
        appDefinition.outlineIcon &&
        !appDefinition.outlineIcon.startsWith("https://")
          ? (await fs.readFile(`${appDirectory}/${appDefinition.outlineIcon}`)).toString("base64")
          : undefined;

      await logProvider?.debug(`${type} appDefinition: ${JSON.stringify(appDefinition)}`);
      const appDef = await AppStudioClient.createApp(
        appDefinition,
        appStudioToken,
        logProvider,
        colorIconContent,
        outlineIconContent
      );
      teamsAppId = appDef?.teamsAppId;
      if (!appDef?.teamsAppId) {
        return err(
          type === "remote"
            ? AppStudioResultFactory.SystemError(
                AppStudioError.RemoteAppIdCreateFailedError.name,
                AppStudioError.RemoteAppIdCreateFailedError.message
              )
            : AppStudioResultFactory.SystemError(
                AppStudioError.LocalAppIdCreateFailedError.name,
                AppStudioError.LocalAppIdCreateFailedError.message
              )
        );
      }
      appDefinition.outlineIcon = appDef.outlineIcon;
      appDefinition.colorIcon = appDef.colorIcon;
    }

    const colorIconContent =
      appDirectory && appDefinition.colorIcon && !appDefinition.colorIcon.startsWith("https://")
        ? (await fs.readFile(`${appDirectory}/${appDefinition.colorIcon}`)).toString("base64")
        : undefined;
    const outlineIconContent =
      appDirectory && appDefinition.outlineIcon && !appDefinition.outlineIcon.startsWith("https://")
        ? (await fs.readFile(`${appDirectory}/${appDefinition.outlineIcon}`)).toString("base64")
        : undefined;
    appDefinition.appId = teamsAppId;

    try {
      await AppStudioClient.updateApp(
        teamsAppId!,
        appDefinition,
        appStudioToken,
        logProvider,
        colorIconContent,
        outlineIconContent
      );
      return ok(teamsAppId!);
    } catch (e) {
      if (e instanceof Error) {
        return err(
          type === "remote"
            ? AppStudioResultFactory.SystemError(
                AppStudioError.RemoteAppIdUpdateFailedError.name,
                AppStudioError.RemoteAppIdUpdateFailedError.message(e.name, e.message)
              )
            : AppStudioResultFactory.SystemError(
                AppStudioError.LocalAppIdUpdateFailedError.name,
                AppStudioError.LocalAppIdUpdateFailedError.message(e.name, e.message)
              )
        );
      }
      throw e;
    }
  }

  private async getConfigAndAppDefinition(
    ctx: PluginContext,
    localDebug: boolean,
    manifest: TeamsAppManifest
  ): Promise<Result<[IAppDefinition, TeamsAppManifest], FxError>> {
    const maybeConfig = this.getConfigForCreatingManifest(ctx, localDebug).map((conf) => {
      return {
        localTabEndpoint: conf.tabEndpoint,
        localTabDomain: conf.tabDomain,
        localAADId: conf.aadId,
        localBotDomain: conf.botDomain,
        botId: conf.botId,
        webApplicationInfoResource: conf.webApplicationInfoResource,
      };
    });

    if (maybeConfig.isErr()) {
      return err(maybeConfig.error);
    }

    const {
      localTabEndpoint,
      localTabDomain,
      localAADId,
      localBotDomain,
      botId,
      webApplicationInfoResource,
    } = maybeConfig.value;

    const validDomains: string[] = [];

    if (localTabDomain) {
      validDomains.push(localTabDomain);
    }

    if (localBotDomain) {
      validDomains.push(localBotDomain);
    }

    let appDirectory: string;
    try {
      appDirectory = await this.getAppDirectory(ctx);
    } catch (error) {
      return err(error);
    }
    const manifestTpl = (await fs.readFile(`${appDirectory}/${REMOTE_MANIFEST}`)).toString();

    const [appDefinition, _updatedManifest] = this.getDevAppDefinition(
      manifestTpl,
      localAADId,
      validDomains,
      webApplicationInfoResource,
      false,
      localTabEndpoint,
      manifest.name.short,
      manifest.version,
      botId,
      "-local-debug"
    );

    return ok([appDefinition, _updatedManifest]);
  }

  private async getAppDirectory(ctx: PluginContext): Promise<string> {
    const appDirNewLoc = `${ctx.root}/${AppPackageFolderName}`;
    const appDirOldLoc = `${ctx.root}/.${ConfigFolderName}`;

    const manifestNewLocExist = await this.checkFileExist(`${appDirNewLoc}/${REMOTE_MANIFEST}`);
    const manifestOldLocExist = await this.checkFileExist(`${appDirOldLoc}/${REMOTE_MANIFEST}`);
    const manifestExist = manifestNewLocExist || manifestOldLocExist;
    if (!manifestExist) {
      throw AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message("manifest.source.json")
      );
    }
    const appDirectory = manifestNewLocExist ? appDirNewLoc : appDirOldLoc;

    return appDirectory;
  }
}
