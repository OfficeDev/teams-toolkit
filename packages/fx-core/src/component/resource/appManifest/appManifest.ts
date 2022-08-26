// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  CloudResource,
  Colors,
  err,
  FxError,
  Inputs,
  InputsWithProjectPath,
  M365TokenProvider,
  ok,
  Platform,
  ProjectSettingsV3,
  QTreeNode,
  ResourceContextV3,
  Result,
  SystemError,
  TeamsAppManifest,
  TokenProvider,
  UserError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import { pathToFileURL } from "url";
import isUUID from "validator/lib/isUUID";
import { VSCodeExtensionCommand } from "../../../common/constants";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ResourcePermission, TeamsAppAdmin } from "../../../common/permissionInterface";
import { hasTab } from "../../../common/projectSettingsHelperV3";
import { AppStudioScopes } from "../../../common/tools";
import { getProjectTemplatesFolderPath } from "../../../common/utils";
import { globalVars } from "../../../core/globalVars";
import { getTemplatesFolder } from "../../../folder";
import { AppStudioClient } from "../../../plugins/resource/appstudio/appStudio";
import {
  COLOR_TEMPLATE,
  Constants,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_DEVELOPER,
  DEFAULT_OUTLINE_PNG_FILENAME,
  ErrorMessages,
  MANIFEST_RESOURCES,
  OUTLINE_TEMPLATE,
} from "../../../plugins/resource/appstudio/constants";
import { AppStudioError } from "../../../plugins/resource/appstudio/errors";
import { AppUser } from "../../../plugins/resource/appstudio/interfaces/appUser";
import {
  autoPublishOption,
  manuallySubmitOption,
} from "../../../plugins/resource/appstudio/questions";
import { AppStudioResultFactory } from "../../../plugins/resource/appstudio/results";
import {
  TelemetryEventName,
  TelemetryPropertyKey,
} from "../../../plugins/resource/appstudio/utils/telemetry";
import { ComponentNames } from "../../constants";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import {
  buildTeamsAppPackage,
  createTeamsApp,
  getManifest,
  publishTeamsApp,
  updateManifest,
  updateTeamsApp,
  validateManifest,
} from "./appStudio";
import { TEAMS_APP_MANIFEST_TEMPLATE } from "./constants";
import { manifestUtils } from "./utils";

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
    return manifestUtils.addCapabilities(inputs, capabilities);
  }
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: "update-capability",
    }),
  ])
  async updateCapability(
    inputs: InputsWithProjectPath,
    capability: v3.ManifestCapability
  ): Promise<Result<undefined, FxError>> {
    return manifestUtils.updateCapability(inputs.projectPath, capability);
  }
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: "delete-capability",
    }),
  ])
  async deleteCapability(
    inputs: InputsWithProjectPath,
    capability: v3.ManifestCapability
  ): Promise<Result<undefined, FxError>> {
    return manifestUtils.deleteCapability(inputs.projectPath, capability);
  }
  async capabilityExceedLimit(
    inputs: InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
  ): Promise<Result<boolean, FxError>> {
    return manifestUtils.capabilityExceedLimit(inputs.projectPath, capability);
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
