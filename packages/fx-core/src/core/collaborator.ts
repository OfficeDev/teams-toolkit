// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  TokenProvider,
  v2,
  err,
  v3,
  Platform,
  Colors,
  Json,
  UserError,
  Inputs,
  DynamicPlatforms,
  QTreeNode,
  ContextV3,
  M365TokenProvider,
  SystemError,
  MultiSelectQuestion,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import {
  AadOwner,
  AppIds,
  CollaborationState,
  CollaborationStateResult,
  ListCollaboratorResult,
  PermissionsResult,
  ResourcePermission,
} from "../common/permissionInterface";
import { AppStudioScopes, getHashedEnv, GraphScopes, isV3Enabled } from "../common/tools";
import {
  AzureRoleAssignmentsHelpLink,
  SharePointManageSiteAdminHelpLink,
  SolutionError,
  SolutionSource,
  SolutionTelemetryProperty,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../component/constants";
import { AppUser } from "../component/resource/appManifest/interfaces/appUser";
import { CoreSource } from "./error";
import { TOOLS } from "./globalVars";
import { getUserEmailQuestion } from "../component/question";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { VSCodeExtensionCommand } from "../common/constants";
import { ComponentNames } from "../component/constants";
import { hasAAD, hasAzureResourceV3, hasSPFxTab } from "../common/projectSettingsHelperV3";
import { AppManifest } from "../component/resource/appManifest/appManifest";
import axios from "axios";
import { AadApp } from "../component/resource/aadApp/aadApp";
import fs from "fs-extra";
import * as dotenv from "dotenv";
import { validate as uuidValidate } from "uuid";
import {
  CoreQuestionNames,
  selectAadAppManifestQuestion,
  selectEnvNode,
  selectTeamsAppManifestQuestion,
} from "./question";
import { envUtil } from "../component/utils/envUtil";
import { FileNotFoundError } from "../error/common";

export class CollaborationConstants {
  // Collaboartion CLI parameters
  static readonly TeamsAppId = "teamsAppId";
  static readonly AadObjectId = "aadObjectId";
  static readonly DotEnvFilePath = "dotEnvFilePath";

  // Collaboration env key
  static readonly AadObjectIdEnv = "AAD_APP_OBJECT_ID";
  static readonly TeamsAppIdEnv = "TEAMS_APP_ID";
  static readonly TeamsAppTenantIdEnv = "TEAMS_APP_TENANT_ID";

  // App Type Question
  static readonly AppType = "collaborationType";
  static readonly TeamsAppQuestionId = "teamsApp";
  static readonly AadAppQuestionId = "aadApp";

  static readonly placeholderRegex = /\$\{\{ *[a-zA-Z0-9_.-]* *\}\}/g;
}

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
          user.mail?.toLowerCase() === email.toLowerCase() ||
          user.userPrincipalName?.toLowerCase() === email.toLowerCase()
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

  static async loadDotEnvFile(
    dotEnvFilePath: string
  ): Promise<Result<{ [key: string]: string }, FxError>> {
    try {
      const result: { [key: string]: string } = {};
      if (!(await fs.pathExists(dotEnvFilePath))) {
        throw new FileNotFoundError("CollaboratorUtil", dotEnvFilePath);
      }

      const envs = dotenv.parse(await fs.readFile(dotEnvFilePath));
      const entries = Object.entries(envs);
      for (const [key, value] of entries) {
        result[key] = value;
      }
      return ok(result);
    } catch (error: any) {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.FailedToLoadDotEnvFile,
          getLocalizedString("core.collaboration.error.failedToLoadDotEnvFile", error?.message)
        )
      );
    }
  }

  // Priority parameter > dotenv > env
  static async getTeamsAppIdAndAadObjectId(
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<AppIds, FxError>> {
    let teamsAppId, aadObjectId;

    // load from parameter and dotenv only wroks for cli
    if (inputs?.platform == Platform.CLI) {
      // 1. Get from parameter
      teamsAppId = inputs?.[CollaborationConstants.TeamsAppId] ?? undefined;
      aadObjectId = inputs?.[CollaborationConstants.AadObjectId] ?? undefined;
      // Return if getting two app ids
      if (teamsAppId && aadObjectId) {
        return ok({
          teamsAppId: teamsAppId,
          aadObjectId: aadObjectId,
        });
      }

      // 2. Get from dotenv
      if (inputs?.[CollaborationConstants.DotEnvFilePath]) {
        const loadDotEnvFileResult = await this.loadDotEnvFile(
          inputs?.[CollaborationConstants.DotEnvFilePath]
        );
        if (loadDotEnvFileResult.isErr()) {
          return err(loadDotEnvFileResult.error);
        }

        const dotEnv = loadDotEnvFileResult.value;
        teamsAppId = teamsAppId ?? dotEnv[CollaborationConstants.TeamsAppIdEnv] ?? undefined;
        aadObjectId = aadObjectId ?? dotEnv[CollaborationConstants.AadObjectIdEnv] ?? undefined;
        // Return if getting two app ids
        if (teamsAppId && aadObjectId) {
          return ok({
            teamsAppId: teamsAppId,
            aadObjectId: aadObjectId,
          });
        }
      }
    }

    // 3. load from env
    const teamsAppManifestFilePath = inputs?.[CoreQuestionNames.TeamsAppManifestFilePath] as string;
    const aadAppManifestFilePath = inputs?.[CoreQuestionNames.AadAppManifestFilePath] as string;

    if (teamsAppManifestFilePath && !teamsAppId) {
      const teamsAppIdRes = await this.loadManifestId(teamsAppManifestFilePath);
      if (teamsAppIdRes.isOk()) {
        teamsAppId = await this.parseManifestId(teamsAppIdRes.value, inputs);
      } else {
        return err(teamsAppIdRes.error);
      }
    }

    if (aadAppManifestFilePath && !aadObjectId) {
      const aadObjectIdRes = await this.loadManifestId(aadAppManifestFilePath);
      if (aadObjectIdRes.isOk()) {
        aadObjectId = await this.parseManifestId(aadObjectIdRes.value, inputs);
      } else {
        return err(aadObjectIdRes.error);
      }
    }

    return ok({
      teamsAppId: teamsAppId,
      aadObjectId: aadObjectId,
    });
  }

  static async loadManifestId(manifestFilePath: string): Promise<Result<string, FxError>> {
    try {
      if (!manifestFilePath || !(await fs.pathExists(manifestFilePath))) {
        return err(new FileNotFoundError(SolutionSource, manifestFilePath));
      }

      const manifest = await fs.readJson(manifestFilePath);
      if (!manifest || !manifest.id) {
        return err(
          new UserError(
            SolutionSource,
            SolutionError.InvalidManifestError,
            getLocalizedString("error.collaboration.InvalidManifestError", manifestFilePath)
          )
        );
      }

      const id = manifest.id;
      return ok(id);
    } catch (error) {
      return err(
        new UserError(
          SolutionSource,
          SolutionError.FailedToLoadManifestFile,
          getLocalizedString("error.collaboration.FailedToLoadManifest", manifestFilePath)
        )
      );
    }
  }

  static requireEnvQuestion(appId: string): boolean {
    return !!appId.match(CollaborationConstants.placeholderRegex);
  }

  static async parseManifestId(appId: string, inputs: Inputs): Promise<string | undefined> {
    // Hardcoded id in manifest
    if (uuidValidate(appId)) {
      return appId;
    } else if (appId.match(CollaborationConstants.placeholderRegex)) {
      // Reference value in .env file
      const envName = appId
        .replace(/\$*\{+/g, "")
        .replace(/\}+/g, "")
        .trim();
      return process.env[envName] ?? undefined;
    }

    return undefined;
  }
}

export async function listCollaborator(
  ctx: ContextV3,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3 | undefined,
  tokenProvider: TokenProvider,
  telemetryProps?: Json
): Promise<Result<ListCollaboratorResult, FxError>> {
  const result = await CollaborationUtil.getCurrentUserInfo(tokenProvider.m365TokenProvider);
  if (result.isErr()) {
    return err(result.error);
  }
  const user = result.value;
  if (!isV3Enabled()) {
    const stateResult: CollaborationStateResult = getCurrentCollaborationState(envInfo!, user);
    if (stateResult.state != CollaborationState.OK) {
      if (inputs.platform === Platform.CLI && stateResult.message) {
        ctx.userInteraction.showMessage("warn", stateResult.message, false);
      } else if (inputs.platform === Platform.VSCode && stateResult.message) {
        ctx.logProvider.warning(stateResult.message);
      }
      return ok({
        state: stateResult.state,
        message: stateResult.message,
      });
    }
  }

  let appIds: AppIds;
  if (isV3Enabled()) {
    const getAppIdsResult = await CollaborationUtil.getTeamsAppIdAndAadObjectId(inputs);
    if (getAppIdsResult.isErr()) {
      return err(getAppIdsResult.error);
    }
    appIds = getAppIdsResult.value;
  }

  const hasAad = isV3Enabled() ? appIds!.aadObjectId != undefined : hasAAD(ctx.projectSetting);
  const hasTeams = isV3Enabled() ? appIds!.teamsAppId != undefined : true;
  const appStudio = Container.get<AppManifest>(ComponentNames.AppManifest);
  const aadPlugin = Container.get<AadApp>(ComponentNames.AadApp);
  const appStudioRes = hasTeams
    ? await appStudio.listCollaborator(
        ctx,
        inputs,
        envInfo,
        tokenProvider.m365TokenProvider,
        isV3Enabled() ? appIds!.teamsAppId : undefined
      )
    : ok([]);
  if (appStudioRes.isErr()) return err(appStudioRes.error);
  const teamsAppOwners = appStudioRes.value;
  const aadRes = hasAad
    ? await aadPlugin.listCollaborator(ctx, isV3Enabled() ? appIds!.aadObjectId : undefined)
    : ok([]);
  if (aadRes.isErr()) return err(aadRes.error);
  const aadOwners: AadOwner[] = aadRes.value;
  const teamsAppId: string = teamsAppOwners[0]?.resourceId ?? "";
  const aadAppId: string = aadOwners[0]?.resourceId ?? "";
  const aadAppTenantId = isV3Enabled()
    ? user.tenantId
    : envInfo!.state[ComponentNames.AppManifest]?.tenantId;

  if (inputs.platform === Platform.CLI || inputs.platform === Platform.VSCode) {
    const message = [
      {
        content: getLocalizedString("core.collaboration.ListingM365Permission"),
        color: Colors.BRIGHT_WHITE,
      },
      {
        content: getLocalizedString("core.collaboration.AccountUsedToCheck"),
        color: Colors.BRIGHT_WHITE,
      },
      { content: user.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
      { content: getLocalizedString("core.collaboration.TenantId"), color: Colors.BRIGHT_WHITE },
      { content: aadAppTenantId + "\n", color: Colors.BRIGHT_MAGENTA },
    ];

    if (hasTeams) {
      message.push(
        ...getPrintEnvMessage(
          isV3Enabled() ? inputs.env : envInfo!.envName,
          getLocalizedString("core.collaboration.StartingListAllTeamsAppOwners")
        ),
        {
          content: getLocalizedString("core.collaboration.M365TeamsAppId"),
          color: Colors.BRIGHT_WHITE,
        },
        { content: teamsAppId, color: Colors.BRIGHT_MAGENTA },
        { content: `)\n`, color: Colors.BRIGHT_WHITE }
      );

      for (const teamsAppOwner of teamsAppOwners) {
        message.push(
          {
            content: getLocalizedString("core.collaboration.TeamsAppOwner"),
            color: Colors.BRIGHT_WHITE,
          },
          { content: teamsAppOwner.userPrincipalName, color: Colors.BRIGHT_MAGENTA },
          { content: `.\n`, color: Colors.BRIGHT_WHITE }
        );
      }
    }

    if (hasAad) {
      message.push(
        ...getPrintEnvMessage(
          isV3Enabled() ? inputs.env : envInfo!.envName,
          getLocalizedString("core.collaboration.StartingListAllAadAppOwners")
        ),
        {
          content: getLocalizedString("core.collaboration.SsoAadAppId"),
          color: Colors.BRIGHT_WHITE,
        },
        { content: aadAppId, color: Colors.BRIGHT_MAGENTA },
        { content: `)\n`, color: Colors.BRIGHT_WHITE }
      );

      for (const aadOwner of aadOwners) {
        message.push(
          {
            content: getLocalizedString("core.collaboration.AadAppOwner"),
            color: Colors.BRIGHT_WHITE,
          },
          { content: aadOwner.userPrincipalName, color: Colors.BRIGHT_MAGENTA },
          { content: `.\n`, color: Colors.BRIGHT_WHITE }
        );
      }
    }

    if (inputs.platform === Platform.CLI) {
      ctx.userInteraction.showMessage("info", message, false);
    } else if (inputs.platform === Platform.VSCode) {
      ctx.userInteraction.showMessage(
        "info",
        getLocalizedString(
          "core.collaboration.ListCollaboratorsSuccess",
          VSCodeExtensionCommand.showOutputChannel
        ),
        false
      );
      ctx.logProvider.info(message);
    }
  }
  const aadOwnerCount = hasAad ? aadOwners.length : -1;
  const teamsOwnerCount = hasTeams ? teamsAppOwners.length : -1;
  if (telemetryProps) {
    telemetryProps[SolutionTelemetryProperty.Env] = isV3Enabled()
      ? inputs.env
        ? getHashedEnv(inputs.env)
        : undefined
      : getHashedEnv(envInfo!.envName);
    telemetryProps[SolutionTelemetryProperty.CollaboratorCount] = teamsOwnerCount.toString();
    telemetryProps[SolutionTelemetryProperty.AadOwnerCount] = aadOwnerCount.toString();
  }
  return ok({
    state: CollaborationState.OK,
  });
}

function getCurrentCollaborationState(
  envInfo: v3.EnvInfoV3,
  user: AppUser
): CollaborationStateResult {
  const provisioned =
    envInfo.state.solution[SOLUTION_PROVISION_SUCCEEDED] === "true" ||
    envInfo.state.solution[SOLUTION_PROVISION_SUCCEEDED] === true;
  if (!provisioned) {
    const warningMsg = getLocalizedString("core.collaboration.notProvisioned");
    return {
      state: CollaborationState.NotProvisioned,
      message: warningMsg,
    };
  }

  const aadAppTenantId = envInfo.state[ComponentNames.AppManifest]?.tenantId;
  if (!aadAppTenantId || user.tenantId != (aadAppTenantId as string)) {
    const warningMsg = getLocalizedString("core.collaboration.tenantNotMatch");
    return {
      state: CollaborationState.M365TenantNotMatch,
      message: warningMsg,
    };
  }

  return {
    state: CollaborationState.OK,
  };
}

export async function checkPermission(
  ctx: ContextV3,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3 | undefined,
  tokenProvider: TokenProvider,
  telemetryProps?: Json
): Promise<Result<PermissionsResult, FxError>> {
  const result = await CollaborationUtil.getCurrentUserInfo(tokenProvider.m365TokenProvider);
  if (result.isErr()) {
    return err(result.error);
  }

  if (!isV3Enabled()) {
    const stateResult = getCurrentCollaborationState(envInfo!, result.value);

    if (stateResult.state != CollaborationState.OK) {
      if (inputs.platform === Platform.CLI && stateResult.message) {
        ctx.userInteraction.showMessage("warn", stateResult.message, false);
      }
      return ok({
        state: stateResult.state,
        message: stateResult.message,
      });
    }
  }
  const userInfo = result.value as AppUser;

  if (inputs.platform === Platform.CLI) {
    // TODO: get tenant id from .env
    const aadAppTenantId = isV3Enabled()
      ? userInfo.tenantId
      : envInfo!.state[ComponentNames.AppManifest]?.tenantId;
    const message = [
      {
        content: getLocalizedString("core.collaboration.AccountUsedToCheck"),
        color: Colors.BRIGHT_WHITE,
      },
      { content: userInfo.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
      ...getPrintEnvMessage(
        isV3Enabled() ? inputs.env : envInfo!.envName,
        getLocalizedString("core.collaboration.StaringCheckPermission")
      ),
      { content: getLocalizedString("core.collaboration.TenantId"), color: Colors.BRIGHT_WHITE },
      { content: aadAppTenantId + "\n", color: Colors.BRIGHT_MAGENTA },
    ];
    ctx.userInteraction.showMessage("info", message, false);
  }

  let appIds: AppIds;
  if (isV3Enabled()) {
    const getAppIdsResult = await CollaborationUtil.getTeamsAppIdAndAadObjectId(inputs);
    if (getAppIdsResult.isErr()) {
      return err(getAppIdsResult.error);
    }
    appIds = getAppIdsResult.value;
  }

  const appStudio = Container.get<AppManifest>(ComponentNames.AppManifest);
  const aadPlugin = Container.get<AadApp>(ComponentNames.AadApp);

  const isTeamsActivated = isV3Enabled() ? appIds!.teamsAppId != undefined : true;
  const appStudioRes = isTeamsActivated
    ? await appStudio.checkPermission(
        ctx,
        inputs,
        envInfo,
        tokenProvider.m365TokenProvider,
        userInfo,
        isV3Enabled() ? appIds!.teamsAppId : undefined
      )
    : ok([] as ResourcePermission[]);
  if (appStudioRes.isErr()) {
    return err(appStudioRes.error);
  }
  const permissions = appStudioRes.value;
  const isAadActivated = isV3Enabled()
    ? appIds!.aadObjectId != undefined
    : hasAAD(ctx.projectSetting);
  if (isAadActivated) {
    const aadRes = await aadPlugin.checkPermission(
      ctx,
      result.value,
      isV3Enabled() ? appIds!.aadObjectId : undefined
    );
    if (aadRes.isErr()) return err(aadRes.error);
    aadRes.value.forEach((r: ResourcePermission) => {
      permissions.push(r);
    });
  }
  if (inputs.platform === Platform.CLI) {
    for (const permission of permissions) {
      const message = [
        {
          content: getLocalizedString("core.collaboration.CheckPermissionResourceId"),
          color: Colors.BRIGHT_WHITE,
        },
        {
          content: permission.resourceId ?? getLocalizedString("core.collaboration.Undefined"),
          color: Colors.BRIGHT_MAGENTA,
        },
        {
          content: getLocalizedString("core.collaboration.ResourceName"),
          color: Colors.BRIGHT_WHITE,
        },
        { content: permission.name, color: Colors.BRIGHT_MAGENTA },
        {
          content: getLocalizedString("core.collaboration.Permission"),
          color: Colors.BRIGHT_WHITE,
        },
        {
          content: permission.roles
            ? permission.roles.toString()
            : getLocalizedString("core.collaboration.Undefined") + "\n",
          color: Colors.BRIGHT_MAGENTA,
        },
      ];
      ctx.userInteraction.showMessage("info", message, false);
    }
  }
  const aadPermission = permissions.find((permission) => permission.name === "Azure AD App");
  const teamsAppPermission = permissions.find((permission) => permission.name === "Teams App");
  if (telemetryProps) {
    telemetryProps[SolutionTelemetryProperty.AadPermission] = aadPermission?.roles
      ? aadPermission.roles.join(";")
      : getLocalizedString("core.collaboration.Undefined");
    telemetryProps[SolutionTelemetryProperty.TeamsAppPermission] = teamsAppPermission?.roles
      ? teamsAppPermission.roles.join(";")
      : getLocalizedString("core.collaboration.Undefined");
  }
  return ok({
    state: CollaborationState.OK,
    permissions,
  });
}

export async function grantPermission(
  ctx: ContextV3,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3 | undefined,
  tokenProvider: TokenProvider,
  telemetryProps?: Json
): Promise<Result<PermissionsResult, FxError>> {
  const progressBar = ctx.userInteraction.createProgressBar(
    getLocalizedString("core.collaboration.GrantingPermission"),
    1
  );
  try {
    const result = await CollaborationUtil.getCurrentUserInfo(tokenProvider.m365TokenProvider);
    if (result.isErr()) {
      return err(result.error);
    }
    if (!isV3Enabled()) {
      const stateResult = getCurrentCollaborationState(envInfo!, result.value);
      if (stateResult.state != CollaborationState.OK) {
        if (inputs.platform === Platform.CLI && stateResult.message) {
          ctx.userInteraction.showMessage("warn", stateResult.message, false);
        } else if (inputs.platform === Platform.VSCode && stateResult.message) {
          ctx.logProvider.warning(stateResult.message);
        }
        return ok({
          state: stateResult.state,
          message: stateResult.message,
        });
      }
    }
    const email = inputs.email;
    if (!email || email === result.value.userPrincipalName) {
      return err(
        new UserError(
          CoreSource,
          SolutionError.EmailCannotBeEmptyOrSame,
          getDefaultString("core.collaboration.EmailCannotBeEmptyOrSame"),
          getLocalizedString("core.collaboration.EmailCannotBeEmptyOrSame")
        )
      );
    }

    const userInfo = await CollaborationUtil.getUserInfo(tokenProvider.m365TokenProvider, email);

    if (!userInfo) {
      return err(
        new UserError(
          CoreSource,
          SolutionError.CannotFindUserInCurrentTenant,
          getDefaultString("core.collaboration.CannotFindUserInCurrentTenant"),
          getLocalizedString("core.collaboration.CannotFindUserInCurrentTenant")
        )
      );
    }

    await progressBar?.start();
    await progressBar?.next(getLocalizedString("core.collaboration.GrantPermissionForUser", email));

    let appIds: AppIds;
    if (isV3Enabled()) {
      const getAppIdsResult = await CollaborationUtil.getTeamsAppIdAndAadObjectId(inputs);
      if (getAppIdsResult.isErr()) {
        return err(getAppIdsResult.error);
      }
      appIds = getAppIdsResult.value;
    }

    if (inputs.platform === Platform.CLI) {
      // TODO: get tenant id from .env
      const aadAppTenantId = isV3Enabled()
        ? result.value.tenantId
        : envInfo!.state[ComponentNames.AppManifest]?.tenantId;
      const message = [
        {
          content: getLocalizedString("core.collaboration.AccountToGrantPermission"),
          color: Colors.BRIGHT_WHITE,
        },
        { content: userInfo.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
        ...getPrintEnvMessage(
          isV3Enabled() ? inputs.env : envInfo!.envName,
          getLocalizedString("core.collaboration.StartingGrantPermission")
        ),
        { content: getLocalizedString("core.collaboration.TenantId"), color: Colors.BRIGHT_WHITE },
        { content: aadAppTenantId + "\n", color: Colors.BRIGHT_MAGENTA },
      ];

      ctx.userInteraction.showMessage("info", message, false);
    }
    const isAadActivated = isV3Enabled()
      ? appIds!.aadObjectId != undefined
      : hasAAD(ctx.projectSetting);
    const isTeamsActivated = isV3Enabled() ? appIds!.teamsAppId != undefined : true;
    const appStudio = Container.get<AppManifest>(ComponentNames.AppManifest);
    const aadPlugin = Container.get<AadApp>(ComponentNames.AadApp);
    const appStudioRes = isTeamsActivated
      ? await appStudio.grantPermission(
          ctx,
          inputs,
          envInfo,
          tokenProvider.m365TokenProvider,
          userInfo,
          isV3Enabled() ? appIds!.teamsAppId : undefined
        )
      : ok([] as ResourcePermission[]);
    if (appStudioRes.isErr()) {
      return err(appStudioRes.error);
    }
    const permissions = appStudioRes.value;
    if (isAadActivated) {
      const aadRes = await aadPlugin.grantPermission(
        ctx,
        userInfo,
        isV3Enabled() ? appIds!.aadObjectId : undefined
      );
      if (aadRes.isErr()) return err(aadRes.error);
      aadRes.value.forEach((r: ResourcePermission) => {
        permissions.push(r);
      });
    }
    if (inputs.platform === Platform.CLI) {
      for (const permission of permissions) {
        const message = [
          { content: `${permission.roles?.join(",")} `, color: Colors.BRIGHT_MAGENTA },
          {
            content: getLocalizedString("core.collaboration.PermissionHasBeenGrantTo"),
            color: Colors.BRIGHT_WHITE,
          },
          { content: permission.name, color: Colors.BRIGHT_MAGENTA },
          {
            content: getLocalizedString("core.collaboration.GrantPermissionResourceId"),
            color: Colors.BRIGHT_WHITE,
          },
          { content: `${permission.resourceId}`, color: Colors.BRIGHT_MAGENTA },
        ];
        ctx.userInteraction.showMessage("info", message, false);
      }
      // Will not show helplink for v3
      if (!isV3Enabled() && hasSPFxTab(ctx.projectSetting)) {
        ctx.userInteraction.showMessage(
          "info",
          getLocalizedString("core.collaboration.SharePointTip") +
            SharePointManageSiteAdminHelpLink,
          false
        );
      }
      // Will not show helplink for v3
      if (!isV3Enabled() && hasAzureResourceV3(ctx.projectSetting)) {
        ctx.userInteraction.showMessage(
          "info",
          getLocalizedString("core.collaboration.AzureTip") + AzureRoleAssignmentsHelpLink,
          false
        );
      }
    }
    return ok({
      state: CollaborationState.OK,
      userInfo: userInfo,
      permissions,
    });
  } finally {
    await progressBar?.end(true);
  }
}

export async function getQuestionsForGrantPermission(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  if (isDynamicQuestion) {
    const jsonObjectRes = await TOOLS.tokenProvider.m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    if (jsonObjectRes.isErr()) {
      return err(jsonObjectRes.error);
    }
    const jsonObject = jsonObjectRes.value;

    const root = await getCollaborationQuestionNode(inputs);
    root.addChild(new QTreeNode(getUserEmailQuestion((jsonObject as any).upn)));
    return ok(root);
  }
  return ok(undefined);
}

export async function getQuestionsForListCollaborator(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  if (isDynamicQuestion) {
    const root = await getCollaborationQuestionNode(inputs);
    return ok(root);
  }
  return ok(undefined);
}

function getPrintEnvMessage(env: string | undefined, message: string) {
  return env
    ? [
        {
          content: message,
          color: Colors.BRIGHT_WHITE,
        },
        { content: `${env}\n`, color: Colors.BRIGHT_MAGENTA },
      ]
    : [];
}

function selectAppTypeQuestion(): MultiSelectQuestion {
  return {
    name: CollaborationConstants.AppType,
    title: getLocalizedString("core.selectCollaborationAppTypeQuestion.title"),
    type: "multiSelect",
    staticOptions: [
      {
        id: CollaborationConstants.AadAppQuestionId,
        label: getLocalizedString("core.aadAppQuestion.label"),
        description: getLocalizedString("core.aadAppQuestion.description"),
      },
      {
        id: CollaborationConstants.TeamsAppQuestionId,
        label: getLocalizedString("core.teamsAppQuestion.label"),
        description: getLocalizedString("core.teamsAppQuestion.description"),
      },
    ],
  };
}

async function getCollaborationQuestionNode(inputs: Inputs): Promise<QTreeNode> {
  const root = new QTreeNode(selectAppTypeQuestion());

  // Teams app manifest select node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  teamsAppSelectNode.condition = { contains: CollaborationConstants.TeamsAppQuestionId };
  root.addChild(teamsAppSelectNode);

  // Aad app manifest select node
  const aadAppSelectNode = selectAadAppManifestQuestion(inputs);
  aadAppSelectNode.condition = { contains: CollaborationConstants.AadAppQuestionId };
  root.addChild(aadAppSelectNode);

  // Env select node
  const envNode = await selectEnvNode(inputs);
  if (!envNode) {
    return root;
  }
  envNode.data.name = "env";
  envNode.condition = {
    validFunc: validateEnvQuestion,
  };
  teamsAppSelectNode.addChild(envNode);
  aadAppSelectNode.addChild(envNode);

  return root;
}

export async function validateEnvQuestion(
  input: any,
  inputs?: Inputs
): Promise<string | undefined> {
  if (inputs?.env || inputs?.targetEnvName) {
    return "Env already selected";
  }

  const appType = inputs?.[CollaborationConstants.AppType] as string[];
  const requireAad = appType.includes(CollaborationConstants.AadAppQuestionId);
  const requireTeams = appType.includes(CollaborationConstants.TeamsAppQuestionId);
  const aadManifestPath = inputs?.[CoreQuestionNames.AadAppManifestFilePath];
  const teamsManifestPath = inputs?.[CoreQuestionNames.TeamsAppManifestFilePath];

  // When both is selected, only show the question once at the end
  if ((requireAad && !aadManifestPath) || (requireTeams && !teamsManifestPath)) {
    return "Question not finished";
  }

  // Only show env question when manifest id is referencing value from .env file
  let requireEnv = false;
  if (requireTeams && teamsManifestPath) {
    const teamsAppIdRes = await CollaborationUtil.loadManifestId(teamsManifestPath);
    if (teamsAppIdRes.isOk()) {
      requireEnv = CollaborationUtil.requireEnvQuestion(teamsAppIdRes.value);
      if (requireEnv) {
        return undefined;
      }
    } else {
      return "Invalid manifest";
    }
  }

  if (requireAad && aadManifestPath) {
    const aadAppIdRes = await CollaborationUtil.loadManifestId(aadManifestPath);
    if (aadAppIdRes.isOk()) {
      requireEnv = CollaborationUtil.requireEnvQuestion(aadAppIdRes.value);
      if (requireEnv) {
        return undefined;
      }
    } else {
      return "Invalid manifest";
    }
  }

  return "Env question not required";
}
