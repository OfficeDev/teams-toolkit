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
  v3,
} from "@microsoft/teamsfx-api";
import { isUndefined } from "lodash";
import Container from "typedi";
import { PluginDisplayName } from "../../../../common/constants";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { hasAzureResource, isVSProject } from "../../../../common/projectSettingsHelper";
import { Constants } from "../../../resource/aad/constants";
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
import { sendErrorTelemetryThenReturnError } from "../utils/util";
import { askForDeployConsent } from "../v3/provision";
import { executeConcurrently, NamedThunk } from "./executor";
import {
  extractSolutionInputs,
  getAzureSolutionSettings,
  getSelectedPlugins,
  isAzureProject,
  IsBotProject,
} from "./utils";

export async function deploy(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider
): Promise<Result<Void, FxError>> {
  ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.DeployStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    [SolutionTelemetryProperty.IncludeAadManifest]: inputs[Constants.INCLUDE_AAD_MANIFEST] ?? "no",
  });
  const provisionOutputs: Json = envInfo.state;
  const inAzureProject = isAzureProject(getAzureSolutionSettings(ctx));
  const inBotProject = IsBotProject(getAzureSolutionSettings(ctx));
  const provisioned =
    (provisionOutputs[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED] as boolean) ||
    inputs[Constants.DEPLOY_AAD_FROM_CODELENS] === "yes";

  if (inAzureProject && !provisioned) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.Deploy,
        new UserError(
          SolutionSource,
          SolutionError.CannotDeployBeforeProvision,
          getDefaultString("core.NotProvisionedNotice", ctx.projectSetting.appName),
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
            getDefaultString("core.AppStudioJsonUndefined"),
            getLocalizedString("core.AppStudioJsonUndefined")
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
    if (inputs[Constants.INCLUDE_AAD_MANIFEST] === "yes" && inputs.platform === Platform.VSCode) {
      optionsToDeploy = [PluginNames.AAD];
    }

    if (inputs[Constants.INCLUDE_AAD_MANIFEST] !== "yes" && inputs.platform === Platform.CLI) {
      optionsToDeploy = optionsToDeploy.filter((option) => option !== PluginNames.AAD);
    }

    if (optionsToDeploy === undefined || optionsToDeploy.length === 0) {
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.Deploy,
          new UserError(
            SolutionSource,
            SolutionError.NoResourcePluginSelected,
            getDefaultString("core.NoPluginSelected"),
            getLocalizedString("core.NoPluginSelected")
          ),
          ctx.telemetryReporter
        )
      );
    }
  }

  if (
    isAzureProject(getAzureSolutionSettings(ctx)) &&
    hasAzureResource(ctx.projectSetting, true) &&
    inputs[Constants.INCLUDE_AAD_MANIFEST] !== "yes"
  ) {
    const consent = await askForDeployConsent(
      ctx,
      tokenProvider.azureAccountProvider,
      envInfo as v3.EnvInfoV3
    );
    if (consent.isErr()) {
      return err(consent.error);
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
          getDefaultString("core.InvalidOption", optionsToDeploy.join(", ")),
          getLocalizedString("core.InvalidOption", optionsToDeploy.join(", "))
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

  const botTroubleShootLink =
    "https://aka.ms/teamsfx-bot-help#how-can-i-troubleshoot-issues-when-teams-bot-isnt-responding-on-azure";
  const botTroubleShootDesc = getLocalizedString("ore.deploy.botTroubleShoot");
  const botTroubleShootLearnMore = getLocalizedString("core.deploy.botTroubleShoot.learnMore");
  if (result.kind === "success") {
    if (inAzureProject) {
      let msg = getLocalizedString("core.deploy.successNotice", ctx.projectSetting.appName);
      // Append a new sentence for bot trouble shootting.
      if (inBotProject) {
        msg += ` ${botTroubleShootDesc} ${botTroubleShootLearnMore}: ${botTroubleShootLink}.`;
      }
      ctx.logProvider.info(msg);
      if (inBotProject) {
        // Show a `Learn more` action button for bot trouble shooting.
        ctx.userInteraction
          .showMessage("info", msg, false, botTroubleShootLearnMore)
          .then((result) => {
            const userSelected = result.isOk() ? result.value : undefined;
            if (userSelected === botTroubleShootLearnMore) {
              ctx.userInteraction.openUrl(botTroubleShootLink);
            }
          });
      } else {
        ctx.userInteraction.showMessage("info", msg, false);
      }
    }
    return ok(Void);
  } else {
    let msg = getLocalizedString("core.deploy.failNotice", ctx.projectSetting.appName);
    if (inBotProject) {
      msg += ` ${botTroubleShootDesc} ${botTroubleShootLearnMore}: ${botTroubleShootLink}.`;
    }
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
