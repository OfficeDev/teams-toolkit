// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { hooks } from "@feathersjs/hooks/lib";
import {
  CloudResource,
  err,
  FxError,
  M365TokenProvider,
  ok,
  Result,
  UserError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ResourcePermission, TeamsAppAdmin } from "../../../common/permissionInterface";
import { AppStudioScopes } from "../../../common/tools";
import { AppStudioClient } from "../../driver/teamsApp/clients/appStudioClient";
import { Constants, ErrorMessages } from "../../driver/teamsApp/constants";
import { AppStudioError } from "../../driver/teamsApp/errors";
import { AppUser } from "../../driver/teamsApp/interfaces/appdefinitions/appUser";
import { AppStudioResultFactory } from "../../driver/teamsApp/results";
import { TelemetryEventName, TelemetryUtils } from "../../driver/teamsApp/utils/telemetry";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";

/**
 * @deprecated Collaboration methods will be moved.
 */
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
