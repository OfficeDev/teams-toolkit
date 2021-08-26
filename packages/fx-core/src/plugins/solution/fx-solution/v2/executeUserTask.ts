import {
  v2,
  Inputs,
  FxError,
  Result,
  ok,
  err,
  returnUserError,
	Func,
  returnSystemError,
  TelemetryReporter,
  AzureSolutionSettings,
  Void,
  Platform,
  UserInteraction,
  AppStudioTokenProvider,
} from "@microsoft/teamsfx-api";
import { getStrings, isArmSupportEnabled } from "../../../../common/tools";
import { executeConcurrently, NamedThunk } from "./executor";
import {
  combineRecords,
  extractSolutionInputs,
  getAzureSolutionSettings,
  getSelectedPlugins,
  isAzureProject,
  reloadV2Plugins,
} from "./utils";
import { GLOBAL_CONFIG, SolutionError, SolutionTelemetryComponentName, SolutionTelemetryEvent, SolutionTelemetryProperty, SolutionTelemetrySuccess, SOLUTION_PROVISION_SUCCEEDED } from "../constants";
import * as util from "util";
import { AzureSolutionQuestionNames, BotOptionItem, HostTypeOptionAzure, MessageExtensionItem, TabOptionItem } from "../question";
import { cloneDeep } from "lodash";
import { PluginDisplayName } from "../../../../common/constants";
import { sendErrorTelemetryThenReturnError } from "../utils/util";
import { getAllResourcePluginMap, getAllV2ResourcePluginMap, ResourcePluginsV2 } from "../ResourcePluginContainer";
import { Container } from "typedi";
import { scaffoldByPlugins } from "./scaffolding";
import { generateResourceTemplateAdapter } from "../../../resource/utils4v2";
import { generateResourceTemplate } from "./generateResourceTemplate";

export async function executeUserTask(ctx: v2.Context, func: Func, inputs: Inputs, tokenProvider: AppStudioTokenProvider): Promise<Result<unknown, FxError>> {
    const namespace = func.namespace;
    const method = func.method;
    const array = namespace.split("/");
    if (method === "addCapability") {
      return addCapability(ctx, inputs);
    }
    if (method === "addResource") {
      return this.executeAddResource(ctx);
    }
    if (namespace.includes("solution")) {
      if (method === "registerTeamsAppAndAad") {
        const maybeParams = this.extractParamForRegisterTeamsAppAndAad(ctx.answers);
        if (maybeParams.isErr()) {
          return maybeParams;
        }
        return this.registerTeamsAppAndAad(ctx, maybeParams.value);
      } else if (method === "VSpublish") {
        // VSpublish means VS calling cli to do publish. It is different than normal cli work flow
        // It's teamsfx init followed by teamsfx  publish without running provision.
        // Using executeUserTask here could bypass the fx project check.
        if (inputs.platform !== "vs") {
          return err(
            returnSystemError(
              new Error(`VS publish is not supposed to run on platform ${inputs.platform}`),
              "Solution",
              SolutionError.UnsupportedPlatform
            )
          );
        }
        const appStudioPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
        if (appStudioPlugin.publishApplication) {
          return appStudioPlugin.publishApplication(ctx, inputs, {}, tokenProvider);
        }
      } else if (method === "validateManifest") {
        const appStudioPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
        if (appStudioPlugin.executeUserTask) {
          return appStudioPlugin.executeUserTask(ctx, func, inputs);
        }
      } else if (array.length == 2) {
        const pluginName = array[1];
        const pluginMap = getAllV2ResourcePluginMap();
        const plugin = pluginMap.get(pluginName);
        if (plugin && plugin.executeUserTask) {
          return plugin.executeUserTask(ctx, func, inputs);
        }
      }
    }

    return err(
      returnUserError(
        new Error(`executeUserTaskRouteFailed:${JSON.stringify(func)}`),
        "Solution",
        `executeUserTaskRouteFailed`
      )
    );
  }

  export function canAddCapability(settings: AzureSolutionSettings, telemetryReporter: TelemetryReporter): Result<Void, FxError> {
    if (!(settings.hostType === HostTypeOptionAzure.id)) {
      const e = returnUserError(
        new Error("Add capability is not supported for SPFx project"),
        "Solution",
        SolutionError.FailedToAddCapability
      );
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.AddCapability,
          e,
          telemetryReporter
        )
      );
    }
    return ok(Void);
  }

  export async function addCapability(ctx: v2.Context, inputs: Inputs): Promise<Result<any, FxError>> {
    ctx.telemetryReporter.sendTelemetryEvent(SolutionTelemetryEvent.AddCapabilityStart, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    });
    
    const settings = getAzureSolutionSettings(ctx);
    const originalSettings = cloneDeep(settings);
    const canProceed = canAddCapability(settings, ctx.telemetryReporter!);
    if (canProceed.isErr()) {
      return canProceed;
    }

    const capabilitiesAnswer = inputs[AzureSolutionQuestionNames.Capabilities] as string[];
    if (!capabilitiesAnswer || capabilitiesAnswer.length === 0) {
      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddCapability, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
        [SolutionTelemetryProperty.Capabilities]: [].join(";"),
      });
      return ok(Void);
    }

    if (
      (settings.capabilities?.includes(BotOptionItem.id) ||
        settings.capabilities?.includes(MessageExtensionItem.id)) &&
      (capabilitiesAnswer.includes(BotOptionItem.id) ||
        capabilitiesAnswer.includes(MessageExtensionItem.id))
    ) {
      const e = returnUserError(
        new Error("Application already contains a Bot and/or Messaging Extension"),
        "Solution",
        SolutionError.FailedToAddCapability
      );
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.AddCapability,
          e,
          ctx.telemetryReporter
        )
      );
    }
    let change = false;
    const notifications: string[] = [];
    const localDebugPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.LocalDebugPlugin);
    const appStudioPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
    const frontendPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FrontendPlugin);
    const botPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.BotPlugin);
    const pluginsToScaffold: v2.ResourcePlugin[] = [localDebugPlugin, appStudioPlugin];
    const capabilities = Array.from(settings.capabilities);
    for (const cap of capabilitiesAnswer) {
      if (!capabilities.includes(cap)) {
        capabilities.push(cap);
        change = true;
        if (cap === TabOptionItem.id) {
          notifications.push("Azure Tab Frontend");
          pluginsToScaffold.push(frontendPlugin);
        } else if (
          (cap === BotOptionItem.id || cap === MessageExtensionItem.id) &&
          !pluginsToScaffold.includes(botPlugin)
        ) {
          notifications.push("Bot/MessageExtension");
          pluginsToScaffold.push(botPlugin);
        }
      }
    }

    if (change) {
      if (isArmSupportEnabled()) {
        const confirmed = await confirmRegenerateArmTemplate(ctx.userInteraction);
        if (!confirmed) {
          return ok(Void);
        }
      }
      settings.capabilities = capabilities;
      reloadV2Plugins(settings);
      ctx.logProvider?.info(`start scaffolding ${notifications.join(",")}.....`);
      const scaffoldRes = await scaffoldCodeAndResourceTemplate(ctx, inputs, pluginsToScaffold);
      if (scaffoldRes.isErr()) {
        ctx.logProvider?.info(`failed to scaffold ${notifications.join(",")}!`);
        ctx.projectSetting.solutionSettings = originalSettings;
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.AddCapability,
            scaffoldRes.error,
            ctx.telemetryReporter
          )
        );
      }
      ctx.logProvider?.info(`finish scaffolding ${notifications.join(",")}!`);
      ctx.config.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, false);
      const msg = util.format(
        inputs.platform === Platform.CLI
          ? getStrings().solution.AddCapabilityNoticeForCli
          : getStrings().solution.AddCapabilityNotice,
        notifications.join(",")
      );
      ctx.userInteraction.showMessage("info", msg, false);

      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddCapability, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
        [SolutionTelemetryProperty.Capabilities]: capabilitiesAnswer.join(";"),
      });
      return ok({});
    }
    const cannotAddCapWarnMsg = "Add nothing";
    ctx.userInteraction.showMessage("warn", cannotAddCapWarnMsg, false);
    ctx.telemetryReporter.sendTelemetryEvent(SolutionTelemetryEvent.AddCapability, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
      [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      [SolutionTelemetryProperty.Capabilities]: [].join(";"),
    });
    return ok({});

  }

export async function confirmRegenerateArmTemplate(ui?: UserInteraction): Promise<boolean> {
  const msg: string = util.format(getStrings().solution.RegenerateArmTemplateConfirmNotice);
  const okItem = "Ok";
  const confirmRes = await ui?.showMessage("warn", msg, true, okItem);

  const confirm = confirmRes?.isOk() ? confirmRes.value : undefined;

  return confirm === okItem;
}

export async function scaffoldCodeAndResourceTemplate(ctx: v2.Context, inputs: Inputs, plugins: v2.ResourcePlugin[]): Promise<Result<unknown, FxError>> {
  const result = await scaffoldByPlugins(ctx, inputs, plugins);
  if (result.isErr()) {
    return result;
  }
  return generateResourceTemplate(ctx, inputs);
}