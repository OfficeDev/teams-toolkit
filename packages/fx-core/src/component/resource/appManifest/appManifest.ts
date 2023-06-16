// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { hooks } from "@feathersjs/hooks/lib";
import {
  Context,
  err,
  FxError,
  InputsWithProjectPath,
  M365TokenProvider,
  ok,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import "reflect-metadata";
import { Service } from "typedi";
import isUUID from "validator/lib/isUUID";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ResourcePermission, TeamsAppAdmin } from "../../../common/permissionInterface";
import { AppStudioScopes, isV3Enabled } from "../../../common/tools";
import { AppStudioClient } from "../../driver/teamsApp/clients/appStudioClient";
import {
  Constants,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_OUTLINE_PNG_FILENAME,
  ErrorMessages,
  MANIFEST_RESOURCES,
} from "./constants";
import { AppStudioError } from "./errors";
import { AppUser } from "./interfaces/appUser";
import { AppStudioResultFactory } from "./results";
import { TelemetryEventName, TelemetryUtils } from "./utils/telemetry";
import { ComponentNames } from "../../constants";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { updateManifestV3 } from "./appStudio";
import { manifestUtils } from "./utils/ManifestUtils";

@Service("app-manifest")
export class AppManifest {
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
      telemetryEventName: TelemetryEventName.deploy,
    }),
  ])
  async deployV3(
    context: Context,
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
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "AppStudioPlugin",
      telemetryEventName: TelemetryEventName.listCollaborator,
      errorSource: "AppStudioPlugin",
    }),
  ])
  async listCollaborator(
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: any | undefined,
    m365TokenProvider: M365TokenProvider,
    teamsAppIdV3?: string
  ): Promise<Result<TeamsAppAdmin[], FxError>> {
    TelemetryUtils.init(ctx);
    try {
      const teamsAppId = teamsAppIdV3;
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
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: any | undefined,
    m365TokenProvider: M365TokenProvider,
    userInfo: AppUser,
    teamsAppIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    TelemetryUtils.init(ctx);
    try {
      const appStudioTokenRes = await m365TokenProvider.getAccessToken({ scopes: AppStudioScopes });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      const teamsAppId = teamsAppIdV3;
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
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: any | undefined,
    m365TokenProvider: M365TokenProvider,
    userInfo: AppUser,
    teamsAppIdV3?: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    TelemetryUtils.init(ctx);
    try {
      const appStudioTokenRes = await m365TokenProvider.getAccessToken({ scopes: AppStudioScopes });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
      const teamsAppId = teamsAppIdV3;
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
