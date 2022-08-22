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
import { AppStudioScopes } from "../../../../common";
import { PluginDisplayName } from "../../../../common/constants";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { getAzurePlugins, isVSProject } from "../../../../common/projectSettingsHelper";
import { askForDeployConsent } from "../../../../component/provision";
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
  ViewAadAppHelpLink,
} from "../constants";
import { AzureSolutionQuestionNames } from "../question";
import { sendErrorTelemetryThenReturnError } from "../utils/util";
import { executeConcurrently, NamedThunk } from "./executor";
import {
  extractSolutionInputs,
  getAzureSolutionSettings,
  getBotTroubleShootMessage,
  getSelectedPlugins,
  isAzureProject,
  isBotProject,
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

  const isDeployAADManifestFromVSCode =
    inputs[Constants.INCLUDE_AAD_MANIFEST] === "yes" && inputs.platform === Platform.VSCode;
  const provisionOutputs: Json = envInfo.state;
  const inAzureProject = isAzureProject(getAzureSolutionSettings(ctx));
  const botTroubleShootMsg = getBotTroubleShootMessage(isBotProject(getAzureSolutionSettings(ctx)));
  const provisioned =
    (provisionOutputs[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED] as boolean) ||
    isDeployAADManifestFromVSCode;

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
    const appStudioTokenJsonRes = await tokenProvider.m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    const appStudioTokenJson = appStudioTokenJsonRes.isOk()
      ? appStudioTokenJsonRes.value
      : undefined;

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
  } else if (envInfo.envName !== "local" && !isDeployAADManifestFromVSCode) {
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
    if (isDeployAADManifestFromVSCode) {
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

  const azurePlugins = getAzurePlugins(true);
  const hasAzureResource = thunks.some((thunk) => azurePlugins.includes(thunk.pluginName));

  if (isAzureProject(getAzureSolutionSettings(ctx)) && hasAzureResource) {
    const consent = await askForDeployConsent(
      ctx,
      tokenProvider.azureAccountProvider,
      envInfo as v3.EnvInfoV3
    );
    if (consent.isErr()) {
      return err(consent.error);
    }
  }

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

  if (result.kind === "success") {
    const appName = ctx.projectSetting.appName;
    if (inAzureProject) {
      let msg =
        getLocalizedString("core.deploy.successNotice", appName) +
        botTroubleShootMsg.textForLogging;

      if (isDeployAADManifestFromVSCode) {
        msg = getLocalizedString("core.deploy.aadManifestSuccessNotice");
      }
      ctx.logProvider.info(msg);
      if (botTroubleShootMsg.textForLogging && !isDeployAADManifestFromVSCode) {
        // Show a `Learn more` action button for bot trouble shooting.
        ctx.userInteraction
          .showMessage(
            "info",
            `${getLocalizedString("core.deploy.successNotice", appName)} ${
              botTroubleShootMsg.textForMsgBox
            }`,
            false,
            botTroubleShootMsg.textForActionButton
          )
          .then((result) => {
            const userSelected = result.isOk() ? result.value : undefined;
            if (userSelected === botTroubleShootMsg.textForActionButton) {
              ctx.userInteraction.openUrl(botTroubleShootMsg.troubleShootLink);
            }
          });
      } else {
        if (isDeployAADManifestFromVSCode) {
          ctx.userInteraction
            .showMessage("info", msg, false, getLocalizedString("core.deploy.aadManifestLearnMore"))
            .then((result) => {
              const userSelected = result.isOk() ? result.value : undefined;
              if (userSelected === getLocalizedString("core.deploy.aadManifestLearnMore")) {
                ctx.userInteraction?.openUrl(ViewAadAppHelpLink);
              }
            });
        } else {
          ctx.userInteraction.showMessage("info", msg, false);
        }
      }
    }
    return ok(Void);
  } else {
    const msg =
      getLocalizedString("core.deploy.failNotice", ctx.projectSetting.appName) +
      botTroubleShootMsg.textForLogging;
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
