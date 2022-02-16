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
  AzureSolutionSettings,
  Colors,
  Json,
  UserError,
  Inputs,
  DynamicPlatforms,
  QTreeNode,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import {
  AadOwner,
  CollaborationState,
  CollaborationStateResult,
  Collaborator,
  ListCollaboratorResult,
  PermissionsResult,
  ResourcePermission,
  TeamsAppAdmin,
} from "../common/permissionInterface";
import { getHashedEnv, getStrings } from "../common/tools";
import { AadAppForTeamsPluginV3 } from "../plugins/resource/aad/v3";
import { AppStudioPluginV3 } from "../plugins/resource/appstudio/v3";
import {
  AzureRoleAssignmentsHelpLink,
  SharePointManageSiteAdminHelpLink,
  SolutionError,
  SolutionTelemetryProperty,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../plugins/solution/fx-solution/constants";
import { CollaborationUtil } from "../plugins/solution/fx-solution/v2/collaborationUtil";
import { BuiltInFeaturePluginNames } from "../plugins/solution/fx-solution/v3/constants";
import * as util from "util";
import { IUserList } from "../plugins/resource/appstudio/interfaces/IAppDefinition";
import { CoreSource } from "./error";
import { TOOLS } from ".";
import { getUserEmailQuestion } from "../plugins/solution/fx-solution/question";

export async function listCollaborator(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider,
  telemetryProps?: Json
): Promise<Result<ListCollaboratorResult, FxError>> {
  const result = await CollaborationUtil.getCurrentUserInfo(tokenProvider.graphTokenProvider);
  if (result.isErr()) {
    return err(result.error);
  }
  const user = result.value;
  const stateResult: CollaborationStateResult = getCurrentCollaborationState(envInfo, user);
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
  const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  const isAadActivated = solutionSettings?.activeResourcePlugins?.includes(
    BuiltInFeaturePluginNames.aad
  )
    ? true
    : false;
  const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
  const aadPlugin = Container.get<AadAppForTeamsPluginV3>(BuiltInFeaturePluginNames.aad);
  const appStudioRes = await appStudio.listCollaborator(
    ctx,
    inputs,
    envInfo,
    tokenProvider.appStudioToken
  );
  const teamsAppOwners: TeamsAppAdmin[] = appStudioRes.isErr() ? [] : appStudioRes.value;
  const aadRes = isAadActivated
    ? await aadPlugin.listCollaborator(ctx, envInfo, tokenProvider)
    : ok([]);
  const aadOwners: AadOwner[] = aadRes.isErr() ? [] : aadRes.value;
  const collaborators: Collaborator[] = [];
  const teamsAppId: string = teamsAppOwners[0]?.resourceId ?? "";
  const aadAppId: string = aadOwners[0]?.resourceId ?? "";
  const aadAppTenantId = envInfo.state[BuiltInFeaturePluginNames.appStudio]?.tenantId;

  for (const teamsAppOwner of teamsAppOwners) {
    const aadOwner = aadOwners.find((owner) => owner.userObjectId === teamsAppOwner.userObjectId);

    collaborators.push({
      // For guest account, aadOwner.userPrincipalName will be user's email, and is easy to read.
      userPrincipalName:
        aadOwner?.userPrincipalName ??
        teamsAppOwner.userPrincipalName ??
        teamsAppOwner.userObjectId,
      userObjectId: teamsAppOwner.userObjectId,
      isAadOwner: aadOwner ? true : false,
      aadResourceId: aadOwner ? aadOwner.resourceId : undefined,
      teamsAppResourceId: teamsAppOwner.resourceId,
    });
  }

  if (inputs.platform === Platform.CLI || inputs.platform === Platform.VSCode) {
    const message = [
      {
        content: getStrings().solution.Collaboration.ListingM365Permission,
        color: Colors.BRIGHT_WHITE,
      },
      {
        content: getStrings().solution.Collaboration.AccountUsedToCheck,
        color: Colors.BRIGHT_WHITE,
      },
      { content: user.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
      {
        content: getStrings().solution.Collaboration.StartingListAllTeamsAppOwners,
        color: Colors.BRIGHT_WHITE,
      },
      { content: `${envInfo.envName}\n`, color: Colors.BRIGHT_MAGENTA },
      { content: getStrings().solution.Collaboration.TenantId, color: Colors.BRIGHT_WHITE },
      { content: aadAppTenantId + "\n", color: Colors.BRIGHT_MAGENTA },
      { content: getStrings().solution.Collaboration.M365TeamsAppId, color: Colors.BRIGHT_WHITE },
      { content: teamsAppId, color: Colors.BRIGHT_MAGENTA },
    ];

    if (isAadActivated) {
      message.push(
        { content: getStrings().solution.Collaboration.SsoAadAppId, color: Colors.BRIGHT_WHITE },
        { content: aadAppId, color: Colors.BRIGHT_MAGENTA },
        { content: `)\n`, color: Colors.BRIGHT_WHITE }
      );
    } else {
      message.push({ content: ")\n", color: Colors.BRIGHT_WHITE });
    }

    for (const collaborator of collaborators) {
      message.push(
        { content: getStrings().solution.Collaboration.TeamsAppOwner, color: Colors.BRIGHT_WHITE },
        { content: collaborator.userPrincipalName, color: Colors.BRIGHT_MAGENTA },
        { content: `. `, color: Colors.BRIGHT_WHITE }
      );

      if (isAadActivated && !collaborator.isAadOwner) {
        message.push({
          content: getStrings().solution.Collaboration.NotOwnerOfSsoAadApp,
          color: Colors.BRIGHT_YELLOW,
        });
      }

      message.push({ content: "\n", color: Colors.BRIGHT_WHITE });
    }

    if (inputs.platform === Platform.CLI) {
      ctx.userInteraction.showMessage("info", message, false);
    } else if (inputs.platform === Platform.VSCode) {
      const hasSPFx = solutionSettings?.activeResourcePlugins?.includes(
        BuiltInFeaturePluginNames.aad
      )
        ? true
        : false;
      ctx.userInteraction.showMessage(
        "info",
        util.format(
          getStrings().solution.Collaboration.ListCollaboratorsSuccess,
          hasSPFx ? "" : getStrings().solution.Collaboration.WithAadApp
        ),
        false
      );
      ctx.logProvider.info(message);
    }
  }
  const aadOwnerCount = collaborators.filter(
    (collaborator) => collaborator.aadResourceId && collaborator.isAadOwner
  ).length;
  if (telemetryProps) {
    telemetryProps[SolutionTelemetryProperty.Env] = getHashedEnv(envInfo.envName);
    telemetryProps[SolutionTelemetryProperty.CollaboratorCount] = collaborators.length.toString();
    telemetryProps[SolutionTelemetryProperty.AadOwnerCount] = aadOwnerCount.toString();
  }
  return ok({
    collaborators: collaborators,
    state: CollaborationState.OK,
  });
}

function getCurrentCollaborationState(
  envInfo: v3.EnvInfoV3,
  user: IUserList
): CollaborationStateResult {
  const provisioned =
    envInfo.state.solution[SOLUTION_PROVISION_SUCCEEDED] === "true" ||
    envInfo.state.solution[SOLUTION_PROVISION_SUCCEEDED] === true;
  if (!provisioned) {
    const warningMsg =
      "The resources have not been provisioned yet. Please provision the resources first.";
    return {
      state: CollaborationState.NotProvisioned,
      message: warningMsg,
    };
  }

  const aadAppTenantId = envInfo.state[BuiltInFeaturePluginNames.appStudio]?.tenantId;
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

export async function checkPermission(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider,
  telemetryProps?: Json
): Promise<Result<PermissionsResult, FxError>> {
  const result = await CollaborationUtil.getCurrentUserInfo(tokenProvider.graphTokenProvider);
  if (result.isErr()) {
    return err(result.error);
  }
  const stateResult = getCurrentCollaborationState(envInfo, result.value);

  if (stateResult.state != CollaborationState.OK) {
    if (inputs.platform === Platform.CLI && stateResult.message) {
      ctx.userInteraction.showMessage("warn", stateResult.message, false);
    }
    return ok({
      state: stateResult.state,
      message: stateResult.message,
    });
  }
  const userInfo = result.value as IUserList;

  if (inputs.platform === Platform.CLI) {
    const aadAppTenantId = envInfo.state[BuiltInFeaturePluginNames.appStudio]?.tenantId;
    const message = [
      {
        content: getStrings().solution.Collaboration.AccountUsedToCheck,
        color: Colors.BRIGHT_WHITE,
      },
      { content: userInfo.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
      {
        content: getStrings().solution.Collaboration.StaringCheckPermission,
        color: Colors.BRIGHT_WHITE,
      },
      { content: `${inputs.envName}\n`, color: Colors.BRIGHT_MAGENTA },
      { content: getStrings().solution.Collaboration.TenantId, color: Colors.BRIGHT_WHITE },
      { content: aadAppTenantId + "\n", color: Colors.BRIGHT_MAGENTA },
    ];
    ctx.userInteraction.showMessage("info", message, false);
  }

  const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  const isAadActivated = solutionSettings?.activeResourcePlugins?.includes(
    BuiltInFeaturePluginNames.aad
  )
    ? true
    : false;
  const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
  const aadPlugin = Container.get<AadAppForTeamsPluginV3>(BuiltInFeaturePluginNames.aad);
  const appStudioRes = await appStudio.checkPermission(
    ctx,
    inputs,
    envInfo,
    tokenProvider.appStudioToken,
    userInfo
  );
  if (appStudioRes.isErr()) {
    return err(appStudioRes.error);
  }
  const permissions = appStudioRes.value;
  if (isAadActivated) {
    const aadRes = await aadPlugin.checkPermission(ctx, envInfo, tokenProvider, result.value);
    if (aadRes.isErr()) return err(aadRes.error);
    aadRes.value.forEach((r: ResourcePermission) => {
      permissions.push(r);
    });
  }
  if (inputs.platform === Platform.CLI) {
    for (const permission of permissions) {
      const message = [
        {
          content: getStrings().solution.Collaboration.CheckPermissionResourceId,
          color: Colors.BRIGHT_WHITE,
        },
        {
          content: permission.resourceId ?? getStrings().solution.Collaboration.Undefined,
          color: Colors.BRIGHT_MAGENTA,
        },
        { content: getStrings().solution.Collaboration.ResourceName, color: Colors.BRIGHT_WHITE },
        { content: permission.name, color: Colors.BRIGHT_MAGENTA },
        { content: getStrings().solution.Collaboration.Permission, color: Colors.BRIGHT_WHITE },
        {
          content: permission.roles
            ? permission.roles.toString()
            : getStrings().solution.Collaboration.Undefined + "\n",
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
      : getStrings().solution.Collaboration.Undefined;
    telemetryProps[SolutionTelemetryProperty.TeamsAppPermission] = teamsAppPermission?.roles
      ? teamsAppPermission.roles.join(";")
      : getStrings().solution.Collaboration.Undefined;
  }
  return ok({
    state: CollaborationState.OK,
    permissions,
  });
}

export async function grantPermission(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  tokenProvider: TokenProvider,
  telemetryProps?: Json
): Promise<Result<PermissionsResult, FxError>> {
  const progressBar = ctx.userInteraction.createProgressBar(
    getStrings().solution.Collaboration.GrantingPermission,
    1
  );
  try {
    const result = await CollaborationUtil.getCurrentUserInfo(tokenProvider.graphTokenProvider);
    if (result.isErr()) {
      return err(result.error);
    }
    const stateResult = getCurrentCollaborationState(envInfo, result.value);
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
    const email = inputs.email;
    if (!email || email === result.value.userPrincipalName) {
      return err(
        new UserError(
          SolutionError.EmailCannotBeEmptyOrSame,
          getStrings().solution.Collaboration.EmailCannotBeEmptyOrSame,
          CoreSource
        )
      );
    }

    const userInfo = await CollaborationUtil.getUserInfo(tokenProvider.graphTokenProvider, email);

    if (!userInfo) {
      return err(
        new UserError(
          SolutionError.CannotFindUserInCurrentTenant,
          getStrings().solution.Collaboration.CannotFindUserInCurrentTenant,
          CoreSource
        )
      );
    }

    progressBar?.start();
    progressBar?.next(getStrings().solution.Collaboration.GrantPermissionForUser + ` ${email}`);

    if (inputs.platform === Platform.CLI) {
      const aadAppTenantId = envInfo.state[BuiltInFeaturePluginNames.appStudio]?.tenantId;
      const message = [
        {
          content: getStrings().solution.Collaboration.AccountToGrantPermission,
          color: Colors.BRIGHT_WHITE,
        },
        { content: userInfo.userPrincipalName + "\n", color: Colors.BRIGHT_MAGENTA },
        {
          content: getStrings().solution.Collaboration.StartingGrantPermission,
          color: Colors.BRIGHT_WHITE,
        },
        { content: `${inputs.envName}\n`, color: Colors.BRIGHT_MAGENTA },
        { content: getStrings().solution.Collaboration.TenantId, color: Colors.BRIGHT_WHITE },
        { content: aadAppTenantId + "\n", color: Colors.BRIGHT_MAGENTA },
      ];

      ctx.userInteraction.showMessage("info", message, false);
    }
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    const isAadActivated = solutionSettings?.activeResourcePlugins?.includes(
      BuiltInFeaturePluginNames.aad
    )
      ? true
      : false;
    const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    const aadPlugin = Container.get<AadAppForTeamsPluginV3>(BuiltInFeaturePluginNames.aad);
    const appStudioRes = await appStudio.grantPermission(
      ctx,
      inputs,
      envInfo,
      tokenProvider.appStudioToken,
      userInfo
    );
    if (appStudioRes.isErr()) {
      return err(appStudioRes.error);
    }
    const permissions = appStudioRes.value;
    if (isAadActivated) {
      const aadRes = await aadPlugin.grantPermission(ctx, envInfo, tokenProvider, result.value);
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
            content: getStrings().solution.Collaboration.PermissionHasBeenGrantTo,
            color: Colors.BRIGHT_WHITE,
          },
          { content: permission.name, color: Colors.BRIGHT_MAGENTA },
          {
            content: getStrings().solution.Collaboration.GrantPermissionResourceId,
            color: Colors.BRIGHT_WHITE,
          },
          { content: `${permission.resourceId}`, color: Colors.BRIGHT_MAGENTA },
        ];

        ctx.userInteraction.showMessage("info", message, false);
      }
      const hasSPFx = solutionSettings?.activeResourcePlugins?.includes(
        BuiltInFeaturePluginNames.aad
      )
        ? true
        : false;
      if (hasSPFx) {
        ctx.userInteraction.showMessage(
          "info",
          getStrings().solution.Collaboration.SharePointTip + SharePointManageSiteAdminHelpLink,
          false
        );
      } else {
        ctx.userInteraction.showMessage(
          "info",
          getStrings().solution.Collaboration.AzureTip + AzureRoleAssignmentsHelpLink,
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
    const jsonObject = await TOOLS.tokenProvider.appStudioToken.getJsonObject();
    return ok(new QTreeNode(getUserEmailQuestion((jsonObject as any).upn)));
  }
  return ok(undefined);
}
