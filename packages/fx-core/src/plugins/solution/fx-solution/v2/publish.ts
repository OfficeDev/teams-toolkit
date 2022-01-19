import {
  AppStudioTokenProvider,
  err,
  FxError,
  Inputs,
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
import {
  GLOBAL_CONFIG,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
  SolutionSource,
} from "../constants";
import { executeConcurrently } from "./executor";
import { getAzureSolutionSettings, getSelectedPlugins, isAzureProject } from "./utils";

export async function publishApplication(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: AppStudioTokenProvider
): Promise<Result<Void, FxError>> {
  const inAzureProject = isAzureProject(getAzureSolutionSettings(ctx));
  const provisioned = envInfo.state[GLOBAL_CONFIG]["output"][SOLUTION_PROVISION_SUCCEEDED];

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

  const plugins = getSelectedPlugins(ctx.projectSetting);
  const thunks = plugins
    .filter((plugin) => !isUndefined(plugin.publishApplication))
    .map((plugin) => {
      return {
        pluginName: `${plugin.name}`,
        taskName: "publishApplication",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        thunk: () => plugin.publishApplication!(ctx, inputs, envInfo, tokenProvider),
      };
    });

  ctx.logProvider.info(
    util.format(getStrings().solution.PublishStartNotice, PluginDisplayName.Solution)
  );

  const result = await executeConcurrently(thunks, ctx.logProvider);

  if (result.kind !== "success") {
    const msg = util.format(getStrings().solution.PublishFailNotice, ctx.projectSetting.appName);
    ctx.logProvider?.info(msg);
    return err(result.error);
  }
  return ok(Void);
}
