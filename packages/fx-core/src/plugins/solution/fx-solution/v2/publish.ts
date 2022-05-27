import {
  err,
  FxError,
  Inputs,
  M365TokenProvider,
  ok,
  Result,
  UserError,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import { isUndefined } from "lodash";
import { Container } from "typedi";
import { PluginDisplayName } from "../../../../common/constants";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { isExistingTabApp } from "../../../../common/projectSettingsHelper";
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
  tokenProvider: M365TokenProvider
): Promise<Result<Void, FxError>> {
  const inAzureProject = isAzureProject(getAzureSolutionSettings(ctx));
  const provisioned = envInfo.state[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED];

  if (inAzureProject && !provisioned) {
    return err(
      new UserError(
        SolutionSource,
        SolutionError.CannotDeployBeforeProvision,
        getDefaultString("core.NotProvisionedNotice", ctx.projectSetting.appName),
        getLocalizedString("core.NotProvisionedNotice", ctx.projectSetting.appName)
      )
    );
  }

  const pureExistingApp = isExistingTabApp(ctx.projectSetting);
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
