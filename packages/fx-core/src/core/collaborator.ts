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
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import {
  AadOwner,
  CollaborationState,
  CollaborationStateResult,
  Collaborator,
  ListCollaboratorResult,
  TeamsAppAdmin,
} from "../common/permissionInterface";
import { getHashedEnv, getStrings } from "../common/tools";
import { AadAppForTeamsPluginV3 } from "../plugins/resource/aad/v3";
import { AppStudioPluginV3 } from "../plugins/resource/appstudio/v3";
import {
  SolutionTelemetryProperty,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../plugins/solution/fx-solution/constants";
import { CollaborationUtil } from "../plugins/solution/fx-solution/v2/collaborationUtil";
import { BuiltInFeaturePluginNames } from "../plugins/solution/fx-solution/v3/constants";
import * as util from "util";

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
  let stateResult: CollaborationStateResult = {
    state: CollaborationState.OK,
  };
  const provisioned =
    envInfo.state.solution[SOLUTION_PROVISION_SUCCEEDED] === "true" ||
    envInfo.state.solution[SOLUTION_PROVISION_SUCCEEDED] === true;
  if (!provisioned) {
    const warningMsg =
      "The resources have not been provisioned yet. Please provision the resources first.";
    stateResult = {
      state: CollaborationState.NotProvisioned,
      message: warningMsg,
    };
  } else {
    const aadAppTenantId = envInfo.state[BuiltInFeaturePluginNames.appStudio]?.tenantId;
    if (!aadAppTenantId || user.tenantId != (aadAppTenantId as string)) {
      const warningMsg =
        "Tenant id of your account and the provisioned Azure AD app does not match. Please check whether you login with wrong account.";
      stateResult = {
        state: CollaborationState.M365TenantNotMatch,
        message: warningMsg,
      };
    }
  }
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
  const appStudioRes = ok([]); //await appStudio.listCollaborator(...);
  const teamsAppOwners: TeamsAppAdmin[] = appStudioRes.isErr() ? [] : appStudioRes.value;
  const aadRes = ok([]); //awaut aadPlugin?.listCollaborator(...);
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
