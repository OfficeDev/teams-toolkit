// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  CloudResource,
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
  TokenProvider,
  UserError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import isUUID from "validator/lib/isUUID";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ResourcePermission, TeamsAppAdmin } from "../../../common/permissionInterface";
import { hasTab } from "../../../common/projectSettingsHelperV3";
import { AppStudioScopes, isV3Enabled } from "../../../common/tools";
import { getProjectTemplatesFolderPath } from "../../../common/utils";
import { getTemplatesFolder } from "../../../folder";
import { AppStudioClient } from "./appStudioClient";
import {
  COLOR_TEMPLATE,
  Constants,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_DEVELOPER,
  DEFAULT_OUTLINE_PNG_FILENAME,
  ErrorMessages,
  MANIFEST_RESOURCES,
  OUTLINE_TEMPLATE,
} from "./constants";
import { AppStudioError } from "./errors";
import { AppUser } from "./interfaces/appUser";
import { autoPublishOption, manuallySubmitOption } from "./questions";
import { AppStudioResultFactory } from "./results";
import { TelemetryEventName, TelemetryUtils } from "./utils/telemetry";
import { ComponentNames } from "../../constants";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { createTeamsApp, updateManifestV3 } from "./appStudio";
import { TEAMS_APP_MANIFEST_TEMPLATE } from "./constants";
import { manifestUtils } from "./utils/ManifestUtils";

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
    inputs: InputsWithProjectPath,
    existingApp = false
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
    capabilities: v3.ManifestCapability[],
    isM365 = false
  ): Promise<Result<undefined, FxError>> {
    return manifestUtils.addCapabilities(inputs, capabilities, isM365);
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
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.deploy,
    }),
  ])
  async deployV3(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Map<string, string>, FxError>> {
    TelemetryUtils.init(context);
    return await updateManifestV3(context, inputs);
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
    const manifestResult = await manifestUtils.getManifest(inputs.projectPath, envInfo, false);
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
    envInfo: v3.EnvInfoV3 | undefined,
    m365TokenProvider: M365TokenProvider,
    teamsAppIdV3?: string
  ): Promise<Result<TeamsAppAdmin[], FxError>> {
    TelemetryUtils.init(ctx);
    try {
      const teamsAppId = isV3Enabled()
        ? teamsAppIdV3
        : await this.getTeamsAppId(ctx, inputs, envInfo!);
      if (!teamsAppId) {
        return err(
          new UserError(
            Constants.PLUGIN_NAME,
            AppStudioError.ListCollaboratorFailedError.name,
            getLocalizedString(
              "core.collaboration.error.failedToGetTeamsAppId",
              Constants.TEAMS_APP_ID_ENV
            )
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
        if (error.message.includes(404)) {
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
    envInfo: v3.EnvInfoV3 | undefined,
    m365TokenProvider: M365TokenProvider,
    userInfo: AppUser,
    teamsAppIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    TelemetryUtils.init(ctx);
    try {
      const appStudioTokenRes = await m365TokenProvider.getAccessToken({ scopes: AppStudioScopes });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      const teamsAppId = isV3Enabled()
        ? teamsAppIdV3
        : await this.getTeamsAppId(ctx, inputs, envInfo!);
      if (!teamsAppId) {
        return err(
          new UserError(
            Constants.PLUGIN_NAME,
            AppStudioError.GrantPermissionFailedError.name,
            getLocalizedString(
              "core.collaboration.error.failedToGetTeamsAppId",
              Constants.TEAMS_APP_ID_ENV
            )
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
    envInfo: v3.EnvInfoV3 | undefined,
    m365TokenProvider: M365TokenProvider,
    userInfo: AppUser,
    teamsAppIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    TelemetryUtils.init(ctx);
    try {
      const appStudioTokenRes = await m365TokenProvider.getAccessToken({ scopes: AppStudioScopes });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
      const teamsAppId = isV3Enabled()
        ? teamsAppIdV3
        : await this.getTeamsAppId(ctx, inputs, envInfo!);
      if (!teamsAppId) {
        return err(
          new UserError(
            Constants.PLUGIN_NAME,
            AppStudioError.CheckPermissionFailedError.name,
            getLocalizedString(
              "core.collaboration.error.failedToGetTeamsAppId",
              Constants.TEAMS_APP_ID_ENV
            )
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
      staticOptions: [manuallySubmitOption(), autoPublishOption()],
      title: getLocalizedString("plugins.appstudio.publishTip"),
      default: autoPublishOption().id,
    });
    return ok(buildOrPublish);
  }
  return ok(undefined);
}
