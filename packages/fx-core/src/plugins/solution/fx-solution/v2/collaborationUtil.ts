// This file contains reusable pieces for collaboration apis
import {
  SolutionContext,
  v2,
  TokenProvider,
  GraphTokenProvider,
  Result,
  FxError,
  ok,
  returnSystemError,
  err,
  SolutionConfig,
  SolutionSettings,
} from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2/types";
import axios from "axios";
import { CollaborationState, CollaborationStateResult } from "../../../../common";
import { IUserList } from "../../../resource/appstudio/interfaces/IAppDefinition";
import {
  GLOBAL_CONFIG,
  PluginNames,
  REMOTE_TEAMS_APP_TENANT_ID,
  SolutionError,
  SolutionSource,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../constants";

export type CollabApiParam =
  | { apiVersion: 1; ctx: SolutionContext }
  | {
      apiVersion: 2;
      ctx: v2.Context;
      inputs: v2.InputsWithProjectPath;
      envInfo: v2.DeepReadonly<v2.EnvInfoV2>;
      tokenProvider: TokenProvider;
    };

export class CollaborationUtil {
  static async getCurrentUserInfo(
    graphTokenProvider?: GraphTokenProvider
  ): Promise<Result<IUserList, FxError>> {
    const user = await CollaborationUtil.getUserInfo(graphTokenProvider);

    if (!user) {
      return err(
        returnSystemError(
          new Error("Failed to retrieve current user info from graph token."),
          SolutionSource,
          SolutionError.FailedToRetrieveUserInfo
        )
      );
    }

    return ok(user);
  }

  static async getUserInfo(
    graphTokenProvider?: GraphTokenProvider,
    email?: string
  ): Promise<IUserList | undefined> {
    const currentUser = await graphTokenProvider?.getJsonObject();

    if (!currentUser) {
      return undefined;
    }

    const tenantId = currentUser["tid"] as string;
    let aadId = currentUser["oid"] as string;
    let userPrincipalName = currentUser["unique_name"] as string;
    let displayName = currentUser["name"] as string;
    const isAdministrator = true;

    if (email) {
      const graphToken = await graphTokenProvider?.getAccessToken();
      const instance = axios.create({
        baseURL: "https://graph.microsoft.com/v1.0",
      });
      instance.defaults.headers.common["Authorization"] = `Bearer ${graphToken}`;
      const res = await instance.get(
        `/users?$filter=startsWith(mail,'${email}') or startsWith(userPrincipalName, '${email}')`
      );
      if (!res || !res.data || !res.data.value) {
        return undefined;
      }

      const collaborator = res.data.value.find(
        (user: any) =>
          user.mail.toLowerCase() === email.toLowerCase() ||
          user.userPrincipalName.toLowerCase() === email.toLowerCase()
      );

      if (!collaborator) {
        return undefined;
      }

      aadId = collaborator.id;
      userPrincipalName = collaborator.userPrincipalName;
      displayName = collaborator.displayName;
    }

    return {
      tenantId,
      aadId,
      userPrincipalName,
      displayName,
      isAdministrator,
    };
  }

  static checkWetherProvisionSucceeded(solutionConfig: SolutionConfig): boolean {
    return !!solutionConfig.get(GLOBAL_CONFIG)?.getBoolean(SOLUTION_PROVISION_SUCCEEDED);
  }

  static getCurrentCollaborationState(
    envState: Map<string, any>,
    user: IUserList
  ): CollaborationStateResult {
    const provisioned = CollaborationUtil.checkWetherProvisionSucceeded(envState);
    if (!provisioned) {
      const warningMsg =
        "The resources have not been provisioned yet. Please provision the resources first.";
      return {
        state: CollaborationState.NotProvisioned,
        message: warningMsg,
      };
    }

    const aadAppTenantId = envState.get(PluginNames.SOLUTION)?.get(REMOTE_TEAMS_APP_TENANT_ID);
    if (!aadAppTenantId || user.tenantId != (aadAppTenantId as string)) {
      const warningMsg =
        "Tenant id of your account and the provisioned Azure AD app does not match. Please check whether you logined with wrong account.";
      return {
        state: CollaborationState.M365TenantNotMatch,
        message: warningMsg,
      };
    }

    return {
      state: CollaborationState.OK,
    };
  }

  private static getProjectSettings(ctx: SolutionContext | Context): SolutionSettings | undefined {
    let solutionSettings;
    if ("projectSettings" in ctx) {
      solutionSettings = (ctx as SolutionContext).projectSettings?.solutionSettings;
    } else {
      solutionSettings = (ctx as Context).projectSetting.solutionSettings;
    }

    return solutionSettings;
  }

  static isSpfxProject(ctx: SolutionContext | Context): boolean {
    const solutionSettings = this.getProjectSettings(ctx);
    if (solutionSettings) {
      const selectedPlugins = solutionSettings.activeResourcePlugins;
      return selectedPlugins && selectedPlugins.indexOf("fx-resource-spfx") !== -1;
    }
    return false;
  }

  static AadResourcePluginsActivated(ctx: SolutionContext | Context): boolean {
    const solutionSettings = this.getProjectSettings(ctx);
    if (solutionSettings) {
      const selectedPlugins = solutionSettings.activeResourcePlugins;
      return selectedPlugins && selectedPlugins.indexOf("fx-resource-aad-app-for-teams") !== -1;
    }
    return false;
  }
}
