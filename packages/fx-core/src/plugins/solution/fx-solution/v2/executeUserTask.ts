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
  SolutionSettings,
  TokenProvider,
  combine,
  Json,
  UserError,
  IStaticTab,
  IConfigurableTab,
  IBot,
  IComposeExtension,
  ProjectSettings,
} from "@microsoft/teamsfx-api";
import { getStrings } from "../../../../common/tools";
import { getAzureSolutionSettings, setActivatedResourcePluginsV2 } from "./utils";
import {
  SolutionError,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  SolutionTelemetrySuccess,
  SolutionSource,
} from "../constants";
import * as util from "util";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceKeyVault,
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  BotOptionItem,
  HostTypeOptionAzure,
  MessageExtensionItem,
  TabOptionItem,
} from "../question";
import { cloneDeep } from "lodash";
import { sendErrorTelemetryThenReturnError } from "../utils/util";
import { getAllV2ResourcePluginMap, ResourcePluginsV2 } from "../ResourcePluginContainer";
import { Container } from "typedi";
import { scaffoldByPlugins } from "./scaffolding";
import { generateResourceTemplateForPlugins } from "./generateResourceTemplate";
import { scaffoldLocalDebugSettings } from "../debug/scaffolding";
import { AppStudioPluginV3 } from "../../../resource/appstudio/v3";
import { BuiltInFeaturePluginNames } from "../v3/constants";
import { isVSProject, OperationNotSupportedForExistingAppError } from "../../../../core";
import { TeamsAppSolutionNameV2 } from "./constants";
export async function executeUserTask(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  localSettings: Json,
  envInfo: v2.EnvInfoV2,
  tokenProvider: TokenProvider
): Promise<Result<unknown, FxError>> {
  const namespace = func.namespace;
  const method = func.method;
  const array = namespace.split("/");
  if (method === "addCapability") {
    return addCapability(ctx, inputs, localSettings);
  }
  if (method === "addResource") {
    return addResource(ctx, inputs, localSettings, func, envInfo, tokenProvider);
  }
  if (namespace.includes("solution")) {
    if (method === "registerTeamsAppAndAad") {
      // not implemented for now
      return err(
        returnSystemError(
          new Error("Not implemented"),
          SolutionSource,
          SolutionError.FeatureNotSupported
        )
      );
    } else if (method === "VSpublish") {
      // VSpublish means VS calling cli to do publish. It is different than normal cli work flow
      // It's teamsfx init followed by teamsfx  publish without running provision.
      // Using executeUserTask here could bypass the fx project check.
      if (inputs.platform !== "vs") {
        return err(
          returnSystemError(
            new Error(`VS publish is not supposed to run on platform ${inputs.platform}`),
            SolutionSource,
            SolutionError.UnsupportedPlatform
          )
        );
      }
      const appStudioPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
      if (appStudioPlugin.publishApplication) {
        return appStudioPlugin.publishApplication(
          ctx,
          inputs,
          envInfo,
          tokenProvider.appStudioToken
        );
      }
    } else if (method === "validateManifest") {
      const appStudioPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
      if (appStudioPlugin.executeUserTask) {
        return await appStudioPlugin.executeUserTask(
          ctx,
          inputs,
          func,
          localSettings,
          envInfo,
          tokenProvider
        );
      }
    } else if (method === "buildPackage") {
      const appStudioPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
      if (appStudioPlugin.executeUserTask) {
        return await appStudioPlugin.executeUserTask(
          ctx,
          inputs,
          func,
          localSettings,
          envInfo,
          tokenProvider
        );
      }
    } else if (method === "validateManifest") {
      const appStudioPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
      if (appStudioPlugin.executeUserTask) {
        return appStudioPlugin.executeUserTask(
          ctx,
          inputs,
          func,
          localSettings,
          envInfo,
          tokenProvider
        );
      }
    } else if (array.length == 2) {
      const pluginName = array[1];
      const pluginMap = getAllV2ResourcePluginMap();
      const plugin = pluginMap.get(pluginName);
      if (plugin && plugin.executeUserTask) {
        return plugin.executeUserTask(ctx, inputs, func, localSettings, envInfo, tokenProvider);
      }
    }
  }

  return err(
    returnUserError(
      new Error(`executeUserTaskRouteFailed:${JSON.stringify(func)}`),
      SolutionSource,
      `executeUserTaskRouteFailed`
    )
  );
}

export function canAddCapability(
  settings: AzureSolutionSettings | undefined,
  telemetryReporter: TelemetryReporter
): Result<Void, FxError> {
  if (settings && !(settings.hostType === HostTypeOptionAzure.id)) {
    const e = new UserError(
      SolutionError.AddCapabilityNotSupport,
      getStrings().solution.addCapability.OnlySupportAzure,
      SolutionSource
    );
    return err(
      sendErrorTelemetryThenReturnError(SolutionTelemetryEvent.AddCapability, e, telemetryReporter)
    );
  }
  return ok(Void);
}

export function canAddResource(
  projectSetting: ProjectSettings,
  telemetryReporter: TelemetryReporter
): Result<Void, FxError> {
  const isVS = isVSProject(projectSetting);
  if (isVS) {
    const e = new UserError(
      SolutionError.AddResourceNotSupport,
      getStrings().solution.addResource.NotSupportForVSProject,
      SolutionSource
    );
    return err(
      sendErrorTelemetryThenReturnError(SolutionTelemetryEvent.AddResource, e, telemetryReporter)
    );
  }
  const solutionSettings = projectSetting.solutionSettings as AzureSolutionSettings;
  if (!(solutionSettings.hostType === HostTypeOptionAzure.id)) {
    const e = new UserError(
      SolutionError.AddResourceNotSupport,
      getStrings().solution.addResource.OnlySupportAzure,
      SolutionSource
    );
    return err(
      sendErrorTelemetryThenReturnError(SolutionTelemetryEvent.AddResource, e, telemetryReporter)
    );
  }
  return ok(Void);
}

export async function addCapability(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings: Json
): Promise<
  Result<{ solutionSettings?: SolutionSettings; solutionConfig?: Record<string, unknown> }, FxError>
> {
  ctx.telemetryReporter.sendTelemetryEvent(SolutionTelemetryEvent.AddCapabilityStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });

  // 1. checking addable
  let solutionSettings = getAzureSolutionSettings(ctx);
  if (!solutionSettings) {
    // pure existing app
    solutionSettings = {
      name: TeamsAppSolutionNameV2,
      version: "1.0.0",
      hostType: "Azure",
      capabilities: [],
      azureResources: [],
      activeResourcePlugins: [],
    };
    ctx.projectSetting.solutionSettings = solutionSettings;
  }
  const originalSettings = cloneDeep(solutionSettings);
  const inputsNew = {
    ...inputs,
    projectPath: inputs.projectPath!,
    existingResources: originalSettings.activeResourcePlugins,
    existingCapabilities: originalSettings.capabilities,
  };
  const canProceed = canAddCapability(solutionSettings, ctx.telemetryReporter);
  if (canProceed.isErr()) {
    return err(canProceed.error);
  }

  // 2. check answer
  const capabilitiesAnswer = inputs[AzureSolutionQuestionNames.Capabilities] as string[];
  if (!capabilitiesAnswer || capabilitiesAnswer.length === 0) {
    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddCapability, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
      [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      [SolutionTelemetryProperty.Capabilities]: [].join(";"),
    });
    return ok({});
  }

  // 3. check capability limit
  const alreadyHasTab = solutionSettings.capabilities.includes(TabOptionItem.id);
  const alreadyHasBot = solutionSettings.capabilities.includes(BotOptionItem.id);
  const alreadyHasME = solutionSettings.capabilities.includes(MessageExtensionItem.id);
  const toAddTab = capabilitiesAnswer.includes(TabOptionItem.id);
  const toAddBot = capabilitiesAnswer.includes(BotOptionItem.id);
  const toAddME = capabilitiesAnswer.includes(MessageExtensionItem.id);
  const appStudioPlugin = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
  const inputsWithProjectPath = inputs as v2.InputsWithProjectPath;
  const tabExceedRes = await appStudioPlugin.capabilityExceedLimit(
    ctx,
    inputs as v2.InputsWithProjectPath,
    "staticTab"
  );
  if (tabExceedRes.isErr()) {
    return err(tabExceedRes.error);
  }
  const isTabAddable = !tabExceedRes.value;
  const botExceedRes = await appStudioPlugin.capabilityExceedLimit(
    ctx,
    inputs as v2.InputsWithProjectPath,
    "Bot"
  );
  if (botExceedRes.isErr()) {
    return err(botExceedRes.error);
  }
  const isBotAddable = !botExceedRes.value;
  const meExceedRes = await appStudioPlugin.capabilityExceedLimit(
    ctx,
    inputs as v2.InputsWithProjectPath,
    "MessageExtension"
  );
  if (meExceedRes.isErr()) {
    return err(meExceedRes.error);
  }
  const isMEAddable = !meExceedRes.value;
  if ((toAddTab && !isTabAddable) || (toAddBot && !isBotAddable) || (toAddME && !isMEAddable)) {
    const error = new UserError(
      SolutionError.FailedToAddCapability,
      getStrings().solution.addCapability.ExceedMaxLimit,
      SolutionSource
    );
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.AddCapability,
        error,
        ctx.telemetryReporter
      )
    );
  }

  const capabilitiesToAddManifest: (
    | { name: "staticTab"; snippet?: { local: IStaticTab; remote: IStaticTab } }
    | { name: "configurableTab"; snippet?: { local: IConfigurableTab; remote: IConfigurableTab } }
    | { name: "Bot"; snippet?: { local: IBot; remote: IBot } }
    | {
        name: "MessageExtension";
        snippet?: { local: IComposeExtension; remote: IComposeExtension };
      }
  )[] = [];
  const pluginNamesToScaffold: Set<string> = new Set<string>();
  const pluginNamesToArm: Set<string> = new Set<string>();
  const newCapabilitySet = new Set<string>();
  solutionSettings.capabilities.forEach((c) => newCapabilitySet.add(c));
  const vsProject = isVSProject(ctx.projectSetting);

  // 4. check Tab
  if (capabilitiesAnswer.includes(TabOptionItem.id)) {
    if (vsProject) {
      pluginNamesToScaffold.add(ResourcePluginsV2.FrontendPlugin);
      if (!alreadyHasTab) {
        pluginNamesToArm.add(ResourcePluginsV2.FrontendPlugin);
        pluginNamesToArm.add(ResourcePluginsV2.SimpleAuthPlugin);
      }
    } else {
      if (!alreadyHasTab) {
        pluginNamesToScaffold.add(ResourcePluginsV2.FrontendPlugin);
        pluginNamesToArm.add(ResourcePluginsV2.FrontendPlugin);
        pluginNamesToArm.add(ResourcePluginsV2.SimpleAuthPlugin);
      }
    }
    capabilitiesToAddManifest.push({ name: "staticTab" });
    newCapabilitySet.add(TabOptionItem.id);
  }
  // 5. check Bot
  if (capabilitiesAnswer.includes(BotOptionItem.id)) {
    if (vsProject) {
      pluginNamesToScaffold.add(ResourcePluginsV2.FrontendPlugin);
      if (!alreadyHasBot && !alreadyHasME) {
        pluginNamesToArm.add(ResourcePluginsV2.BotPlugin);
      }
    } else {
      if (!alreadyHasBot && !alreadyHasME) {
        pluginNamesToScaffold.add(ResourcePluginsV2.BotPlugin);
        pluginNamesToArm.add(ResourcePluginsV2.BotPlugin);
      }
    }
    capabilitiesToAddManifest.push({ name: "Bot" });
    newCapabilitySet.add(BotOptionItem.id);
  }
  // 6. check MessageExtension
  if (capabilitiesAnswer.includes(MessageExtensionItem.id)) {
    if (vsProject) {
      pluginNamesToScaffold.add(ResourcePluginsV2.FrontendPlugin);
      if (!alreadyHasBot && !alreadyHasME) {
        pluginNamesToArm.add(ResourcePluginsV2.BotPlugin);
      }
    } else {
      if (!alreadyHasBot && !alreadyHasME) {
        pluginNamesToScaffold.add(ResourcePluginsV2.BotPlugin);
        pluginNamesToArm.add(ResourcePluginsV2.BotPlugin);
      }
    }
    capabilitiesToAddManifest.push({ name: "MessageExtension" });
    newCapabilitySet.add(MessageExtensionItem.id);
  }

  // 7. update solution settings
  solutionSettings.capabilities = Array.from(newCapabilitySet);
  setActivatedResourcePluginsV2(ctx.projectSetting);

  // 8. scaffold and update arm
  const pluginsToScaffold = Array.from(pluginNamesToScaffold).map((name) =>
    Container.get<v2.ResourcePlugin>(name)
  );
  const pluginsToArm = Array.from(pluginNamesToArm).map((name) =>
    Container.get<v2.ResourcePlugin>(name)
  );
  if (pluginsToScaffold.length > 0) {
    const scaffoldRes = await scaffoldCodeAndResourceTemplate(
      ctx,
      inputsNew,
      localSettings,
      pluginsToScaffold,
      pluginsToArm
    );
    if (scaffoldRes.isErr()) {
      ctx.projectSetting.solutionSettings = originalSettings;
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.AddCapability,
          scaffoldRes.error,
          ctx.telemetryReporter
        )
      );
    }
  }
  // 4. update manifest
  if (capabilitiesToAddManifest.length > 0 || pluginsToScaffold.length > 0) {
    await appStudioPlugin.addCapabilities(ctx, inputsWithProjectPath, capabilitiesToAddManifest);
  }
  if (capabilitiesAnswer.length > 0) {
    const addNames = capabilitiesAnswer.map((c) => `'${c}'`).join(" and ");
    const single = capabilitiesAnswer.length === 1;
    const template =
      inputs.platform === Platform.CLI
        ? single
          ? getStrings().solution.addCapability.AddCapabilityNoticeForCli
          : getStrings().solution.addCapability.AddCapabilitiesNoticeForCli
        : single
        ? getStrings().solution.addCapability.AddCapabilityNotice
        : getStrings().solution.addCapability.AddCapabilitiesNotice;
    const msg = util.format(template, addNames);
    ctx.userInteraction.showMessage("info", msg, false);
    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddCapability, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
      [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      [SolutionTelemetryProperty.Capabilities]: capabilitiesAnswer.join(";"),
    });
  }
  return ok({
    solutionSettings: solutionSettings,
    solutionConfig: { provisionSucceeded: false },
  });
}

export function showUpdateArmTemplateNotice(ui?: UserInteraction) {
  const msg: string = util.format(getStrings().solution.UpdateArmTemplateNotice);
  ui?.showMessage("info", msg, false);
}

async function scaffoldCodeAndResourceTemplate(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings: Json,
  pluginsToScaffold: v2.ResourcePlugin[],
  pluginsToDoArm?: v2.ResourcePlugin[]
): Promise<Result<unknown, FxError>> {
  const result = await scaffoldByPlugins(ctx, inputs, localSettings, pluginsToScaffold);
  if (result.isErr()) {
    return result;
  }
  const scaffoldLocalDebugSettingsResult = await scaffoldLocalDebugSettings(
    ctx,
    inputs,
    localSettings
  );
  if (scaffoldLocalDebugSettingsResult.isErr()) {
    return scaffoldLocalDebugSettingsResult;
  }
  const pluginsToUpdateArm = pluginsToDoArm ? pluginsToDoArm : pluginsToScaffold;
  if (pluginsToUpdateArm.length > 0) {
    return generateResourceTemplateForPlugins(ctx, inputs, pluginsToUpdateArm);
  }
  return ok(undefined);
}

export async function addResource(
  ctx: v2.Context,
  inputs: Inputs,
  localSettings: Json,
  func: Func,
  envInfo: v2.EnvInfoV2,
  tokenProvider: TokenProvider
): Promise<Result<unknown, FxError>> {
  ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddResourceStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });

  // 1. checking addable
  const solutionSettings = getAzureSolutionSettings(ctx);
  if (!solutionSettings) {
    return err(new OperationNotSupportedForExistingAppError("addResource"));
  }
  const originalSettings = cloneDeep(solutionSettings);
  const inputsNew: v2.InputsWithProjectPath & { existingResources: string[] } = {
    ...inputs,
    projectPath: inputs.projectPath!,
    existingResources: originalSettings.activeResourcePlugins,
  };
  const canProceed = canAddResource(ctx.projectSetting, ctx.telemetryReporter);
  if (canProceed.isErr()) {
    return err(canProceed.error);
  }

  // 2. check answer
  const addResourcesAnswer = inputs[AzureSolutionQuestionNames.AddResources] as string[];
  if (!addResourcesAnswer || addResourcesAnswer.length === 0) {
    ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddResource, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
      [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      [SolutionTelemetryProperty.Resources]: [].join(";"),
    });
    return ok({});
  }

  const alreadyHaveFunction = solutionSettings.azureResources.includes(AzureResourceFunction.id);
  const alreadyHaveApim = solutionSettings.azureResources.includes(AzureResourceApim.id);
  const alreadyHaveKeyVault = solutionSettings.azureResources.includes(AzureResourceKeyVault.id);
  const addSQL = addResourcesAnswer.includes(AzureResourceSQL.id);
  const addApim = addResourcesAnswer.includes(AzureResourceApim.id);
  const addKeyVault = addResourcesAnswer.includes(AzureResourceKeyVault.id);
  const addFunc =
    addResourcesAnswer.includes(AzureResourceFunction.id) || (addApim && !alreadyHaveFunction);

  // 3. check APIM and KeyVault addable
  if ((alreadyHaveApim && addApim) || (alreadyHaveKeyVault && addKeyVault)) {
    const e = new UserError(
      new Error("APIM/KeyVault is already added."),
      SolutionSource,
      SolutionError.AddResourceNotSupport
    );
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.AddResource,
        e,
        ctx.telemetryReporter
      )
    );
  }

  const newResourceSet = new Set<string>();
  solutionSettings.azureResources.forEach((r) => newResourceSet.add(r));
  const addedResources: string[] = [];
  const pluginsToScaffold: v2.ResourcePlugin[] = [];
  const pluginsToDoArm: v2.ResourcePlugin[] = [];
  let scaffoldApim = false;
  // 4. check Function
  if (addFunc) {
    const functionPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.FunctionPlugin);
    pluginsToScaffold.push(functionPlugin);
    if (!alreadyHaveFunction) {
      pluginsToDoArm.push(functionPlugin);
    }
    addedResources.push(AzureResourceFunction.id);
  }
  // 5. check SQL
  if (addSQL) {
    const sqlPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.SqlPlugin);
    const identityPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.IdentityPlugin);
    pluginsToDoArm.push(sqlPlugin);
    if (!solutionSettings.activeResourcePlugins.includes(identityPlugin.name)) {
      // add identity for first time
      pluginsToDoArm.push(identityPlugin);
    }
    addedResources.push(AzureResourceSQL.id);
  }
  // 6. check APIM
  const apimPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.ApimPlugin);
  if (addApim) {
    // We don't add apimPlugin into pluginsToScaffold because
    // apim plugin needs to modify config output during scaffolding,
    // which is not supported by the scaffoldSourceCode API.
    // The scaffolding will run later as a userTask as a work around.
    addedResources.push(AzureResourceApim.id);
    pluginsToDoArm.push(apimPlugin);
    scaffoldApim = true;
  }
  if (addKeyVault) {
    const keyVaultPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.KeyVaultPlugin);
    pluginsToDoArm.push(keyVaultPlugin);
    addedResources.push(AzureResourceKeyVault.id);
  }

  // 7. update solution settings
  addedResources.forEach((r) => newResourceSet.add(r));
  solutionSettings.azureResources = Array.from(newResourceSet);
  setActivatedResourcePluginsV2(ctx.projectSetting);

  // 8. scaffold and update arm
  if (pluginsToScaffold.length > 0 || pluginsToDoArm.length > 0) {
    let scaffoldRes = await scaffoldCodeAndResourceTemplate(
      ctx,
      inputsNew,
      localSettings,
      pluginsToScaffold,
      pluginsToDoArm
    );
    if (scaffoldApim) {
      if (apimPlugin && apimPlugin.executeUserTask) {
        const result = await apimPlugin.executeUserTask(
          ctx,
          inputs,
          func,
          {},
          envInfo,
          tokenProvider
        );
        if (result.isErr()) {
          scaffoldRes = combine([scaffoldRes, result]);
        }
      }
    }
    if (scaffoldRes.isErr()) {
      ctx.projectSetting.solutionSettings = originalSettings;
      return err(
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.AddResource,
          scaffoldRes.error,
          ctx.telemetryReporter
        )
      );
    }
    const addNames = addedResources.map((c) => `'${c}'`).join(" and ");
    const single = addedResources.length === 1;
    const template =
      inputs.platform === Platform.CLI
        ? single
          ? getStrings().solution.addResource.AddResourceNoticeForCli
          : getStrings().solution.addResource.AddResourcesNoticeForCli
        : single
        ? getStrings().solution.addResource.AddResourceNotice
        : getStrings().solution.addResource.AddResourcesNotice;
    ctx.userInteraction.showMessage("info", util.format(template, addNames), false);
  }

  ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.AddResource, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
    [SolutionTelemetryProperty.Resources]: addResourcesAnswer.join(";"),
  });
  return ok(
    pluginsToDoArm.length > 0
      ? { solutionSettings: solutionSettings, solutionConfig: { provisionSucceeded: false } }
      : Void
  );
}

export function extractParamForRegisterTeamsAppAndAad(
  answers?: Inputs
): Result<ParamForRegisterTeamsAppAndAad, FxError> {
  if (answers == undefined) {
    return err(
      returnSystemError(
        new Error("Input is undefined"),
        SolutionSource,
        SolutionError.FailedToGetParamForRegisterTeamsAppAndAad
      )
    );
  }

  const param: ParamForRegisterTeamsAppAndAad = {
    "app-name": "",
    endpoint: "",
    environment: "local",
    "root-path": "",
  };
  for (const key of Object.keys(param)) {
    const value = answers[key];
    if (value == undefined) {
      return err(
        returnSystemError(
          new Error(`${key} not found`),
          SolutionSource,
          SolutionError.FailedToGetParamForRegisterTeamsAppAndAad
        )
      );
    }
    (param as any)[key] = value;
  }

  return ok(param);
}

export type ParamForRegisterTeamsAppAndAad = {
  "app-name": string;
  environment: "local" | "remote";
  endpoint: string;
  "root-path": string;
};
