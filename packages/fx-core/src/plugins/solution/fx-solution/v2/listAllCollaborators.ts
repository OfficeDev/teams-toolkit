import {
  err,
  FxError,
  GraphTokenProvider,
  ok,
  Platform,
  Result,
  returnSystemError,
  returnUserError,
  TelemetryReporter,
  UserInteraction,
  CryptoProvider,
} from "@microsoft/teamsfx-api";
import {
  AadOwner,
  CollaborationState,
  Collaborator,
  getHashedEnv,
  ListCollaboratorResult,
  TeamsAppAdmin,
} from "../../../../common";
import { IUserList } from "../../../resource/appstudio/interfaces/IAppDefinition";
import {
  PluginNames,
  SolutionError,
  SolutionSource,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  SolutionTelemetrySuccess,
} from "../constants";
import { sendErrorTelemetryThenReturnError } from "../utils/util";
import { CollabApiParam, CollaborationUtil } from "./collaborationUtil";
import { environmentManager } from "../../../..";
import { executeListCollaboratorV1, executeListCollaboratorV2 } from "./listCollaborator";

async function listAllCollaboratorsImpl(
  param: CollabApiParam,
  projectPath: string,
  cryptoProvider: CryptoProvider,
  telemetryReporter?: TelemetryReporter,
  ui?: UserInteraction,
  graphTokenProvider?: GraphTokenProvider,
  platform?: string
): Promise<Result<Record<string, ListCollaboratorResult>, FxError>> {
  telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.ListAllCollaboratorsStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });
  const collaboratorsResult: Record<string, ListCollaboratorResult> = {};

  const envs = await environmentManager.listEnvConfigs(projectPath);
  if (envs.isErr()) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.ListAllCollaborators,
        envs.error,
        telemetryReporter
      )
    );
  }

  const result = await CollaborationUtil.getCurrentUserInfo(graphTokenProvider);
  if (result.isErr()) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.ListAllCollaborators,
        result.error,
        telemetryReporter
      )
    );
  }

  const userInfo = result.value as IUserList;
  for (const env of envs.value) {
    try {
      const envInfo = await environmentManager.loadEnvInfo(projectPath, cryptoProvider, env);
      if (envInfo.isErr()) {
        throw envInfo.error;
      }

      const stateResult = CollaborationUtil.getCurrentCollaborationState(
        envInfo.value.state,
        result.value
      );

      if (stateResult.state != CollaborationState.OK) {
        if (platform === Platform.CLI) {
          ui?.showMessage("warn", stateResult.message!, false);
        }

        collaboratorsResult[env] = {
          state: stateResult.state,
          message: stateResult.message,
        };

        continue;
      }
      const [results, errors] =
        param.apiVersion === 1
          ? await executeListCollaboratorV1(param.ctx, userInfo)
          : await executeListCollaboratorV2(
              param.ctx,
              param.inputs,
              param.envInfo,
              param.tokenProvider,
              userInfo
            );

      let errorMsg = "";
      if (errors.length > 0) {
        errorMsg += `Failed to list collaborator for the project.\n Error details: \n`;
        for (const fxError of errors) {
          errorMsg += fxError.error.message + "\n";
        }
      }

      if (errorMsg) {
        collaboratorsResult[env] = {
          state: CollaborationState.ERROR,
          error: err(
            sendErrorTelemetryThenReturnError(
              SolutionTelemetryEvent.ListAllCollaborators,
              returnUserError(
                new Error(errorMsg),
                SolutionSource,
                SolutionError.FailedToListCollaborator
              ),
              telemetryReporter
            )
          ),
        };
        continue;
      }

      const teamsAppOwners: TeamsAppAdmin[] = results[0].isErr() ? [] : results[0].value;
      const aadOwners: AadOwner[] = results[1].isErr() ? [] : results[1].value;
      const collaborators: Collaborator[] = [];

      for (const teamsAppOwner of teamsAppOwners) {
        const aadOwner = aadOwners.find(
          (owner) => owner.userObjectId === teamsAppOwner.userObjectId
        );

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

      const aadOwnerCount = collaborators.filter(
        (collaborator) => collaborator.aadResourceId && collaborator.isAadOwner
      ).length;
      telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.ListAllCollaborators, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
        [SolutionTelemetryProperty.CollaboratorCount]: collaborators.length.toString(),
        [SolutionTelemetryProperty.AadOwnerCount]: aadOwnerCount.toString(),
        [SolutionTelemetryProperty.Env]: getHashedEnv(env),
      });

      collaboratorsResult[env] = {
        collaborators: collaborators,
        state: CollaborationState.OK,
      };
    } catch (error) {
      collaboratorsResult[env] = {
        state: CollaborationState.ERROR,
        error: err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.ListAllCollaborators,
            returnUserError(error, SolutionSource, SolutionError.FailedToListCollaborator),
            telemetryReporter
          )
        ),
      };
    }
  }
  return ok(collaboratorsResult);
}

export async function listAllCollaborators(
  param: CollabApiParam
): Promise<Result<Record<string, ListCollaboratorResult>, FxError>> {
  if (param.apiVersion === 1) {
    const telemetryReporter = param.ctx.telemetryReporter;
    const ui = param.ctx.ui;
    const graphTokenProvider = param.ctx.graphTokenProvider;
    const platform = param.ctx.answers?.platform;
    const projectPath = param.ctx.root;
    if (!projectPath) {
      return err(
        returnSystemError(
          new Error(`projectPath is undefined`),
          PluginNames.SOLUTION,
          SolutionError.InternelError
        )
      );
    }
    return listAllCollaboratorsImpl(
      param,
      projectPath,
      param.ctx.cryptoProvider,
      telemetryReporter,
      ui,
      graphTokenProvider,
      platform
    );
  } else {
    const telemetryReporter = param.ctx.telemetryReporter;
    const ui = param.ctx.userInteraction;
    const graphTokenProvider = param.tokenProvider.graphTokenProvider;
    const platform = param.inputs?.platform;

    return listAllCollaboratorsImpl(
      param,
      param.inputs.projectPath,
      param.ctx.cryptoProvider,
      telemetryReporter,
      ui,
      graphTokenProvider,
      platform
    );
  }
}
