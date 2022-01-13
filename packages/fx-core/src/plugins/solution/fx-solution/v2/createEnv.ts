import {
  AzureSolutionSettings,
  err,
  FxError,
  Inputs,
  ok,
  Result,
  SolutionContext,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import { CopyFileError, newEnvInfo } from "../../../../core";
import { copyParameterJson, getParameterJson } from "../arm";
import { isAzureProject } from "./utils";

export async function createEnv(ctx: v2.Context, inputs: Inputs): Promise<Result<Void, FxError>> {
  if (isAzureProject(ctx.projectSetting.solutionSettings as AzureSolutionSettings)) {
    const solutionContext: SolutionContext = {
      root: inputs.projectPath || "",
      envInfo: newEnvInfo(inputs.targetEnvName),
      projectSettings: ctx.projectSetting,
      answers: inputs,
      logProvider: ctx.logProvider,
      telemetryReporter: ctx.telemetryReporter,
      cryptoProvider: ctx.cryptoProvider,
      permissionRequestProvider: ctx.permissionRequestProvider,
      ui: ctx.userInteraction,
    };
    try {
      if (inputs.copy === true) {
        await copyParameterJson(
          inputs.projectPath!,
          ctx.projectSetting.appName,
          inputs.targetEnvName!,
          inputs.sourceEnvName!
        );
      } else {
        await getParameterJson(solutionContext);
      }
    } catch (e) {
      return err(CopyFileError(e));
    }
  }
  return ok(Void);
}
