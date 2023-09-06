// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, FxError, M365TokenProvider, Result, err, ok } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { hooks } from "@feathersjs/hooks/lib";
import { AadOwner, ResourcePermission, TeamsAppAdmin } from "../../common/permissionInterface";
import { AadAppClient } from "../driver/aad/utility/aadAppClient";
import { permissionsKeys } from "../driver/aad/utility/constants";
import { addStartAndEndTelemetry } from "../driver/middleware/addStartAndEndTelemetry";
import axios from "axios";
import { HttpClientError, HttpServerError, UnhandledError } from "../../error/common";
import { TelemetryUtils } from "../driver/teamsApp/utils/telemetry";
import { AppUser } from "../driver/teamsApp/interfaces/appdefinitions/appUser";
import { AppStudioScopes, Constants } from "../driver/teamsApp/constants";
import { AppStudioClient } from "../driver/teamsApp/clients/appStudioClient";
import { AppIdNotExist } from "../../core/error";
import { ErrorContextMW } from "../../core/globalVars";

const EventName = {
  grantPermission: "grant-permission",
  listCollaborator: "list-collaborator",
  checkPermission: "check-permission",
};
const componentNameAad = "fx-resource-aad-app-for-teams";
const componentNameTeams = "AppStudioPlugin";

@Service("aad-collaboration")
export class AadCollaboration {
  private readonly aadAppClient: AadAppClient;

  constructor(m365TokenProvider: M365TokenProvider) {
    this.aadAppClient = new AadAppClient(m365TokenProvider);
  }
  @hooks([
    ErrorContextMW({ source: "Graph", component: "AadCollaboration" }),
    addStartAndEndTelemetry(EventName.grantPermission, componentNameAad),
  ])
  public async grantPermission(
    ctx: Context,
    objectId: string,
    userObjectId: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      await this.aadAppClient.addOwner(objectId, userObjectId);

      const result = [
        {
          name: permissionsKeys.name,
          type: permissionsKeys.type,
          roles: [permissionsKeys.owner],
          resourceId: objectId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx, objectId));
    }
  }
  @hooks([
    ErrorContextMW({ source: "Graph", component: "AadCollaboration" }),
    addStartAndEndTelemetry(EventName.listCollaborator, componentNameAad),
  ])
  public async listCollaborator(
    ctx: Context,
    objectId: string
  ): Promise<Result<AadOwner[], FxError>> {
    try {
      const owners = await this.aadAppClient.getOwners(objectId);
      return ok(owners ?? []);
    } catch (error) {
      return err(this.handleError(error, ctx, objectId));
    }
  }
  @hooks([
    ErrorContextMW({ source: "Graph", component: "AadCollaboration" }),
    addStartAndEndTelemetry(EventName.checkPermission, componentNameAad),
  ])
  public async checkPermission(
    ctx: Context,
    objectId: string,
    userObjectId: string
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      const owners = await this.aadAppClient.getOwners(objectId);
      const isAadOwner = owners?.find((owner: AadOwner) => owner.userObjectId === userObjectId);

      const result = [
        {
          name: permissionsKeys.name,
          type: permissionsKeys.type,
          roles: isAadOwner ? [permissionsKeys.owner] : [permissionsKeys.noPermission],
          resourceId: objectId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx, objectId));
    }
  }

  private handleError(error: any, ctx: Context, appId: string): FxError {
    if (axios.isAxiosError(error)) {
      const message = JSON.stringify(error.response!.data);
      ctx.logProvider?.error(message);
      if (error.response!.status === 404) {
        return new AppIdNotExist(appId);
      } else if (error.response!.status >= 400 && error.response!.status < 500) {
        return new HttpClientError(error, componentNameAad, message);
      } else {
        return new HttpServerError(error, componentNameAad, message);
      }
    }

    const message = JSON.stringify(error);
    ctx.logProvider?.error(message);
    return new UnhandledError(error as Error, componentNameAad);
  }
}

@Service("teams-collaboration")
export class TeamsCollaboration {
  private readonly tokenProvider: M365TokenProvider;

  constructor(ctx: Context, m365TokenProvider: M365TokenProvider) {
    this.tokenProvider = m365TokenProvider;
    TelemetryUtils.init(ctx);
  }
  @hooks([
    ErrorContextMW({ source: "Teams", component: "TeamsCollaboration" }),
    addStartAndEndTelemetry(EventName.grantPermission, componentNameTeams),
  ])
  public async grantPermission(
    ctx: Context,
    teamsAppId: string,
    userInfo: AppUser
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      const appStudioTokenRes = await this.tokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      await AppStudioClient.grantPermission(
        teamsAppId,
        appStudioToken as string,
        userInfo,
        ctx.logProvider
      );
      const result: ResourcePermission[] = [
        {
          name: Constants.PERMISSIONS.name,
          roles: [Constants.PERMISSIONS.admin],
          type: Constants.PERMISSIONS.type,
          resourceId: teamsAppId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx, teamsAppId));
    }
  }
  @hooks([
    ErrorContextMW({ source: "Teams", component: "TeamsCollaboration" }),
    addStartAndEndTelemetry(EventName.listCollaborator, componentNameTeams),
  ])
  public async listCollaborator(
    ctx: Context,
    teamsAppId: string
  ): Promise<Result<TeamsAppAdmin[], FxError>> {
    try {
      const appStudioTokenRes = await this.tokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      const userLists = await AppStudioClient.getUserList(
        teamsAppId,
        appStudioToken as string,
        ctx.logProvider
      );
      if (!userLists) {
        return ok([]);
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
    } catch (error) {
      return err(this.handleError(error, ctx, teamsAppId));
    }
  }
  @hooks([
    ErrorContextMW({ source: "Teams", component: "TeamsCollaboration" }),
    addStartAndEndTelemetry(EventName.checkPermission, componentNameTeams),
  ])
  public async checkPermission(
    ctx: Context,
    teamsAppId: string,
    userInfo: AppUser
  ): Promise<Result<ResourcePermission[], FxError>> {
    try {
      const appStudioTokenRes = await this.tokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      const teamsAppRoles = await AppStudioClient.checkPermission(
        teamsAppId,
        appStudioToken as string,
        userInfo.aadId,
        ctx.logProvider
      );

      const result: ResourcePermission[] = [
        {
          name: Constants.PERMISSIONS.name,
          roles: [teamsAppRoles],
          type: Constants.PERMISSIONS.type,
          resourceId: teamsAppId,
        },
      ];
      return ok(result);
    } catch (error) {
      return err(this.handleError(error, ctx, teamsAppId));
    }
  }

  private handleError(error: any, ctx: Context, appId: string): FxError {
    if (error.innerError) {
      const message = JSON.stringify(error.innerError.response.data);
      ctx.logProvider?.error(message);
      if (error.innerError.response.status) {
        const statusCode = error.innerError.response.status;
        if (statusCode === 404) {
          return new AppIdNotExist(appId);
        } else if (statusCode >= 400 && statusCode < 500) {
          return new HttpClientError(error, componentNameTeams, message);
        } else {
          return new HttpServerError(error, componentNameTeams, message);
        }
      }
    }

    const message = JSON.stringify(error);
    ctx.logProvider?.error(message);
    return new UnhandledError(error as Error, componentNameTeams);
  }
}
