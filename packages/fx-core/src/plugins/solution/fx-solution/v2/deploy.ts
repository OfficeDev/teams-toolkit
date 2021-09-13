import {
  AzureAccountProvider,
  err,
  FxError,
  Inputs,
  Json,
  ok,
  Result,
  returnUserError,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import { isUndefined } from "lodash";
import * as util from "util";
import { PluginDisplayName } from "../../../../common/constants";
import { getStrings } from "../../../../common/tools";
import { GLOBAL_CONFIG, SolutionError, SOLUTION_PROVISION_SUCCEEDED } from "../constants";
import { AzureSolutionQuestionNames } from "../question";
import { executeConcurrently, NamedThunk } from "./executor";
import {
  combineRecords,
  extractSolutionInputs,
  getAzureSolutionSettings,
  getSelectedPlugins,
  isAzureProject,
} from "./utils";

export async function deploy(
  ctx: v2.Context,
  inputs: Inputs,
  provisionOutputs: Json,
  tokenProvider: AzureAccountProvider
): Promise<Result<Void, FxError>> {
  const inAzureProject = isAzureProject(getAzureSolutionSettings(ctx));
  const provisioned = provisionOutputs[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED] as boolean;

  if (inAzureProject && !provisioned) {
    return err(
      returnUserError(
        new Error(
          util.format(getStrings().solution.NotProvisionedNotice, ctx.projectSetting.appName)
        ),
        "Solution",
        SolutionError.CannotDeployBeforeProvision
      )
    );
  }

  const optionsToDeploy = inputs[AzureSolutionQuestionNames.PluginSelectionDeploy] as string[];
  if (optionsToDeploy === undefined || optionsToDeploy.length === 0) {
    return err(
      returnUserError(
        new Error(`No plugin selected`),
        "Solution",
        SolutionError.NoResourcePluginSelected
      )
    );
  }

  const plugins = getSelectedPlugins(getAzureSolutionSettings(ctx));
  const thunks: NamedThunk<Json>[] = plugins
    .filter((plugin) => !isUndefined(plugin.deploy) && optionsToDeploy.includes(plugin.name))
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "deploy",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () =>
          plugin.deploy!(
            ctx,
            { ...inputs, ...extractSolutionInputs(provisionOutputs[GLOBAL_CONFIG]) },
            provisionOutputs[plugin.name],
            tokenProvider
          ),
      };
    });

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

  if (result.isOk()) {
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
