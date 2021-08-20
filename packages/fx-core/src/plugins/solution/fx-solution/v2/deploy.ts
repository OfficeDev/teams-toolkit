import {
  v2,
  Inputs,
  FxError,
  Result,
  ok,
  err,
  returnUserError,
  AzureAccountProvider,
} from "@microsoft/teamsfx-api";
import { getStrings } from "../../../../common/tools";
import { executeConcurrently, NamedThunk } from "./executor";
import {
  combineRecords,
  extractSolutionInputs,
  getAzureSolutionSettings,
  getSelectedPlugins,
  isAzureProject,
} from "./utils";
import { GLOBAL_CONFIG, SolutionError, SOLUTION_PROVISION_SUCCEEDED } from "../constants";
import * as util from "util";
import { AzureSolutionQuestionNames } from "../question";
import { isUndefined } from "lodash";
import { PluginDisplayName } from "../../../../common/constants";

export async function deploy(
  ctx: v2.Context,
  inputs: Inputs,
  provisionOutput: Readonly<Record<v2.PluginName, v2.ProvisionOutput>>,
  tokenProvider: AzureAccountProvider
): Promise<Result<Record<v2.PluginName, { output: Record<string, string> }>, FxError>> {
  const inAzureProject = isAzureProject(getAzureSolutionSettings(ctx));
  const provisioned = provisionOutput[GLOBAL_CONFIG].states[
    SOLUTION_PROVISION_SUCCEEDED
  ] as boolean;

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
  const thunks: NamedThunk<{ output: Record<string, string> }>[] = plugins
    .filter((plugin) => !isUndefined(plugin.deploy) && optionsToDeploy.includes(plugin.name))
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "deploy",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () =>
          plugin.deploy!(
            ctx,
            { ...inputs, ...extractSolutionInputs(provisionOutput[GLOBAL_CONFIG].output) },
            provisionOutput[plugin.name],
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
    return ok(combineRecords(result.value));
  } else {
    const msg = util.format(getStrings().solution.DeployFailNotice, ctx.projectSetting.appName);
    ctx.logProvider.info(msg);
    return err(result.error);
  }
}
