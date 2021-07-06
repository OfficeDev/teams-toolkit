// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ok,
  err,
  AzureSolutionSettings,
  ConfigFolderName,
  FxError,
  returnSystemError,
  Result,
  PluginContext,
  TeamsAppManifest,
  Platform,
  LogProvider,
  DialogMsg,
  DialogType,
  QuestionType,
  ProjectSettings,
  IComposeExtension,
  IBot,
} from "@microsoft/teamsfx-api";
import { AppStudioClient } from "./appStudio";
import {
  IAppDefinition,
  IMessagingExtension,
  IAppDefinitionBot,
  ITeamCommand,
  IPersonalCommand,
  IGroupChatCommand,
  ICommand,
  ICommandList,
} from "../../solution/fx-solution/appstudio/interface";
import {
  BotOptionItem,
  HostTypeOptionAzure,
  MessageExtensionItem,
  TabOptionItem,
} from "../../solution/fx-solution/question";
import {
  TEAMS_APP_MANIFEST_TEMPLATE,
  CONFIGURABLE_TABS_TPL,
  STATIC_TABS_TPL,
  BOTS_TPL,
  COMPOSE_EXTENSIONS_TPL,
  TEAMS_APP_SHORT_NAME_MAX_LENGTH,
  DEFAULT_DEVELOPER_WEBSITE_URL,
  DEFAULT_DEVELOPER_TERM_OF_USE_URL,
  DEFAULT_DEVELOPER_PRIVACY_URL,
} from "../../solution/fx-solution/constants";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import { Constants } from "./constants";
import { REMOTE_TEAMS_APP_ID, REMOTE_MANIFEST } from "../../solution/fx-solution/constants";
import AdmZip from "adm-zip";
import * as fs from "fs-extra";

export class AppStudioPluginImpl {
  public async createApp(
    appDefinition: IAppDefinition,
    appStudioToken: string,
    logProvider?: LogProvider,
    colorIconContent?: string, // base64 encoded
    outlineIconContent?: string // base64 encoded
  ): Promise<IAppDefinition | undefined> {
    return await AppStudioClient.createApp(
      appDefinition,
      appStudioToken,
      logProvider,
      colorIconContent,
      outlineIconContent
    );
  }

  public async updateApp(
    appDefinition: IAppDefinition,
    appStudioToken: string,
    type: "localDebug" | "remote",
    createIfNotExist: boolean,
    teamsAppId?: string,
    logProvider?: LogProvider,
    projectRoot?: string
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
        projectRoot && appDefinition.colorIcon && !appDefinition.colorIcon.startsWith("https://")
          ? (
              await fs.readFile(`${projectRoot}/.${ConfigFolderName}/${appDefinition.colorIcon}`)
            ).toString("base64")
          : undefined;
      const outlineIconContent =
        projectRoot &&
        appDefinition.outlineIcon &&
        !appDefinition.outlineIcon.startsWith("https://")
          ? (
              await fs.readFile(`${projectRoot}/.${ConfigFolderName}/${appDefinition.outlineIcon}`)
            ).toString("base64")
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
      projectRoot && appDefinition.colorIcon && !appDefinition.colorIcon.startsWith("https://")
        ? (
            await fs.readFile(`${projectRoot}/.${ConfigFolderName}/${appDefinition.colorIcon}`)
          ).toString("base64")
        : undefined;
    const outlineIconContent =
      projectRoot && appDefinition.outlineIcon && !appDefinition.outlineIcon.startsWith("https://")
        ? (
            await fs.readFile(`${projectRoot}/.${ConfigFolderName}/${appDefinition.outlineIcon}`)
          ).toString("base64")
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

  /**
   * ask app common questions to generate app manifest
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
    ctxRoot: string
  ): Promise<Result<TeamsAppManifest, FxError>> {
    const result = await this.reloadManifest(ctxRoot);
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

  public async validateManifest(ctx: PluginContext, manifestString: string): Promise<string[]> {
    const appStudioToken = await ctx?.appStudioToken?.getAccessToken();
    return await AppStudioClient.validateManifest(manifestString, appStudioToken!);
  }

  public getDevAppDefinition(
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

  public convertToAppDefinition(
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

  public async buildTeamsAppPackage(
    ctx: PluginContext,
    appDirectory: string,
    manifestString: string
  ): Promise<string> {
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

    const zipFileName = `${appDirectory}/appPackage.zip`;
    zip.writeZip(zipFileName);

    if (this.isSPFxProject(ctx)) {
      await fs.copyFile(zipFileName, `${ctx.root}/SPFx/teams/TeamsSPFxApp.zip`);
    }

    return zipFileName;
  }

  public async publish(ctx: PluginContext): Promise<{ name: string; id: string; update: boolean }> {
    let appDirectory: string | undefined = undefined;
    let manifestString: string | undefined = undefined;

    // For vs platform, read the local manifest.json file
    // For cli/vsc platform, get manifest from ctx
    if (ctx.answers?.platform === Platform.VS) {
      appDirectory = ctx.answers![Constants.PUBLISH_PATH_QUESTION] as string;
      const manifestFile = `${appDirectory}/${Constants.MANIFEST_FILE}`;
      try {
        const manifestFileState = await fs.stat(manifestFile);
        if (manifestFileState.isFile()) {
          manifestString = (await fs.readFile(manifestFile)).toString();
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
      appDirectory = `${ctx.root}/.${ConfigFolderName}`;
      manifestString = JSON.stringify(ctx.app);
    }

    if (!appDirectory) {
      throw AppStudioResultFactory.SystemError(
        AppStudioError.ParamUndefinedError.name,
        AppStudioError.ParamUndefinedError.message(Constants.PUBLISH_PATH_QUESTION)
      );
    }

    const manifest = JSON.parse(manifestString);

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
        const appId = await this.beforePublish(ctx, appDirectory, manifestString, true);
        return { id: appId, name: manifest.name.short, update: true };
      } else {
        throw AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppPublishCancelError.name,
          AppStudioError.TeamsAppPublishCancelError.message(manifest.name.short)
        );
      }
    } else {
      const appId = await this.beforePublish(ctx, appDirectory, manifestString, false);
      return { id: appId, name: manifest.name.short, update: false };
    }
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
      const validationResult = await this.validateManifest(ctx, manifestString!);
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
      await publishProgress?.next(`Building Teams app package in ${appDirectory}.`);
      const appPackage = await this.buildTeamsAppPackage(ctx, appDirectory, manifestString!);

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

  private async reloadManifest(ctxRoot: string): Promise<Result<TeamsAppManifest, FxError>> {
    try {
      const manifest = await fs.readJson(`${ctxRoot}/.${ConfigFolderName}/${REMOTE_MANIFEST}`);
      if (!manifest) {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.ManifestLoadFailedError.name,
            AppStudioError.ManifestLoadFailedError.message("Failed to load manifest file")
          )
        );
      }
      // Object.assign(ctx.app, manifest);
      return ok(manifest);
    } catch (e) {
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.ManifestLoadFailedError.name,
          AppStudioError.ManifestLoadFailedError.message("Failed to load manifest file")
        )
      );
    }
  }
}
