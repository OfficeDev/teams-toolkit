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
import Container from "typedi";
import { PluginDisplayName } from "../../../../common/constants";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { isPureExistingApp } from "../../../../common/projectSettingsHelper";
import {
  GLOBAL_CONFIG,
  SolutionError,
  SolutionSource,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../constants";
import { ResourcePluginsV2 } from "../ResourcePluginContainer";
import { executeConcurrently } from "./executor";
import { getAzureSolutionSettings, getSelectedPlugins, isAzureProject } from "./utils";

export async function publishApplication(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: AppStudioTokenProvider
): Promise<Result<Void, FxError>> {
  const inAzureProject = isAzureProject(getAzureSolutionSettings(ctx));
  const provisioned = envInfo.state[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED];

  if (inAzureProject && !provisioned) {
    return err(
      returnUserError(
        new Error(getLocalizedString("core.NotProvisionedNotice", ctx.projectSetting.appName)),
        SolutionSource,
        SolutionError.CannotDeployBeforeProvision
      )
    );
  }

  const pureExistingApp = isPureExistingApp(ctx.projectSetting);
  // for minimized teamsfx project, there is only one plugin (app studio)
  const plugins = pureExistingApp
    ? [Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin)]
    : getSelectedPlugins(ctx.projectSetting);
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

  ctx.logProvider.info(getLocalizedString("core.publish.startNotice", PluginDisplayName.Solution));

  const result = await executeConcurrently(thunks, ctx.logProvider);

  if (result.kind !== "success") {
    const msg = getLocalizedString("core.publish.failNotice", ctx.projectSetting.appName);
    ctx.logProvider?.info(msg);
    return err(result.error);
  }
  return ok(Void);
}
