// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceManagementClient } from "@azure/arm-resources";
import {
  AzureAccountProvider,
  err,
  FxError,
  InputsWithProjectPath,
  M365TokenProvider,
  ok,
  ResourceContextV3,
  Result,
  SubscriptionInfo,
  SystemError,
  UserError,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { assembleError } from "../error/common";
import fs from "fs-extra";
import { HelpLinks } from "../common/constants";
import { getLocalizedString } from "../common/localizeUtils";
import { TelemetryEvent, TelemetryProperty } from "../common/telemetry";
import { getHashedEnv } from "../common/tools";
import { TOOLS } from "../core/globalVars";
import {
  InvalidAzureCredentialError,
  InvalidAzureSubscriptionError,
  ResourceGroupNotExistError,
  SelectSubscriptionError,
} from "../error/azure";
import {
  M365TenantIdNotFoundInTokenError,
  M365TenantIdNotMatchError,
  M365TokenJSONNotFoundError,
} from "../error/m365";
import { SolutionError, SolutionSource, SolutionTelemetryProperty } from "./constants";
import { DriverContext } from "./driver/interface/commonArgs";
import { AppStudioScopes } from "./resource/appManifest/constants";
import { resourceGroupHelper, ResourceGroupInfo } from "./utils/ResourceGroupHelper";
export interface M365TenantRes {
  tenantIdInToken: string;
  tenantUserName: string;
}

export class ProvisionUtils {
  /**
   * make sure subscription is correct before provision for V3
   * subscriptionId is provided from .env.xxx file
   */
  async ensureSubscription(
    azureAccountProvider: AzureAccountProvider,
    givenSubscriptionId?: string
  ): Promise<Result<SubscriptionInfo, FxError>> {
    TOOLS.logProvider.info("check whether azure account is signed in.");
    // make sure the user is logged in
    await azureAccountProvider.getIdentityCredentialAsync(true);
    if (!givenSubscriptionId) {
      TOOLS.logProvider.info("subscription is not selected, try to select.");
      try {
        const subscriptionInAccount = await azureAccountProvider.getSelectedSubscription(true);
        if (!subscriptionInAccount) {
          // this case will not happen actually
          return err(new SelectSubscriptionError());
        } else {
          TOOLS.logProvider.info(
            `successful to select subscription: ${subscriptionInAccount.subscriptionId}`
          );
          return ok(subscriptionInAccount);
        }
      } catch (e) {
        return err(assembleError(e));
      }
    }

    // verify valid subscription (permission)
    TOOLS.logProvider.info("subscription is given, try to validate");
    const subscriptions = await azureAccountProvider.listSubscriptions();
    const foundSubscriptionInfo = findSubscriptionFromList(givenSubscriptionId, subscriptions);
    if (!foundSubscriptionInfo) {
      TOOLS.logProvider.info("subscription validate fail");
      return err(new InvalidAzureSubscriptionError(givenSubscriptionId));
    }
    TOOLS.logProvider.info("subscription validate success");
    return ok(foundSubscriptionInfo);
  }

  async ensureResourceGroup(
    azureAccountProvider: AzureAccountProvider,
    subscriptionId: string,
    givenResourceGroupName?: string,
    defaultResourceGroupName?: string
  ): Promise<Result<ResourceGroupInfo, FxError>> {
    const azureToken = await azureAccountProvider.getIdentityCredentialAsync();
    if (azureToken === undefined) {
      return err(new InvalidAzureCredentialError());
    }
    await azureAccountProvider.setSubscription(subscriptionId);
    const rmClient = new ResourceManagementClient(azureToken, subscriptionId);
    let resourceGroupInfo: ResourceGroupInfo;
    if (givenResourceGroupName) {
      const getResourceGroupRes = await resourceGroupHelper.getResourceGroupInfo(
        givenResourceGroupName,
        rmClient
      );
      if (getResourceGroupRes.isErr()) {
        return err(getResourceGroupRes.error);
      } else {
        if (!getResourceGroupRes.value) {
          return err(new ResourceGroupNotExistError(givenResourceGroupName, subscriptionId));
        } else {
          resourceGroupInfo = getResourceGroupRes.value;
        }
      }
    } else {
      const defaultRG = defaultResourceGroupName || "teams-app-rg";
      const rgRes = await resourceGroupHelper.askResourceGroupInfoV3(
        azureAccountProvider,
        rmClient,
        defaultRG
      );
      if (rgRes.isErr()) return err(rgRes.error);
      resourceGroupInfo = rgRes.value;
    }
    return ok(resourceGroupInfo);
  }

  async getM365TenantId(
    m365TokenProvider: M365TokenProvider
  ): Promise<Result<M365TenantRes, FxError>> {
    // Just to trigger M365 login before the concurrent execution of localDebug.
    // Because concurrent execution of localDebug may getAccessToken() concurrently, which
    // causes 2 M365 logins before the token caching in common lib takes effect.
    const appStudioTokenRes = await m365TokenProvider.getAccessToken({ scopes: AppStudioScopes });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioTokenJsonRes = await m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    const appStudioTokenJson = appStudioTokenJsonRes.isOk()
      ? appStudioTokenJsonRes.value
      : undefined;
    if (appStudioTokenJson === undefined) {
      return err(new M365TokenJSONNotFoundError());
    }
    const tenantIdInToken = (appStudioTokenJson as any).tid;
    const tenantUserName = (appStudioTokenJson as any).upn;
    if (!tenantIdInToken || !(typeof tenantIdInToken === "string")) {
      return err(new M365TenantIdNotFoundInTokenError());
    }
    return ok({ tenantIdInToken, tenantUserName });
  }
  async askForProvisionConsentV3(
    ctx: DriverContext,
    m365tenant: M365TenantRes | undefined,
    azureSubInfo: SubscriptionInfo,
    envName: string | undefined
  ): Promise<Result<undefined, FxError>> {
    const azureTokenJson = await ctx.azureAccountProvider.getJsonObject();
    const username = (azureTokenJson as any).unique_name || "";

    const azureAccountInfo = getLocalizedString("core.provision.azureAccount", username);
    const azureSubscriptionInfo = getLocalizedString(
      "core.provision.azureSubscription",
      azureSubInfo.subscriptionName
    );
    const accountsInfo = [azureAccountInfo, azureSubscriptionInfo];
    if (m365tenant) {
      const m365AccountInfo = getLocalizedString(
        "core.provision.m365Account",
        m365tenant?.tenantUserName
      );
      accountsInfo.push(m365AccountInfo);
    }

    const confirmMsg = getLocalizedString("core.provision.confirmEnvAndCostNotice", envName);
    const provisionText = getLocalizedString("core.provision.provision");

    const confirmRes = await ctx.ui?.showMessage(
      "warn",
      accountsInfo.join("\n") + "\n\n" + confirmMsg,
      true,
      provisionText
    );
    const confirm = confirmRes?.isOk() ? confirmRes.value : undefined;
    ctx.telemetryReporter?.sendTelemetryEvent(
      TelemetryEvent.ConfirmProvision,
      envName
        ? {
            [TelemetryProperty.Env]: getHashedEnv(envName),
            [SolutionTelemetryProperty.SubscriptionId]: azureSubInfo.subscriptionId,
            [SolutionTelemetryProperty.M365TenantId]: m365tenant?.tenantIdInToken ?? "",
            [SolutionTelemetryProperty.ConfirmRes]: !confirm ? "Cancel" : "Provision",
          }
        : {}
    );
    if (confirm !== provisionText) {
      return err(new UserError("coordinator", "CancelProvision", "CancelProvision"));
    }

    return ok(undefined);
  }

  async ensureM365TenantMatchesV3(
    actions: string[],
    tenantId: string | undefined,
    env: string | undefined,
    source: string
  ): Promise<Result<undefined, FxError>> {
    if (actions.length === 0 || !tenantId) {
      return ok(undefined);
    }

    const hasSwitched =
      !!process.env.TEAMS_APP_TENANT_ID && process.env.TEAMS_APP_TENANT_ID !== tenantId;
    const keysNeedToUpdate: string[] = ["TEAMS_APP_TENANT_ID"];
    if (actions.includes("aadApp/create")) {
      if (process.env.AAD_APP_CLIENT_ID) {
        keysNeedToUpdate.push("AAD_APP_CLIENT_ID");
      }
    }
    if (actions.includes("botAadApp/create") || actions.includes("botFramework/create")) {
      if (process.env.BOT_ID) {
        keysNeedToUpdate.push("BOT_ID");
      }
    }
    const error = new M365TenantIdNotMatchError(
      tenantId,
      process.env.TEAMS_APP_TENANT_ID!,
      keysNeedToUpdate.join(", ")
    );
    error.helpLink = HelpLinks.SwitchTenant;
    return !hasSwitched ? ok(undefined) : err(error);
  }
}

export function findSubscriptionFromList(
  subscriptionId: string,
  subscriptions: SubscriptionInfo[]
): SubscriptionInfo | undefined {
  return subscriptions.find((item) => item.subscriptionId === subscriptionId);
}

export async function checkWhetherLocalDebugM365TenantMatches(
  envInfo: v3.EnvInfoV3 | undefined,
  ctx: ResourceContextV3,
  isCSharpProject: boolean,
  localDebugTenantId: string | undefined,
  m365TokenProvider: M365TokenProvider,
  inputs: InputsWithProjectPath
): Promise<Result<Void, FxError>> {
  if (localDebugTenantId) {
    const projectPath = inputs.projectPath;
    const appStudioTokenJsonRes = await m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    const appStudioTokenJson = appStudioTokenJsonRes?.isOk()
      ? appStudioTokenJsonRes.value
      : undefined;
    const maybeM365TenantId = parseTeamsAppTenantId(appStudioTokenJson);
    if (maybeM365TenantId.isErr()) {
      return maybeM365TenantId;
    }

    const maybeM365UserAccount = parseUserName(appStudioTokenJson);
    if (maybeM365UserAccount.isErr()) {
      return maybeM365UserAccount;
    }

    if (maybeM365TenantId.value !== localDebugTenantId) {
      if (
        projectPath !== undefined &&
        (await fs.pathExists(`${projectPath}/bot/.notification.localstore.json`))
      ) {
        const errorMessage = getLocalizedString(
          "core.localDebug.tenantConfirmNoticeWhenAllowSwitchAccount",
          localDebugTenantId,
          maybeM365UserAccount.value,
          "bot/.notification.localstore.json"
        );
        return err(
          new UserError("Solution", SolutionError.CannotLocalDebugInDifferentTenant, errorMessage)
        );
      } else if (envInfo) {
        ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckLocalDebugTenant, {
          [TelemetryProperty.HasSwitchedM365Tenant]: "true",
          [SolutionTelemetryProperty.M365TenantId]: maybeM365TenantId.value,
          [SolutionTelemetryProperty.PreviousM365TenantId]: localDebugTenantId,
        });

        const keys = Object.keys(envInfo.state);
        for (const key of keys) {
          if (key !== "solution") {
            delete (envInfo as v3.EnvInfoV3).state[key];
          }
        }
      }
    } else {
      ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckLocalDebugTenant, {
        [TelemetryProperty.HasSwitchedM365Tenant]: "false",
        [SolutionTelemetryProperty.M365TenantId]: maybeM365TenantId.value,
        [SolutionTelemetryProperty.PreviousM365TenantId]: localDebugTenantId,
      });
    }
  }

  return ok(Void);
}

export function parseTeamsAppTenantId(
  appStudioToken?: Record<string, unknown>
): Result<string, FxError> {
  if (appStudioToken === undefined) {
    return err(
      new SystemError(
        SolutionSource,
        SolutionError.NoAppStudioToken,
        "Graph token json is undefined"
      )
    );
  }

  const teamsAppTenantId = appStudioToken["tid"];
  if (
    teamsAppTenantId === undefined ||
    !(typeof teamsAppTenantId === "string") ||
    teamsAppTenantId.length === 0
  ) {
    return err(new M365TenantIdNotFoundInTokenError());
  }
  return ok(teamsAppTenantId);
}

export function parseUserName(appStudioToken?: Record<string, unknown>): Result<string, FxError> {
  if (appStudioToken === undefined) {
    return err(
      new SystemError("Solution", SolutionError.NoAppStudioToken, "Graph token json is undefined")
    );
  }

  const userName = appStudioToken["upn"];
  if (userName === undefined || !(typeof userName === "string") || userName.length === 0) {
    return err(
      new SystemError(
        "Solution",
        SolutionError.NoUserName,
        "Cannot find user name from App Studio token."
      )
    );
  }
  return ok(userName);
}

export const provisionUtils = new ProvisionUtils();
