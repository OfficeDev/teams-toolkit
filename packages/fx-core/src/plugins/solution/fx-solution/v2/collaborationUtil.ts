// This file contains reusable pieces for collaboration apis
import {
  SolutionContext,
  v2,
  TokenProvider,
  M365TokenProvider,
  Result,
  FxError,
  ok,
  err,
  SolutionConfig,
  SolutionSettings,
  Err,
  Json,
  SystemError,
} from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2/types";
import axios from "axios";
import { isArray } from "lodash";
import {
  CollaborationState,
  CollaborationStateResult,
  GraphScopes,
  ResourcePermission,
} from "../../../../common";
import { AppUser } from "../../../resource/appstudio/interfaces/appUser";
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
    m365TokenProvider?: M365TokenProvider
  ): Promise<Result<AppUser, FxError>> {
    const user = await CollaborationUtil.getUserInfo(m365TokenProvider);

    if (!user) {
      return err(
        new SystemError(
          SolutionSource,
          SolutionError.FailedToRetrieveUserInfo,
          "Failed to retrieve current user info from graph token."
        )
      );
    }

    return ok(user);
  }

  static async getUserInfo(
    m365TokenProvider?: M365TokenProvider,
    email?: string
  ): Promise<AppUser | undefined> {
    const currentUserRes = await m365TokenProvider?.getJsonObject({ scopes: GraphScopes });
    const currentUser = currentUserRes?.isOk() ? currentUserRes.value : undefined;

    if (!currentUser) {
      return undefined;
    }

    const tenantId = currentUser["tid"] as string;
    let aadId = currentUser["oid"] as string;
    let userPrincipalName = currentUser["unique_name"] as string;
    let displayName = currentUser["name"] as string;
    const isAdministrator = true;

    if (email) {
      const graphTokenRes = await m365TokenProvider?.getAccessToken({ scopes: GraphScopes });
      const graphToken = graphTokenRes?.isOk() ? graphTokenRes.value : undefined;
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
    user: AppUser
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

  static collectPermissionsAndErrors(
    executionResult: v2.FxResult<{ name: string; result: Json }[], FxError>
  ): [ResourcePermission[], Err<any, FxError>[]] {
    const results = executionResult;
    const permissions: ResourcePermission[] = [];
    let errors: Err<any, FxError>[] = [];

    if (results.kind === "success" || results.kind === "partialSuccess") {
      for (const r of results.output) {
        if (r && r.result && isArray(r.result)) {
          for (const res of r.result) {
            permissions.push(res as ResourcePermission);
          }
        }
      }
    }
    if (results.kind === "partialSuccess" || results.kind === "failure") {
      errors = [err(results.error)];
    }

    return [permissions, errors];
  }
}
