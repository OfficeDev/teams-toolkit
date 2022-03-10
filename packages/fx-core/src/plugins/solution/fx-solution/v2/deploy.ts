import {
  TokenProvider,
  err,
  FxError,
  Inputs,
  Json,
  ok,
  Result,
  returnUserError,
  v2,
  Void,
  returnSystemError,
  SystemError,
} from "@microsoft/teamsfx-api";
import { isUndefined } from "lodash";
import * as util from "util";
import { isVSProject } from "../../../..";
import { PluginDisplayName } from "../../../../common/constants";
import { getStrings } from "../../../../common/tools";
import { checkM365Tenant, checkSubscription } from "../commonQuestions";
import {
  GLOBAL_CONFIG,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
  SolutionSource,
} from "../constants";
import { AzureSolutionQuestionNames } from "../question";
import { executeConcurrently, NamedThunk } from "./executor";
import {
  extractSolutionInputs,
  getAzureSolutionSettings,
  getSelectedPlugins,
  isAzureProject,
} from "./utils";

export async function deploy(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider
): Promise<Result<Void, FxError>> {
  const provisionOutputs: Json = envInfo.state;
  const inAzureProject = isAzureProject(getAzureSolutionSettings(ctx));
  const provisioned = provisionOutputs[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED] as boolean;

  if (inAzureProject && !provisioned) {
    return err(
      returnUserError(
        new Error(
          util.format(getStrings().solution.NotProvisionedNotice, ctx.projectSetting.appName)
        ),
        SolutionSource,
        SolutionError.CannotDeployBeforeProvision
      )
    );
  }

  if (!inAzureProject) {
    const appStudioTokenJson = await tokenProvider.appStudioToken.getJsonObject();

    if (appStudioTokenJson) {
      const checkM365 = await checkM365Tenant({ version: 2, data: envInfo }, appStudioTokenJson);
      if (checkM365.isErr()) {
        return checkM365;
      }
    } else {
      return err(
        new SystemError(
          SolutionError.NoAppStudioToken,
          "App Studio json is undefined",
          SolutionSource
        )
      );
    }
  } else {
    const checkAzure = await checkSubscription(
      { version: 2, data: envInfo },
      tokenProvider.azureAccountProvider
    );
    if (checkAzure.isErr()) {
      return checkAzure;
    }
  }

  const isVsProject = isVSProject(ctx.projectSetting);

  let optionsToDeploy: string[] = [];
  if (!isVsProject) {
    optionsToDeploy = inputs[AzureSolutionQuestionNames.PluginSelectionDeploy] as string[];
    if (optionsToDeploy === undefined || optionsToDeploy.length === 0) {
      return err(
        returnUserError(
          new Error(`No plugin selected`),
          SolutionSource,
          SolutionError.NoResourcePluginSelected
        )
      );
    }
  }

  const plugins = getSelectedPlugins(ctx.projectSetting);
  const thunks: NamedThunk<Json>[] = plugins
    .filter(
      (plugin) =>
        !isUndefined(plugin.deploy) && (isVsProject ? true : optionsToDeploy.includes(plugin.name))
    )
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "deploy",
        thunk: () =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          plugin.deploy!(
            ctx,
            {
              ...inputs,
              ...extractSolutionInputs(provisionOutputs[GLOBAL_CONFIG]),
              projectPath: inputs.projectPath!,
            },
            envInfo,
            tokenProvider
          ),
      };
    });

  if (thunks.length === 0) {
    return err(
      returnUserError(
        new Error(`invalid options: [${optionsToDeploy.join(", ")}]`),
        SolutionSource,
        SolutionError.NoResourcePluginSelected
      )
    );
  }

  ctx.logProvider.info(
    util.format(
      getStrings().solution.SelectedPluginsToDeployNotice,
      PluginDisplayName.Solution,
      JSON.stringify(thunks.map((p) => p.pluginName))
    )
  );
  ctx.logProvider.info(
    util.format(getStrings().solution.DeployStartNotice, PluginDisplayName.Solution)
  );
  const result = await executeConcurrently(thunks, ctx.logProvider);

  if (result.kind === "success") {
    if (inAzureProject) {
      const msg = util.format(
        `Success: ${getStrings().solution.DeploySuccessNotice}`,
        ctx.projectSetting.appName
      );
      ctx.logProvider.info(msg);
      ctx.userInteraction.showMessage("info", msg, false);
    }
    return ok(Void);
  } else {
    const msg = util.format(getStrings().solution.DeployFailNotice, ctx.projectSetting.appName);
    ctx.logProvider.info(msg);
    return err(result.error);
  }
}
