// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ActionContext,
  CloudResource,
  Colors,
  err,
  FxError,
  Inputs,
  InputsWithProjectPath,
  ok,
  Platform,
  ResourceContextV3,
  QTreeNode,
  Result,
  SystemError,
  TeamsAppManifest,
  UserError,
  v3,
  v2,
  ProjectSettingsV3,
  IStaticTab,
  M365TokenProvider,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { pathToFileURL } from "url";
import { getLocalizedString } from "../../../common/localizeUtils";
import { VSCodeExtensionCommand } from "../../../common/constants";
import { hasTab } from "../../../common/projectSettingsHelperV3";
import { globalVars } from "../../../core/globalVars";
import { getTemplatesFolder } from "../../../folder";
import {
  CommandAndResponseOptionItem,
  NotificationOptionItem,
} from "../../../plugins/solution/fx-solution/question";
import {
  BOTS_TPL_EXISTING_APP,
  COLOR_TEMPLATE,
  COMPOSE_EXTENSIONS_TPL_EXISTING_APP,
  CONFIGURABLE_TABS_TPL_EXISTING_APP,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_OUTLINE_PNG_FILENAME,
  OUTLINE_TEMPLATE,
  STATIC_TABS_TPL_EXISTING_APP,
  DEFAULT_DEVELOPER,
  Constants,
  MANIFEST_RESOURCES,
  STATIC_TABS_MAX_ITEMS,
  ErrorMessages,
} from "../../../plugins/resource/appstudio/constants";
import { AppStudioError } from "../../../plugins/resource/appstudio/errors";
import {
  autoPublishOption,
  manuallySubmitOption,
} from "../../../plugins/resource/appstudio/questions";
import { AppStudioResultFactory } from "../../../plugins/resource/appstudio/results";
import {
  TelemetryPropertyKey,
  TelemetryEventName,
} from "../../../plugins/resource/appstudio/utils/telemetry";
import { ComponentNames } from "../../constants";
import {
  createTeamsApp,
  updateTeamsApp,
  publishTeamsApp,
  buildTeamsAppPackage,
  validateManifest,
  getManifest,
  updateManifest,
} from "./appStudio";
import {
  BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3,
  BOTS_TPL_FOR_NOTIFICATION_V3,
  BOTS_TPL_V3,
  COMPOSE_EXTENSIONS_TPL_V3,
  CONFIGURABLE_TABS_TPL_V3,
  STATIC_TABS_TPL_V3,
  TEAMS_APP_MANIFEST_TEMPLATE,
  WEB_APPLICATION_INFO_V3,
} from "./constants";
import { readAppManifest, writeAppManifest } from "./utils";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { getProjectTemplatesFolderPath } from "../../../common/utils";
import { ResourcePermission, TeamsAppAdmin } from "../../../common/permissionInterface";
import isUUID from "validator/lib/isUUID";
import { AppStudioScopes } from "../../../common/tools";
import { AppStudioClient } from "../../../plugins/resource/appstudio/appStudio";
import { AppUser } from "../../../plugins/resource/appstudio/interfaces/appUser";

@Service("app-manifest")
export class AppManifest implements CloudResource {
  name = "app-manifest";
  outputs = {
    teamsAppId: {
      key: "teamsAppId",
    },
    tenantId: {
      key: "tenantId",
    },
  };
  finalOutputKeys = ["teamsAppId", "tenantId"];
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.init,
    }),
  ])
  async init(
    context: v2.Context,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    let manifest;
    const sourceTemplatesFolder = getTemplatesFolder();
    if (inputs.capabilities === "TabSPFx") {
      const templateManifestFolder = path.join(
        sourceTemplatesFolder,
        "plugins",
        "resource",
        "spfx"
      );
      const manifestFile = path.resolve(
        templateManifestFolder,
        "./solution/manifest_multi_env.json"
      );
      const manifestString = (await fs.readFile(manifestFile)).toString();
      manifest = JSON.parse(manifestString);
    } else {
      const existingApp = inputs.existingApp as boolean;
      const manifestString = TEAMS_APP_MANIFEST_TEMPLATE;
      manifest = JSON.parse(manifestString);
      if (existingApp || !hasTab(context.projectSetting as ProjectSettingsV3)) {
        manifest.developer = DEFAULT_DEVELOPER;
      }
    }
    const targetTemplateFolder = await getProjectTemplatesFolderPath(inputs.projectPath);
    await fs.ensureDir(targetTemplateFolder);
    const appPackageFolder = path.join(targetTemplateFolder, "appPackage");
    await fs.ensureDir(appPackageFolder);
    const resourcesFolder = path.resolve(appPackageFolder, "resources");
    await fs.ensureDir(resourcesFolder);
    const targetManifestPath = path.join(appPackageFolder, "manifest.template.json");
    await fs.writeFile(targetManifestPath, JSON.stringify(manifest, null, 4));
    const defaultColorPath = path.join(sourceTemplatesFolder, COLOR_TEMPLATE);
    const defaultOutlinePath = path.join(sourceTemplatesFolder, OUTLINE_TEMPLATE);
    await fs.copy(defaultColorPath, path.join(resourcesFolder, DEFAULT_COLOR_PNG_FILENAME));
    await fs.copy(defaultOutlinePath, path.join(resourcesFolder, DEFAULT_OUTLINE_PNG_FILENAME));
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.addCapability,
    }),
  ])
  async addCapability(
    inputs: InputsWithProjectPath,
    capabilities: v3.ManifestCapability[]
  ): Promise<Result<undefined, FxError>> {
    const res = await addCapabilities(inputs, capabilities);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
  async capabilityExceedLimit(
    inputs: InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
  ): Promise<Result<boolean, FxError>> {
    const appManifestRes = await readAppManifest(inputs.projectPath);
    if (appManifestRes.isErr()) return err(appManifestRes.error);
    const res = await _capabilityExceedLimit(appManifestRes.value, capability);
    if (res.isErr()) return err(res.error);
    return ok(res.value);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: getLocalizedString("plugins.appstudio.provisionTitle"),
      progressSteps: 1,
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.provision, // TODO
    }),
  ])
  async provision(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ResourceContextV3;
    await actionContext?.progressBar?.next(
      getLocalizedString("plugins.appstudio.provisionProgress", ctx.projectSetting.appName)
    );
    const res = await createTeamsApp(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
    if (res.isErr()) return err(res.error);
    ctx.envInfo.state[ComponentNames.AppManifest].teamsAppId = res.value;
    globalVars.teamsAppId = res.value;
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: getLocalizedString("plugins.appstudio.provisionTitle"),
      progressSteps: 1,
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.provisionManifest,
    }),
  ])
  async provisionForCLI(
    ctx: v2.Context,
    inputs: InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProvider,
    actionContext?: ActionContext
  ): Promise<Result<string, FxError>> {
    await actionContext?.progressBar?.next(
      getLocalizedString("plugins.appstudio.provisionProgress", ctx.projectSetting.appName)
    );
    const res = await createTeamsApp(ctx, inputs, envInfo, tokenProvider);
    return res;
  }
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: getLocalizedString("plugins.appstudio.provisionTitle"),
      progressSteps: 1,
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.localDebug,
    }),
  ])
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ResourceContextV3;
    await actionContext?.progressBar?.next(
      getLocalizedString("plugins.appstudio.postProvisionProgress", ctx.projectSetting.appName)
    );
    const res = await updateTeamsApp(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.publish,
      question: async (context, inputs) => {
        return await publishQuestion(inputs);
      },
    }),
  ])
  async publish(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionCtx?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ResourceContextV3;
    if (
      inputs.platform === Platform.VSCode &&
      inputs[Constants.BUILD_OR_PUBLISH_QUESTION] === manuallySubmitOption.id
    ) {
      if (actionCtx?.telemetryProps)
        actionCtx.telemetryProps[TelemetryPropertyKey.manual] = String(true);
      try {
        const appPackagePath = await buildTeamsAppPackage(
          inputs.projectPath,
          ctx.envInfo,
          false,
          actionCtx!.telemetryProps!
        );
        const msg = getLocalizedString(
          "plugins.appstudio.adminApprovalTip",
          ctx.projectSetting.appName,
          appPackagePath
        );
        ctx.userInteraction
          .showMessage("info", msg, false, "OK", Constants.READ_MORE)
          .then((value) => {
            if (value.isOk() && value.value === Constants.READ_MORE) {
              ctx.userInteraction.openUrl(Constants.PUBLISH_GUIDE);
            }
          });
        return ok(undefined);
      } catch (error: any) {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.TeamsPackageBuildError.name,
            AppStudioError.TeamsPackageBuildError.message(error),
            error.helpLink
          )
        );
      }
    }
    try {
      const res = await publishTeamsApp(
        ctx,
        inputs,
        ctx.envInfo,
        ctx.tokenProvider.m365TokenProvider
      );
      if (res.isErr()) return err(res.error);
      ctx.logProvider.info(`Publish success!`);
      if (inputs.platform === Platform.CLI) {
        const msg = getLocalizedString(
          "plugins.appstudio.publishSucceedNotice.cli",
          res.value.appName,
          Constants.TEAMS_ADMIN_PORTAL,
          Constants.TEAMS_MANAGE_APP_DOC
        );
        ctx.userInteraction.showMessage("info", msg, false);
      } else {
        const msg = getLocalizedString(
          "plugins.appstudio.publishSucceedNotice",
          res.value.appName,
          Constants.TEAMS_MANAGE_APP_DOC
        );
        const adminPortal = getLocalizedString("plugins.appstudio.adminPortal");
        ctx.userInteraction.showMessage("info", msg, false, adminPortal).then((value) => {
          if (value.isOk() && value.value === adminPortal) {
            ctx.userInteraction.openUrl(Constants.TEAMS_ADMIN_PORTAL);
          }
        });
      }
      if (actionCtx?.telemetryProps) {
        actionCtx.telemetryProps[TelemetryPropertyKey.updateExistingApp] = String(res.value.update);
        actionCtx.telemetryProps[TelemetryPropertyKey.publishedAppId] = String(
          res.value.publishedAppId
        );
      }
    } catch (error: any) {
      if (error instanceof SystemError || error instanceof UserError) {
        throw error;
      } else {
        const publishFailed = new SystemError({
          name: AppStudioError.TeamsAppPublishFailedError.name,
          message: error.message,
          source: Constants.PLUGIN_NAME,
          error: error,
        });
        return err(publishFailed);
      }
    }
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.validateManifest,
    }),
  ])
  async validate(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<string[], FxError>> {
    const manifestRes = await getManifest(inputs.projectPath, context.envInfo);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }
    const manifest: TeamsAppManifest = manifestRes.value;
    const validationResult = await validateManifest(manifest);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }
    if (validationResult.value.length > 0) {
      const errMessage = AppStudioError.ValidationFailedError.message(validationResult.value);
      context.logProvider?.error(getLocalizedString("plugins.appstudio.validationFailedNotice"));
      const validationFailed = AppStudioResultFactory.UserError(
        AppStudioError.ValidationFailedError.name,
        errMessage
      );
      return err(validationFailed);
    }
    const validationSuccess = getLocalizedString("plugins.appstudio.validationSucceedNotice");
    context.userInteraction.showMessage("info", validationSuccess, false);
    return validationResult;
  }
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.buildTeamsPackage,
    }),
  ])
  async build(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<string, FxError>> {
    const res = await buildTeamsAppPackage(inputs.projectPath, context.envInfo);
    if (res.isOk()) {
      if (inputs.platform === Platform.CLI || inputs.platform === Platform.VS) {
        const builtSuccess = [
          { content: "(√)Done: ", color: Colors.BRIGHT_GREEN },
          { content: "Teams Package ", color: Colors.BRIGHT_WHITE },
          { content: res.value, color: Colors.BRIGHT_MAGENTA },
          { content: " built successfully!", color: Colors.BRIGHT_WHITE },
        ];
        if (inputs.platform === Platform.VS) {
          context.logProvider?.info(builtSuccess);
        } else {
          context.userInteraction.showMessage("info", builtSuccess, false);
        }
      } else if (inputs.platform === Platform.VSCode) {
        const isWindows = process.platform === "win32";
        let builtSuccess = getLocalizedString(
          "plugins.appstudio.buildSucceedNotice.fallback",
          res.value
        );
        if (isWindows) {
          const folderLink = pathToFileURL(path.dirname(res.value));
          const appPackageLink = `${VSCodeExtensionCommand.openFolder}?%5B%22${folderLink}%22%5D`;
          builtSuccess = getLocalizedString("plugins.appstudio.buildSucceedNotice", appPackageLink);
        }
        context.userInteraction.showMessage("info", builtSuccess, false);
      }
    }
    return res;
  }
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.deploy,
    }),
  ])
  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    return await updateManifest(context, inputs);
  }

  /**
   * Check if manifest templates already exist.
   */
  async preCheck(projectPath: string): Promise<string[]> {
    const existFiles = new Array<string>();
    for (const templates of ["Templates", "templates"]) {
      const appPackageDir = path.join(projectPath, templates, "appPackage");
      const manifestPath = path.resolve(appPackageDir, "manifest.template.json");
      if (await fs.pathExists(manifestPath)) {
        existFiles.push(manifestPath);
      }
      const resourcesDir = path.resolve(appPackageDir, MANIFEST_RESOURCES);
      const defaultColorPath = path.join(resourcesDir, DEFAULT_COLOR_PNG_FILENAME);
      if (await fs.pathExists(defaultColorPath)) {
        existFiles.push(defaultColorPath);
      }
      const defaultOutlinePath = path.join(resourcesDir, DEFAULT_OUTLINE_PNG_FILENAME);
      if (await fs.pathExists(defaultOutlinePath)) {
        existFiles.push(defaultOutlinePath);
      }
    }
    return existFiles;
  }
  private async getTeamsAppId(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3
  ): Promise<string> {
    let teamsAppId = "";
    // User may manually update id in manifest template file, rather than configuration file
    // The id in manifest template file should override configurations
    const manifestResult = await getManifest(inputs.projectPath, envInfo);
    if (manifestResult.isOk()) {
      teamsAppId = manifestResult.value.id;
    }
    if (!isUUID(teamsAppId)) {
      teamsAppId = (envInfo.state[ComponentNames.AppManifest] as v3.TeamsAppResource).teamsAppId;
    }
    return teamsAppId;
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.listCollaborator,
      errorSource: "AppStudioPlugin",
    }),
  ])
  async listCollaborator(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    m365TokenProvider: M365TokenProvider
  ): Promise<Result<TeamsAppAdmin[], FxError>> {
    try {
      const teamsAppId = await this.getTeamsAppId(ctx, inputs, envInfo);
      if (!teamsAppId) {
        return err(
          new UserError(
            Constants.PLUGIN_NAME,
            "GetConfigError",
            ErrorMessages.GetConfigError(Constants.TEAMS_APP_ID, this.name)
          )
        );
      }
      const appStudioTokenRes = await m365TokenProvider.getAccessToken({ scopes: AppStudioScopes });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
      let userLists;
      try {
        userLists = await AppStudioClient.getUserList(teamsAppId, appStudioToken as string);
        if (!userLists) {
          return ok([]);
        }
      } catch (error: any) {
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

      return ok(teamsAppAdmin);
    } catch (error: any) {
      const fxError =
        error.name && error.name >= 400 && error.name < 500
          ? AppStudioResultFactory.UserError(
              AppStudioError.ListCollaboratorFailedError.name,
              AppStudioError.ListCollaboratorFailedError.message(error)
            )
          : AppStudioResultFactory.SystemError(
              AppStudioError.ListCollaboratorFailedError.name,
              AppStudioError.ListCollaboratorFailedError.message(error)
            );

      return err(fxError);
    }
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.grantPermission,
      errorSource: "AppStudioPlugin",
    }),
  ])
  public async grantPermission(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    m365TokenProvider: M365TokenProvider,
    userInfo: AppUser
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      const appStudioTokenRes = await m365TokenProvider.getAccessToken({ scopes: AppStudioScopes });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      const teamsAppId = await this.getTeamsAppId(ctx, inputs, envInfo);
      if (!teamsAppId) {
        const msgs = ErrorMessages.GetConfigError(Constants.TEAMS_APP_ID, this.name);
        return err(
          new UserError(
            Constants.PLUGIN_NAME,
            AppStudioError.GrantPermissionFailedError.name,
            msgs[0],
            msgs[1]
          )
        );
      }

      try {
        await AppStudioClient.grantPermission(teamsAppId, appStudioToken as string, userInfo);
      } catch (error: any) {
        const msgs = AppStudioError.GrantPermissionFailedError.message(error?.message, teamsAppId);
        return err(
          new UserError(
            Constants.PLUGIN_NAME,
            AppStudioError.GrantPermissionFailedError.name,
            msgs[0],
            msgs[1]
          )
        );
      }
      const result: ResourcePermission[] = [
        {
          name: Constants.PERMISSIONS.name,
          roles: [Constants.PERMISSIONS.admin],
          type: Constants.PERMISSIONS.type,
          resourceId: teamsAppId,
        },
      ];
      return ok(result);
    } catch (error: any) {
      const fxError =
        error.name && error.name >= 400 && error.name < 500
          ? AppStudioResultFactory.UserError(
              AppStudioError.GrantPermissionFailedError.name,
              AppStudioError.GrantPermissionFailedError.message(error.message)
            )
          : AppStudioResultFactory.SystemError(
              AppStudioError.GrantPermissionFailedError.name,
              AppStudioError.GrantPermissionFailedError.message(error.message)
            );

      return err(fxError);
    }
  }
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.checkPermission,
      errorSource: "AppStudioPlugin",
    }),
  ])
  async checkPermission(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    m365TokenProvider: M365TokenProvider,
    userInfo: AppUser
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      const appStudioTokenRes = await m365TokenProvider.getAccessToken({ scopes: AppStudioScopes });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
      const teamsAppId = await this.getTeamsAppId(ctx, inputs, envInfo);
      if (!teamsAppId) {
        return err(
          new UserError(
            Constants.PLUGIN_NAME,
            "GetConfigError",
            ErrorMessages.GetConfigError(Constants.TEAMS_APP_ID, this.name)
          )
        );
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
      return ok(result);
    } catch (error: any) {
      const fxError =
        error.name && error.name >= 400 && error.name < 500
          ? AppStudioResultFactory.UserError(
              AppStudioError.CheckPermissionFailedError.name,
              AppStudioError.CheckPermissionFailedError.message(error)
            )
          : AppStudioResultFactory.SystemError(
              AppStudioError.CheckPermissionFailedError.name,
              AppStudioError.CheckPermissionFailedError.message(error)
            );
      return err(fxError);
    }
  }
}

export async function publishQuestion(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (inputs.platform === Platform.VSCode) {
    const buildOrPublish = new QTreeNode({
      name: Constants.BUILD_OR_PUBLISH_QUESTION,
      type: "singleSelect",
      staticOptions: [manuallySubmitOption, autoPublishOption],
      title: getLocalizedString("plugins.appstudio.publishTip"),
      default: autoPublishOption.id,
    });
    return ok(buildOrPublish);
  }
  return ok(undefined);
}

export async function addCapabilities(
  inputs: InputsWithProjectPath,
  capabilities: v3.ManifestCapability[]
): Promise<Result<undefined, FxError>> {
  const appManifestRes = await readAppManifest(inputs.projectPath);
  if (appManifestRes.isErr()) return err(appManifestRes.error);
  const appManifest = appManifestRes.value;
  for (const capability of capabilities) {
    const exceedLimit = await _capabilityExceedLimit(appManifest, capability.name);
    if (exceedLimit.isErr()) {
      return err(exceedLimit.error);
    }
    if (exceedLimit.value) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.CapabilityExceedLimitError.name,
          AppStudioError.CapabilityExceedLimitError.message(capability.name)
        )
      );
    }
    let staticTabIndex = appManifest.staticTabs?.length ?? 0;
    switch (capability.name) {
      case "staticTab":
        appManifest.staticTabs = appManifest.staticTabs || [];
        if (capability.snippet) {
          appManifest.staticTabs.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            const template = cloneDeep(STATIC_TABS_TPL_EXISTING_APP[0]);
            template.entityId = "index" + staticTabIndex;
            appManifest.staticTabs.push(template);
          } else {
            const template = cloneDeep(STATIC_TABS_TPL_V3[0]);
            template.entityId = "index" + staticTabIndex;
            appManifest.staticTabs.push(template);
          }
          staticTabIndex++;
        }
        break;
      case "configurableTab":
        appManifest.configurableTabs = appManifest.configurableTabs || [];
        if (capability.snippet) {
          appManifest.configurableTabs.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            appManifest.configurableTabs = appManifest.configurableTabs.concat(
              CONFIGURABLE_TABS_TPL_EXISTING_APP
            );
          } else {
            appManifest.configurableTabs =
              appManifest.configurableTabs.concat(CONFIGURABLE_TABS_TPL_V3);
          }
        }
        break;
      case "Bot":
        appManifest.bots = appManifest.bots || [];
        if (capability.snippet) {
          appManifest.bots.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            appManifest.bots = appManifest.bots.concat(BOTS_TPL_EXISTING_APP);
          } else {
            if (appManifest.bots === undefined) {
              appManifest.bots = [];
            }

            // import CoreQuestionNames introduces dependency cycle and breaks the whole program
            // inputs[CoreQuestionNames.Features]
            const feature = inputs.features;
            if (feature === CommandAndResponseOptionItem.id) {
              // command and response bot
              appManifest.bots = appManifest.bots.concat(BOTS_TPL_FOR_COMMAND_AND_RESPONSE_V3);
            } else if (feature === NotificationOptionItem.id) {
              // notification
              appManifest.bots = appManifest.bots.concat(BOTS_TPL_FOR_NOTIFICATION_V3);
            } else {
              // legacy bot
              appManifest.bots = appManifest.bots.concat(BOTS_TPL_V3);
            }
          }
        }
        break;
      case "MessageExtension":
        appManifest.composeExtensions = appManifest.composeExtensions || [];
        if (capability.snippet) {
          appManifest.composeExtensions.push(capability.snippet);
        } else {
          if (capability.existingApp) {
            appManifest.composeExtensions = appManifest.composeExtensions.concat(
              COMPOSE_EXTENSIONS_TPL_EXISTING_APP
            );
          } else {
            appManifest.composeExtensions =
              appManifest.composeExtensions.concat(COMPOSE_EXTENSIONS_TPL_V3);
          }
        }
        break;
      case "WebApplicationInfo":
        if (capability.snippet) {
          appManifest.webApplicationInfo = capability.snippet;
        } else {
          appManifest.webApplicationInfo = WEB_APPLICATION_INFO_V3;
        }
        break;
    }
  }
  if (inputs.validDomain && !appManifest.validDomains?.includes(inputs.validDomain)) {
    appManifest.validDomains?.push(inputs.validDomain);
  }
  const writeRes = await writeAppManifest(appManifest, inputs.projectPath);
  if (writeRes.isErr()) return err(writeRes.error);
  return ok(undefined);
}

export async function updateCapability(
  projectPath: string,
  capability: v3.ManifestCapability
): Promise<Result<any, FxError>> {
  const appManifestRes = await readAppManifest(projectPath);
  if (appManifestRes.isErr()) return err(appManifestRes.error);
  const manifest = appManifestRes.value;
  switch (capability.name) {
    case "staticTab":
      // find the corresponding static Tab with entity id
      const entityId = (capability.snippet as IStaticTab).entityId;
      const index = manifest.staticTabs?.map((x) => x.entityId).indexOf(entityId);
      if (index !== undefined && index !== -1) {
        manifest.staticTabs![index] = capability.snippet!;
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.StaticTabNotExistError.name,
            AppStudioError.StaticTabNotExistError.message(entityId)
          )
        );
      }
      break;
    case "configurableTab":
      if (manifest.configurableTabs && manifest.configurableTabs.length) {
        manifest.configurableTabs[0] = capability.snippet!;
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "Bot":
      if (manifest.bots && manifest.bots.length > 0) {
        manifest.bots[0] = capability.snippet!;
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "MessageExtension":
      if (manifest.composeExtensions && manifest.composeExtensions.length > 0) {
        manifest.composeExtensions[0] = capability.snippet!;
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "WebApplicationInfo":
      manifest.webApplicationInfo = capability.snippet;
      break;
  }
  const writeRes = await writeAppManifest(manifest, projectPath);
  if (writeRes.isErr()) return err(writeRes.error);
  return ok(undefined);
}

export async function deleteCapability(
  projectPath: string,
  capability: v3.ManifestCapability
): Promise<Result<any, FxError>> {
  const appManifestRes = await readAppManifest(projectPath);
  if (appManifestRes.isErr()) return err(appManifestRes.error);
  const manifest = appManifestRes.value;
  switch (capability.name) {
    case "staticTab":
      // find the corresponding static Tab with entity id
      const entityId = (capability.snippet! as IStaticTab).entityId;
      const index = manifest.staticTabs?.map((x) => x.entityId).indexOf(entityId);
      if (index !== undefined && index !== -1) {
        manifest.staticTabs!.slice(index, 1);
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.StaticTabNotExistError.name,
            AppStudioError.StaticTabNotExistError.message(entityId)
          )
        );
      }
      break;
    case "configurableTab":
      if (manifest.configurableTabs && manifest.configurableTabs.length > 0) {
        manifest.configurableTabs = [];
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "Bot":
      if (manifest.bots && manifest.bots.length > 0) {
        manifest.bots = [];
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "MessageExtension":
      if (manifest.composeExtensions && manifest.composeExtensions.length > 0) {
        manifest.composeExtensions = [];
      } else {
        return err(
          AppStudioResultFactory.SystemError(
            AppStudioError.CapabilityNotExistError.name,
            AppStudioError.CapabilityNotExistError.message(capability.name)
          )
        );
      }
      break;
    case "WebApplicationInfo":
      manifest.webApplicationInfo = undefined;
      break;
  }
  const writeRes = await writeAppManifest(manifest, projectPath);
  if (writeRes.isErr()) return err(writeRes.error);
  return ok(undefined);
}
export async function capabilityExceedLimit(
  projectPath: string,
  capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
): Promise<Result<boolean, FxError>> {
  const manifestRes = await readAppManifest(projectPath);
  if (manifestRes.isErr()) return err(manifestRes.error);
  return _capabilityExceedLimit(manifestRes.value, capability);
}
export async function _capabilityExceedLimit(
  manifest: TeamsAppManifest,
  capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
): Promise<Result<boolean, FxError>> {
  let exceed = false;
  switch (capability) {
    case "staticTab":
      exceed =
        manifest.staticTabs !== undefined && manifest.staticTabs!.length >= STATIC_TABS_MAX_ITEMS;
      return ok(exceed);
    case "configurableTab":
      exceed = manifest.configurableTabs !== undefined && manifest.configurableTabs!.length >= 1;
      return ok(exceed);
    case "Bot":
      exceed = manifest.bots !== undefined && manifest.bots!.length >= 1;
      return ok(exceed);
    case "MessageExtension":
      exceed = manifest.composeExtensions !== undefined && manifest.composeExtensions!.length >= 1;
      return ok(exceed);
    case "WebApplicationInfo":
      return ok(false);
    default:
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.InvalidCapabilityError.name,
          AppStudioError.InvalidCapabilityError.message(capability)
        )
      );
  }
}

/**
 * Only works for manifest.template.json
 * @param projectRoot
 * @returns
 */
export async function getCapabilities(projectRoot: string): Promise<Result<string[], FxError>> {
  const manifestRes = await readAppManifest(projectRoot);
  if (manifestRes.isErr()) {
    return err(manifestRes.error);
  }
  const capabilities: string[] = [];
  if (manifestRes.value.staticTabs && manifestRes.value.staticTabs!.length > 0) {
    capabilities.push("staticTab");
  }
  if (manifestRes.value.configurableTabs && manifestRes.value.configurableTabs!.length > 0) {
    capabilities.push("configurableTab");
  }
  if (manifestRes.value.bots && manifestRes.value.bots!.length > 0) {
    capabilities.push("Bot");
  }
  if (manifestRes.value.composeExtensions) {
    capabilities.push("MessageExtension");
  }
  return ok(capabilities);
}
