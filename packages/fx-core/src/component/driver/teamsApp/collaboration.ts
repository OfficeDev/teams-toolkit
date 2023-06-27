import { Service } from "typedi";
import { hooks } from "@feathersjs/hooks/lib";
import { Context, FxError, M365TokenProvider, Result, err, ok } from "@microsoft/teamsfx-api";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { ResourcePermission, TeamsAppAdmin } from "../../../common/permissionInterface";
import { AppStudioScopes, Constants } from "./constants";
import { AppStudioClient } from "./clients/appStudioClient";
import { AppUser } from "./interfaces/appdefinitions/appUser";
import axios from "axios";
import { HttpClientError, HttpServerError, UnhandledError } from "../../../error/common";
import { TelemetryUtils } from "./utils/telemetry";

const EventName = {
  grantPermission: "grant-permission",
  listCollaborator: "list-collaborator",
  checkPermission: "check-permission",
};
const componentName = "AppStudioPlugin";

@Service("teams-collaboration")
export class TeamsCollaboration {
  private readonly tokenProvider: M365TokenProvider;

  constructor(ctx: Context, m365TokenProvider: M365TokenProvider) {
    this.tokenProvider = m365TokenProvider;
    TelemetryUtils.init(ctx);
  }

  @hooks([addStartAndEndTelemetry(EventName.grantPermission, componentName)])
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

      await AppStudioClient.grantPermission(teamsAppId, appStudioToken as string, userInfo);
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
      if (axios.isAxiosError(error)) {
        const message = JSON.stringify(error.response!.data);
        ctx.logProvider.error(message);
        if (error.response!.status >= 400 && error.response!.status < 500) {
          return err(new HttpClientError(componentName, message));
        } else {
          return err(new HttpServerError(componentName, message));
        }
      }

      const message = JSON.stringify(error);
      ctx.logProvider.error(message);
      return err(new UnhandledError(error as Error, componentName));
    }
  }

  @hooks([addStartAndEndTelemetry(EventName.listCollaborator, componentName)])
  public async listCollaborator(
    ctx: Context,
    teamsAppId: string
  ): Promise<Result<TeamsAppAdmin[], FxError>> {
    try {
      const appStudioTokenRes = await this.tokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;

      const userLists = await AppStudioClient.getUserList(teamsAppId, appStudioToken as string);
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
      if (axios.isAxiosError(error)) {
        const message = JSON.stringify(error.response!.data);
        ctx.logProvider.error(message);
        if (error.response!.status >= 400 && error.response!.status < 500) {
          return err(new HttpClientError(componentName, message));
        } else {
          return err(new HttpServerError(componentName, message));
        }
      }

      const message = JSON.stringify(error);
      ctx.logProvider.error(message);
      return err(new UnhandledError(error as Error, componentName));
    }
  }

  @hooks([addStartAndEndTelemetry(EventName.checkPermission, componentName)])
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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = JSON.stringify(error.response!.data);
        ctx.logProvider.error(message);
        if (error.response!.status >= 400 && error.response!.status < 500) {
          return err(new HttpClientError(componentName, message));
        } else {
          return err(new HttpServerError(componentName, message));
        }
      }

      const message = JSON.stringify(error);
      ctx.logProvider.error(message);
      return err(new UnhandledError(error as Error, componentName));
    }
  }
}
