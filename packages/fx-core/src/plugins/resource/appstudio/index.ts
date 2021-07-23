// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  FxError,
  ok,
  err,
  LogProvider,
  Platform,
  Plugin,
  PluginContext,
  QTreeNode,
  Result,
  Stage,
  TeamsAppManifest,
  SystemError,
  UserError,
  ProjectSettings,
  Colors,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import { AppStudioPluginImpl } from "./plugin";
import { Constants } from "./constants";
import { IAppDefinition } from "./interfaces/IAppDefinition";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import { manuallySubmitOption, autoPublishOption } from "./questions";
import { TelemetryUtils, TelemetryEventName, TelemetryPropertyKey } from "./utils/telemetry";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
@Service(ResourcePlugins.AppStudioPlugin)
export class AppStudioPlugin implements Plugin {
  name = "fx-resource-appstudio";
  displayName = "App Studio";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    return true;
  }
  private appStudioPluginImpl = new AppStudioPluginImpl();

  async getQuestions(
    stage: Stage,
    ctx: PluginContext
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const appStudioQuestions = new QTreeNode({
      type: "group",
    });

    if (stage === Stage.publish) {
      if (ctx.answers?.platform === Platform.VS) {
        const appPath = new QTreeNode({
          type: "folder",
          name: Constants.PUBLISH_PATH_QUESTION,
          title: "Please select the folder contains manifest.json and icons",
          default: `${ctx.root}/.${ConfigFolderName}`,
        });
        appStudioQuestions.addChild(appPath);

        const remoteTeamsAppId = new QTreeNode({
          type: "text",
          name: Constants.REMOTE_TEAMS_APP_ID,
          title: "Please input the teams app id in App Studio",
        });
        appStudioQuestions.addChild(remoteTeamsAppId);
      } else if (ctx.answers?.platform === Platform.VSCode) {
        const buildOrPublish = new QTreeNode({
          name: Constants.BUILD_OR_PUBLISH_QUESTION,
          type: "singleSelect",
          staticOptions: [manuallySubmitOption, autoPublishOption],
          title: "Teams Toolkit: Publish to Teams",
          default: autoPublishOption.id,
        });
        appStudioQuestions.addChild(buildOrPublish);
      }
    }

    return ok(appStudioQuestions);
  }

  public async getAppDefinitionAndUpdate(
    ctx: PluginContext,
    type: "localDebug" | "remote",
    manifest: TeamsAppManifest
  ): Promise<Result<string, FxError>> {
    return await this.appStudioPluginImpl.getAppDefinitionAndUpdate(ctx, type, manifest);
  }

  public async createManifest(settings: ProjectSettings): Promise<TeamsAppManifest | undefined> {
    return await this.appStudioPluginImpl.createManifest(settings);
  }

  public async reloadManifestAndCheckRequiredFields(
    ctxRoot: string
  ): Promise<Result<TeamsAppManifest, FxError>> {
    return await this.appStudioPluginImpl.reloadManifestAndCheckRequiredFields(ctxRoot);
  }

  /**
   * Create teams app
   * @returns {string} - Remote teams app id
   */
  public async provision(ctx: PluginContext): Promise<Result<string, FxError>> {
    const remoteTeamsAppId = await this.appStudioPluginImpl.provision(ctx);
    return ok(remoteTeamsAppId);
  }

  /**
   * Update teams app
   * @returns {string} - Remote teams app id
   */
  public async postProvision(ctx: PluginContext): Promise<Result<string, FxError>> {
    const remoteTeamsAppId = await this.appStudioPluginImpl.postProvision(ctx);
    return ok(remoteTeamsAppId);
  }

  /**
   * Validate manifest string against schema
   * @param {string} manifestString - the string of manifest.json file
   * @returns {string[]} an array of errors
   */
  public async validateManifest(ctx: PluginContext): Promise<Result<string[], FxError>> {
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendStartEvent(TelemetryEventName.validateManifest);
    const validationpluginResult = await this.appStudioPluginImpl.validateManifest(ctx);
    if (validationpluginResult.isErr()) {
      return err(validationpluginResult.error);
    }
    const validationResult = validationpluginResult.value;
    if (validationResult.length > 0) {
      const errMessage = AppStudioError.ValidationFailedError.message(validationResult);
      ctx.logProvider?.error("Manifest Validation failed!");
      ctx.ui?.showMessage("error", errMessage, false);
      const properties: { [key: string]: string } = {};
      properties[TelemetryPropertyKey.validationResult] = validationResult.join("\n");
      const validationFailed = AppStudioResultFactory.UserError(
        AppStudioError.ValidationFailedError.name,
        errMessage
      );
      TelemetryUtils.sendErrorEvent(
        TelemetryEventName.validateManifest,
        validationFailed,
        properties
      );
      return err(validationFailed);
    }
    const validationSuccess = "Manifest Validation succeed!";
    ctx.ui?.showMessage("info", validationSuccess, false);
    TelemetryUtils.sendSuccessEvent(TelemetryEventName.validateManifest);
    return validationpluginResult;
  }

  public createManifestForRemote(
    ctx: PluginContext,
    maybeSelectedPlugins: Result<Plugin[], FxError>,
    manifest: TeamsAppManifest
  ): Result<[IAppDefinition, TeamsAppManifest], FxError> {
    return this.appStudioPluginImpl.createManifestForRemote(ctx, maybeSelectedPlugins, manifest);
  }

  public async scaffold(ctx: PluginContext): Promise<Result<any, FxError>> {
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendStartEvent(TelemetryEventName.scaffold);
    try {
      const scaffoldResult = await this.appStudioPluginImpl.scaffold(ctx);
      TelemetryUtils.sendSuccessEvent(TelemetryEventName.scaffold);
      return ok(scaffoldResult);
    } catch (error) {
      TelemetryUtils.sendErrorEvent(TelemetryEventName.scaffold, error);
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.ScaffoldFailedError.name,
          AppStudioError.ScaffoldFailedError.message(error)
        )
      );
    }
  }

  /**
   * Build Teams Package
   * @param {string} appDirectory - The directory contains manifest.source.json and two images
   * @returns {string} - Path of built appPackage.zip
   */
  public async buildTeamsPackage(
    ctx: PluginContext,
    appDirectory: string
  ): Promise<Result<string, FxError>> {
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendStartEvent(TelemetryEventName.buildTeamsPackage);
    try {
      const appPackagePath = await this.appStudioPluginImpl.buildTeamsAppPackage(ctx, appDirectory);
      const builtSuccess = [
        { content: "(√)Done: ", color: Colors.BRIGHT_GREEN },
        { content: "Teams Package ", color: Colors.BRIGHT_WHITE },
        { content: appPackagePath, color: Colors.BRIGHT_MAGENTA },
        { content: " built successfully!", color: Colors.BRIGHT_WHITE },
      ];
      ctx.ui?.showMessage("info", builtSuccess, false);
      const properties: { [key: string]: string } = {};
      properties[TelemetryPropertyKey.buildOnly] = "true";
      TelemetryUtils.sendSuccessEvent(TelemetryEventName.buildTeamsPackage, properties);
      return ok(appPackagePath);
    } catch (error) {
      TelemetryUtils.sendErrorEvent(TelemetryEventName.buildTeamsPackage, error);
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.TeamsPackageBuildError.name,
          AppStudioError.TeamsPackageBuildError.message(error)
        )
      );
    }
  }

  /**
   * Publish the app to Teams App Catalog
   * @param {PluginContext} ctx
   * @returns {string[]} - Teams App ID in Teams app catalog
   */
  public async publish(ctx: PluginContext): Promise<Result<string | undefined, FxError>> {
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendStartEvent(TelemetryEventName.publish);
    if (ctx.answers?.platform === Platform.VSCode) {
      const answer = ctx.answers![Constants.BUILD_OR_PUBLISH_QUESTION] as string;
      if (answer === manuallySubmitOption.id) {
        const appDirectory = `${ctx.root}/.${ConfigFolderName}`;
        try {
          const appPackagePath = await this.appStudioPluginImpl.buildTeamsAppPackage(
            ctx,
            appDirectory
          );
          const msg = `Successfully created ${
            ctx.projectSettings!.appName
          } app package file at ${appPackagePath}. Send this to your administrator for approval.`;
          ctx.ui?.showMessage("info", msg, false, "OK", Constants.READ_MORE).then((value) => {
            if (value.isOk() && value.value === Constants.READ_MORE) {
              ctx.ui?.openUrl(Constants.PUBLISH_GUIDE);
            }
          });
          TelemetryUtils.sendSuccessEvent(TelemetryEventName.publish);
          return ok(appPackagePath);
        } catch (error) {
          TelemetryUtils.sendErrorEvent(TelemetryEventName.publish, error);
          return err(
            AppStudioResultFactory.SystemError(
              AppStudioError.TeamsPackageBuildError.name,
              AppStudioError.TeamsPackageBuildError.message(error)
            )
          );
        }
      }
    }

    try {
      const result = await this.appStudioPluginImpl.publish(ctx);
      ctx.logProvider?.info(`Publish success!`);
      ctx.ui?.showMessage(
        "info",
        `${result.name} successfully published to the admin portal. Once approved, your app will be available for your organization.`,
        false
      );
      const properties: { [key: string]: string } = {};
      properties[TelemetryPropertyKey.updateExistingApp] = String(result.update);
      TelemetryUtils.sendSuccessEvent(TelemetryEventName.publish);
      return ok(result.id);
    } catch (error) {
      if (error instanceof SystemError || error instanceof UserError) {
        if (error.name === AppStudioError.TeamsAppPublishCancelError.name) {
          TelemetryUtils.sendSuccessEvent(TelemetryEventName.publish);
          return ok(undefined);
        }
        const innerError = error.innerError ? `innerError: ${error.innerError}` : "";
        error.message = `${error.message} ${innerError}`;
        TelemetryUtils.sendErrorEvent(TelemetryEventName.publish, error);
        return err(error);
      } else {
        const publishFailed = new SystemError(
          AppStudioError.TeamsAppPublishFailedError.name,
          error.message,
          Constants.PLUGIN_NAME,
          undefined,
          undefined,
          error
        );
        TelemetryUtils.sendErrorEvent(TelemetryEventName.publish, publishFailed);
        return err(publishFailed);
      }
    }
  }
}

export default new AppStudioPlugin();
