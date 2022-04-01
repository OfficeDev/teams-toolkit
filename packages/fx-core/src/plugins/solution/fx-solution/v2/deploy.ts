import {
  TokenProvider,
  err,
  FxError,
  Inputs,
  Json,
  ok,
  Result,
  v2,
  Void,
  SystemError,
  UserError,
  Platform,
} from "@microsoft/teamsfx-api";
import { isUndefined } from "lodash";
import Container from "typedi";
import { PluginDisplayName } from "../../../../common/constants";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { isVSProject } from "../../../../common/projectSettingsHelper";
import { checkM365Tenant, checkSubscription } from "../commonQuestions";
import {
  GLOBAL_CONFIG,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
  SolutionSource,
  PluginNames,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  SolutionTelemetryComponentName,
} from "../constants";
import { AzureSolutionQuestionNames } from "../question";
import { ResourcePluginsV2 } from "../ResourcePluginContainer";
import { sendErrorTelemetryThenReturnError } from "../utils/util";
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
  ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.DeployStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    [SolutionTelemetryProperty.SkipAadDeploy]: inputs.skipAadDeploy ?? "yes",
  });
  const provisionOutputs: Json = envInfo.state;
  const inAzureProject = isAzureProject(getAzureSolutionSettings(ctx));
  const provisioned = provisionOutputs[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED] as boolean;

  if (inAzureProject && !provisioned) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.Deploy,
        new UserError(
          SolutionSource,
          SolutionError.CannotDeployBeforeProvision,
          getLocalizedString("core.NotProvisionedNotice", ctx.projectSetting.appName),
          getLocalizedString("core.NotProvisionedNotice", ctx.projectSetting.appName)
        ),
        ctx.telemetryReporter
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
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.Deploy,
          new SystemError(
            SolutionSource,
            SolutionError.NoAppStudioToken,
            "App Studio json is undefined"
          ),
          ctx.telemetryReporter
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
    if (inputs.skipAadDeploy === "no" && inputs.platform === Platform.VSCode) {
      optionsToDeploy = [PluginNames.AAD];
    }
    if (optionsToDeploy === undefined || optionsToDeploy.length === 0) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.Deploy,
          new UserError(
            SolutionSource,
            SolutionError.NoResourcePluginSelected,
            "No plugin selected"
          ),
          ctx.telemetryReporter
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
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.Deploy,
        new UserError(
          SolutionSource,
          SolutionError.NoResourcePluginSelected,
          `invalid options: [${optionsToDeploy.join(", ")}]`
        ),
        ctx.telemetryReporter
      )
    );
  }
  ctx.logProvider.info(
    getLocalizedString(
      "core.deploy.selectedPluginsToDeployNotice",
      PluginDisplayName.Solution,
      JSON.stringify(thunks.map((p) => p.pluginName))
    )
  );
  ctx.logProvider.info(getLocalizedString("core.deploy.startNotice", PluginDisplayName.Solution));
  const result = await executeConcurrently(thunks, ctx.logProvider);

  if (result.kind === "success") {
    if (inAzureProject) {
      const msg = getLocalizedString("core.deploy.successNotice", ctx.projectSetting.appName);
      ctx.logProvider.info(msg);
      ctx.userInteraction.showMessage("info", msg, false);
    }
    return ok(Void);
  } else {
    const msg = getLocalizedString("core.deploy.failNotice", ctx.projectSetting.appName);
    ctx.logProvider.info(msg);
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.Deploy,
        result.error,
        ctx.telemetryReporter
      )
    );
  }
}
